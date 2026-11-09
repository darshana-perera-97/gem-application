const crypto = require("crypto");
const express = require("express");
const { getDb } = require("./db");
const { serialize } = require("./catalog");

const router = express.Router();

const ADMIN_COOKIE = "gem_admin_session";
const ADMIN_MAX_AGE = 60 * 60 * 12;

function asyncRoute(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error(error);
      if (!res.headersSent) {
        res.status(error.status || 500).json({ error: error.message });
      }
    });
  };
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    const error = new Error("AUTH_SECRET is missing from backend/.env");
    error.status = 500;
    throw error;
  }
  return secret;
}

function adminCredentials() {
  const username = String(process.env.ADMIN_USERNAME || "").trim();
  const password = String(process.env.ADMIN_PASSWORD || "");
  return { username, password };
}

function adminConfigured() {
  const { username, password } = adminCredentials();
  return Boolean(username && password);
}

function signPayload(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function readPayload(token) {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", authSecret()).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = {};
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

function appendCookie(res, cookie) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookie);
  } else if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, cookie]);
  } else {
    res.setHeader("Set-Cookie", [existing, cookie]);
  }
}

function setCookie(res, name, value, maxAge) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  appendCookie(res, parts.join("; "));
}

function clearCookie(res, name) {
  setCookie(res, name, "", 0);
}

function startAdminSession(res, username) {
  setCookie(
    res,
    ADMIN_COOKIE,
    signPayload({ role: "admin", username, exp: Date.now() + ADMIN_MAX_AGE * 1000 }),
    ADMIN_MAX_AGE
  );
}

function adminSession(req) {
  if (!process.env.AUTH_SECRET) return null;
  const cookies = parseCookies(req);
  const session = readPayload(cookies[ADMIN_COOKIE]);
  if (!session || session.role !== "admin") return null;
  return session;
}

function requireAdmin(req, res, next) {
  const session = adminSession(req);
  if (!session) {
    res.status(401).json({ error: "Admin sign-in required" });
    return;
  }
  req.admin = session;
  next();
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function publishedFilter() {
  return {
    $or: [
      { status: "published" },
      { status: { $exists: false } },
      { status: null },
    ],
  };
}

async function notify(database, note) {
  if (!note.userId) return;
  await database.collection("notifications").insertOne({
    id: makeId("note"),
    userId: note.userId,
    type: note.type,
    message: note.message,
    href: note.href || "/",
    read: false,
    createdAt: new Date().toISOString(),
  });
}

router.get("/admin/configured", (req, res) => {
  res.json({ configured: adminConfigured() });
});

router.get("/admin/me", (req, res) => {
  const session = adminSession(req);
  if (!session) {
    res.json({ admin: null });
    return;
  }
  res.json({ admin: { username: session.username, role: "admin" } });
});

router.post("/admin/login", asyncRoute(async (req, res) => {
  if (!adminConfigured()) {
    res.status(503).json({
      error: "Admin login is not configured. Add ADMIN_USERNAME and ADMIN_PASSWORD to backend/.env, then restart the API.",
    });
    return;
  }
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const expected = adminCredentials();
  if (!safeEqual(username, expected.username) || !safeEqual(password, expected.password)) {
    res.status(401).json({ error: "Invalid admin username or password" });
    return;
  }
  startAdminSession(res, expected.username);
  res.json({ ok: true, admin: { username: expected.username, role: "admin" } });
}));

router.post("/admin/logout", (req, res) => {
  clearCookie(res, ADMIN_COOKIE);
  res.json({ ok: true });
});

router.get("/admin/analytics", requireAdmin, asyncRoute(async (req, res) => {
  const database = getDb();
  const [
    users,
    vendors,
    listings,
    activeListings,
    soldListings,
    posts,
    pendingPosts,
    publishedPosts,
    events,
    conversations,
    messages,
    reviews,
    shorts,
    reports,
    pendingVendors,
    listingValue,
    listingsByStatus,
    listingsByType,
    recentUsers,
    recentListings,
  ] = await Promise.all([
    database.collection("users").countDocuments(),
    database.collection("vendors").countDocuments(),
    database.collection("listings").countDocuments(),
    database.collection("listings").countDocuments({ status: "ACTIVE" }),
    database.collection("listings").countDocuments({ status: "SOLD" }),
    database.collection("posts").countDocuments(),
    database.collection("posts").countDocuments({ status: "pending" }),
    database.collection("posts").countDocuments(publishedFilter()),
    database.collection("events").countDocuments(),
    database.collection("conversations").countDocuments(),
    database.collection("messages").countDocuments(),
    database.collection("reviews").countDocuments(),
    database.collection("shorts").countDocuments(),
    database.collection("reports").countDocuments(),
    database.collection("users").countDocuments({ vendorStatus: "PENDING" }),
    database.collection("listings").aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ["$price", 0] } }, avg: { $avg: { $ifNull: ["$price", 0] } } } },
    ]).toArray(),
    database.collection("listings").aggregate([
      { $group: { _id: { $ifNull: ["$status", "UNKNOWN"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),
    database.collection("listings").aggregate([
      {
        $project: {
          name: {
            $trim: {
              input: {
                $ifNull: ["$gemType", { $ifNull: ["$variety", { $ifNull: ["$type", "Other"] }] }],
              },
            },
          },
          price: { $ifNull: ["$price", 0] },
        },
      },
      { $group: { _id: "$name", count: { $sum: 1 }, value: { $sum: "$price" } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray(),
    database.collection("users").find({}).sort({ createdAt: -1 }).limit(8).toArray(),
    database.collection("listings").find({}).sort({ createdAt: -1 }).limit(8).toArray(),
  ]);

  const valueRow = listingValue[0] || { total: 0, avg: 0 };
  const monthBuckets = {};
  const monthUsers = await database.collection("users").find({}, { projection: { createdAt: 1 } }).toArray();
  for (const user of monthUsers) {
    const created = user.createdAt ? new Date(user.createdAt) : null;
    if (!created || Number.isNaN(created.getTime())) continue;
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    monthBuckets[key] = (monthBuckets[key] || 0) + 1;
  }
  const growth = Object.keys(monthBuckets)
    .sort()
    .slice(-6)
    .map((name) => ({ name, value: monthBuckets[name] }));

  res.json({
    stats: [
      { key: "users", label: "Total Users", value: String(users), trend: `${pendingVendors} vendor apps` },
      { key: "listings", label: "Active Listings", value: String(activeListings), trend: `${soldListings} sold` },
      { key: "vendors", label: "Vendors", value: String(vendors), trend: `${pendingVendors} pending` },
      { key: "revenue", label: "Listing Value", value: `$${Math.round(Number(valueRow.total || 0)).toLocaleString("en-US")}`, trend: `avg $${Math.round(Number(valueRow.avg || 0)).toLocaleString("en-US")}` },
    ],
    activity: [
      { label: "Pending article approvals", count: pendingPosts, color: "bg-amber-500", max: Math.max(pendingPosts, 10) },
      { label: "Pending vendor applications", count: pendingVendors, color: "bg-amber-500", max: Math.max(pendingVendors, 10) },
      { label: "Reported items", count: reports, color: "bg-red-500", max: Math.max(reports, 10) },
      { label: "Conversations", count: conversations, color: "bg-blue-500", max: Math.max(conversations, 10) },
    ],
    totals: {
      users,
      vendors,
      listings,
      activeListings,
      soldListings,
      posts,
      pendingPosts,
      publishedPosts,
      events,
      conversations,
      messages,
      reviews,
      shorts,
      reports,
      pendingVendors,
      listingValue: Number(valueRow.total || 0),
      averageListingPrice: Number(valueRow.avg || 0),
    },
    marketplace: {
      byStatus: listingsByStatus.map((row) => ({ status: row._id, count: row.count })),
      byType: listingsByType.map((row) => ({
        name: row._id || "Other",
        count: row.count,
        value: Number(row.value || 0),
      })),
    },
    growth,
    recentUsers: recentUsers.map(serialize),
    recentListings: recentListings.map(serialize),
  });
}));

router.get("/admin/users", requireAdmin, asyncRoute(async (req, res) => {
  const database = getDb();
  const users = await database.collection("users").find({}).sort({ createdAt: -1 }).toArray();
  res.json(users.map(serialize));
}));

router.get("/admin/posts", requireAdmin, asyncRoute(async (req, res) => {
  const database = getDb();
  const status = String(req.query.status || "all").toLowerCase();
  const filter = {};
  if (status === "pending" || status === "published" || status === "rejected") {
    filter.status = status;
  }
  const posts = await database.collection("posts").find(filter).sort({ createdAt: -1 }).toArray();
  res.json(posts.map(serialize));
}));

router.post("/admin/posts", requireAdmin, asyncRoute(async (req, res) => {
  const content = String(req.body?.content || "").trim();
  const title = String(req.body?.title || "").trim();
  if (!content && !title) {
    res.status(400).json({ error: "Add a title or body before publishing" });
    return;
  }
  const type = String(req.body?.type || "NEWS").toUpperCase();
  const allowedTypes = new Set(["NEWS", "ARTICLE", "STORY", "DISCUSSION"]);
  const database = getDb();
  const post = {
    id: makeId("post"),
    authorId: "admin",
    authorName: String(req.body?.authorName || "GEM Admin"),
    authorAvatar: req.body?.authorAvatar || "",
    authorType: "ADMIN",
    title,
    content: content || title,
    media: Array.isArray(req.body?.media) ? req.body.media.slice(0, 4) : [],
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    type: allowedTypes.has(type) ? type : "NEWS",
    status: "published",
    publishedAt: new Date().toISOString(),
    publishedBy: req.admin.username,
    createdAt: new Date().toISOString(),
  };
  await database.collection("posts").insertOne(post);

  if (req.body?.setAsNews) {
    await database.collection("content").updateOne(
      { key: "news" },
      {
        $set: {
          key: "news",
          badge: "Industry News",
          title: title || content.slice(0, 80),
          body: content,
          image: post.media[0] || "/assets/images/emerald_gemstone_1781701044795.jpg",
          cta: "Read Article",
          postId: post.id,
          updatedAt: new Date().toISOString(),
        },
        $setOnInsert: { createdAt: new Date().toISOString() },
      },
      { upsert: true }
    );
  }

  res.status(201).json(serialize(post));
}));

router.post("/admin/posts/:id/approve", requireAdmin, asyncRoute(async (req, res) => {
  const database = getDb();
  const post = await database.collection("posts").findOne({ id: req.params.id });
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const publishedAt = new Date().toISOString();
  await database.collection("posts").updateOne(
    { id: post.id },
    {
      $set: {
        status: "published",
        publishedAt,
        publishedBy: req.admin.username,
        rejectedAt: null,
        rejectedReason: null,
      },
    }
  );
  if (post.authorId && post.authorId !== "admin") {
    await notify(database, {
      userId: post.authorId,
      type: "article",
      message: "Your article was approved and published",
      href: "/",
    });
  }
  if (req.body?.setAsNews || post.type === "NEWS" || post.type === "ARTICLE") {
    await database.collection("content").updateOne(
      { key: "news" },
      {
        $set: {
          key: "news",
          badge: "Industry News",
          title: post.title || String(post.content || "").slice(0, 80),
          body: post.content,
          image: Array.isArray(post.media) && post.media[0]
            ? post.media[0]
            : "/assets/images/emerald_gemstone_1781701044795.jpg",
          cta: "Read Article",
          postId: post.id,
          updatedAt: publishedAt,
        },
        $setOnInsert: { createdAt: publishedAt },
      },
      { upsert: true }
    );
  }
  const updated = await database.collection("posts").findOne({ id: post.id });
  res.json(serialize(updated));
}));

router.post("/admin/posts/:id/reject", requireAdmin, asyncRoute(async (req, res) => {
  const database = getDb();
  const post = await database.collection("posts").findOne({ id: req.params.id });
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const reason = String(req.body?.reason || "").trim();
  await database.collection("posts").updateOne(
    { id: post.id },
    {
      $set: {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedReason: reason || "Rejected by admin",
        rejectedBy: req.admin.username,
      },
    }
  );
  if (post.authorId && post.authorId !== "admin") {
    await notify(database, {
      userId: post.authorId,
      type: "article",
      message: reason ? `Your article was not approved: ${reason}` : "Your article was not approved",
      href: "/",
    });
  }
  const updated = await database.collection("posts").findOne({ id: post.id });
  res.json(serialize(updated));
}));

router.get("/admin/events", requireAdmin, asyncRoute(async (req, res) => {
  const database = getDb();
  const events = await database.collection("events").find({}).sort({ order: 1, createdAt: -1 }).toArray();
  res.json(events.map(serialize));
}));

router.post("/admin/events", requireAdmin, asyncRoute(async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const date = String(req.body?.date || "").trim();
  const type = String(req.body?.type || "Exhibitions").trim() || "Exhibitions";
  if (!title || !date) {
    res.status(400).json({ error: "Event title and date are required" });
    return;
  }
  const database = getDb();
  const last = await database.collection("events").find({}).sort({ order: -1 }).limit(1).next();
  const event = {
    id: makeId("event"),
    title,
    date,
    type,
    location: String(req.body?.location || "").trim(),
    description: String(req.body?.description || "").trim(),
    order: Number(last?.order || 0) + 1,
    createdAt: new Date().toISOString(),
    createdBy: req.admin.username,
  };
  await database.collection("events").insertOne(event);
  res.status(201).json(serialize(event));
}));

router.delete("/admin/events/:id", requireAdmin, asyncRoute(async (req, res) => {
  const database = getDb();
  const result = await database.collection("events").deleteOne({ id: req.params.id });
  if (!result.deletedCount) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json({ ok: true });
}));

const GROUP_COLORS = new Set([
  "bg-primary",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-blue-600",
  "bg-rose-500",
  "bg-slate-700",
]);

router.get("/admin/groups", requireAdmin, asyncRoute(async (req, res) => {
  const database = getDb();
  const groups = await database.collection("groups").find({}).sort({ order: 1, createdAt: -1 }).toArray();
  res.json(groups.map(serialize));
}));

router.post("/admin/groups", requireAdmin, asyncRoute(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "Group name is required" });
    return;
  }
  const color = String(req.body?.color || "bg-primary").trim();
  const activity = String(req.body?.activity || "Medium").trim() || "Medium";
  const members = String(req.body?.members || "0").trim() || "0";
  const database = getDb();
  const last = await database.collection("groups").find({}).sort({ order: -1 }).limit(1).next();
  const group = {
    id: makeId("group"),
    name,
    members,
    activity,
    color: GROUP_COLORS.has(color) ? color : "bg-primary",
    order: Number(last?.order || 0) + 1,
    createdAt: new Date().toISOString(),
    createdBy: req.admin.username,
  };
  await database.collection("groups").insertOne(group);
  res.status(201).json(serialize(group));
}));

router.delete("/admin/groups/:id", requireAdmin, asyncRoute(async (req, res) => {
  const database = getDb();
  const result = await database.collection("groups").deleteOne({ id: req.params.id });
  if (!result.deletedCount) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  await database.collection("memberships").deleteMany({ groupId: req.params.id });
  res.json({ ok: true });
}));

module.exports = {
  adminRouter: router,
  adminConfigured,
  adminSession,
  publishedFilter,
};
