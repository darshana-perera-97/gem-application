const crypto = require("crypto");
const express = require("express");
const nodemailer = require("nodemailer");
const { getDb } = require("./db");
const { startSession } = require("./googleAuth");

const router = express.Router();

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.AUTH_SECRET);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashCode(email, code) {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET).update(`${email}:${code}`).digest("hex");
}

function codesMatch(email, code, expectedHash) {
  const actual = Buffer.from(hashCode(email, code));
  const expected = Buffer.from(String(expectedHash || ""));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function displayNameFromEmail(email) {
  const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  if (!local) return "GemBook Member";
  return local.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: String(process.env.SMTP_SECURE).toLowerCase() !== "false",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
}

async function sendCode(email, code) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await mailer().sendMail({
    from: `GemBook <${from}>`,
    to: email,
    subject: "Your GemBook sign-in code",
    text: `Your GemBook sign-in code is ${code}.\n\nIt expires in 10 minutes. If you did not request this, you can ignore this email.`,
  });
}

async function upsertEmailUser(email) {
  const users = getDb().collection("users");
  const now = new Date().toISOString();
  const existing = await users.findOne({
    email,
    provider: { $in: ["email", "google"] },
  });

  if (existing) {
    await users.updateOne({ uid: existing.uid }, { $set: { email, lastActive: now } });
    return { ...existing, email, lastActive: now };
  }

  const created = {
    uid: `email-${crypto.createHash("sha256").update(email).digest("hex").slice(0, 24)}`,
    email,
    phone: null,
    displayName: displayNameFromEmail(email),
    photoURL: null,
    role: "USER",
    provider: "email",
    followersCount: 0,
    followingCount: 0,
    createdAt: now,
    lastActive: now,
  };
  await users.insertOne(created);
  return created;
}

function asyncRoute(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error("Email sign-in failed:", error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Could not complete email sign-in." });
      }
    });
  };
}

router.post("/auth/email/request", asyncRoute(async (req, res) => {
  if (!smtpConfigured()) {
    res.status(503).json({ error: "Email sign-in is not configured. Add the SMTP settings to backend/.env and restart the API." });
    return;
  }

  const email = normalizeEmail(req.body?.email);
  if (!isEmail(email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  const otps = getDb().collection("emailOtps");
  const recent = await otps.findOne({ email, createdAt: { $gt: new Date(Date.now() - RESEND_WAIT_MS) } });
  if (recent) {
    res.status(429).json({ error: "A code was just sent. Wait a minute before requesting another." });
    return;
  }

  const code = String(crypto.randomInt(100000, 1000000));
  await otps.deleteMany({ email });
  await otps.insertOne({
    email,
    codeHash: hashCode(email, code),
    attempts: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  try {
    await sendCode(email, code);
  } catch (error) {
    await otps.deleteMany({ email });
    console.error("SMTP send failed:", error.message);
    res.status(502).json({ error: "Could not send the email. Check the SMTP settings and try again." });
    return;
  }

  res.json({ ok: true });
}));

router.post("/auth/email/verify", asyncRoute(async (req, res) => {
  if (!process.env.AUTH_SECRET) {
    res.status(503).json({ error: "Email sign-in is not configured." });
    return;
  }

  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").replace(/\D/g, "");
  if (!isEmail(email) || code.length !== 6) {
    res.status(400).json({ error: "Enter the 6-digit code from your email." });
    return;
  }

  const otps = getDb().collection("emailOtps");
  const record = await otps.findOne({ email });
  if (!record || record.expiresAt < new Date()) {
    res.status(400).json({ error: "That code has expired. Request a new one." });
    return;
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await otps.deleteMany({ email });
    res.status(400).json({ error: "Too many attempts. Request a new code." });
    return;
  }
  if (!codesMatch(email, code, record.codeHash)) {
    await otps.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    res.status(400).json({ error: "Invalid verification code. Please try again." });
    return;
  }

  await otps.deleteMany({ email });
  const user = await upsertEmailUser(email);
  startSession(res, user.uid);
  res.json({ ok: true });
}));

module.exports = { emailAuthRouter: router, smtpConfigured };
