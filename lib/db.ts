import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "CRITICAL SECURITY CONFIGURATION ERROR: DATABASE_URL environment variable is missing. Database access aborted."
  );
}

declare global {
  var __postgres_client__: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global.__postgres_client__ ||
  postgres(connectionString, {
    ssl: "require",
    prepare: false, // Critical for Supabase transaction pooler (port 6543)
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.__postgres_client__ = sql;
}
