import type { EvaluationDetails, QueryResultPayload } from "./types";

function isNumericString(value: string) {
  return /^-?\d+(\.\d+)?$/.test(value.trim());
}

export function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    if (isNumericString(value)) {
      const numericValue = Number(value);

      if (Number.isFinite(numericValue) && Math.abs(numericValue) <= Number.MAX_SAFE_INTEGER) {
        return numericValue;
      }
    }
  }

  return value;
}

export function normalizeRows(result: QueryResultPayload) {
  return result.rows.map((row) => {
    const normalized: Record<string, unknown> = {};

    for (const column of result.columns) {
      normalized[column] = normalizeValue(row[column]);
    }

    return normalized;
  });
}

function comparableRows(result: QueryResultPayload, orderMatters: boolean) {
  const rows = normalizeRows(result);

  if (orderMatters) {
    return rows;
  }

  return rows
    .map((row) => ({
      row,
      rowString: JSON.stringify(row)
    }))
    .sort((left, right) => left.rowString.localeCompare(right.rowString))
    .map((entry) => entry.row);
}

function findFirstDifferentRow(
  expectedRows: Record<string, unknown>[],
  receivedRows: Record<string, unknown>[]
): EvaluationDetails["firstDifferentRow"] {
  const maxRows = Math.max(expectedRows.length, receivedRows.length);

  for (let index = 0; index < maxRows; index += 1) {
    const expected = expectedRows[index] ?? null;
    const received = receivedRows[index] ?? null;

    if (JSON.stringify(expected) !== JSON.stringify(received)) {
      return {
        index,
        expected,
        received
      };
    }
  }

  return undefined;
}

export function compareResults(
  studentResult: QueryResultPayload,
  expectedResult: QueryResultPayload,
  orderMatters: boolean
) {
  const expectedRows = comparableRows(expectedResult, orderMatters);
  const receivedRows = comparableRows(studentResult, orderMatters);
  const details: EvaluationDetails = {
    expectedRowCount: expectedRows.length,
    receivedRowCount: receivedRows.length,
    expectedColumns: expectedResult.columns,
    receivedColumns: studentResult.columns,
    firstDifferentRow: findFirstDifferentRow(expectedRows, receivedRows)
  };

  if (JSON.stringify(studentResult.columns) !== JSON.stringify(expectedResult.columns)) {
    return {
      passed: false,
      reason: "wrong_columns",
      message: `Wrong columns. Expected ${expectedResult.columns.join(", ") || "no columns"}, got ${
        studentResult.columns.join(", ") || "no columns"
      }.`,
      details
    };
  }

  if (receivedRows.length !== expectedRows.length) {
    return {
      passed: false,
      reason: "wrong_row_count",
      message: `Wrong row count. Expected ${expectedRows.length} row(s), got ${receivedRows.length} row(s).`,
      details
    };
  }

  if (JSON.stringify(receivedRows) !== JSON.stringify(expectedRows)) {
    return {
      passed: false,
      reason: "wrong_values",
      message: "Wrong values. Your query executed, but the result does not match the expected answer.",
      details
    };
  }

  return {
    passed: true,
    reason: "passed",
    message: "Correct. Your query returned the expected columns and rows.",
    details
  };
}
