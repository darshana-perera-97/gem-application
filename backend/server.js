require("dotenv").config();

const fs = require("fs");
const path = require("path");
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

const { PORT } = require("./src/publicUrl");
const frontendBuildPath = path.resolve(
  process.env.FRONTEND_BUILD_PATH || path.join(__dirname, "..", "frontend", "build")
);
const serveFrontend =
  process.env.SERVE_FRONTEND !== "false" &&
  fs.existsSync(path.join(frontendBuildPath, "index.html"));

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
]);

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || serveFrontend) {
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

if (serveFrontend) {
  app.use(express.static(frontendBuildPath, { index: false }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({
      ok: true,
      message: "GEM API is running",
      hint: "Build the frontend (npm run build in frontend/) to serve the app from this server.",
    });
  });
}

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
    if (serveFrontend) {
      console.log(`Serving frontend from ${frontendBuildPath}`);
    } else {
      console.log(`Frontend build not found at ${frontendBuildPath} (API only)`);
    }
  });
}

start();
