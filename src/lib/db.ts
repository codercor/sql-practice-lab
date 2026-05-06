import { Pool, types, type QueryResult } from "pg";
import type { QueryResultPayload } from "./types";

types.setTypeParser(1082, (value) => value);

const statementTimeoutMs = 5000;

let pool: Pool | undefined;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL
  });

  return pool;
}

function lastResult(result: QueryResult | QueryResult[]): QueryResult {
  return Array.isArray(result) ? result[result.length - 1] : result;
}

export async function executeSql(sql: string, rollback = true): Promise<QueryResultPayload> {
  const client = await getPool().connect();

  try {
    if (rollback) {
      await client.query("BEGIN");
      await client.query(`SET LOCAL statement_timeout = ${statementTimeoutMs}`);
    } else {
      await client.query(`SET statement_timeout = ${statementTimeoutMs}`);
    }

    const rawResult = await client.query(sql);
    const result = lastResult(rawResult as QueryResult | QueryResult[]);

    if (rollback) {
      await client.query("ROLLBACK");
    }

    return {
      columns: result.fields?.map((field) => field.name) ?? [],
      rows: result.rows ?? []
    };
  } catch (error) {
    if (rollback) {
      await client.query("ROLLBACK").catch(() => undefined);
    }

    throw error;
  } finally {
    client.release();
  }
}
