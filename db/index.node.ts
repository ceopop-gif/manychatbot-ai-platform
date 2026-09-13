import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.pg";

let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is required for the Node runtime");

  client ??= postgres(connectionString, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 20,
  });

  return drizzle(client, { schema });
}