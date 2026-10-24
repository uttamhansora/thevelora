import mongoose from "mongoose";
import { DatabaseConfigError } from "@/lib/errors";
import { redactSecrets } from "@/lib/security/redact";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

type ConnectFn = (uri: string, dbName: string) => Promise<typeof mongoose>;

const globalForMongoose = globalThis as typeof globalThis & { __veloraMongoose?: MongooseCache };

function cache(): MongooseCache {
  if (!globalForMongoose.__veloraMongoose) {
    globalForMongoose.__veloraMongoose = { conn: null, promise: null };
  }
  return globalForMongoose.__veloraMongoose;
}

export async function connectWithCache(options: {
  uri: string | undefined;
  dbName: string;
  cache: MongooseCache;
  connect: ConnectFn;
  logError: (message: string) => void;
}): Promise<typeof mongoose> {
  const uri = options.uri?.trim();
  if (!uri) {
    options.logError("MongoDB connection failed: MONGODB_URI is not set.");
    throw new DatabaseConfigError(
      "Database is not configured. Set MONGODB_URI for the thevelora database on the server.",
    );
  }
  if (options.cache.conn) return options.cache.conn;
  if (!options.cache.promise) {
    options.cache.promise = options
      .connect(uri, options.dbName)
      .then((connection) => {
        options.cache.conn = connection;
        return connection;
      })
      .catch((error: unknown) => {
        options.cache.promise = null;
        options.cache.conn = null;
        const raw = error instanceof Error ? error.message : "Unknown database error";
        options.logError(`MongoDB connection failed: ${redactSecrets(raw)}`);
        throw new DatabaseConfigError(
          "Database connection failed. Check the server log for a diagnostic that does not include credentials.",
        );
      });
  }
  return options.cache.promise;
}

const defaultConnect: ConnectFn = (uri, dbName) =>
  mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 10,
  });

export async function connectDB(): Promise<typeof mongoose> {
  return connectWithCache({
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME?.trim() || "thevelora",
    cache: cache(),
    connect: defaultConnect,
    logError: (message) => {
      const line = `[velora] ${message}`;
      if (message.includes("MONGODB_URI is not set")) console.warn(line);
      else console.error(line);
    },
  });
}

export function resetConnectionCacheForTests(): void {
  if (!process.env.MONGODB_DB_NAME?.endsWith("_test")) {
    throw new Error("Connection cache can only be reset for a test database.");
  }
  const bucket = cache();
  bucket.conn = null;
  bucket.promise = null;
}
