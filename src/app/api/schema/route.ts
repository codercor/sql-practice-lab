import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { SchemaRelationship, SchemaTable } from "@/lib/types";

export const runtime = "nodejs";

type SchemaRow = {
  table_name: string;
  table_type: "BASE TABLE" | "VIEW";
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
};

const relationships: SchemaRelationship[] = [
  {
    fromTable: "orders",
    fromColumn: "customer_id",
    toTable: "customers",
    toColumn: "customer_id"
  },
  {
    fromTable: "orders",
    fromColumn: "product_id",
    toTable: "products",
    toColumn: "product_id"
  }
];

export async function GET() {
  try {
    const result = await getPool().query<SchemaRow>(`
      SELECT
        t.table_name,
        t.table_type,
        c.column_name,
        c.data_type,
        c.is_nullable
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON c.table_schema = t.table_schema
        AND c.table_name = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY t.table_type, t.table_name, c.ordinal_position;
    `);

    const tables = new Map<string, SchemaTable>();

    for (const row of result.rows) {
      if (!tables.has(row.table_name)) {
        tables.set(row.table_name, {
          name: row.table_name,
          kind: row.table_type,
          columns: []
        });
      }

      tables.get(row.table_name)?.columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === "YES"
      });
    }

    return NextResponse.json({
      tables: Array.from(tables.values()),
      relationships
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load schema."
      },
      { status: 500 }
    );
  }
}
