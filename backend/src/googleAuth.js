const crypto = require("crypto");
const express = require("express");
const { getDb } = require("./db");
const { serialize } = require("./catalog");

const router = express.Router();

const SESSION_COOKIE = "gem_session";
const STATE_COOKIE = "gem_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

function frontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
}

function callbackUrl() {
  return process.env.GOOGLE_CALLBACK_URL || "http://localhost:1324/api/auth/google/callback";
}

function googleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SECRET);
}

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is missing from backend/.env");
  }
  return secret;
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

function startSession(res, uid) {
  setCookie(
    res,
    SESSION_COOKIE,
    signPayload({ uid, exp: Date.now() + SESSION_MAX_AGE * 1000 }),
    SESSION_MAX_AGE
  );
}

function sessionUid(req) {
  if (!process.env.AUTH_SECRET) return null;
  const cookies = parseCookies(req);
  const session = readPayload(cookies[SESSION_COOKIE]);
  return session?.uid || null;
}

function endSession(res) {
  clearCookie(res, SESSION_COOKIE);
}

function redirectToLogin(res, error) {
  res.redirect(`${frontendUrl()}/login?error=${encodeURIComponent(error)}`);
}

function googlePhotoUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (!url.includes("googleusercontent.com") || /=s\d+/.test(url)) return url;
  return `${url}=s256-c`;
}

function publicUser(user) {
  if (!user) return null;
  const googlePhotoURL = googlePhotoUrl(user.googlePhotoURL || (
    typeof user.photoURL === "string" && user.photoURL.includes("googleusercontent.com")
      ? user.photoURL
      : null
  ));
  return {
    uid: user.uid,
    email: user.email || null,
    phone: user.phone || null,
    phoneVerified: Boolean(user.phoneVerified),
    displayName: user.displayName || "Google User",
    photoURL: user.photoURL || googlePhotoURL || null,
    googlePhotoURL,
    role: user.role || "USER",
    followersCount: user.followersCount || 0,
    followingCount: user.followingCount || 0,
    provider: user.provider || "google",
    createdAt: user.createdAt || null,
    lastActive: user.lastActive || null,
  };
}

function isUsingGoogleAvatar(user) {
  if (!user?.photoURL) return true;
  const google = googlePhotoUrl(user.googlePhotoURL);
  if (!google) return !String(user.photoURL).startsWith("data:");
  return user.photoURL === google || user.photoURL === user.googlePhotoURL;
}

async function upsertGoogleUser(profile) {
  const users = getDb().collection("users");
  const now = new Date().toISOString();
  const googlePhoto = googlePhotoUrl(profile.picture);
  const existing = await users.findOne({ uid: profile.sub });
  if (!existing) {
    const created = {
      uid: profile.sub,
      email: profile.email || null,
      phone: null,
      displayName: profile.name || profile.email || "Google User",
      photoURL: googlePhoto,
      googlePhotoURL: googlePhoto,
      role: "USER",
      provider: "google",
      followersCount: 0,
      followingCount: 0,
      createdAt: now,
      lastActive: now,
    };
    await users.insertOne(created);
    return created;
  }

  const updates = {
    email: profile.email || existing.email || null,
    displayName: profile.name || existing.displayName || "Google User",
    googlePhotoURL: googlePhoto || existing.googlePhotoURL || null,
    provider: "google",
    lastActive: now,
  };
  if (googlePhoto && isUsingGoogleAvatar(existing)) {
    updates.photoURL = googlePhoto;
  }
  await users.updateOne({ uid: profile.sub }, { $set: updates });
  return { ...existing, ...updates };
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: callbackUrl(),
    grant_type: "authorization_code",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error_description || data.error || "Google token exchange failed";
    throw new Error(message);
  }
  return data;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await response.json().catch(() => ({}));
  if (!response.ok || !profile.sub) {
    throw new Error("Could not read the Google profile");
  }
  return profile;
}

function asyncRoute(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error("Google sign-in failed:", error.message);
      if (!res.headersSent) {
        redirectToLogin(res, "google_failed");
      }
    });
  };
}

router.get("/auth/google", (req, res) => {
  if (!googleAuthConfigured()) {
    redirectToLogin(res, "google_not_configured");
    return;
  }

  const state = crypto.randomBytes(24).toString("base64url");
  setCookie(res, STATE_COOKIE, state, 600);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/auth/google/callback", asyncRoute(async (req, res) => {
  if (!googleAuthConfigured()) {
    redirectToLogin(res, "google_not_configured");
    return;
  }

  const cookies = parseCookies(req);
  clearCookie(res, STATE_COOKIE);

  if (req.query.error) {
    redirectToLogin(res, req.query.error === "access_denied" ? "access_denied" : "google_failed");
    return;
  }

  if (!req.query.code || !req.query.state || req.query.state !== cookies[STATE_COOKIE]) {
    redirectToLogin(res, "google_failed");
    return;
  }

  const tokens = await exchangeCode(req.query.code);
  const profile = await fetchGoogleProfile(tokens.access_token);
  const user = await upsertGoogleUser(profile);
  startSession(res, user.uid);

  const target = new URL("/auth/callback", `${frontendUrl()}/`);
  if (tokens.id_token) {
    target.hash = new URLSearchParams({ id_token: tokens.id_token }).toString();
  }
  res.redirect(target.toString());
}));

router.get("/auth/me", async (req, res) => {
  try {
    if (!process.env.AUTH_SECRET) {
      res.json({ user: null });
      return;
    }
    const cookies = parseCookies(req);
    const session = readPayload(cookies[SESSION_COOKIE]);
    if (!session?.uid) {
      res.json({ user: null });
      return;
    }
    const user = await getDb().collection("users").findOne({ uid: session.uid });
    res.json({ user: publicUser(serialize(user)) });
  } catch (error) {
    console.error("Session lookup failed:", error.message);
    res.status(500).json({ user: null });
  }
});

let firebaseCerts = { certs: null, expiresAt: 0 };

async function firebaseCertificates() {
  if (firebaseCerts.certs && Date.now() < firebaseCerts.expiresAt) return firebaseCerts.certs;
  const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!response.ok) throw new Error("Could not load Firebase signing keys");
  const certs = await response.json();
  const maxAge = Number((response.headers.get("cache-control") || "").match(/max-age=(\d+)/)?.[1] || 3600);
  firebaseCerts = { certs, expiresAt: Date.now() + maxAge * 1000 };
  return certs;
}

async function verifyFirebaseIdToken(idToken, expectedProvider = "google.com") {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is missing from backend/.env");
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("Invalid sign-in token");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = JSON.parse(Buffer.from(headerPart, "base64url").toString());
  const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString());
  if (header.alg !== "RS256" || !header.kid) throw new Error("Invalid sign-in token");
  const cert = (await firebaseCertificates())[header.kid];
  if (!cert) throw new Error("Unknown sign-in token key");
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();
  if (!verifier.verify(cert, Buffer.from(signaturePart, "base64url"))) {
    throw new Error("Invalid sign-in token signature");
  }
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) throw new Error("Sign-in token expired");
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Sign-in token is for a different project");
  }
  if (payload.firebase?.sign_in_provider !== expectedProvider) {
    throw new Error("This token is not from the expected sign-in method");
  }
  return payload;
}

router.post("/auth/google/firebase", async (req, res) => {
  try {
    const payload = await verifyFirebaseIdToken(req.body?.idToken);
    const user = await upsertGoogleUser({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });
    startSession(res, user.uid);
    res.json({ ok: true });
  } catch (error) {
    console.error("Google sign-in failed:", error.message);
    res.status(401).json({ error: "Google sign-in could not be verified." });
  }
});

router.post("/auth/logout", (req, res) => {
  clearCookie(res, SESSION_COOKIE);
  res.json({ ok: true });
});

router.post("/users/phone", async (req, res) => {
  try {
    const uid = sessionUid(req);
    if (!uid) {
      res.status(401).json({ error: "Sign in to add a phone number." });
      return;
    }

    const phone = String(req.body?.phone || "").trim();
    if (!/^\+\d{8,15}$/.test(phone)) {
      res.status(400).json({ error: "Enter a valid mobile number." });
      return;
    }

    const users = getDb().collection("users");
    const taken = await users.findOne({ phone, uid: { $ne: uid } });
    if (taken) {
      res.status(409).json({ error: "That phone number is already linked to another account." });
      return;
    }

    await users.updateOne(
      { uid },
      { $set: { phone, phoneVerified: true, updatedAt: new Date().toISOString() } }
    );
    const user = await users.findOne({ uid });
    res.json({ user: publicUser(serialize(user)) });
  } catch (error) {
    console.error("Phone save failed:", error.message);
    res.status(500).json({ error: "Could not save that phone number." });
  }
});

module.exports = { authRouter: router, googleAuthConfigured, startSession, sessionUid, endSession };
