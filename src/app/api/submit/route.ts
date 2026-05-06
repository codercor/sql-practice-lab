import { NextRequest, NextResponse } from "next/server";
import { executeSql } from "@/lib/db";
import { compareResults } from "@/lib/evaluate";
import { getQuestionById } from "@/lib/questions";
import { formatSqlError } from "@/lib/sql";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    questionId?: number;
    sql?: string;
  } | null;

  if (!body?.questionId || !body?.sql?.trim()) {
    return NextResponse.json({ error: "questionId and sql are required." }, { status: 400 });
  }

  const question = getQuestionById(body.questionId);

  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  if (question.validationMode === "manual") {
    return NextResponse.json({
      passed: false,
      manual: true,
      message: "This question requires manual review. Compare your answer with the official solution.",
      officialSolution: question.solutionSql
    });
  }

  try {
    const studentResult = await executeSql(body.sql, true);
    const expectedResult = await executeSql(question.solutionSql, true);
    const evaluation = compareResults(studentResult, expectedResult, question.orderMatters);

    return NextResponse.json({
      ...evaluation,
      studentResult,
      expectedResult
    });
  } catch (error) {
    return NextResponse.json(
      {
        passed: false,
        message: "Your SQL could not be evaluated because it failed to run.",
        error: formatSqlError(error)
      },
      { status: 400 }
    );
  }
}
