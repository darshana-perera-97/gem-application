const express = require("express");
const { getDb } = require("./db");
const { serialize } = require("./catalog");

const router = express.Router();

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

function requireUserId(body) {
  const userId = String(body?.userId || "").trim();
  if (!userId) {
    const error = new Error("Sign in to continue");
    error.status = 401;
    throw error;
  }
  return userId;
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

async function bumpCount(database, collectionName, filter, field, delta) {
  const current = await database.collection(collectionName).findOne(filter);
  if (!current || typeof current[field] !== "number") return null;
  const next = Math.max(0, current[field] + delta);
  await database.collection(collectionName).updateOne(filter, { $set: { [field]: next } });
  return next;
}

router.get("/activity", asyncRoute(async (req, res) => {
  const userId = String(req.query.userId || "").trim();
  const empty = { likes: [], follows: [], saves: [], groups: [], debates: [], rsvps: [], reads: [] };
  if (!userId) {
    res.json(empty);
    return;
  }
  const database = getDb();
  const [likes, follows, saves, groups, debates, rsvps, reads] = await Promise.all([
    database.collection("likes").find({ userId }).toArray(),
    database.collection("follows").find({ userId }).toArray(),
    database.collection("saves").find({ userId }).toArray(),
    database.collection("memberships").find({ userId }).toArray(),
    database.collection("debateJoins").find({ userId }).toArray(),
    database.collection("eventRsvps").find({ userId }).toArray(),
    database.collection("articleReads").find({ userId }).toArray(),
  ]);
  res.json({
    likes: likes.map((row) => row.postId),
    follows: follows.map((row) => ({ targetId: row.targetId, targetType: row.targetType })),
    saves: saves.map((row) => row.listingId),
    groups: groups.map((row) => row.groupId),
    debates: debates.map((row) => row.discussionId),
    rsvps: rsvps.map((row) => row.eventId),
    reads: reads.map((row) => row.articleKey),
  });
}));

router.post("/posts", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const content = String(req.body.content || "").trim();
  const title = String(req.body.title || "").trim();
  if (!content) {
    res.status(400).json({ error: "Write something before posting" });
    return;
  }
  const requestedType = String(req.body.type || "STORY").toUpperCase();
  const isArticle = requestedType === "ARTICLE" || requestedType === "NEWS";
  const type = isArticle ? (requestedType === "NEWS" ? "NEWS" : "ARTICLE") : "STORY";
  const database = getDb();
  const post = {
    id: makeId("post"),
    authorId: userId,
    authorName: String(req.body.authorName || "Member"),
    authorAvatar: req.body.authorAvatar || "",
    authorType: req.body.authorType === "VENDOR" ? "VENDOR" : "USER",
    title,
    content,
    media: Array.isArray(req.body.media) ? req.body.media.slice(0, 4) : [],
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    type,
    status: isArticle ? "pending" : "published",
    createdAt: new Date().toISOString(),
  };
  if (!isArticle) {
    post.publishedAt = post.createdAt;
  }
  await database.collection("posts").insertOne(post);
  res.status(201).json(serialize(post));
}));

router.post("/posts/:id/like", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const postId = req.params.id;
  const database = getDb();
  const likes = database.collection("likes");
  const existing = await likes.findOne({ userId, postId });
  let liked = false;
  if (existing) {
    await likes.deleteOne({ _id: existing._id });
  } else {
    await likes.insertOne({
      id: makeId("like"),
      userId,
      postId,
      createdAt: new Date().toISOString(),
    });
    liked = true;
  }
  const likesCount = await bumpCount(database, "posts", { id: postId }, "likesCount", liked ? 1 : -1);
  if (liked) {
    const post = await database.collection("posts").findOne({ id: postId });
    if (post?.authorId && post.authorId !== userId) {
      await notify(database, {
        userId: post.authorId,
        type: "like",
        message: "Someone liked your post",
        href: "/",
      });
    }
  }
  res.json({ liked, likesCount });
}));

router.get("/posts/:id/comments", asyncRoute(async (req, res) => {
  const database = getDb();
  const comments = await database.collection("comments")
    .find({ postId: req.params.id })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(comments.map(serialize));
}));

router.post("/posts/:id/comments", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const content = String(req.body.content || "").trim();
  if (!content) {
    res.status(400).json({ error: "Comment cannot be empty" });
    return;
  }
  const database = getDb();
  const comment = {
    id: makeId("comment"),
    postId: req.params.id,
    authorId: userId,
    authorName: String(req.body.authorName || "Member"),
    authorAvatar: req.body.authorAvatar || "",
    content,
    createdAt: new Date().toISOString(),
  };
  await database.collection("comments").insertOne(comment);
  const commentsCount = await bumpCount(database, "posts", { id: req.params.id }, "commentsCount", 1);
  const post = await database.collection("posts").findOne({ id: req.params.id });
  if (post?.authorId && post.authorId !== userId) {
    await notify(database, {
      userId: post.authorId,
      type: "comment",
      message: `${comment.authorName} commented on your post`,
      href: "/",
    });
  }
  res.status(201).json({ comment: serialize(comment), commentsCount });
}));

router.post("/follows", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const targetId = String(req.body.targetId || "").trim();
  const targetType = req.body.targetType === "vendor" ? "vendor" : "user";
  if (!targetId) {
    res.status(400).json({ error: "Missing follow target" });
    return;
  }
  const database = getDb();
  const follows = database.collection("follows");
  const existing = await follows.findOne({ userId, targetId, targetType });
  let following = false;
  if (existing) {
    await follows.deleteOne({ _id: existing._id });
  } else {
    await follows.insertOne({
      id: makeId("follow"),
      userId,
      targetId,
      targetType,
      createdAt: new Date().toISOString(),
    });
    following = true;
  }
  let followersCount = null;
  if (targetType === "vendor") {
    followersCount = await bumpCount(database, "vendors", { id: targetId }, "followersCount", following ? 1 : -1);
    if (following) {
      const vendor = await database.collection("vendors").findOne({ id: targetId });
      if (vendor?.userId && vendor.userId !== userId) {
        await notify(database, {
          userId: vendor.userId,
          type: "follow",
          message: "A member followed your business",
          href: `/vendors/${targetId}`,
        });
      }
    }
  }
  res.json({ following, followersCount });
}));

router.post("/saves", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const listingId = String(req.body.listingId || "").trim();
  if (!listingId) {
    res.status(400).json({ error: "Missing listing" });
    return;
  }
  const database = getDb();
  const saves = database.collection("saves");
  const existing = await saves.findOne({ userId, listingId });
  let saved = false;
  if (existing) {
    await saves.deleteOne({ _id: existing._id });
  } else {
    await saves.insertOne({
      id: makeId("save"),
      userId,
      listingId,
      createdAt: new Date().toISOString(),
    });
    saved = true;
  }
  res.json({ saved });
}));

router.get("/reviews", asyncRoute(async (req, res) => {
  const database = getDb();
  const filter = {};
  if (req.query.targetId) filter.targetId = req.query.targetId;
  const reviews = await database.collection("reviews").find(filter).sort({ createdAt: -1 }).toArray();
  res.json(reviews.map(serialize));
}));

router.post("/reviews", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const targetId = String(req.body.targetId || "").trim();
  const content = String(req.body.content || "").trim();
  const rating = Math.min(5, Math.max(1, Number(req.body.rating) || 5));
  if (!targetId || !content) {
    res.status(400).json({ error: "Rating and review text are required" });
    return;
  }
  const database = getDb();
  const targetVendor = await database.collection("vendors").findOne({
    $or: [{ id: targetId }, { userId: targetId }],
  });
  const isOwnProfile =
    targetId === userId
    || targetVendor?.userId === userId
    || targetVendor?.id === userId;
  if (isOwnProfile) {
    res.status(403).json({ error: "You cannot review your own profile" });
    return;
  }
  const review = {
    id: makeId("review"),
    targetId,
    authorId: userId,
    authorName: String(req.body.authorName || "Member"),
    authorAvatar: req.body.authorAvatar || "",
    rating,
    content,
    createdAt: new Date().toISOString(),
  };
  await database.collection("reviews").insertOne(review);
  const all = await database.collection("reviews").find({ targetId }).toArray();
  const reviewCount = all.length;
  const average = Math.round((all.reduce((sum, row) => sum + Number(row.rating || 0), 0) / reviewCount) * 10) / 10;
  const ratingUpdate = { reviewCount, rating: average, updatedAt: new Date().toISOString() };
  await database.collection("vendors").updateMany(
    { $or: [{ id: targetId }, { userId: targetId }] },
    { $set: ratingUpdate }
  );
  await database.collection("users").updateOne(
    { uid: targetId },
    { $set: ratingUpdate }
  );
  if (targetVendor?.userId && targetVendor.userId !== userId) {
    await database.collection("users").updateOne(
      { uid: targetVendor.userId },
      { $set: ratingUpdate }
    );
    await notify(database, {
      userId: targetVendor.userId,
      type: "review",
      message: `${review.authorName} left a ${rating}-star review`,
      href: `/vendors/${targetVendor.id || targetId}`,
    });
  } else if (!targetVendor && targetId !== userId) {
    await notify(database, {
      userId: targetId,
      type: "review",
      message: `${review.authorName} left a ${rating}-star review`,
      href: `/vendors/${targetId}`,
    });
  }
  res.status(201).json(serialize(review));
}));

function normalizeListingImages(rawImages) {
  const images = Array.isArray(rawImages)
    ? rawImages.map((image) => String(image || "").trim()).filter(Boolean)
    : [];
  if (images.length < 1) {
    const error = new Error("Upload at least 1 image of your gem");
    error.status = 400;
    throw error;
  }
  if (images.length > 5) {
    const error = new Error("You can upload a maximum of 5 images");
    error.status = 400;
    throw error;
  }
  return images;
}

function isValidPhoneNumber(value) {
  return /^\+\d{8,15}$/.test(String(value || "").trim());
}

async function requireVerifiedPhone(database, userId) {
  const user = await database.collection("users").findOne({ uid: userId });
  if (!user?.phoneVerified || !isValidPhoneNumber(user.phone)) {
    const error = new Error("Enter a valid phone number before listing a gem");
    error.status = 400;
    throw error;
  }
  return user;
}

async function findOwnedListing(database, listingId, userId) {
  const listing = await database.collection("listings").findOne({ id: listingId });
  if (!listing) {
    const error = new Error("Listing not found");
    error.status = 404;
    throw error;
  }
  const vendor = await database.collection("vendors").findOne({
    $or: [{ id: listing.vendorId }, { userId: listing.vendorId }],
  });
  const ownerIds = new Set(
    [listing.vendorId, vendor?.id, vendor?.userId].filter(Boolean).map(String)
  );
  if (!ownerIds.has(userId)) {
    const error = new Error("You can only edit your own listings");
    error.status = 403;
    throw error;
  }
  return { listing, vendor };
}

function listingFieldsFromBody(body, images) {
  const gemType = body.gemType || "Sapphire";
  const status = String(body.status || "ACTIVE").toUpperCase() === "SOLD" ? "SOLD" : "ACTIVE";
  return {
    title: String(body.title || "").trim(),
    gemType,
    variety: gemType,
    type: gemType,
    caratWeight: Number(body.caratWeight) || 0,
    weight: Number(body.caratWeight) || 0,
    price: Number(body.price) || 0,
    currency: body.currency || "LKR",
    cut: body.cut || "",
    clarity: body.clarity || "",
    treatment: body.treatment || "",
    certification: body.certification || "None",
    origin: body.origin || "Sri Lanka",
    shape: body.shape || "",
    dimensions: body.dimensions || "",
    description: body.description || "",
    images,
    status,
    negotiable: body.negotiable === undefined ? true : Boolean(body.negotiable),
  };
}

router.post("/listings", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const title = String(req.body.title || "").trim();
  if (!title) {
    res.status(400).json({ error: "A listing title is required" });
    return;
  }
  const images = normalizeListingImages(req.body.images);
  const database = getDb();
  const user = await requireVerifiedPhone(database, userId);
  let vendor = await database.collection("vendors").findOne({ userId });
  if (!vendor) {
    const displayName = String(user?.displayName || "Member").trim() || "Member";
    const photoURL = user?.photoURL || null;
    vendor = {
      id: userId,
      userId,
      companyName: displayName,
      displayName,
      logo: photoURL,
      photoURL,
      coverImage: "",
      description: "",
      location: "",
      rating: 0,
      reviewCount: 0,
      followersCount: 0,
      verified: false,
      contactEmail: user?.email || "",
      createdAt: new Date().toISOString(),
    };
    await database.collection("vendors").insertOne(vendor);
  }
  const fields = listingFieldsFromBody({ ...req.body, title }, images);
  const listing = {
    id: makeId("listing"),
    vendorId: vendor.id,
    ...fields,
    featured: false,
    createdAt: new Date().toISOString(),
  };
  await database.collection("listings").insertOne(listing);
  res.status(201).json(serialize(listing));
}));

router.post("/listings/:id", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const title = String(req.body.title || "").trim();
  if (!title) {
    res.status(400).json({ error: "A listing title is required" });
    return;
  }
  const images = normalizeListingImages(req.body.images);
  const database = getDb();
  await requireVerifiedPhone(database, userId);
  const { listing } = await findOwnedListing(database, req.params.id, userId);
  const updates = {
    ...listingFieldsFromBody({ ...req.body, title }, images),
    updatedAt: new Date().toISOString(),
  };
  await database.collection("listings").updateOne({ id: listing.id }, { $set: updates });
  const saved = await database.collection("listings").findOne({ id: listing.id });
  res.json(serialize(saved));
}));

router.post("/listings/:id/status", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const status = String(req.body.status || "").toUpperCase() === "SOLD" ? "SOLD" : "ACTIVE";
  const database = getDb();
  await requireVerifiedPhone(database, userId);
  const { listing } = await findOwnedListing(database, req.params.id, userId);
  await database.collection("listings").updateOne(
    { id: listing.id },
    { $set: { status, updatedAt: new Date().toISOString() } }
  );
  const saved = await database.collection("listings").findOne({ id: listing.id });
  res.json(serialize(saved));
}));

router.post("/groups/:id/join", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const groupId = req.params.id;
  const database = getDb();
  const memberships = database.collection("memberships");
  const existing = await memberships.findOne({ userId, groupId });
  let joined = false;
  if (existing) {
    await memberships.deleteOne({ _id: existing._id });
  } else {
    await memberships.insertOne({
      id: makeId("member"),
      userId,
      groupId,
      createdAt: new Date().toISOString(),
    });
    joined = true;
  }
  res.json({ joined });
}));

router.post("/discussions/:id/join", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const discussionId = req.params.id;
  const database = getDb();
  const joins = database.collection("debateJoins");
  const existing = await joins.findOne({ userId, discussionId });
  let joined = false;
  if (existing) {
    await joins.deleteOne({ _id: existing._id });
  } else {
    await joins.insertOne({
      id: makeId("debate"),
      userId,
      discussionId,
      createdAt: new Date().toISOString(),
    });
    joined = true;
  }
  const replies = await bumpCount(database, "discussions", { id: discussionId }, "replies", joined ? 1 : -1);
  res.json({ joined, replies });
}));

router.post("/invites", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email.includes("@")) {
    res.status(400).json({ error: "Enter a valid email address" });
    return;
  }
  const database = getDb();
  const invite = {
    id: makeId("invite"),
    userId,
    email,
    createdAt: new Date().toISOString(),
  };
  await database.collection("invites").insertOne(invite);
  res.status(201).json(serialize(invite));
}));

router.post("/events/:id/rsvp", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const eventId = req.params.id;
  const database = getDb();
  const rsvps = database.collection("eventRsvps");
  const existing = await rsvps.findOne({ userId, eventId });
  let going = false;
  if (existing) {
    await rsvps.deleteOne({ _id: existing._id });
  } else {
    await rsvps.insertOne({
      id: makeId("rsvp"),
      userId,
      eventId,
      createdAt: new Date().toISOString(),
    });
    going = true;
  }
  res.json({ going });
}));

router.post("/shorts", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const title = String(req.body.title || "").trim();
  const video = String(req.body.video || "").trim();
  if (!title) {
    res.status(400).json({ error: "Add a title for your short" });
    return;
  }
  if (!video) {
    res.status(400).json({ error: "Upload a video for your short" });
    return;
  }
  if (video.length > 14 * 1024 * 1024) {
    res.status(400).json({ error: "Keep the video under about 8MB" });
    return;
  }

  const database = getDb();
  const vendor = await database.collection("vendors").findOne({ userId });
  const user = await database.collection("users").findOne({ uid: userId });
  const dealerName = String(
    req.body.dealerName
      || vendor?.companyName
      || user?.displayName
      || req.body.authorName
      || "Member"
  ).trim();
  const avatar = String(
    req.body.avatar
      || req.body.dealerAvatar
      || vendor?.logo
      || user?.photoURL
      || ""
  ).trim();
  const thumbnail = String(req.body.thumbnail || "").trim();
  const last = await database.collection("shorts").find().sort({ order: -1 }).limit(1).toArray();
  const order = Number(last[0]?.order) > 0 ? Number(last[0].order) + 1 : 1;

  const short = {
    id: makeId("short"),
    userId,
    order,
    title,
    video,
    thumbnail,
    dealerName,
    avatar,
    dealerAvatar: avatar,
    createdAt: new Date().toISOString(),
  };
  await database.collection("shorts").insertOne(short);
  res.status(201).json(serialize(short));
}));

router.post("/shorts/:id/view", asyncRoute(async (req, res) => {
  const database = getDb();
  const view = {
    id: makeId("view"),
    shortId: req.params.id,
    userId: String(req.body.userId || "guest"),
    createdAt: new Date().toISOString(),
  };
  await database.collection("shortViews").insertOne(view);
  res.status(201).json({ id: view.id });
}));

router.post("/articles/read", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const articleKey = String(req.body.articleKey || "news").trim();
  const database = getDb();
  const reads = database.collection("articleReads");
  const existing = await reads.findOne({ userId, articleKey });
  let saved = false;
  if (existing) {
    await reads.deleteOne({ _id: existing._id });
  } else {
    await reads.insertOne({
      id: makeId("read"),
      userId,
      articleKey,
      createdAt: new Date().toISOString(),
    });
    saved = true;
  }
  res.json({ saved });
}));

router.get("/notifications", asyncRoute(async (req, res) => {
  const userId = String(req.query.userId || "").trim();
  if (!userId) {
    res.json([]);
    return;
  }
  const database = getDb();
  const notes = await database.collection("notifications")
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();
  res.json(notes.map(serialize));
}));

router.post("/notifications/read", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const database = getDb();
  const filter = { userId };
  if (req.body.id) filter.id = req.body.id;
  const result = await database.collection("notifications").updateMany(filter, { $set: { read: true } });
  res.json({ updated: result.modifiedCount });
}));

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_COVER_BYTES = 4 * 1024 * 1024;
const IMAGE_DATA_URL = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i;

function dataUrlByteLength(value) {
  const comma = value.indexOf(",");
  if (comma === -1) return Number.POSITIVE_INFINITY;
  const payload = value.slice(comma + 1).replace(/\s/g, "");
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

function normalizeImageDataUrl(value, { maxBytes, label }) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const image = String(value).trim();
  if (!image) return null;
  if (!IMAGE_DATA_URL.test(image)) {
    const error = new Error(`Upload a JPG, PNG, GIF, or WebP ${label}.`);
    error.status = 400;
    throw error;
  }
  if (dataUrlByteLength(image) > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    const error = new Error(`${label} must be ${mb}MB or smaller.`);
    error.status = 400;
    throw error;
  }
  return image;
}

function normalizePhotoURL(value, existing) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const photoURL = String(value).trim();
  if (!photoURL) return null;

  if (photoURL === "google" || photoURL === "__google__") {
    const googlePhoto = existing?.googlePhotoURL || (
      typeof existing?.photoURL === "string" && existing.photoURL.includes("googleusercontent.com")
        ? existing.photoURL
        : null
    );
    if (!googlePhoto) {
      const error = new Error("No Google profile photo is available for this account.");
      error.status = 400;
      throw error;
    }
    return googlePhoto;
  }

  if (IMAGE_DATA_URL.test(photoURL)) {
    return normalizeImageDataUrl(photoURL, { maxBytes: MAX_AVATAR_BYTES, label: "Avatar" });
  }

  if (/^https?:\/\//i.test(photoURL) && photoURL.includes("googleusercontent.com")) {
    return photoURL;
  }

  const error = new Error("Choose a Google photo or upload a JPG, PNG, GIF, or WebP image.");
  error.status = 400;
  throw error;
}

function normalizeCoverImage(value) {
  return normalizeImageDataUrl(value, { maxBytes: MAX_COVER_BYTES, label: "Cover photo" });
}

function normalizeTextField(value, { max = 500 } = {}) {
  if (value === undefined) return undefined;
  if (value === null) return "";
  return String(value).trim().slice(0, max);
}

async function ensureVendorMirror(database, userId, user, vendorMirror) {
  if (!Object.keys(vendorMirror).length) return;
  vendorMirror.updatedAt = new Date().toISOString();
  const result = await database.collection("vendors").updateMany(
    { $or: [{ userId }, { id: userId }] },
    { $set: vendorMirror }
  );
  if (result.matchedCount > 0) return;

  const displayName = String(user?.displayName || "Member").trim() || "Member";
  const photoURL = user?.photoURL || null;
  const vendor = {
    id: userId,
    userId,
    companyName: displayName,
    displayName,
    logo: photoURL,
    photoURL,
    coverImage: "",
    description: "",
    location: "",
    website: "",
    rating: Number(user?.rating || 0),
    reviewCount: Number(user?.reviewCount || 0),
    followersCount: Number(user?.followersCount || 0),
    verified: false,
    contactEmail: user?.email || "",
    createdAt: new Date().toISOString(),
    ...vendorMirror,
  };
  try {
    await database.collection("vendors").insertOne(vendor);
  } catch (error) {
    await database.collection("vendors").updateMany(
      { $or: [{ userId }, { id: userId }] },
      { $set: vendorMirror }
    );
  }
}

router.post("/users/profile", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const database = getDb();
  const existing = await database.collection("users").findOne({ uid: userId });
  const updates = { updatedAt: new Date().toISOString() };
  if (req.body.phone !== undefined) {
    res.status(400).json({ error: "Use Add phone number to save a mobile number." });
    return;
  }
  if (req.body.displayName) updates.displayName = String(req.body.displayName).trim();
  if (req.body.twoFactor !== undefined) updates.twoFactor = Boolean(req.body.twoFactor);
  if (req.body.email) updates.email = String(req.body.email).trim();
  if (req.body.photoURL !== undefined) {
    updates.photoURL = normalizePhotoURL(req.body.photoURL, existing);
  }
  if (req.body.coverImage !== undefined) {
    updates.coverImage = normalizeCoverImage(req.body.coverImage);
  }
  if (req.body.description !== undefined || req.body.bio !== undefined) {
    const description = normalizeTextField(req.body.description ?? req.body.bio, { max: 1000 });
    updates.description = description;
    updates.bio = description;
  }
  if (req.body.location !== undefined) {
    updates.location = normalizeTextField(req.body.location, { max: 120 });
  }
  if (req.body.website !== undefined) {
    const website = normalizeTextField(req.body.website, { max: 200 });
    updates.website = website && !/^https?:\/\//i.test(website) ? `https://${website}` : website;
  }
  await database.collection("users").updateOne(
    { uid: userId },
    {
      $set: updates,
      $setOnInsert: {
        uid: userId,
        role: "USER",
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
  const vendorMirror = {};
  if (updates.displayName) {
    vendorMirror.displayName = updates.displayName;
    vendorMirror.companyName = updates.displayName;
  }
  if (updates.photoURL !== undefined) {
    vendorMirror.photoURL = updates.photoURL;
    vendorMirror.logo = updates.photoURL;
  }
  if (updates.coverImage !== undefined) vendorMirror.coverImage = updates.coverImage;
  if (updates.description !== undefined) vendorMirror.description = updates.description;
  if (updates.location !== undefined) vendorMirror.location = updates.location;
  if (updates.website !== undefined) vendorMirror.website = updates.website;
  const user = await database.collection("users").findOne({ uid: userId });
  await ensureVendorMirror(database, userId, user, vendorMirror);
  res.json(serialize(user));
}));

router.post("/users/vendor", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const database = getDb();
  const vendorUpdate = {
    role: "VENDOR",
    vendorStatus: "PENDING",
    updatedAt: new Date().toISOString(),
  };
  if (req.body.displayName) vendorUpdate.displayName = req.body.displayName;
  if (req.body.email) vendorUpdate.email = req.body.email;
  if (req.body.photoURL) vendorUpdate.photoURL = req.body.photoURL;
  await database.collection("users").updateOne(
    { uid: userId },
    {
      $set: vendorUpdate,
      $setOnInsert: {
        uid: userId,
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
  await notify(database, {
    userId,
    type: "vendor",
    message: "Your vendor application was submitted and is pending review",
    href: "/profile",
  });
  const user = await database.collection("users").findOne({ uid: userId });
  res.json(serialize(user));
}));

router.post("/exports", asyncRoute(async (req, res) => {
  const database = getDb();
  const record = {
    id: makeId("export"),
    userId: String(req.body.userId || "guest"),
    kind: req.body.kind || "admin",
    report: req.body.report || {},
    createdAt: new Date().toISOString(),
  };
  await database.collection("exports").insertOne(record);
  res.status(201).json(serialize(record));
}));

router.post("/conversations", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const otherUserId = String(req.body.otherUserId || "").trim();
  if (!otherUserId) {
    res.status(400).json({ error: "Choose someone to message" });
    return;
  }
  if (otherUserId === userId) {
    res.status(400).json({ error: "You cannot message yourself" });
    return;
  }
  const database = getDb();
  const existing = await database.collection("conversations").findOne({
    participants: { $all: [userId, otherUserId] },
  });
  if (existing) {
    res.json(serialize(existing));
    return;
  }
  const conversation = {
    id: makeId("conv"),
    participants: [userId, otherUserId],
    participantNames: {
      [userId]: String(req.body.userName || "You"),
      [otherUserId]: String(req.body.otherUserName || "Seller"),
    },
    participantAvatars: {
      [userId]: String(req.body.userAvatar || ""),
      [otherUserId]: String(req.body.otherUserAvatar || ""),
    },
    peerId: otherUserId,
    listingId: req.body.listingId ? String(req.body.listingId) : null,
    listingTitle: req.body.listingTitle ? String(req.body.listingTitle) : null,
    lastMessage: "",
    lastSenderId: null,
    lastUpdatedAt: new Date().toISOString(),
    unreadCount: { [userId]: 0, [otherUserId]: 0 },
  };
  await database.collection("conversations").insertOne(conversation);
  res.status(201).json(serialize(conversation));
}));

router.post("/conversations/:id/messages", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const text = String(req.body.text || "").trim();
  if (!text) {
    res.status(400).json({ error: "Message is empty" });
    return;
  }
  const database = getDb();
  const conversation = await database.collection("conversations").findOne({ id: req.params.id });
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const createdAt = new Date().toISOString();
  const message = {
    id: makeId("msg"),
    conversationId: conversation.id,
    senderId: userId,
    senderName: String(req.body.senderName || conversation.participantNames?.[userId] || "You"),
    text,
    createdAt,
    readBy: [userId],
  };
  await database.collection("messages").insertOne(message);
  const participants = Array.isArray(conversation.participants) ? [...conversation.participants] : [];
  if (!participants.includes(userId)) participants.push(userId);
  const unreadCount = { ...(conversation.unreadCount || {}) };
  unreadCount[userId] = 0;
  for (const participantId of participants) {
    if (participantId !== userId) unreadCount[participantId] = (Number(unreadCount[participantId]) || 0) + 1;
  }
  const names = { ...(conversation.participantNames || {}) };
  if (!names[userId] && req.body.senderName) names[userId] = String(req.body.senderName);
  await database.collection("conversations").updateOne(
    { id: conversation.id },
    {
      $set: {
        participants,
        participantNames: names,
        lastMessage: text,
        lastSenderId: userId,
        lastUpdatedAt: createdAt,
        unreadCount,
      },
    }
  );
  res.status(201).json(serialize(message));
}));

router.post("/conversations/:id/read", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const database = getDb();
  const conversation = await database.collection("conversations").findOne({ id: req.params.id });
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  await database.collection("conversations").updateOne(
    { id: conversation.id },
    { $set: { [`unreadCount.${userId}`]: 0 } }
  );
  res.json({ ok: true });
}));

router.post("/reports", asyncRoute(async (req, res) => {
  const userId = requireUserId(req.body);
  const database = getDb();
  const report = {
    id: makeId("report"),
    userId,
    targetType: req.body.targetType || "conversation",
    targetId: String(req.body.targetId || ""),
    reason: String(req.body.reason || "Reported from chat"),
    createdAt: new Date().toISOString(),
  };
  await database.collection("reports").insertOne(report);
  res.status(201).json(serialize(report));
}));

module.exports = { actionsRouter: router };
