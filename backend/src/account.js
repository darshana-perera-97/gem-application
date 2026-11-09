const express = require("express");
const { getDb } = require("./db");
const { sessionUid, endSession } = require("./googleAuth");

const router = express.Router();

const DELETE_REASONS = new Set([
  "not_using",
  "privacy",
  "notifications",
  "marketplace_problem",
  "new_account",
  "other",
]);

function asyncRoute(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error("Account deletion failed:", error.message);
      if (!res.headersSent) {
        const status = error.status || 500;
        res.status(status).json({
          error: status === 500 ? "Could not delete the account." : error.message,
        });
      }
    });
  };
}

function cleanDetails(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 1000);
}

async function deleteOwnedRecords(database, user) {
  const uid = user.uid;
  const email = user.email || null;
  const vendors = await database.collection("vendors").find({
    $or: [{ userId: uid }, { id: uid }],
  }).toArray();
  const vendorIds = [...new Set(vendors.map((vendor) => vendor.id).filter(Boolean))];
  const listingVendorIds = [...new Set([...vendorIds, uid])];

  const removedName = {
    authorId: "deleted",
    authorName: "Deleted member",
    authorAvatar: "",
  };

  await Promise.all([
    database.collection("likes").deleteMany({ userId: uid }),
    database.collection("saves").deleteMany({ userId: uid }),
    database.collection("memberships").deleteMany({ userId: uid }),
    database.collection("debateJoins").deleteMany({ userId: uid }),
    database.collection("eventRsvps").deleteMany({ userId: uid }),
    database.collection("articleReads").deleteMany({ userId: uid }),
    database.collection("notifications").deleteMany({ userId: uid }),
    database.collection("shortViews").deleteMany({ userId: uid }),
    database.collection("shorts").deleteMany({ userId: uid }),
    database.collection("reports").deleteMany({ userId: uid }),
    database.collection("exports").deleteMany({ userId: uid }),
    database.collection("follows").deleteMany({
      $or: [
        { userId: uid },
        { targetId: uid, targetType: "user" },
        ...(vendorIds.length ? [{ targetId: { $in: vendorIds }, targetType: "vendor" }] : []),
      ],
    }),
    email ? database.collection("emailOtps").deleteMany({ email }) : Promise.resolve(),
    email ? database.collection("invites").deleteMany({ email }) : Promise.resolve(),
    database.collection("posts").updateMany({ authorId: uid }, { $set: removedName }),
    database.collection("comments").updateMany({ authorId: uid }, { $set: removedName }),
    database.collection("reviews").updateMany({ authorId: uid }, { $set: removedName }),
    database.collection("listings").deleteMany({ vendorId: { $in: listingVendorIds } }),
    database.collection("vendors").deleteMany({ $or: [{ userId: uid }, { id: uid }] }),
  ]);

  const conversations = await database.collection("conversations").find({ participants: uid }).toArray();
  const conversationIds = conversations.map((conversation) => conversation.id).filter(Boolean);
  if (conversationIds.length > 0) {
    await database.collection("messages").deleteMany({ conversationId: { $in: conversationIds } });
  }
  await database.collection("conversations").deleteMany({ participants: uid });
  await database.collection("users").deleteOne({ uid });
}

function readFeedback(body) {
  const reason = String(body?.reason || "").trim();
  const details = cleanDetails(body?.details);
  const confirmation = String(body?.confirmation || "").trim();

  if (!DELETE_REASONS.has(reason)) {
    const error = new Error("Choose why you are leaving.");
    error.status = 400;
    throw error;
  }
  if (reason === "other" && details.length < 3) {
    const error = new Error("Tell us a little more about why you are leaving.");
    error.status = 400;
    throw error;
  }
  if (confirmation !== "DELETE") {
    const error = new Error("Type DELETE to confirm.");
    error.status = 400;
    throw error;
  }
  return { reason, details };
}

async function saveFeedback(feedback) {
  await getDb().collection("accountFeedback").insertOne({
    reason: feedback.reason,
    details: feedback.details,
    createdAt: new Date().toISOString(),
  });
}

router.post("/account/feedback", asyncRoute(async (req, res) => {
  const feedback = readFeedback(req.body);
  await saveFeedback(feedback);
  res.json({ ok: true });
}));

router.post("/account/delete", asyncRoute(async (req, res) => {
  const uid = sessionUid(req);
  if (!uid) {
    res.status(401).json({ error: "Sign in again, then delete your account." });
    return;
  }

  const feedback = readFeedback(req.body);
  await saveFeedback(feedback);

  const database = getDb();
  const user = await database.collection("users").findOne({ uid });
  if (user) {
    await deleteOwnedRecords(database, user);
  }
  endSession(res);
  res.json({ ok: true });
}));

module.exports = { accountRouter: router };
