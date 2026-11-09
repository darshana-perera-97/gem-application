const { faker } = require("@faker-js/faker");
const { connectDb, closeDb, getDb } = require("./db");

const AVATARS = [
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&h=256&fit=facearea&facepad=2&auto=format&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&h=256&fit=facearea&facepad=2&auto=format&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=facearea&facepad=2&auto=format&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=facearea&facepad=2&auto=format&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=facearea&facepad=2&auto=format&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=facearea&facepad=2&auto=format&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=facearea&facepad=2&auto=format&q=80",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=256&h=256&fit=facearea&facepad=2&auto=format&q=80",
];

const GEMS = [
  "/assets/images/blue_sapphire_gemstone_1781700990385.jpg",
  "/assets/images/red_ruby_gemstone_1781701006995.jpg",
  "/assets/images/green_emerald_gemstone_1781701027567.jpg",
  "/assets/images/padparadscha_sapphire_1781701049583.jpg",
  "/assets/images/gemstone_collection_luxury_1781701065808.jpg",
  "/assets/images/pink_spinel_gem_1781701058612.jpg",
  "/assets/images/yellow_sapphire_gem_1781701016187.jpg",
  "/assets/images/emerald_gemstone_1781701044795.jpg",
  "/assets/images/ruby_gemstone_1781701002346.jpg",
  "/assets/images/blue_sapphire_gem_1781700985688.jpg",
];

const COVERS = [GEMS[4], GEMS[0], GEMS[3], GEMS[1], GEMS[2]];
const VIDEOS = [
  "https://assets.mixkit.co/videos/5218/5218-720.mp4",
  "https://assets.mixkit.co/videos/51649/51649-720.mp4",
  "https://assets.mixkit.co/videos/47476/47476-720.mp4",
];

const SL_LOCATIONS = ["Ratnapura", "Colombo", "Beruwala", "Elahera", "Galle", "Kandy", "Matale"];
const GEM_TYPES = ["Sapphire", "Ruby", "Emerald", "Spinel", "Alexandrite", "Cat's Eye", "Moonstone", "Amethyst", "Topaz"];
const GEM_VARIETIES = ["Ceylon Blue", "Yellow", "Padparadscha", "Star", "Pink", "White"];
const CUTS = ["Excellent", "Very Good", "Good", "Fair"];
const CLARITY = ["IF", "VVS1", "VVS2", "VS1", "VS2", "SI1"];
const TREATMENTS = ["None (Unheated)", "Heat Treated", "Beryllium Treated", "Diffusion"];
const ORIGINS = ["Sri Lanka", "Ratnapura", "Beruwala", "Colombo", "Madagascar"];
const SHAPES = ["Oval", "Cushion", "Round", "Pear", "Emerald", "Marquise", "Cabochon"];
const CERTIFICATIONS = ["GIA", "GRS", "None"];
const VERIFICATION_LEVELS = ["BLUE", "GREEN", "GOLD", "NIC"];

const at = (list, index) => list[index % list.length];
const pad = (value, size = 2) => String(value).padStart(size, "0");

function buildCatalog() {
  faker.seed(42);
  const now = Date.UTC(2026, 10, 6);

  const users = Array.from({ length: 20 }, (_, i) => ({
    uid: `user-${pad(i + 1)}`,
    displayName: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    photoURL: at(AVATARS, i),
    role: i < 12 ? "VENDOR" : "USER",
    bio: faker.lorem.sentence(),
    followersCount: faker.number.int({ min: 20, max: 1000 }),
    followingCount: faker.number.int({ min: 5, max: 500 }),
    createdAt: new Date(now - (i + 40) * 86400000).toISOString(),
    lastActive: new Date(now - i * 3600000).toISOString(),
  }));

  const vendors = users.filter((user) => user.role === "VENDOR").map((user, i) => ({
    id: `vendor-${pad(i + 1)}`,
    userId: user.uid,
    companyName: `${faker.company.name()} Gems`,
    logo: at(AVATARS, i + 3),
    coverImage: at(COVERS, i),
    description: faker.company.catchPhrase(),
    location: at(SL_LOCATIONS, i),
    rating: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }),
    reviewCount: faker.number.int({ min: 12, max: 500 }),
    followersCount: faker.number.int({ min: 80, max: 5000 }),
    verified: i % 4 !== 3,
    verificationLevel: at(VERIFICATION_LEVELS, i),
    contactEmail: faker.internet.email().toLowerCase(),
    phone: `+94 7${faker.string.numeric(1)} ${faker.string.numeric(3)} ${faker.string.numeric(4)}`,
    website: faker.internet.url(),
    createdAt: user.createdAt,
  }));

  const listings = vendors.flatMap((vendor, vendorIndex) =>
    Array.from({ length: 6 }, (_, itemIndex) => {
      const i = vendorIndex * 6 + itemIndex;
      const gemType = at(GEM_TYPES, i);
      const variety = at(GEM_VARIETIES, i);
      const certification = at(CERTIFICATIONS, i);
      const caratWeight = faker.number.float({ min: 0.5, max: 20, fractionDigits: 1 });
      return {
        id: `listing-${pad(i + 1, 3)}`,
        vendorId: vendor.id,
        title: `${variety} ${gemType}`,
        gemType,
        variety,
        type: gemType,
        caratWeight,
        weight: caratWeight,
        cut: at(CUTS, i),
        clarity: at(CLARITY, i),
        treatment: at(TREATMENTS, i),
        certification,
        shape: at(SHAPES, i),
        description: faker.lorem.paragraph(),
        price: faker.number.int({ min: 500, max: 50000 }),
        currency: "USD",
        origin: at(ORIGINS, i),
        featured: i % 3 === 0,
        negotiable: i % 2 === 0,
        images: [at(GEMS, i), at(GEMS, i + 3)],
        status: i % 5 === 0 ? "SOLD" : "ACTIVE",
        certificate: certification === "None"
          ? null
          : {
              lab: certification,
              number: `SL-${99200 + i}`,
              date: "Jan 12, 2026",
            },
        createdAt: new Date(now - i * 8 * 3600000).toISOString(),
      };
    })
  );

  const posts = Array.from({ length: 12 }, (_, i) => {
    const user = at(users, i);
    return {
      id: `post-${pad(i + 1)}`,
      authorId: user.uid,
      authorName: user.displayName,
      authorAvatar: user.photoURL,
      authorType: user.role === "VENDOR" ? "VENDOR" : "USER",
      content: faker.lorem.paragraph(),
      media: [at(GEMS, i), at(GEMS, i + 2)],
      likesCount: faker.number.int({ min: 4, max: 500 }),
      likes: [],
      ratingsCount: faker.number.int({ min: 10, max: 200 }),
      averageRating: faker.number.float({ min: 4, max: 5, fractionDigits: 1 }),
      commentsCount: faker.number.int({ min: 0, max: 40 }),
      sharesCount: faker.number.int({ min: 0, max: 20 }),
      type: at(["DISCUSSION", "STORY", "NEWS"], i),
      status: "published",
      publishedAt: new Date(now - i * 5 * 3600000).toISOString(),
      createdAt: new Date(now - i * 5 * 3600000).toISOString(),
    };
  });

  const shorts = [
    {
      id: "short-1",
      order: 1,
      thumbnail: "/assets/images/pink_spinel_gem_1781701058612.jpg",
      video: VIDEOS[0],
      dealerName: "Ratnapura Gems",
      title: "10x Zoom: Rare Pink Spinel Analysis",
    },
    {
      id: "short-2",
      order: 2,
      thumbnail: "/assets/images/blue_sapphire_gemstone_1781700990385.jpg",
      video: VIDEOS[1],
      dealerName: "Ceylon Blue Co.",
      title: "Unheated Royal Blue Sapphire Reveal",
    },
    {
      id: "short-3",
      order: 3,
      thumbnail: "/assets/images/padparadscha_sapphire_1781701049583.jpg",
      video: VIDEOS[0],
      dealerName: "Beruwala Traders",
      title: "Padparadscha Color Shift Under Light",
    },
    {
      id: "short-4",
      order: 4,
      thumbnail: "/assets/images/red_ruby_gemstone_1781701006995.jpg",
      video: VIDEOS[1],
      dealerName: "Elahera Exports",
      title: "Star Ruby Asterism Close-Up",
    },
    {
      id: "short-5",
      order: 5,
      thumbnail: "/assets/images/green_emerald_gemstone_1781701027567.jpg",
      video: VIDEOS[0],
      dealerName: "Colombo Jewelers",
      title: "Emerald Inclusion Mapping 101",
    },
  ];

  const categories = [
    "Blue Sapphire",
    "Padparadscha",
    "Alexandrite",
    "Star Ruby",
    "Ceylon Yellow",
  ].map((name, i) => ({ id: `category-${pad(i + 1)}`, name, badge: "New", order: i + 1 }));

  const events = [
    { title: "Colombo Gem Expo 2026", date: "Jul 15", type: "Exhibitions" },
    { title: "Beruwala Rough Trade Meet", date: "Jun 28", type: "Trade Shows" },
  ].map((event, i) => ({ id: `event-${pad(i + 1)}`, order: i + 1, ...event }));

  const groups = [
    { name: "Sapphire Collectors", members: "12.4k", activity: "High", color: "bg-primary" },
    { name: "Ratnapura Mining Hub", members: "4.2k", activity: "Medium", color: "bg-emerald-600" },
    { name: "Gemology Enthusiasts", members: "8.9k", activity: "High", color: "bg-amber-500" },
    { name: "Wholesale Sri Lanka", members: "2.1k", activity: "Real-time", color: "bg-blue-600" },
  ].map((group, i) => ({ id: `group-${pad(i + 1)}`, order: i + 1, ...group }));

  const discussions = [1, 2, 3, 4].map((n) => {
    const user = users[n];
    return {
      id: `discussion-${pad(n)}`,
      order: n,
      authorId: user.uid,
      authorName: user.displayName,
      authorAvatar: user.photoURL,
      timeLabel: "2h ago",
      topic: "Market Analysis",
      title: "Is the current surge in Padparadscha Sapphire demand sustainable for the next quarter?",
      body: "I've been monitoring the auction yields from Geneva. The saturation levels requested by high-end retailers are becoming more specific. This could signal a shift in supply chain priorities for Sri Lankan miners...",
      replies: 42,
      upvotes: 128,
    };
  });

  const content = [
    {
      key: "featured",
      image: "/assets/images/yellow_sapphire_gem_1781701016187.jpg",
      kicker: "DAILY GEM",
      subtitle: "Blue Sapphire",
      title: "Royal Blue Sapphire",
      specs: "No Heat • 4.12 Carats",
      badge: "PLATINUM",
      valuationLabel: "Valuation",
      price: "Rs. 5.4M",
      cta: "Market",
      href: "/marketplace",
    },
    {
      key: "news",
      image: "/assets/images/emerald_gemstone_1781701044795.jpg",
      badge: "Industry News",
      title: "Export Regulation Changes for 2026 Announced",
      cta: "Read Article",
    },
  ];

  const dashboards = [
    {
      key: "vendor",
      stats: [
        { key: "revenue", label: "Total Revenue", value: 4580000, format: "currency", trend: "+12.4%", color: "bg-primary/10 text-primary" },
        { key: "items", label: "Active Items", value: "14", trend: "+2", color: "bg-primary/5 text-primary" },
        { key: "views", label: "Profile Views", value: "2.8k", trend: "+45%", color: "bg-amber-50 text-amber-600" },
        { key: "inquiries", label: "New Inquiries", value: "28", trend: "+5", color: "bg-primary/5 text-primary" },
      ],
      revenue: [
        { day: "Mon", value: 450000 },
        { day: "Tue", value: 820000 },
        { day: "Wed", value: 610000 },
        { day: "Thu", value: 950000 },
        { day: "Fri", value: 1200000 },
        { day: "Sat", value: 1450000 },
        { day: "Sun", value: 1100000 },
      ],
    },
    {
      key: "admin",
      stats: [
        { key: "users", label: "Total Users", value: "2,450", trend: "+12.5%" },
        { key: "listings", label: "Active Listings", value: "1,284", trend: "+12.5%" },
        { key: "vendors", label: "Verified Vendors", value: "142", trend: "+12.5%" },
        { key: "revenue", label: "Total Revenue", value: "$45.2k", trend: "+12.5%" },
      ],
      revenue: [
        { name: "Jan", value: 4000 },
        { name: "Feb", value: 3000 },
        { name: "Mar", value: 5000 },
        { name: "Apr", value: 4500 },
        { name: "May", value: 6000 },
        { name: "Jun", value: 5500 },
      ],
      activity: [
        { label: "Pending Vendor Approvals", count: 12, color: "bg-amber-500", max: 40 },
        { label: "Reported Listings", count: 4, color: "bg-red-500", max: 40 },
        { label: "Support Inquiries", count: 28, color: "bg-red-500", max: 40 },
      ],
    },
  ];

  const buyers = users.filter((user) => user.role === "USER");
  const conversations = vendors.slice(0, 8).map((vendor, i) => {
    const buyer = at(buyers, i);
    const listing = listings.find((item) => item.vendorId === vendor.id && item.status === "ACTIVE")
      || listings.find((item) => item.vendorId === vendor.id);
    const title = listing ? `${listing.caratWeight}ct ${listing.title}` : "this stone";
    const certified = listing?.certification && listing.certification !== "None";
    const lastMessage = certified
      ? `Yes, the ${title} is ${listing.certification} certified${listing.treatment === "None (Unheated)" ? " and unheated" : ""}. Asking $${listing.price.toLocaleString("en-US")}.`
      : `I can arrange a video call to show the ${title} under natural light.`;
    return {
      id: `conv-${pad(i + 1)}`,
      participants: [buyer.uid, vendor.userId],
      participantNames: {
        [buyer.uid]: buyer.displayName,
        [vendor.userId]: vendor.companyName,
      },
      participantAvatars: {
        [buyer.uid]: buyer.photoURL,
        [vendor.userId]: vendor.logo,
      },
      peerId: vendor.userId,
      listingId: listing?.id || null,
      listingTitle: listing?.title || null,
      lastMessage,
      lastSenderId: vendor.userId,
      lastUpdatedAt: new Date(now - (i + 1) * 45 * 60 * 1000).toISOString(),
      unreadCount: {
        [buyer.uid]: i % 3 === 0 ? 1 : 0,
        [vendor.userId]: 0,
      },
    };
  });

  const messages = conversations.flatMap((conversation) => {
    const listing = listings.find((item) => item.id === conversation.listingId);
    const buyerId = conversation.participants[0];
    const vendorId = conversation.participants[1];
    const title = listing ? `${listing.caratWeight}ct ${listing.title}` : (conversation.listingTitle || "this stone");
    const origin = listing?.origin || "Sri Lanka";
    const treatment = listing?.treatment || "unspecified treatment";
    const lines = [
      { senderId: buyerId, text: `Hi, is the ${title} from ${origin} still available?` },
      { senderId: vendorId, text: `Hello! Yes, the ${title} is still available.` },
      { senderId: buyerId, text: `Thanks. The listing notes ${treatment}. Can you confirm that?` },
      { senderId: vendorId, text: conversation.lastMessage },
    ];
    const start = new Date(conversation.lastUpdatedAt).getTime() - (lines.length - 1) * 15 * 60 * 1000;
    return lines.map((line, index) => ({
      id: `${conversation.id}-m${index + 1}`,
      conversationId: conversation.id,
      senderId: line.senderId,
      senderName: conversation.participantNames[line.senderId],
      text: line.text,
      createdAt: new Date(start + index * 15 * 60 * 1000).toISOString(),
      readBy: index === lines.length - 1 ? [line.senderId] : conversation.participants,
    }));
  });

  return { users, vendors, listings, posts, shorts, categories, events, groups, discussions, content, dashboards, conversations, messages };
}

function serialize(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

async function insertIfEmpty(database, name, docs) {
  if (!docs.length) return 0;
  const count = await database.collection(name).countDocuments();
  if (count > 0) return 0;
  await database.collection(name).insertMany(docs);
  return docs.length;
}

async function seedCatalog() {
  const database = getDb();
  const catalog = buildCatalog();
  const inserted = {};

  for (const [name, docs] of Object.entries(catalog)) {
    inserted[name] = await insertIfEmpty(database, name, docs);
  }

  const seeded = Object.values(inserted).some((count) => count > 0);
  return { seeded, inserted };
}

async function runCli() {
  const { initDatabase } = require("./initDatabase");
  try {
    await connectDb();
    await initDatabase();
    const summary = await seedCatalog();
    console.log(JSON.stringify(summary, null, 2));
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

module.exports = { buildCatalog, seedCatalog, serialize };
