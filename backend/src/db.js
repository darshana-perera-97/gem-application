const { MongoClient } = require("mongodb");

const DEFAULT_URI = "mongodb://127.0.0.1:27017/gem";

let client;
let db;

function getUri() {
  return process.env.MONGODB_URI || DEFAULT_URI;
}

async function connectDb() {
  if (db) return db;

  client = new MongoClient(getUri());
  await client.connect();
  db = client.db();
  await db.command({ ping: 1 });
  return db;
}

function getDb() {
  if (!db) {
    throw new Error("Database is not connected");
  }
  return db;
}

async function closeDb() {
  if (client) {
    await client.close();
  }
  client = undefined;
  db = undefined;
}

module.exports = { connectDb, getDb, closeDb, getUri };
