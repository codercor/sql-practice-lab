export type Difficulty = "Easy" | "Medium";

export type ValidationMode = "result_match" | "manual";

export type Question = {
  id: number;
  title: string;
  topic: string;
  difficulty: Difficulty;
  description: string;
  starterSql: string;
  solutionSql: string;
  validationMode: ValidationMode;
  orderMatters: boolean;
};

export type QueryResultPayload = {
  columns: string[];
  rows: Record<string, unknown>[];
};

export type EvaluationDetails = {
  expectedRowCount: number;
  receivedRowCount: number;
  expectedColumns: string[];
  receivedColumns: string[];
  firstDifferentRow?: {
    index: number;
    expected: Record<string, unknown> | null;
    received: Record<string, unknown> | null;
  };
};

export type SchemaColumn = {
  name: string;
  type: string;
  nullable: boolean;
};

export type SchemaTable = {
  name: string;
  kind: "BASE TABLE" | "VIEW";
  columns: SchemaColumn[];
};

export type SchemaRelationship = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
};
