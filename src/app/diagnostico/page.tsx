"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DiagnosticStatus = "pass" | "warn" | "fail";

type DiagnosticTest = {
  name: string;
  status: DiagnosticStatus;
  message: string;
  httpStatus?: number | null;
  durationMs?: number;
  details?: Record<string, unknown>;
};

type DiagnosticReport = {
  startedAt: string;
  finishedAt: string;
  url: string;
  userAgent: string;
  language: string;
  platform: string;
  timezone: string;
  tests: DiagnosticTest[];
};

type NetworkInfo = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInfo;
};

const statusStyles: Record<DiagnosticStatus, string> = {
  pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  fail: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

const httpTest = async (
  name: string,
  path: string,
  classifyStatus: (statusCode: number) => {
    status: DiagnosticStatus;
    message: string;
  },
): Promise<DiagnosticTest> => {
  const started = performance.now();

  try {
    const response = await fetch(path, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    const durationMs = Math.round(performance.now() - started);
    const classified = classifyStatus(response.status);

    return {
      name,
      status: classified.status,
      message: classified.message,
      httpStatus: response.status,
      durationMs,
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - started);
    const message = error instanceof Error ? error.message : "Request failed";

    return {
      name,
      status: "fail",
      message,
      httpStatus: null,
      durationMs,
    };
  }
};

const copyToClipboard = async (value: string) => {
  if (!navigator.clipboard) {
    return false;
  }

  await navigator.clipboard.writeText(value);
  return true;
};

export default function DiagnosticoPage() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string>("");

  const runDiagnostic = useCallback(async () => {
    setRunning(true);
    setCopyFeedback("");

    const startedAt = new Date().toISOString();
    const navigatorConnection = (navigator as NavigatorWithConnection)
      .connection;

    const staticChecks: DiagnosticTest[] = [
      {
        name: "Frontend rendering",
        status: "pass",
        message: "Page rendered and JavaScript is running",
      },
      {
        name: "Browser network state",
        status: navigator.onLine ? "pass" : "warn",
        message: navigator.onLine
          ? "Navigator reports online"
          : "Navigator reports offline",
        details: {
          online: navigator.onLine,
          effectiveType: navigatorConnection?.effectiveType || null,
          downlink: navigatorConnection?.downlink || null,
          rtt: navigatorConnection?.rtt || null,
          saveData: navigatorConnection?.saveData || false,
        },
      },
    ];

    const asyncChecks = await Promise.all([
      httpTest("API health", "/api/health", (statusCode) => {
        if (statusCode === 200) {
          return { status: "pass", message: "Health endpoint answered 200" };
        }

        return { status: "fail", message: `Unexpected status ${statusCode}` };
      }),
      httpTest(
        "Conversations API",
        "/api/conversations?limit=1",
        (statusCode) => {
          if (statusCode === 200) {
            return {
              status: "pass",
              message: "Conversations endpoint answered 200",
            };
          }

          if (statusCode === 401) {
            return {
              status: "warn",
              message:
                "Endpoint answered 401 (expected when not authenticated)",
            };
          }

          return { status: "fail", message: `Unexpected status ${statusCode}` };
        },
      ),
      httpTest(
        "Auth profile verification",
        "/api/auth/verify-profile",
        (statusCode) => {
          if (statusCode === 200) {
            return {
              status: "pass",
              message: "Authenticated profile is valid",
            };
          }

          if (statusCode === 401) {
            return {
              status: "warn",
              message: "Not authenticated in this browser session",
            };
          }

          return { status: "fail", message: `Unexpected status ${statusCode}` };
        },
      ),
    ]);

    const finishedAt = new Date().toISOString();
    const builtReport: DiagnosticReport = {
      startedAt,
      finishedAt,
      url: window.location.href,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      tests: [...staticChecks, ...asyncChecks],
    };

    setReport(builtReport);

    const logResult = await fetch("/api/diagnostico/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(builtReport),
    });

    const logJson = logResult.ok ? await logResult.json() : null;
    setReportId(
      typeof logJson?.reportId === "string" ? logJson.reportId : null,
    );
    setRunning(false);
  }, []);

  useEffect(() => {
    runDiagnostic();
  }, [runDiagnostic]);

  const summary = useMemo(() => {
    if (!report) {
      return { pass: 0, warn: 0, fail: 0 };
    }

    return report.tests.reduce(
      (acc, test) => ({
        pass: acc.pass + (test.status === "pass" ? 1 : 0),
        warn: acc.warn + (test.status === "warn" ? 1 : 0),
        fail: acc.fail + (test.status === "fail" ? 1 : 0),
      }),
      { pass: 0, warn: 0, fail: 0 },
    );
  }, [report]);

  const handleCopyReport = useCallback(async () => {
    if (!report) {
      return;
    }

    const copied = await copyToClipboard(JSON.stringify(report, null, 2));
    setCopyFeedback(
      copied ? "Relatorio copiado." : "Falha ao copiar relatorio.",
    );
  }, [report]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Diagnostico UzzApp
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Esta pagina executa testes automaticos de conectividade e
            autenticacao e envia um relatorio para o servidor.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-300">
              Pass: {summary.pass}
            </span>
            <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-300">
              Warn: {summary.warn}
            </span>
            <span className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-rose-300">
              Fail: {summary.fail}
            </span>
            <span className="text-slate-400">
              {running ? "Executando testes..." : "Diagnostico finalizado"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runDiagnostic}
              disabled={running}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-800"
            >
              {running ? "Executando..." : "Executar novamente"}
            </button>
            <button
              type="button"
              onClick={handleCopyReport}
              disabled={!report}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Copiar relatorio JSON
            </button>
          </div>
          {copyFeedback ? (
            <p className="mt-2 text-sm text-slate-300">{copyFeedback}</p>
          ) : null}
          {reportId ? (
            <p className="mt-2 text-xs text-slate-400">Report ID: {reportId}</p>
          ) : null}
        </header>

        <section className="space-y-3">
          {(report?.tests || []).map((test) => (
            <article
              key={test.name}
              className={`rounded-xl border p-4 ${statusStyles[test.status]}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{test.name}</h2>
                <div className="flex items-center gap-3 text-xs">
                  {typeof test.httpStatus === "number" ? (
                    <span>HTTP {test.httpStatus}</span>
                  ) : null}
                  {typeof test.durationMs === "number" ? (
                    <span>{test.durationMs}ms</span>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-sm">{test.message}</p>
              {test.details ? (
                <pre className="mt-3 overflow-x-auto rounded-md border border-slate-700/80 bg-slate-900/70 p-3 text-xs text-slate-200">
                  {JSON.stringify(test.details, null, 2)}
                </pre>
              ) : null}
            </article>
          ))}
        </section>

        {report ? (
          <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Metadados da sessao
            </h2>
            <pre className="mt-3 overflow-x-auto rounded-md border border-slate-700/80 bg-slate-950/80 p-3 text-xs text-slate-300">
              {JSON.stringify(
                {
                  startedAt: report.startedAt,
                  finishedAt: report.finishedAt,
                  url: report.url,
                  userAgent: report.userAgent,
                  language: report.language,
                  platform: report.platform,
                  timezone: report.timezone,
                },
                null,
                2,
              )}
            </pre>
          </section>
        ) : null}
      </div>
    </main>
  );
}
