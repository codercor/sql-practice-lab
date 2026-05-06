"use client";

import { useEffect, useMemo, useState } from "react";
import type { EvaluationDetails, QueryResultPayload, Question, SchemaRelationship, SchemaTable } from "@/lib/types";

type SchemaPayload = {
  tables: SchemaTable[];
  relationships: SchemaRelationship[];
};

type EvaluationPayload = {
  passed: boolean;
  manual?: boolean;
  reason?: string;
  message: string;
  studentResult?: QueryResultPayload;
  expectedResult?: QueryResultPayload;
  details?: EvaluationDetails;
  officialSolution?: string;
  error?: string;
};

type ResultTab = "results" | "evaluation" | "error";

const emptyEditorSql = "-- Write your SQL answer here\n";

function difficultyClass(difficulty: Question["difficulty"]) {
  return difficulty === "Easy"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    : "border-sky-500/30 bg-sky-500/10 text-sky-200";
}

function ResultTable({ result }: { result?: QueryResultPayload }) {
  if (!result) {
    return <div className="px-4 py-8 text-center text-sm text-slate-500">Run a query to see rows here.</div>;
  }

  if (result.columns.length === 0) {
    return <div className="px-4 py-8 text-center text-sm text-slate-400">Query completed with no result columns.</div>;
  }

  return (
    <div className="max-h-[320px] overflow-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-950">
          <tr>
            {result.columns.map((column) => (
              <th key={column} className="border-b border-line px-3 py-2 font-medium text-slate-300">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-slate-900/40 even:bg-slate-900/10">
              {result.columns.map((column) => (
                <td key={column} className="border-b border-slate-800 px-3 py-2 font-mono text-xs text-slate-200">
                  {String(row[column] ?? "NULL")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvaluationDetailsPanel({ details }: { details?: EvaluationDetails }) {
  if (!details) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-md border border-line bg-slate-950/70 p-4 text-sm md:grid-cols-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected row count</div>
        <div className="mt-1 font-mono text-slate-100">{details.expectedRowCount}</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Received row count</div>
        <div className="mt-1 font-mono text-slate-100">{details.receivedRowCount}</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected columns</div>
        <div className="mt-1 font-mono text-xs text-slate-200">{details.expectedColumns.join(", ") || "none"}</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Received columns</div>
        <div className="mt-1 font-mono text-xs text-slate-200">{details.receivedColumns.join(", ") || "none"}</div>
      </div>
      {details.firstDifferentRow ? (
        <div className="md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            First different row #{details.firstDifferentRow.index + 1}
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <pre className="overflow-auto rounded border border-slate-800 bg-slate-900 p-3 font-mono text-xs text-emerald-100">
              {JSON.stringify(details.firstDifferentRow.expected, null, 2)}
            </pre>
            <pre className="overflow-auto rounded border border-slate-800 bg-slate-900 p-3 font-mono text-xs text-red-100">
              {JSON.stringify(details.firstDifferentRow.received, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [schema, setSchema] = useState<SchemaPayload>({ tables: [], relationships: [] });
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    customers: true,
    products: true,
    orders: true
  });
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<QueryResultPayload | undefined>();
  const [evaluation, setEvaluation] = useState<EvaluationPayload | undefined>();
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ResultTab>("results");
  const [showSolution, setShowSolution] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"run" | "submit" | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      const [questionsResponse, schemaResponse] = await Promise.all([fetch("/api/questions"), fetch("/api/schema")]);
      const nextQuestions = (await questionsResponse.json()) as Question[];
      const nextSchema = (await schemaResponse.json()) as SchemaPayload;

      setQuestions(nextQuestions);
      setSchema(nextSchema);
      setSelectedId(nextQuestions[0]?.id ?? null);
      setSql(emptyEditorSql);
    }

    loadInitialData().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load app data.");
      setActiveTab("error");
    });
  }, []);

  const selectedQuestion = questions.find((question) => question.id === selectedId);
  const visibleTables = schema.tables.filter((table) => ["customers", "products", "orders"].includes(table.name));

  const groupedQuestions = useMemo(() => {
    return questions.reduce<Record<string, Question[]>>((groups, question) => {
      groups[question.topic] = groups[question.topic] ?? [];
      groups[question.topic].push(question);
      return groups;
    }, {});
  }, [questions]);

  function selectQuestion(question: Question) {
    setSelectedId(question.id);
    setSql(emptyEditorSql);
    setResult(undefined);
    setEvaluation(undefined);
    setError("");
    setActiveTab("results");
    setShowSolution(false);
  }

  function toggleTable(tableName: string) {
    setExpandedTables((current) => ({
      ...current,
      [tableName]: !(current[tableName] ?? true)
    }));
  }

  async function runSql() {
    setLoadingAction("run");
    setError("");
    setEvaluation(undefined);

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: selectedQuestion?.id, sql })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Query failed.");
      }

      setResult(payload as QueryResultPayload);
      setActiveTab("results");
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Query failed.");
      setActiveTab("error");
    } finally {
      setLoadingAction(null);
    }
  }

  async function submitSql() {
    if (!selectedQuestion) {
      return;
    }

    setLoadingAction("submit");
    setError("");

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: selectedQuestion.id, sql })
      });
      const payload = (await response.json()) as EvaluationPayload;

      if (!response.ok) {
        setError(payload.error ?? payload.message ?? "Submission failed.");
        setEvaluation(payload);
        setActiveTab("error");
        return;
      }

      setEvaluation(payload);
      setResult(payload.studentResult);
      setActiveTab("evaluation");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Submission failed.");
      setActiveTab("error");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#13213b_0,#0a0f1a_36%,#070b12_100%)] text-slate-100">
      <div className="flex h-full min-w-0 flex-col overflow-auto lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:overflow-hidden">
        <aside className="min-h-0 shrink-0 border-b border-line bg-slate-950/85 lg:flex lg:h-screen lg:shrink lg:flex-col lg:border-b-0 lg:border-r">
          <div className="shrink-0 border-b border-line px-5 py-4">
            <h1 className="text-lg font-semibold tracking-tight text-white">SQL Practice Lab</h1>
            <p className="mt-1 text-xs text-slate-400">PostgreSQL exercises for local learning</p>
          </div>
          <nav className="max-h-[44vh] min-h-0 overflow-auto p-3 lg:max-h-none lg:flex-1">
            {Object.entries(groupedQuestions).map(([topic, topicQuestions]) => (
              <section key={topic} className="mb-4">
                <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{topic}</h2>
                <div className="space-y-1.5">
                  {topicQuestions.map((question) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => selectQuestion(question)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                        selectedId === question.id
                          ? "border-sky-400/80 bg-sky-400/10 text-white shadow-[inset_3px_0_0_#38bdf8]"
                          : "border-transparent bg-slate-950/20 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <span className="mt-0.5 min-w-7 rounded bg-slate-900 px-1.5 py-0.5 text-center font-mono text-[11px] text-slate-400">
                          {question.id}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium leading-5">{question.title}</span>
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] ${difficultyClass(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                        <span className="inline-flex max-w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-400">
                          <span className="truncate">{question.topic}</span>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        <section className="flex min-h-[900px] min-w-0 shrink-0 flex-col lg:h-screen lg:min-h-0 lg:shrink">
          <div className="shrink-0 border-b border-line bg-slate-950/55 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold uppercase tracking-wide text-accent">{selectedQuestion?.topic ?? "Loading"}</span>
                  {selectedQuestion ? (
                    <span className={`rounded-md border px-2 py-0.5 ${difficultyClass(selectedQuestion.difficulty)}`}>
                      {selectedQuestion.difficulty}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">{selectedQuestion?.title ?? "Loading questions"}</h2>
              </div>
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">{selectedQuestion?.description}</p>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(230px,0.9fr)_auto_minmax(170px,0.75fr)] gap-3 overflow-hidden p-4 lg:p-5">
            <section className="min-h-0 overflow-hidden rounded-lg border border-line bg-slate-950/80 shadow-sm">
              <div className="flex items-center justify-between border-b border-line px-4 py-2">
                <span className="text-sm font-medium text-slate-300">SQL editor</span>
                <span className="font-mono text-xs text-slate-500">transaction rollback enabled</span>
              </div>
              <textarea
                value={sql}
                onChange={(event) => setSql(event.target.value)}
                spellCheck={false}
                className="h-[calc(100%-37px)] w-full resize-none overflow-auto bg-[#07101f] p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600"
                placeholder="Write your PostgreSQL answer here..."
              />
            </section>

            <div className="min-h-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runSql}
                  disabled={loadingAction !== null}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingAction === "run" ? "Running..." : "Run"}
                </button>
                <button
                  type="button"
                  onClick={submitSql}
                  disabled={loadingAction !== null}
                  className="rounded-md bg-success px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingAction === "submit" ? "Checking..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSolution((value) => !value)}
                  className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-panelSoft"
                >
                  {showSolution ? "Hide Solution" : "Show Solution"}
                </button>
                <button
                  type="button"
                  onClick={() => setSql(emptyEditorSql)}
                  className="rounded-md border border-line bg-transparent px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900"
                >
                  Reset SQL
                </button>
              </div>

              {showSolution && selectedQuestion ? (
                <section className="max-h-40 overflow-hidden rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
                  <div className="mb-2 text-sm font-semibold text-amber-200">Official solution</div>
                  <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 font-mono text-xs leading-5 text-amber-50">
                    {selectedQuestion.solutionSql}
                  </pre>
                </section>
              ) : null}
            </div>

            <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-slate-950/80 shadow-sm">
              <div className="flex border-b border-line">
                {(["results", "evaluation", "error"] as ResultTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`border-r border-line px-4 py-2 text-sm font-medium capitalize ${
                      activeTab === tab ? "bg-panelSoft text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
              {activeTab === "results" ? <ResultTable result={result} /> : null}
              {activeTab === "evaluation" ? (
                <div className="space-y-4 p-4">
                  {evaluation ? (
                    <>
                      <div
                        className={`rounded-md border p-3 text-sm ${
                          evaluation.manual
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                            : evaluation.passed
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                              : "border-red-500/30 bg-red-500/10 text-red-100"
                        }`}
                      >
                        <strong>{evaluation.manual ? "Manual review" : evaluation.passed ? "Passed" : "Not passed"}:</strong>{" "}
                        {evaluation.message}
                      </div>
                      <EvaluationDetailsPanel details={evaluation.details} />
                      {evaluation.officialSolution ? (
                        <div>
                          <h3 className="mb-2 text-sm font-semibold text-slate-300">Official solution</h3>
                          <pre className="overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 font-mono text-sm leading-6 text-amber-50">
                            {evaluation.officialSolution}
                          </pre>
                        </div>
                      ) : null}
                      {!evaluation.passed && evaluation.expectedResult ? (
                        <div>
                          <h3 className="mb-2 text-sm font-semibold text-slate-300">Expected result</h3>
                          <ResultTable result={evaluation.expectedResult} />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">Submit an answer to see evaluation.</div>
                  )}
                </div>
              ) : null}
              {activeTab === "error" ? (
                <div className="p-4">
                  {error ? (
                    <pre className="whitespace-pre-wrap rounded-md border border-red-500/30 bg-red-500/10 p-4 font-mono text-sm text-red-100">
                      {error}
                    </pre>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">No errors yet.</div>
                  )}
                </div>
              ) : null}
              </div>
            </section>
          </div>
        </section>

        <aside className="min-h-0 shrink-0 border-t border-line bg-slate-950/85 lg:flex lg:h-screen lg:shrink lg:flex-col lg:border-l lg:border-t-0">
          <div className="shrink-0 border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-white">Database schema</h2>
            <p className="mt-1 text-xs text-slate-400">Tables, columns, and relationships</p>
          </div>
          <div className="max-h-[55vh] min-h-0 overflow-auto p-4 lg:max-h-none lg:flex-1">
            <div className="space-y-3">
              {visibleTables.map((table) => (
                <section key={table.name} className="rounded-lg border border-line bg-panel/60">
                  <button
                    type="button"
                    onClick={() => toggleTable(table.name)}
                    className="flex w-full items-center justify-between border-b border-line px-3 py-2 text-left"
                  >
                    <span className="font-mono text-sm font-semibold text-slate-100">{table.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">table</span>
                      <span className="font-mono text-xs text-slate-500">{expandedTables[table.name] ?? true ? "-" : "+"}</span>
                    </span>
                  </button>
                  {expandedTables[table.name] ?? true ? (
                    <div className="divide-y divide-slate-800">
                      {table.columns.map((column) => (
                        <div key={column.name} className="flex items-start justify-between gap-3 px-3 py-2">
                          <span className="font-mono text-xs text-slate-200">{column.name}</span>
                          <span className="text-right font-mono text-[11px] text-slate-500">
                            {column.type}
                            {column.nullable ? "" : " not null"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>

            <section className="mt-5 rounded-lg border border-line bg-panel/60 p-3">
              <h3 className="mb-3 text-sm font-semibold text-slate-100">Relationships</h3>
              <div className="space-y-2">
                {schema.relationships.map((relationship) => (
                  <div key={`${relationship.fromTable}.${relationship.fromColumn}`} className="font-mono text-xs leading-5 text-slate-300">
                    <span className="text-sky-300">
                      {relationship.fromTable}.{relationship.fromColumn}
                    </span>
                    <span className="mx-2 text-slate-600">to</span>
                    <span className="text-emerald-300">
                      {relationship.toTable}.{relationship.toColumn}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}
