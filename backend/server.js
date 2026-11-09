require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { connectDb, getDb } = require("./src/db");
const { initDatabase } = require("./src/initDatabase");
const catalogRoutes = require("./src/routes");
const { actionsRouter } = require("./src/actions");
const { authRouter } = require("./src/googleAuth");
const { emailAuthRouter } = require("./src/emailAuth");
const { accountRouter } = require("./src/account");
const { adminRouter } = require("./src/admin");

const PORT = Number(process.env.PORT) || 1324;
const frontendOrigin = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
const allowedOrigins = new Set([
  frontendOrigin,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: "15mb" }));
app.use("/api", authRouter);
app.use("/api", emailAuthRouter);
app.use("/api", accountRouter);
app.use("/api", adminRouter);
app.use("/api", catalogRoutes);
app.use("/api", actionsRouter);

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "GEM API is running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const database = getDb();
    await database.command({ ping: 1 });
    res.json({
      status: "ok",
      database: database.databaseName,
    });
  } catch (error) {
    res.status(503).json({
      status: "degraded",
      database: "unavailable",
      error: error.message,
    });
  }
});

async function start() {
  try {
    await connectDb();
    const summary = await initDatabase();
    console.log(
      `MongoDB database "${summary.database}" ready (${summary.collections.length} collections)`
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("Start MongoDB on 127.0.0.1:27017, then restart the API.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start();
