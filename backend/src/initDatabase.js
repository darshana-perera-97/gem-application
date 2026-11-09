const { connectDb, closeDb, getDb } = require("./db");

const COLLECTIONS = [
  {
    name: "users",
    indexes: [
      { key: { uid: 1 }, options: { unique: true, sparse: true } },
      { key: { email: 1 }, options: { sparse: true } },
      { key: { role: 1 } },
    ],
  },
  {
    name: "emailOtps",
    indexes: [
      { key: { email: 1 } },
      { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
    ],
  },
  {
    name: "vendors",
    indexes: [
      { key: { userId: 1 } },
      { key: { location: 1 } },
      { key: { verified: 1 } },
    ],
  },
  {
    name: "listings",
    indexes: [
      { key: { vendorId: 1 } },
      { key: { status: 1, createdAt: -1 } },
      { key: { gemType: 1 } },
      { key: { createdAt: -1 } },
    ],
  },
  {
    name: "posts",
    indexes: [
      { key: { authorId: 1 } },
      { key: { createdAt: -1 } },
      { key: { status: 1, createdAt: -1 } },
      { key: { type: 1, status: 1 } },
    ],
  },
  {
    name: "reviews",
    indexes: [{ key: { targetId: 1, createdAt: -1 } }],
  },
  {
    name: "comments",
    indexes: [{ key: { postId: 1, createdAt: -1 } }],
  },
  {
    name: "conversations",
    indexes: [
      { key: { participants: 1 } },
      { key: { lastUpdatedAt: -1 } },
    ],
  },
  {
    name: "messages",
    indexes: [{ key: { conversationId: 1, createdAt: 1 } }],
  },
  {
    name: "shorts",
    indexes: [
      { key: { id: 1 }, options: { unique: true } },
      { key: { userId: 1, createdAt: -1 } },
      { key: { createdAt: -1, order: 1 } },
    ],
  },
  {
    name: "categories",
    indexes: [{ key: { order: 1 } }],
  },
  {
    name: "events",
    indexes: [{ key: { order: 1 } }],
  },
  {
    name: "groups",
    indexes: [{ key: { order: 1 } }],
  },
  {
    name: "discussions",
    indexes: [{ key: { order: 1 } }],
  },
  {
    name: "content",
    indexes: [{ key: { key: 1 }, options: { unique: true } }],
  },
  {
    name: "dashboards",
    indexes: [{ key: { key: 1 }, options: { unique: true } }],
  },
  {
    name: "likes",
    indexes: [{ key: { userId: 1, postId: 1 }, options: { unique: true } }],
  },
  {
    name: "follows",
    indexes: [{ key: { userId: 1, targetId: 1, targetType: 1 }, options: { unique: true } }],
  },
  {
    name: "saves",
    indexes: [{ key: { userId: 1, listingId: 1 }, options: { unique: true } }],
  },
  {
    name: "memberships",
    indexes: [{ key: { userId: 1, groupId: 1 }, options: { unique: true } }],
  },
  {
    name: "debateJoins",
    indexes: [{ key: { userId: 1, discussionId: 1 }, options: { unique: true } }],
  },
  {
    name: "invites",
    indexes: [{ key: { email: 1, createdAt: -1 } }],
  },
  {
    name: "notifications",
    indexes: [{ key: { userId: 1, createdAt: -1 } }],
  },
  {
    name: "eventRsvps",
    indexes: [{ key: { userId: 1, eventId: 1 }, options: { unique: true } }],
  },
  {
    name: "shortViews",
    indexes: [{ key: { shortId: 1, createdAt: -1 } }],
  },
  {
    name: "articleReads",
    indexes: [{ key: { userId: 1, articleKey: 1 }, options: { unique: true } }],
  },
  {
    name: "exports",
    indexes: [{ key: { createdAt: -1 } }],
  },
  {
    name: "reports",
    indexes: [{ key: { createdAt: -1 } }],
  },
  {
    name: "accountFeedback",
    indexes: [{ key: { createdAt: -1 } }],
  },
];

async function ensureCollection(database, name) {
  const existing = await database.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await database.createCollection(name);
  }
}

async function initDatabase() {
  const database = getDb();

  for (const collection of COLLECTIONS) {
    await ensureCollection(database, collection.name);
    for (const index of collection.indexes) {
      await database.collection(collection.name).createIndex(index.key, index.options || {});
    }
  }

  return {
    database: database.databaseName,
    collections: COLLECTIONS.map((collection) => collection.name),
  };
}

async function runCli() {
  try {
    await connectDb();
    const summary = await initDatabase();
    console.log(`Database "${summary.database}" is ready.`);
    console.log(`Collections: ${summary.collections.join(", ")}`);
  } finally {
    await closeDb();
  }
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { initDatabase, COLLECTIONS };
