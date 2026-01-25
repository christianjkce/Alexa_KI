#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const net = require("net");
const tls = require("tls");

const ROOT = "/home/ubuntu";
const LOG_DIR = path.join(ROOT, "logs");
const ENV_PATH = path.join(ROOT, ".env");
const TODAY = new Date();
const DATE_STAMP = TODAY.toISOString().slice(0, 10).replace(/-/g, "");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const loadEnv = (filePath) => {
  const env = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
};

const run = (cmd) => {
  try {
    return execSync(cmd, { encoding: "utf8" });
  } catch (err) {
    return `COMMAND FAILED: ${cmd}\n${err.message}\n`;
  }
};

const collectLogs = () => {
  const sections = [];
  sections.push("## docker logs: app (last 24h)");
  sections.push(run("docker compose logs --since=24h app"));
  sections.push(run("docker logs --since=24h ubuntu-app-1"));
  sections.push("\n## docker logs: db (last 24h)");
  sections.push(run("docker compose logs --since=24h db"));
  sections.push(run("docker logs --since=24h ubuntu-db-1"));
  return sections.join("\n");
};

const extractRequestId = (line) => {
  if (!line) return "";
  const match =
    line.match(/requestId[:=]\s*'([^']+)'/i) ||
    line.match(/requestId[:=]\s*\"([^\"]+)\"/i) ||
    line.match(/requestId[:=]\s*([^,\s]+)/i);
  return match ? match[1].trim() : "";
};

const normalizeLine = (line) => line.replace(/\s+/g, " ").trim();

const analyzeLogs = (logText) => {
  const lines = logText.split(/\r?\n/);
  const errorLines = lines
    .filter((line) => {
    if (!line || !line.trim()) return false;
    if (/http\.log\.access|handled request/i.test(line)) return false;
    if (/checkpoint (starting|complete)/i.test(line)) return false;
    if (/status[^0-9]*5\d\d/i.test(line)) return true;
    return /\b(error|failed|exception|invalid|refused|aborted|timeout)\b/i.test(line);
    })
    .map((line) => {
      const requestId = extractRequestId(line);
      const normalized = normalizeLine(line);
      const isAlexa = requestId.startsWith("amzn1.echo-api.request");
      const isBackground =
        !requestId ||
        requestId === "model_selection_test" ||
        requestId === "model-selection-test";
      return { line: normalized, requestId, isAlexa, isBackground };
    });
  const buckets = {
    logCollection: errorLines.filter((l) => /COMMAND FAILED:/i.test(l.line)),
    straicoTimeout: errorLines.filter((l) => /straico.*(timeout|aborted)/i.test(l.line)),
    straico500: errorLines.filter((l) => /straico.*\b500\b|model marked inactive/i.test(l.line)),
    perplexity: errorLines.filter((l) =>
      /perplexity.*(failed|error)|straico perplexity request failed/i.test(l.line)
    ),
    missingText: errorLines.filter((l) => /response missing text/i.test(l.line)),
    conversationTimeout: errorLines.filter((l) => /conversation timeout/i.test(l.line)),
    auth: errorLines.filter((l) => /authorize invalid credentials|invalid_client|invalid_grant/i.test(l.line)),
    signature: errorLines.filter((l) => /invalid_signature|stale_request/i.test(l.line)),
    network: errorLines.filter((l) => /refused|econnreset|econnrefused/i.test(l.line)),
  };
  const known = new Set(Object.values(buckets).flatMap((linesForBucket) => linesForBucket));
  const otherErrors = errorLines.filter((line) => !known.has(line));
  const userErrors = errorLines.filter((line) => line.isAlexa);
  const backgroundErrors = errorLines.filter((line) => line.isBackground && !line.isAlexa);

  const recommendations = new Set();
  if (buckets.logCollection.length) {
    recommendations.add(
      `Log collection failures (${buckets.logCollection.length}): ensure cron runs with Docker permissions (root or docker group), or switch to docker logs only.`
    );
  }
  if (buckets.straicoTimeout.length) {
    recommendations.add(
      `Straico timeouts (${buckets.straicoTimeout.length}): raise STRAICO_INTERACTIVE_TIMEOUT_MS or reduce prompt size; verify preemptive wait is triggered before Alexa timeout.`
    );
  }
  if (buckets.straico500.length) {
    recommendations.add(
      `Straico 500 / model inactive (${buckets.straico500.length}): verify provider availability and keep STRAICO_FALLBACK_MODEL active; consider disabling unstable models.`
    );
  }
  if (buckets.perplexity.length) {
    recommendations.add(
      `Perplexity failures (${buckets.perplexity.length}): verify PERPLEXITY_API_KEY and adjust PERPLEXITY_TIMEOUT_MS; confirm Straico Perplexity model availability.`
    );
  }
  if (buckets.missingText.length) {
    recommendations.add(
      `Empty Straico replies (${buckets.missingText.length}): verify response schema changes; prefer fallback model or increase max_tokens.`
    );
  }
  if (buckets.auth.length) {
    recommendations.add(
      `OAuth/auth errors (${buckets.auth.length}): verify client_id/secret/redirect_uri and user credentials; ensure user email is verified.`
    );
  }
  if (buckets.signature.length) {
    recommendations.add(
      `Signature/timestamp errors (${buckets.signature.length}): check server clock skew and Alexa signature validation.`
    );
  }
  if (buckets.network.length) {
    recommendations.add(
      `Network errors (${buckets.network.length}): verify outbound connectivity and TLS; check firewall/DNS.`
    );
  }
  if (buckets.conversationTimeout.length) {
    recommendations.add(
      `Conversation timeouts (${buckets.conversationTimeout.length}): ensure pending-response flow is triggered early and LLM timeouts stay below Alexa limits.`
    );
  }
  if (otherErrors.length) {
    recommendations.add(
      `Other errors (${otherErrors.length}): review unknown lines for anomalies.`
    );
  }
  if (!recommendations.size && errorLines.length === 0) {
    recommendations.add("No actionable errors detected in the last 24h.");
  }
  if (!userErrors.length && errorLines.length) {
    recommendations.add(
      "No Alexa request IDs found in errors; likely background/model-selection failures."
    );
  }

  return {
    errorCount: errorLines.length,
    recommendations: Array.from(recommendations),
    buckets,
    otherErrors,
    userErrors,
    backgroundErrors,
  };
};

const formatBucket = (label, lines, maxLines = 8) => {
  if (!lines.length) return "";
  const unique = Array.from(new Set(lines.map((l) => l.line || l))).slice(0, maxLines);
  return [
    `\n${label} (${lines.length})`,
    ...unique.map((line) => `- ${line}`),
  ].join("\n");
};

const summarizeRequestIds = (lines, maxIds = 6) => {
  const counts = new Map();
  for (const entry of lines) {
    if (!entry.requestId) continue;
    counts.set(entry.requestId, (counts.get(entry.requestId) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxIds)
    .map(([id, count]) => `- ${id} (${count})`);
};

const summarizeBucketCounts = (buckets) => {
  const order = [
    ["Log collection failures", "logCollection"],
    ["Straico timeouts", "straicoTimeout"],
    ["Straico 500 / inactive", "straico500"],
    ["Perplexity failures", "perplexity"],
    ["Straico missing text", "missingText"],
    ["Conversation timeouts", "conversationTimeout"],
    ["OAuth/auth errors", "auth"],
    ["Signature/timestamp errors", "signature"],
    ["Network errors", "network"],
  ];
  return order
    .map(([label, key]) => `- ${label}: ${buckets[key]?.length || 0}`)
    .join("\n");
};

const smtpSend = async ({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, to, subject, text }) => {
  if (!smtpHost) {
    return { ok: false, error: "smtp_not_configured" };
  }
  const port = Number(smtpPort) || 587;
  const useTls = false;
  let socket = useTls ? tls.connect(port, smtpHost) : net.connect(port, smtpHost);
  const send = (line) => socket.write(`${line}\r\n`);
  let socketError = null;
  socket.on("error", (err) => {
    socketError = err;
  });
  const readResponse = () =>
    new Promise((resolve, reject) => {
      if (socketError) {
        reject(socketError);
        return;
      }
      const timeout = setTimeout(() => reject(new Error("smtp_timeout")), 8000);
      socket.once("data", (data) => {
        clearTimeout(timeout);
        resolve(data.toString());
      });
    });
  const ensureResponse = (resp, allowedPrefixes, label) => {
    const ok = allowedPrefixes.some((prefix) => resp.startsWith(prefix));
    if (!ok) {
      const err = new Error(`smtp_${label}_failed`);
      err.lastResponse = resp;
      throw err;
    }
  };
  try {
    const banner = await readResponse();
    ensureResponse(banner, ["220"], "banner");
    send(`EHLO ${smtpHost}`);
    let ehloResp = await readResponse();
    if (/STARTTLS/i.test(ehloResp)) {
      send("STARTTLS");
      const tlsResp = await readResponse();
      ensureResponse(tlsResp, ["220"], "starttls");
      socket = tls.connect({ socket, servername: smtpHost });
      socket.on("error", (err) => {
        socketError = err;
      });
      send(`EHLO ${smtpHost}`);
      ehloResp = await readResponse();
    }
    ensureResponse(ehloResp, ["250"], "ehlo");
    if (smtpUser && smtpPass) {
      send("AUTH LOGIN");
      ensureResponse(await readResponse(), ["334"], "auth_login");
      send(Buffer.from(smtpUser).toString("base64"));
      ensureResponse(await readResponse(), ["334"], "auth_user");
      send(Buffer.from(smtpPass).toString("base64"));
      ensureResponse(await readResponse(), ["235"], "auth_pass");
    }
    const headerFrom = smtpFrom || smtpUser;
    const envelopeFrom = smtpUser || smtpFrom || headerFrom;
    send(`MAIL FROM:<${envelopeFrom}>`);
    ensureResponse(await readResponse(), ["250"], "mail_from");
    send(`RCPT TO:<${to}>`);
    ensureResponse(await readResponse(), ["250", "251"], "rcpt_to");
    send("DATA");
    ensureResponse(await readResponse(), ["354"], "data");
    send(`Subject: ${subject}\r\n`);
    send(`From: ${headerFrom}\r\n`);
    send(`To: ${to}\r\n`);
    send("\r\n");
    send(text);
    send("\r\n.");
    ensureResponse(await readResponse(), ["250"], "data_end");
    send("QUIT");
    socket.end();
    return { ok: true };
  } catch (err) {
    socket.end();
    return { ok: false, error: err.message, lastResponse: err.lastResponse };
  }
};

const main = async () => {
  ensureDir(LOG_DIR);
  const env = loadEnv(ENV_PATH);
  const rawLogs = collectLogs();
  const analysis = analyzeLogs(rawLogs);

  const report = [
    `Daily Error Report ${TODAY.toISOString()}`,
    "",
    `Detected error lines: ${analysis.errorCount}`,
    `User-facing errors (Alexa request IDs): ${analysis.userErrors.length}`,
    `Background/test errors: ${analysis.backgroundErrors.length}`,
    "",
    "Errors by category:",
    summarizeBucketCounts(analysis.buckets),
    "",
    "Top Alexa request IDs:",
    ...(summarizeRequestIds(analysis.userErrors).length
      ? summarizeRequestIds(analysis.userErrors)
      : ["- none"]),
    "",
    "Recommended changes:",
    ...analysis.recommendations.map((r) => `- ${r}`),
    "",
    "Error details:",
    formatBucket("Log collection failures", analysis.buckets.logCollection, 6),
    formatBucket("Straico timeouts", analysis.buckets.straicoTimeout),
    formatBucket("Straico 500 / inactive", analysis.buckets.straico500),
    formatBucket("Straico missing text", analysis.buckets.missingText),
    formatBucket("Conversation timeouts", analysis.buckets.conversationTimeout),
    formatBucket("OAuth/auth errors", analysis.buckets.auth),
    formatBucket("Signature/timestamp errors", analysis.buckets.signature),
    formatBucket("Network errors", analysis.buckets.network),
    formatBucket("Other errors", analysis.otherErrors, 5),
  ]
    .filter(Boolean)
    .join("\n");

  const reportPath = path.join(LOG_DIR, `daily-log-report-${DATE_STAMP}.txt`);
  fs.writeFileSync(reportPath, report, "utf8");

  const smtpResult = await smtpSend({
    smtpHost: env.SMTP_HOST,
    smtpPort: env.SMTP_PORT,
    smtpUser: env.SMTP_USER,
    smtpPass: env.SMTP_PASS,
    smtpFrom: env.SMTP_FROM || env.SMTP_USER,
    to: "info@jkce.de",
    subject: `K.I. Daily Log Report ${TODAY.toISOString().slice(0, 10)}`,
    text: report,
  });

  if (!smtpResult.ok) {
    const fallbackPath = path.join(LOG_DIR, `daily-log-report-${DATE_STAMP}.txt`);
    console.error("SMTP failed, report saved to", fallbackPath, smtpResult);
    process.exit(1);
  }
  console.info("Daily report sent to info@jkce.de");
};

main().catch((err) => {
  console.error("Daily report failed", err);
  process.exit(1);
});
