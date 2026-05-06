import { NextRequest, NextResponse } from "next/server";
import { executeSql } from "@/lib/db";
import { formatSqlError, isManualQuestion, stripTransactionControl } from "@/lib/sql";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { questionId?: number; sql?: string } | null;

  if (!body?.sql?.trim()) {
    return NextResponse.json({ error: "SQL is required." }, { status: 400 });
  }

  try {
    const sql = isManualQuestion(body.questionId) ? stripTransactionControl(body.sql) : body.sql;

    if (!sql) {
      return NextResponse.json({
        columns: [],
        rows: []
      });
    }

    const result = await executeSql(sql, true);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: formatSqlError(error)
      },
      { status: 400 }
    );
  }
}
