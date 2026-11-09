const express = require("express");
const { getDb } = require("./db");
const { seedCatalog, serialize } = require("./catalog");
const { publishedFilter } = require("./admin");
const { getPublicBaseUrl } = require("./publicUrl");

const router = express.Router();

function asyncRoute(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error(error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    });
  };
}

async function vendorsById(database, ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  const vendors = await database.collection("vendors").find({ id: { $in: uniqueIds } }).toArray();
  return new Map(vendors.map((vendor) => [vendor.id, serialize(vendor)]));
}

async function usersByUid(database, uids) {
  const uniqueIds = [...new Set(uids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  const users = await database.collection("users").find({ uid: { $in: uniqueIds } }).toArray();
  return new Map(users.map((user) => [user.uid, serialize(user)]));
}

function sellerProfile(vendor, user, fallbackId, extras = {}) {
  const displayName = String(user?.displayName || vendor?.displayName || vendor?.companyName || "").trim();
  const photoURL = user?.photoURL || vendor?.photoURL || vendor?.logo || null;
  const rating = extras.rating != null
    ? Number(extras.rating)
    : Number(vendor?.rating ?? user?.rating ?? 0);
  const reviewCount = extras.reviewCount != null
    ? Number(extras.reviewCount)
    : Number(vendor?.reviewCount ?? user?.reviewCount ?? 0);
  const followersCount = Number(
    vendor?.followersCount ?? user?.followersCount ?? extras.followersCount ?? 0
  );
  if (vendor) {
    return {
      ...vendor,
      companyName: vendor.companyName || displayName,
      logo: vendor.logo || photoURL,
      displayName,
      photoURL,
      coverImage: vendor.coverImage || user?.coverImage || "",
      description: vendor.description || user?.bio || user?.description || "",
      location: vendor.location || user?.location || "",
      website: vendor.website || user?.website || "",
      contactEmail: vendor.contactEmail || user?.email || "",
      phone: vendor.phone || user?.phone || "",
      rating,
      reviewCount,
      followersCount,
      listingCount: extras.listingCount,
    };
  }
  if (!user && !displayName && !photoURL) return null;
  return {
    id: fallbackId || user?.uid || "",
    userId: user?.uid || fallbackId || "",
    companyName: displayName || "Member",
    logo: photoURL,
    displayName: displayName || "Member",
    photoURL,
    location: user?.location || "",
    description: user?.bio || user?.description || "",
    coverImage: user?.coverImage || "",
    website: user?.website || "",
    contactEmail: user?.email || "",
    phone: user?.phone || "",
    verified: false,
    rating,
    reviewCount,
    followersCount,
    listingCount: extras.listingCount,
  };
}

async function ratingByTargetIds(database, targetIds) {
  const uniqueIds = [...new Set(targetIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  const rows = await database.collection("reviews").aggregate([
    { $match: { targetId: { $in: uniqueIds } } },
    {
      $group: {
        _id: "$targetId",
        reviewCount: { $sum: 1 },
        total: { $sum: "$rating" },
      },
    },
  ]).toArray();
  return new Map(rows.map((row) => {
    const reviewCount = Number(row.reviewCount || 0);
    const rating = reviewCount
      ? Math.round((Number(row.total || 0) / reviewCount) * 10) / 10
      : 0;
    return [row._id, { rating, reviewCount }];
  }));
}

async function ensureVendorForSeller(database, sellerId, user) {
  if (!sellerId) return null;
  const existing = await database.collection("vendors").findOne({
    $or: [{ id: sellerId }, { userId: sellerId }],
  });
  if (existing) return serialize(existing);

  const displayName = String(user?.displayName || "Member").trim() || "Member";
  const photoURL = user?.photoURL || null;
  const vendor = {
    id: sellerId,
    userId: sellerId,
    companyName: displayName,
    displayName,
    logo: photoURL,
    photoURL,
    coverImage: "",
    description: "",
    location: "",
    rating: Number(user?.rating || 0),
    reviewCount: Number(user?.reviewCount || 0),
    followersCount: Number(user?.followersCount || 0),
    verified: false,
    contactEmail: user?.email || "",
    createdAt: new Date().toISOString(),
  };
  try {
    await database.collection("vendors").insertOne(vendor);
  } catch (error) {
    const raced = await database.collection("vendors").findOne({
      $or: [{ id: sellerId }, { userId: sellerId }],
    });
    if (raced) return serialize(raced);
    throw error;
  }
  return serialize(vendor);
}

async function trendingCategoriesFromListings(database, { limit = 8 } = {}) {
  const rows = await database.collection("listings").aggregate([
    {
      $project: {
        name: {
          $trim: {
            input: {
              $ifNull: [
                "$gemType",
                { $ifNull: ["$variety", { $ifNull: ["$type", ""] }] },
              ],
            },
          },
        },
      },
    },
    { $match: { name: { $ne: "" } } },
    {
      $group: {
        _id: { $toLower: "$name" },
        name: { $first: "$name" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1, name: 1 } },
    { $limit: limit },
  ]).toArray();

  return rows.map((row, index) => {
    const count = Number(row.count || 0);
    return {
      id: `category-${String(row._id || row.name).replace(/\s+/g, "-")}`,
      name: row.name,
      badge: String(count),
      count,
      order: index + 1,
    };
  });
}

async function sellersFromListings(database, { limit } = {}) {
  const listingCounts = await database.collection("listings").aggregate([
    { $group: { _id: "$vendorId", listingCount: { $sum: 1 } } },
  ]).toArray();
  const sellerIds = listingCounts.map((row) => row._id).filter(Boolean);
  if (sellerIds.length === 0) return [];

  const countById = new Map(listingCounts.map((row) => [row._id, row.listingCount]));
  let vendors = await database.collection("vendors").find({
    $or: [{ id: { $in: sellerIds } }, { userId: { $in: sellerIds } }],
  }).toArray();

  const vendorBySellerId = new Map();
  for (const vendor of vendors) {
    const serialized = serialize(vendor);
    if (vendor.id) vendorBySellerId.set(vendor.id, serialized);
    if (vendor.userId) vendorBySellerId.set(vendor.userId, serialized);
  }

  const missingSellerIds = sellerIds.filter((id) => !vendorBySellerId.has(id));
  if (missingSellerIds.length > 0) {
    const missingUsers = await usersByUid(database, missingSellerIds);
    for (const sellerId of missingSellerIds) {
      const created = await ensureVendorForSeller(
        database,
        sellerId,
        missingUsers.get(sellerId) || null
      );
      if (created) {
        vendorBySellerId.set(created.id, created);
        if (created.userId) vendorBySellerId.set(created.userId, created);
        vendors.push(created);
      }
    }
  }

  const userIds = sellerIds.map((id) => vendorBySellerId.get(id)?.userId || id);
  const [userLookup, reviewLookup] = await Promise.all([
    usersByUid(database, userIds),
    ratingByTargetIds(database, [
      ...sellerIds,
      ...vendors.map((vendor) => vendor.id),
      ...vendors.map((vendor) => vendor.userId),
    ]),
  ]);

  const seen = new Set();
  const profiles = [];
  for (const sellerId of sellerIds) {
    const vendor = vendorBySellerId.get(sellerId) || null;
    const dedupeKey = vendor?.id || vendor?.userId || sellerId;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const relatedIds = [...new Set([sellerId, vendor?.id, vendor?.userId].filter(Boolean))];
    const listingCount = relatedIds.reduce(
      (sum, id) => sum + (countById.get(id) || 0),
      0
    );
    const user = userLookup.get(vendor?.userId || sellerId) || null;
    const reviewStats = relatedIds.map((id) => reviewLookup.get(id)).find(Boolean) || null;
    const profile = sellerProfile(vendor, user, sellerId, {
      listingCount,
      rating: reviewStats?.rating,
      reviewCount: reviewStats?.reviewCount,
    });
    if (profile) profiles.push(profile);
  }

  profiles.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  return typeof limit === "number" ? profiles.slice(0, limit) : profiles;
}

async function resolveSeller(database, id) {
  const vendor = await database.collection("vendors").findOne({
    $or: [{ id }, { userId: id }],
  });
  const listingVendorIds = [...new Set([id, vendor?.id, vendor?.userId].filter(Boolean))];
  const listings = await database.collection("listings").find({
    vendorId: { $in: listingVendorIds },
  }).sort({ createdAt: -1 }).toArray();

  const userId = vendor?.userId || id;
  const user = userId
    ? await database.collection("users").findOne({ uid: userId })
    : null;

  if (!vendor && listings.length === 0 && !user) {
    return null;
  }

  const reviewLookup = await ratingByTargetIds(database, listingVendorIds);
  const reviewStats = listingVendorIds.map((key) => reviewLookup.get(key)).find(Boolean) || null;

  const profile = sellerProfile(serialize(vendor), serialize(user), vendor?.id || id, {
    listingCount: listings.length,
    rating: reviewStats?.rating,
    reviewCount: reviewStats?.reviewCount,
  });
  if (!profile) return null;
  return { vendor: profile, listings };
}

async function withVendors(database, listings) {
  const vendorLookup = await vendorsById(database, listings.map((listing) => listing.vendorId));
  const userIds = listings.map((listing) => {
    const vendor = vendorLookup.get(listing.vendorId);
    return vendor?.userId || listing.vendorId;
  });
  const userLookup = await usersByUid(database, userIds);
  return listings.map((listing) => {
    const vendor = vendorLookup.get(listing.vendorId) || null;
    const user = userLookup.get(vendor?.userId || listing.vendorId) || null;
    return {
      ...serialize(listing),
      vendor: sellerProfile(vendor, user, listing.vendorId),
    };
  });
}

async function vendorWithSeller(database, listing) {
  if (!listing?.vendorId) return null;
  const vendor = await database.collection("vendors").findOne({ id: listing.vendorId });
  const userId = vendor?.userId || listing.vendorId;
  const user = userId
    ? await database.collection("users").findOne({ uid: userId })
    : null;
  return sellerProfile(serialize(vendor), serialize(user), listing.vendorId);
}

router.get("/users", asyncRoute(async (req, res) => {
  const database = getDb();
  const users = await database.collection("users").find({}).sort({ createdAt: 1 }).toArray();
  res.json(users.map(serialize));
}));

router.get("/vendors", asyncRoute(async (req, res) => {
  const database = getDb();
  res.json(await sellersFromListings(database));
}));

router.get("/vendors/leaderboard", asyncRoute(async (req, res) => {
  const database = getDb();
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  const listingStats = await database.collection("listings").aggregate([
    {
      $group: {
        _id: "$vendorId",
        gemCount: { $sum: 1 },
        activeCount: {
          $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] },
        },
        soldCount: {
          $sum: { $cond: [{ $eq: ["$status", "SOLD"] }, 1, 0] },
        },
        listedValue: {
          $sum: {
            $cond: [
              { $eq: ["$status", "ACTIVE"] },
              { $ifNull: ["$price", 0] },
              0,
            ],
          },
        },
        soldAmount: {
          $sum: {
            $cond: [
              { $eq: ["$status", "SOLD"] },
              { $ifNull: ["$price", 0] },
              0,
            ],
          },
        },
        gemAmount: {
          $sum: {
            $convert: {
              input: { $ifNull: ["$caratWeight", { $ifNull: ["$weight", 0] }] },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
    },
  ]).toArray();

  if (listingStats.length === 0) {
    res.json({ dealers: [], ranking: ["rating", "gemCount", "gemAmount", "soldAmount", "listedValue"] });
    return;
  }

  const sellerIds = listingStats.map((row) => row._id).filter(Boolean);
  const countById = new Map(listingStats.map((row) => [row._id, row]));

  let vendors = await database.collection("vendors").find({
    $or: [{ id: { $in: sellerIds } }, { userId: { $in: sellerIds } }],
  }).toArray();

  const vendorBySellerId = new Map();
  for (const vendor of vendors) {
    const serialized = serialize(vendor);
    if (vendor.id) vendorBySellerId.set(vendor.id, serialized);
    if (vendor.userId) vendorBySellerId.set(vendor.userId, serialized);
  }

  const missingSellerIds = sellerIds.filter((id) => !vendorBySellerId.has(id));
  if (missingSellerIds.length > 0) {
    const missingUsers = await usersByUid(database, missingSellerIds);
    for (const sellerId of missingSellerIds) {
      const created = await ensureVendorForSeller(
        database,
        sellerId,
        missingUsers.get(sellerId) || null
      );
      if (created) {
        vendorBySellerId.set(created.id, created);
        if (created.userId) vendorBySellerId.set(created.userId, created);
        vendors.push(created);
      }
    }
  }

  const userIds = sellerIds.map((id) => vendorBySellerId.get(id)?.userId || id);
  const [userLookup, reviewLookup] = await Promise.all([
    usersByUid(database, userIds),
    ratingByTargetIds(database, [
      ...sellerIds,
      ...vendors.map((vendor) => vendor.id),
      ...vendors.map((vendor) => vendor.userId),
    ]),
  ]);

  const mergeStats = (relatedIds) => {
    const merged = {
      gemCount: 0,
      activeCount: 0,
      soldCount: 0,
      listedValue: 0,
      soldAmount: 0,
      gemAmount: 0,
    };
    for (const id of relatedIds) {
      const row = countById.get(id);
      if (!row) continue;
      merged.gemCount += Number(row.gemCount || 0);
      merged.activeCount += Number(row.activeCount || 0);
      merged.soldCount += Number(row.soldCount || 0);
      merged.listedValue += Number(row.listedValue || 0);
      merged.soldAmount += Number(row.soldAmount || 0);
      merged.gemAmount += Number(row.gemAmount || 0);
    }
    return merged;
  };

  const seen = new Set();
  const dealers = [];
  for (const sellerId of sellerIds) {
    const vendor = vendorBySellerId.get(sellerId) || null;
    const dedupeKey = vendor?.id || vendor?.userId || sellerId;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const relatedIds = [...new Set([sellerId, vendor?.id, vendor?.userId].filter(Boolean))];
    const stats = mergeStats(relatedIds);
    const user = userLookup.get(vendor?.userId || sellerId) || null;
    const reviewStats = relatedIds.map((id) => reviewLookup.get(id)).find(Boolean) || null;
    const profile = sellerProfile(vendor, user, sellerId, {
      listingCount: stats.gemCount,
      rating: reviewStats?.rating,
      reviewCount: reviewStats?.reviewCount,
    });
    if (!profile) continue;

    const rating = Number(profile.rating || 0);
    const reviewCount = Number(profile.reviewCount || 0);
    const ratingWeight = Math.min(1, reviewCount / 5);
    const score =
      rating * 18 * (0.4 + 0.6 * ratingWeight) +
      Math.min(stats.gemCount, 40) * 1.2 +
      Math.log10(stats.gemAmount + 1) * 8 +
      Math.log10(stats.soldAmount + 1) * 14 +
      Math.min(stats.soldCount, 30) * 1.5 +
      Math.log10(stats.listedValue + 1) * 10;

    dealers.push({
      ...profile,
      gemCount: stats.gemCount,
      activeCount: stats.activeCount,
      soldCount: stats.soldCount,
      gemAmount: Math.round(stats.gemAmount * 100) / 100,
      listedValue: Math.round(stats.listedValue),
      soldAmount: Math.round(stats.soldAmount),
      score: Math.round(score * 10) / 10,
    });
  }

  dealers.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.rating !== a.rating) return Number(b.rating || 0) - Number(a.rating || 0);
    return Number(b.soldAmount || 0) - Number(a.soldAmount || 0);
  });

  res.json({
    dealers: dealers.slice(0, limit).map((dealer, index) => ({
      ...dealer,
      rank: index + 1,
    })),
    ranking: ["rating", "gemCount", "gemAmount", "soldAmount", "listedValue"],
  });
}));

router.get("/vendors/:id", asyncRoute(async (req, res) => {
  const database = getDb();
  const resolved = await resolveSeller(database, req.params.id);
  if (!resolved) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json({
    vendor: resolved.vendor,
    listings: resolved.listings.map(serialize),
  });
}));

router.get("/listings", asyncRoute(async (req, res) => {
  const database = getDb();
  const filter = {};
  if (req.query.vendorId) filter.vendorId = req.query.vendorId;
  if (req.query.status) filter.status = req.query.status;
  const listings = await database.collection("listings").find(filter).sort({ createdAt: -1 }).toArray();
  res.json(await withVendors(database, listings));
}));

router.get("/listings/:id", asyncRoute(async (req, res) => {
  const database = getDb();
  const listing = await database.collection("listings").findOne({ id: req.params.id });
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json({
    listing: serialize(listing),
    vendor: await vendorWithSeller(database, listing),
  });
}));

router.get("/posts", asyncRoute(async (req, res) => {
  const database = getDb();
  const posts = await database.collection("posts").find(publishedFilter()).sort({ createdAt: -1 }).toArray();
  res.json(posts.map(serialize));
}));

router.get("/feed", asyncRoute(async (req, res) => {
  const database = getDb();
  const [posts, listings, vendors, shorts, categories, events, featured, news] = await Promise.all([
    database.collection("posts").find(publishedFilter()).sort({ createdAt: -1 }).limit(8).toArray(),
    database.collection("listings").find({}).sort({ createdAt: -1 }).toArray(),
    sellersFromListings(database, { limit: 5 }),
    database.collection("shorts").find({}).sort({ createdAt: -1, order: 1 }).toArray(),
    trendingCategoriesFromListings(database, { limit: 8 }),
    database.collection("events").find({}).sort({ order: 1 }).toArray(),
    database.collection("content").findOne({ key: "featured" }),
    database.collection("content").findOne({ key: "news" }),
  ]);

  res.json({
    posts: posts.map(serialize),
    listings: await withVendors(database, listings),
    vendors,
    shorts: shorts.map(serialize),
    categories,
    events: events.map(serialize),
    featured: serialize(featured),
    news: serialize(news),
  });
}));

router.get("/community", asyncRoute(async (req, res) => {
  const database = getDb();
  const [groups, discussions] = await Promise.all([
    database.collection("groups").find({}).sort({ order: 1 }).toArray(),
    database.collection("discussions").find({}).sort({ order: 1 }).toArray(),
  ]);
  res.json({
    groups: groups.map(serialize),
    discussions: discussions.map(serialize),
  });
}));

function dayLabel(date) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

router.get("/dashboard/vendor", asyncRoute(async (req, res) => {
  const database = getDb();
  const sellerId = String(req.query.userId || "").trim();
  if (!sellerId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const user = await database.collection("users").findOne({ uid: sellerId });
  const vendorDoc = await database.collection("vendors").findOne({
    $or: [{ id: sellerId }, { userId: sellerId }],
  });
  const vendor = serialize(vendorDoc);

  const listingVendorIds = [...new Set([sellerId, vendor?.id, vendor?.userId].filter(Boolean))];
  const listings = await database.collection("listings").find({
    vendorId: { $in: listingVendorIds },
  }).sort({ createdAt: -1 }).toArray();

  if (!vendor && !user && listings.length === 0) {
    res.status(404).json({ error: "Vendor dashboard not found" });
    return;
  }

  const activeListings = listings.filter((listing) => listing.status === "ACTIVE");
  const soldListings = listings.filter((listing) => listing.status === "SOLD");
  const revenueTotal = soldListings.reduce((sum, listing) => sum + Number(listing.price || 0), 0);

  const inquiryIds = [...new Set([sellerId, vendor?.id, vendor?.userId].filter(Boolean))];
  const inquiries = await database.collection("conversations").countDocuments({
    participants: { $in: inquiryIds },
  });

  const today = startOfDay(new Date());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const revenueByDay = new Map();
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + offset);
    revenueByDay.set(day.toISOString().slice(0, 10), {
      day: dayLabel(day),
      value: 0,
      date: day.toISOString().slice(0, 10),
    });
  }
  for (const listing of soldListings) {
    const soldAt = new Date(listing.soldAt || listing.updatedAt || listing.createdAt || 0);
    if (Number.isNaN(soldAt.getTime()) || soldAt < weekStart) continue;
    const key = startOfDay(soldAt).toISOString().slice(0, 10);
    const bucket = revenueByDay.get(key);
    if (bucket) bucket.value += Number(listing.price || 0);
  }

  const profile = sellerProfile(vendor, serialize(user), vendor?.id || sellerId, {
    listingCount: listings.length,
  });

  res.json({
    vendor: profile,
    listings: await withVendors(database, listings.slice(0, 12)),
    stats: [
      {
        key: "revenue",
        label: "Sold Revenue",
        value: revenueTotal,
        format: "currency",
        currency: soldListings[0]?.currency || "USD",
        trend: `${soldListings.length} sold`,
        color: "bg-primary/10 text-primary",
      },
      {
        key: "items",
        label: "Active Items",
        value: String(activeListings.length),
        trend: `${listings.length} total`,
        color: "bg-primary/5 text-primary",
      },
      {
        key: "views",
        label: "Followers",
        value: String(Number(profile?.followersCount || 0)),
        trend: `${Number(profile?.reviewCount || 0)} reviews`,
        color: "bg-amber-50 text-amber-600",
      },
      {
        key: "inquiries",
        label: "Inquiries",
        value: String(inquiries),
        trend: "messages",
        color: "bg-primary/5 text-primary",
      },
    ],
    revenue: [...revenueByDay.values()],
  });
}));

router.get("/dashboard/admin", asyncRoute(async (req, res) => {
  const database = getDb();
  const [
    users,
    vendors,
    activeListings,
    soldListings,
    pendingPosts,
    pendingVendors,
    reports,
    conversations,
    listingValue,
  ] = await Promise.all([
    database.collection("users").countDocuments(),
    database.collection("vendors").countDocuments(),
    database.collection("listings").countDocuments({ status: "ACTIVE" }),
    database.collection("listings").countDocuments({ status: "SOLD" }),
    database.collection("posts").countDocuments({ status: "pending" }),
    database.collection("users").countDocuments({ vendorStatus: "PENDING" }),
    database.collection("reports").countDocuments(),
    database.collection("conversations").countDocuments(),
    database.collection("listings").aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ["$price", 0] } } } },
    ]).toArray(),
  ]);
  const totalValue = Number(listingValue[0]?.total || 0);
  const seeded = await database.collection("dashboards").findOne({ key: "admin" });
  res.json({
    ...(serialize(seeded) || {}),
    stats: [
      { key: "users", label: "Total Users", value: String(users), trend: "+live" },
      { key: "listings", label: "Active Listings", value: String(activeListings), trend: `${soldListings} sold` },
      { key: "vendors", label: "Vendors", value: String(vendors), trend: `${pendingVendors} pending` },
      { key: "revenue", label: "Listing Value", value: `$${Math.round(totalValue).toLocaleString("en-US")}`, trend: "+live" },
    ],
    activity: [
      { label: "Pending Article Approvals", count: pendingPosts, color: "bg-amber-500", max: Math.max(pendingPosts, 10) },
      { label: "Pending Vendor Approvals", count: pendingVendors, color: "bg-amber-500", max: Math.max(pendingVendors, 10) },
      { label: "Reported Items", count: reports, color: "bg-red-500", max: Math.max(reports, 10) },
      { label: "Support Conversations", count: conversations, color: "bg-blue-500", max: Math.max(conversations, 10) },
    ],
  });
}));

router.get("/conversations", asyncRoute(async (req, res) => {
  const database = getDb();
  const filter = {};
  if (req.query.userId) filter.participants = String(req.query.userId);
  const conversations = await database.collection("conversations").find(filter).sort({ lastUpdatedAt: -1 }).toArray();
  res.json(conversations.map(serialize));
}));

router.get("/conversations/:id/messages", asyncRoute(async (req, res) => {
  const database = getDb();
  const conversation = await database.collection("conversations").findOne({ id: req.params.id });
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const messages = await database.collection("messages").find({ conversationId: conversation.id }).sort({ createdAt: 1 }).toArray();
  res.json(messages.map(serialize));
}));

router.get("/market/stats", asyncRoute(async (req, res) => {
  const database = getDb();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const since24h = new Date(now - dayMs).toISOString();
  const since14d = new Date(now - 14 * dayMs).toISOString();

  const [
    activeListings,
    verifiedDealers,
    vendors,
    volume24hRows,
    recentListings,
  ] = await Promise.all([
    database.collection("listings").countDocuments({ status: "ACTIVE" }),
    database.collection("vendors").countDocuments({ verified: true }),
    database.collection("vendors").countDocuments(),
    database.collection("listings").aggregate([
      {
        $match: {
          createdAt: { $gte: since24h },
          status: { $ne: "DRAFT" },
        },
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$price", 0] } } } },
    ]).toArray(),
    database.collection("listings").find(
      { createdAt: { $gte: since14d }, status: { $ne: "DRAFT" } },
      { projection: { createdAt: 1 } }
    ).toArray(),
  ]);

  const dayBuckets = Array.from({ length: 14 }, () => 0);
  for (const listing of recentListings) {
    const created = listing.createdAt ? new Date(listing.createdAt) : null;
    if (!created || Number.isNaN(created.getTime())) continue;
    const daysAgo = Math.floor((now - created.getTime()) / dayMs);
    if (daysAgo >= 0 && daysAgo < 14) {
      dayBuckets[13 - daysAgo] += 1;
    }
  }

  const thisWeek = dayBuckets.slice(7).reduce((sum, n) => sum + n, 0);
  const lastWeek = dayBuckets.slice(0, 7).reduce((sum, n) => sum + n, 0);
  let weekChangePct = 0;
  if (lastWeek > 0) {
    weekChangePct = ((thisWeek - lastWeek) / lastWeek) * 100;
  } else if (thisWeek > 0) {
    weekChangePct = 100;
  }

  const activity = dayBuckets.slice(8).map((count) => {
    const max = Math.max(...dayBuckets.slice(8), 1);
    return Math.max(12, Math.round((count / max) * 100));
  });

  const volume24h = Number(volume24hRows[0]?.total || 0);
  const formatVolume = (value) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M USD`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K USD`;
    return `$${Math.round(value).toLocaleString("en-US")} USD`;
  };

  res.json({
    activeListings,
    verifiedDealers: verifiedDealers || vendors,
    volume24h,
    volume24hLabel: formatVolume(volume24h),
    weekChangePct: Math.round(weekChangePct * 10) / 10,
    activity,
    platformOnline: true,
  });
}));

router.post("/seed", asyncRoute(async (req, res) => {
  const summary = await seedCatalog();
  res.json(summary);
}));

router.get("/sitemap.xml", asyncRoute(async (req, res) => {
  const database = getDb();
  const site = getPublicBaseUrl(req);
  const staticRoutes = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/marketplace", priority: "0.9", changefreq: "hourly" },
    { loc: "/vendors", priority: "0.8", changefreq: "daily" },
    { loc: "/community", priority: "0.7", changefreq: "daily" },
    { loc: "/news", priority: "0.7", changefreq: "daily" },
    { loc: "/events", priority: "0.6", changefreq: "weekly" },
    { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
  ];

  const [listings, vendors] = await Promise.all([
    database
      .collection("listings")
      .find({ status: { $ne: "DRAFT" } })
      .project({ id: 1, updatedAt: 1, createdAt: 1 })
      .toArray(),
    sellersFromListings(database),
  ]);

  const escapeXml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const toLastmod = (value) => {
    if (!value) return new Date().toISOString().slice(0, 10);
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
    return date.toISOString().slice(0, 10);
  };

  const urls = [
    ...staticRoutes.map((route) => ({
      loc: `${site}${route.loc === "/" ? "/" : route.loc}`,
      lastmod: toLastmod(),
      changefreq: route.changefreq,
      priority: route.priority,
    })),
    ...listings
      .filter((listing) => listing?.id)
      .map((listing) => ({
        loc: `${site}/listings/${listing.id}`,
        lastmod: toLastmod(listing.updatedAt || listing.createdAt),
        changefreq: "weekly",
        priority: "0.8",
      })),
    ...(Array.isArray(vendors) ? vendors : [])
      .filter((vendor) => vendor?.id)
      .map((vendor) => ({
        loc: `${site}/vendors/${vendor.id}`,
        lastmod: toLastmod(vendor.updatedAt || vendor.createdAt),
        changefreq: "weekly",
        priority: "0.7",
      })),
  ];

  const body = urls
    .map(
      (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
    )
    .join("\n");

  res
    .type("application/xml")
    .send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`);
}));

module.exports = router;
