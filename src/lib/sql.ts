import { getQuestionById } from "./questions";

type SqlError = {
  code?: string;
  message?: string;
};

export function formatSqlError(error: unknown) {
  const sqlError = error as SqlError;
  const rawMessage = error instanceof Error ? error.message : sqlError.message ?? "Query failed.";

  if (sqlError.code === "42601") {
    return `SQL syntax error: ${rawMessage}`;
  }

  if (sqlError.code === "57014") {
    return "Query timed out. SQL statements must finish within 5000 ms.";
  }

  return rawMessage;
}

export function isManualQuestion(questionId: number | undefined) {
  if (!questionId) {
    return false;
  }

  return getQuestionById(questionId)?.validationMode === "manual";
}

export function stripTransactionControl(sql: string) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => !/^(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK)\b/i.test(statement))
    .join(";\n")
    .trim();
}
