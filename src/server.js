const http = require("http");
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const tokenStore = require("./storage/tokenStore");
const conversationStore = require("./storage/conversationStore");
const userStore = require("./storage/userStore");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

const config = {
  appHost: process.env.APP_HOST || "localhost",
  alexaClientId: process.env.ALEXA_CLIENT_ID || "",
  alexaClientSecret: process.env.ALEXA_CLIENT_SECRET || "",
  alexaClientIdAlt: process.env.ALEXA_CLIENT_ID_ALT || "",
  alexaClientSecretAlt: process.env.ALEXA_CLIENT_SECRET_ALT || "",
  alexaRedirectUri: process.env.ALEXA_REDIRECT_URI || "",
  alexaRedirectUris: (process.env.ALEXA_REDIRECT_URIS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  crokApiKey: process.env.CROK_API_KEY || "",
  crokClientId: process.env.CROK_CLIENT_ID || "",
  crokClientSecret: process.env.CROK_CLIENT_SECRET || "",
  crokApiBase: process.env.CROK_API_BASE || "https://api.crok.google.com",
  crokStatusPath: process.env.CROK_STATUS_PATH || "/status",
  crokActionPath: process.env.CROK_ACTION_PATH || "/action",
  crokRequestTimeoutMs: Number(process.env.CROK_REQUEST_TIMEOUT_MS) || 5000,
  straicoRequestTimeoutMs:
    Number(process.env.STRAICO_REQUEST_TIMEOUT_MS) ||
    Number(process.env.CROK_REQUEST_TIMEOUT_MS) ||
    5000,
  straicoInteractiveTimeoutMs: Number(process.env.STRAICO_INTERACTIVE_TIMEOUT_MS) || 3500,
  straicoStoryTimeoutMs: Number(process.env.STRAICO_STORY_TIMEOUT_MS) || 6000,
  alexaResponseTimeoutMs: Number(process.env.ALEXA_RESPONSE_TIMEOUT_MS) || 6500,
  alexaTimeoutBufferMs: Number(process.env.ALEXA_TIMEOUT_BUFFER_MS) || 300,
  pendingResponseBackgroundTimeoutMs:
    Number(process.env.PENDING_RESPONSE_BG_TIMEOUT_MS) || 9000,
  crokChatActionName: process.env.CROK_CHAT_ACTION_NAME || "chat",
  crokChatParamName: process.env.CROK_CHAT_PARAM_NAME || "text",
  crokChatMode: process.env.CROK_CHAT_MODE || "",
  crokChatPath: process.env.CROK_CHAT_PATH || "/chat/completions",
  crokChatModel: process.env.CROK_CHAT_MODEL || "grok-4",
  crokChatTemperature: Number(process.env.CROK_CHAT_TEMPERATURE) || 0.7,
  crokChatHistoryMax: Number(process.env.CROK_CHAT_HISTORY_MAX) || 6,
  modelSelectionMaxLatencyMs: Number(process.env.MODEL_SELECTION_MAX_LATENCY_MS) || 3000,
  modelSelectionTestTimeoutMs:
    Number(process.env.MODEL_SELECTION_TEST_TIMEOUT_MS) || 5000,
  modelSelectionAutoTests: process.env.MODEL_SELECTION_AUTO_TESTS === "1",
  xaiApiKey: process.env.XAI_API_KEY || "",
  straicoApiKey: process.env.STRAICO_API_KEY || "",
  straicoApiBase: process.env.STRAICO_API_BASE || "https://api.straico.com",
  straicoChatPath: process.env.STRAICO_CHAT_PATH || "/v2/chat/completions",
  straicoChatModel: process.env.STRAICO_CHAT_MODEL || "openai/gpt-5",
  straicoChatSelector: process.env.STRAICO_CHAT_SELECTOR || "",
  straicoModelGptFull: process.env.STRAICO_MODEL_GPT_FULL || "openai/gpt-5",
  straicoModelGptMini: process.env.STRAICO_MODEL_GPT_MINI || "openai/gpt-5-mini",
  straicoModelGptNano: process.env.STRAICO_MODEL_GPT_NANO || "openai/gpt-5-nano",
  straicoModelGeminiFlash:
    process.env.STRAICO_MODEL_GEMINI_FLASH || "google/gemini-2.5-flash",
  straicoModelClaudeSonnet:
    process.env.STRAICO_MODEL_CLAUDE_SONNET || "anthropic/claude-sonnet-4.5",
  straicoModelGrokFast: process.env.STRAICO_MODEL_GROK_FAST || "x-ai/grok-4-fast",
  straicoWebModels: (process.env.STRAICO_WEB_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  straicoStoryModel: process.env.STRAICO_STORY_MODEL || "",
  straicoScenarioDialogModel: process.env.STRAICO_SCENARIO_DIALOG_MODEL || "openai/gpt-5-mini",
  straicoScenarioFactsModel: process.env.STRAICO_SCENARIO_FACTS_MODEL || "google/gemini-2.5-flash",
  straicoScenarioExplainModel:
    process.env.STRAICO_SCENARIO_EXPLAIN_MODEL || "anthropic/claude-sonnet-4.5",
  straicoScenarioTrendModel: process.env.STRAICO_SCENARIO_TREND_MODEL || "x-ai/grok-4-fast",
  straicoFallbackModel: process.env.STRAICO_FALLBACK_MODEL || "openai/gpt-5.1",
  straicoExplainTimeoutMs: Number(process.env.STRAICO_EXPLAIN_TIMEOUT_MS) || 3200,
  straicoMaxTokensShort: Number(process.env.STRAICO_MAX_TOKENS_SHORT) || 360,
  straicoMaxTokensLong: Number(process.env.STRAICO_MAX_TOKENS_LONG) || 1200,
  straicoMaxTokensLongChunk: Number(process.env.STRAICO_MAX_TOKENS_LONG_CHUNK) || 800,
  straicoLongChunkModel: process.env.STRAICO_LONG_CHUNK_MODEL || "x-ai/grok-4-fast",
  straicoLongChunkMaxChars: Number(process.env.STRAICO_LONG_CHUNK_MAX_CHARS) || 1200,
  straicoStoryMaxTokens: Number(process.env.STRAICO_STORY_MAX_TOKENS) || 600,
  straicoStoryChunkMaxChars: Number(process.env.STRAICO_STORY_CHUNK_MAX_CHARS) || 800,
  straicoGenericChunkMaxTokens: Number(process.env.STRAICO_GENERIC_CHUNK_MAX_TOKENS) || 360,
  straicoGenericChunkMaxChars: Number(process.env.STRAICO_GENERIC_CHUNK_MAX_CHARS) || 650,
  pendingResponseTtlMs: Number(process.env.PENDING_RESPONSE_TTL_MS) || 120000,
  straicoHistoryItemMaxChars: Number(process.env.STRAICO_HISTORY_ITEM_MAX_CHARS) || 1200,
  straicoHistoryMaxChars: Number(process.env.STRAICO_HISTORY_MAX_CHARS) || 5000,
  straicoHistoryKeepLast: Number(process.env.STRAICO_HISTORY_KEEP_LAST) || 6,
  straicoHistorySummaryMaxChars: Number(process.env.STRAICO_HISTORY_SUMMARY_MAX_CHARS) || 800,
  straicoHistorySummaryItemMaxChars:
    Number(process.env.STRAICO_HISTORY_SUMMARY_ITEM_MAX_CHARS) || 160,
  straicoRouteSelector: process.env.STRAICO_ROUTE_SELECTOR || "",
  registrationEnabled:
    process.env.REGISTRATION_ENABLED === undefined
      ? true
      : process.env.REGISTRATION_ENABLED === "1" || process.env.REGISTRATION_ENABLED === "true",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
  smtpSecure: process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true",
  promptImproverEnabled:
    process.env.PROMPT_IMPROVER_ENABLED === undefined
      ? true
      : process.env.PROMPT_IMPROVER_ENABLED === "1" ||
        process.env.PROMPT_IMPROVER_ENABLED === "true",
  promptImproverModel: process.env.PROMPT_IMPROVER_MODEL || "openai/o4-mini",
  promptImproverDecisionModel:
    process.env.PROMPT_IMPROVER_DECISION_MODEL || "openai/gpt-5-nano",
  promptImproverDecisionTimeoutMs:
    Number(process.env.PROMPT_IMPROVER_DECISION_TIMEOUT_MS) || 400,
  promptImproverTemperature: Number(process.env.PROMPT_IMPROVER_TEMPERATURE) || 0.2,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY || "",
  perplexityApiBase: process.env.PERPLEXITY_API_BASE || "https://api.perplexity.ai",
  perplexityModel: process.env.PERPLEXITY_MODEL || "sonar",
  perplexityMaxTokens: Number(process.env.PERPLEXITY_MAX_TOKENS) || 220,
  perplexityTimeoutMs: Number(process.env.PERPLEXITY_TIMEOUT_MS) || 4500,
  allowUserApiKey: process.env.ALLOW_USER_API_KEY === "1" || process.env.ALLOW_USER_API_KEY === "true",
  disableAlexaSignatureValidation:
    process.env.DISABLE_ALEXA_SIGNATURE_VALIDATION === "1" ||
    process.env.DISABLE_ALEXA_SIGNATURE_VALIDATION === "true",
  sessionSecret: process.env.SESSION_SECRET || "<redacted>",
  adminUser: process.env.ADMIN_DEFAULT_USER || "admin",
  adminPass: process.env.ADMIN_PASS || "<redacted>",
  qaUserUsername: process.env.QA_USER_USERNAME || "qa_user",
  qaUserEmail: process.env.QA_USER_EMAIL || "qa_user@example.com",
  qaUserPassword: process.env.QA_USER_PASSWORD || "",
  activepiecesWebhookUrl:
    process.env.ACTIVEPIECES_WEBHOOK_URL ||
    "https://cloud.activepieces.com/api/v1/webhooks/nzF9fptu9WIuN6hEGoufE",
  dbHost: process.env.POSTGRES_HOST || "db",
  dbPort: Number(process.env.POSTGRES_PORT) || 5432,
  dbName: process.env.POSTGRES_DB || "",
  dbUser: process.env.POSTGRES_USER || "",
  dbPass: process.env.POSTGRES_PASSWORD || "",
};

const VERIFY_LINK_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const VERIFY_LINK_TTL_TEXT = "3 Tage";

const authCodes = new Map(); // code -> { clientId, userId, scope, redirectUri, exp }
const refreshTokens = new Map(); // token -> { clientId, userId, scope, exp }
const accessTokens = new Map(); // token -> { userId, exp }
let dbPool = null;
const preloadRefresh = tokenStore.allRefreshTokens();
for (const [token, payload] of Object.entries(preloadRefresh)) {
  refreshTokens.set(token, payload);
}
const preloadAccess = tokenStore.allAccessTokens();
for (const [token, payload] of Object.entries(preloadAccess)) {
  if (payload?.exp && payload.exp > Date.now()) {
    accessTokens.set(token, payload);
  }
}

const initEventLog = async () => {
  if (dbPool) return;
  if (!config.dbHost || !config.dbName || !config.dbUser) {
    console.warn("Event log DB not configured; skipping Postgres init.");
    return;
  }
  const pool = new Pool({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPass,
    database: config.dbName,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });
  try {
    await pool.query("select 1");
    await pool.query(
      `create table if not exists conversation_events (
        id bigserial primary key,
        event_ts timestamptz not null default now(),
        user_id text,
        account_user_id text,
        event_type text not null,
        payload jsonb
      )`
    );
    dbPool = pool;
    console.info("Event log DB initialized.");
  } catch (err) {
    console.error("Event log DB init failed", { error: err.message });
    try {
      await pool.end();
    } catch {}
  }
};

const logConversationEvent = async ({ userId, accountUserId, eventType, payload }) => {
  if (!dbPool) return;
  try {
    await dbPool.query(
      "insert into conversation_events (user_id, account_user_id, event_type, payload) values ($1, $2, $3, $4)",
      [userId || null, accountUserId || null, eventType, payload ? JSON.stringify(payload) : null]
    );
  } catch (err) {
    console.warn("Event log write failed", { eventType, error: err.message });
  }
};

const sendJson = (res, status, payload, extraHeaders = {}) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
};

const sendHtml = (res, status, html) => {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store, max-age=0",
  });
  res.end(html);
};

const logoHead = `<link rel="icon" href="/logo.png" type="image/png" />`;
const logoImg = `<img class="logo" src="/logo.png" alt="K. I. Logo" />`;
const uiFont =
  '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
  '<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet" />';
const uiStyles = `
:root {
  --bg: #f5f8ff;
  --ink: #0b1d39;
  --muted: #5b6b86;
  --primary: #1b63ff;
  --primary-strong: #0f4fd6;
  --card: #ffffff;
  --line: #e5edf7;
  --shadow: 0 24px 60px rgba(11, 29, 57, 0.14);
  --radius: 20px;
  --focus: rgba(27, 99, 255, 0.25);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "Sora", "Space Grotesk", "IBM Plex Sans", sans-serif;
  color: var(--ink);
  background:
    radial-gradient(800px 500px at 10% -10%, rgba(27, 99, 255, 0.18), transparent 55%),
    radial-gradient(900px 500px at 100% 0%, rgba(64, 144, 255, 0.12), transparent 60%),
    linear-gradient(180deg, #f7f9ff 0%, #eef4ff 100%);
}
a { color: var(--primary); text-decoration: none; }
.page {
  max-width: 1040px;
  margin: 0 auto;
  padding: 40px 20px 80px;
}
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 28px;
}
.hero {
  display: grid;
  gap: 24px;
  align-items: center;
}
.hero-title {
  font-size: clamp(28px, 4vw, 44px);
  margin: 0 0 12px;
}
.lead {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.logo {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: #f0f4ff;
  padding: 6px;
  object-fit: contain;
  box-shadow: 0 10px 24px rgba(27, 99, 255, 0.18);
}
.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 18px;
  border-radius: 12px;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
  font-weight: 600;
}
.btn.secondary {
  background: transparent;
  color: var(--primary);
}
.section-title {
  font-size: 18px;
  margin: 0 0 16px;
}
.grid {
  display: grid;
  gap: 16px;
}
.grid.steps {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.step {
  padding: 18px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: #f9fbff;
}
.step span {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.form-card {
  max-width: 560px;
  margin: 0 auto;
}
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.home-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
}
.home-link span {
  color: var(--muted);
  font-weight: 500;
  font-size: 12px;
}
.home-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--primary);
  box-shadow: 0 0 0 4px rgba(27, 99, 255, 0.18);
}
label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
input, textarea, select {
  font: inherit;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #f9fbff;
  outline: none;
}
input:focus, textarea:focus, select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--focus);
}
.form-help {
  font-size: 12px;
  color: var(--muted);
}
.status {
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  border-left: 4px solid var(--primary);
  background: #eef4ff;
  color: var(--ink);
}
.status.error {
  border-left-color: #d93f3f;
  background: #fff1ea;
  color: #9b3f21;
}
.status.success {
  border-left-color: #2e9c5d;
  background: #eefaf3;
  color: #1c5b3a;
}
.consent {
  display: grid;
  grid-template-columns: 18px 1fr;
  align-items: start;
  column-gap: 12px;
  font-size: 12px;
  color: var(--muted);
  background: #f1f5ff;
  border: 1px solid var(--line);
  padding: 10px 12px;
  border-radius: 12px;
}
.consent input {
  margin: 2px 0 0 0;
  width: 16px;
  height: 16px;
}
.actions {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}
.footer {
  margin-top: 32px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}
.split {
  display: grid;
  gap: 16px;
}
.hero-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  align-items: stretch;
}
.grid.cols-2 {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.grid.cols-3 {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.doc-section {
  padding: 18px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: #f9fbff;
}
@media (max-width: 720px) {
  .cta-row { flex-direction: column; }
  .hero-grid { grid-template-columns: 1fr; }
}
`;
const uiHead = (extra = "") => `${logoHead}${uiFont}<style>${uiStyles}${extra}</style>`;

const parseBody = async (req, type = "json") => {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data) return resolve({ parsed: null, raw: "" });
      try {
        if (type === "json") {
          resolve({ parsed: JSON.parse(data), raw: data });
        } else if (type === "form") {
          resolve({ parsed: Object.fromEntries(new URLSearchParams(data)), raw: data });
        } else {
          resolve({ parsed: data, raw: data });
        }
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
};

const normalizeSpeech = (value, fallback) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  const maxLen = 7000; // keep well under Alexa PlainText limit
  return text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text;
};

const sendResponse = (res, { speech, shouldEndSession, repromptText, sessionAttributes }) => {
  const safeSpeech = normalizeSpeech(speech, "Entschuldigung, da ist etwas schiefgelaufen.");
  const response = {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text: safeSpeech },
      shouldEndSession: Boolean(shouldEndSession),
    },
  };
  if (sessionAttributes && Object.keys(sessionAttributes).length) {
    response.sessionAttributes = sessionAttributes;
  }
  if (!shouldEndSession && repromptText) {
    response.response.reprompt = { outputSpeech: { type: "PlainText", text: repromptText } };
  }
  return sendJson(res, 200, response);
};

const sendLinkAccountResponse = (res, message = "") => {
  const safeSpeech = normalizeSpeech(
    message || "Bitte verknuepfe dein Konto in der Alexa App.",
    "Bitte verknuepfe dein Konto."
  );
  const response = {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text: safeSpeech },
      card: { type: "LinkAccount" },
      shouldEndSession: true,
    },
  };
  return sendJson(res, 200, response);
};

const buildTimeoutFallback = (requestId) => ({
  speech: "Die Verbindung zur KI ist gerade instabil. Bitte versuche es gleich noch einmal.",
  shouldEndSession: false,
  repromptText: "Sag: bitte nochmal.",
  timedOut: true,
  requestId: requestId || "",
});

const runChatWithTimeout = async ({
  utterance,
  fallbackTranscript,
  sessionAttributes,
  userId,
  accountUserId,
  userAccessToken,
  userApiKey,
  sessionIsNew,
  responseBudgetMs,
  requestId,
  intent,
}) => {
  const pendingUserKey = getPendingUserKey(userId, accountUserId);
  const chatPromise = handleChatUtterance({
    utterance,
    fallbackTranscript,
    sessionAttributes,
    userId,
    accountUserId,
    userAccessToken,
    userApiKey,
    sessionIsNew,
    responseBudgetMs,
    requestMeta: {
      requestId: requestId || "",
      intent,
    },
  });
  const runBackgroundRetry = async () => {
    const backgroundSession = {
      ...sessionAttributes,
      chatHistory: Array.isArray(sessionAttributes.chatHistory)
        ? [...sessionAttributes.chatHistory]
        : [],
    };
    return handleChatUtterance({
      utterance,
      fallbackTranscript,
      sessionAttributes: backgroundSession,
      userId,
      accountUserId,
      userAccessToken,
      userApiKey,
      sessionIsNew: false,
      responseBudgetMs: config.pendingResponseBackgroundTimeoutMs,
      requestMeta: {
        requestId: requestId || "",
        intent,
      },
      skipPersistHistory: true,
    });
  };
  const timeoutMs = Math.max(
    800,
    (responseBudgetMs || config.alexaResponseTimeoutMs) - config.alexaTimeoutBufferMs - 100
  );
  const chat = await Promise.race([
    chatPromise,
    new Promise((resolve) => {
      setTimeout(() => resolve(buildTimeoutFallback(requestId)), timeoutMs);
    }),
  ]);
  if (!chat?.timedOut) return chat;
  const pendingEntry = createPendingResponse({
    userKey: pendingUserKey,
    requestId: requestId || chat.requestId,
    prompt: utterance,
    history: sessionAttributes.chatHistory,
  });
  sessionAttributes.pendingResponseId = pendingEntry?.id || "";
  sessionAttributes.pendingResponseKey = pendingUserKey;
  sessionAttributes.pendingResponseUntil = Date.now() + config.pendingResponseTtlMs;
  sessionAttributes.pendingResponseRequestId = requestId || chat.requestId || "";
  sessionAttributes.pendingResponsePrompt = utterance;
  sessionAttributes.pendingResponseHistory = sessionAttributes.chatHistory || [];
  const settlePendingResponse = async (final) => {
    if (!pendingEntry) return;
    if (final?.speech && String(final.speech).trim() && !isNoAnswerResponse(final.speech)) {
      resolvePendingResponse({
        userKey: pendingUserKey,
        id: pendingEntry.id,
        responseText: final.speech,
      });
      return;
    }
    const retry = await runBackgroundRetry();
    if (retry?.speech && String(retry.speech).trim() && !isNoAnswerResponse(retry.speech)) {
      resolvePendingResponse({
        userKey: pendingUserKey,
        id: pendingEntry.id,
        responseText: retry.speech,
      });
      return;
    }
    failPendingResponse({ userKey: pendingUserKey, id: pendingEntry.id });
  };
  chatPromise
    .then((final) => {
      void settlePendingResponse(final);
    })
    .catch(() => {
      void settlePendingResponse(null);
    });
  console.warn("Conversation timeout", {
    requestId: requestId || chat.requestId || "",
    intent,
  });
  void logConversationEvent({
    userId,
    accountUserId,
    eventType: "conversation_timeout",
    payload: { reason: "response_deadline" },
  });
  return {
    speech: "Die Antwort dauert etwas laenger. Moechtest du warten?",
    shouldEndSession: false,
    repromptText: "Sag: ja oder nein.",
    timedOut: true,
    requestId: requestId || chat.requestId || "",
  };
};

const randomToken = (size = 32) => crypto.randomBytes(size).toString("base64url");

const hashPassword = (password, salt, iterations = 100000) => {
  return crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
};

const verifyStoredPassword = (password, userRecord) => {
  if (!userRecord || !userRecord.salt || !userRecord.hash) return false;
  const iter = Number(userRecord.iterations) || 100000;
  const test = hashPassword(password, userRecord.salt, iter);
  return crypto.timingSafeEqual(Buffer.from(test, "hex"), Buffer.from(userRecord.hash, "hex"));
};

const isAdminUser = (userId) => userId === config.adminUser;

const loadEnvFile = () => {
  const envPath = path.join(process.cwd(), ".env");
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    const lines = raw.split(/\r?\n/);
    const map = new Map();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1);
      map.set(key, value);
    }
    return { envPath, lines, map };
  } catch {
    return { envPath, lines: [], map: new Map() };
  }
};

const saveEnvFile = (lines, envPath) => {
  fs.writeFileSync(envPath, lines.join("\n"));
};

const updateEnvFile = (updates) => {
  const allowedKeys = new Set([
    "REGISTRATION_ENABLED",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "SMTP_SECURE",
    "ACTIVEPIECES_WEBHOOK_URL",
    "QA_USER_USERNAME",
    "QA_USER_EMAIL",
    "QA_USER_PASSWORD",
    "ALEXA_TIMEOUT_BUFFER_MS",
    "PENDING_RESPONSE_BG_TIMEOUT_MS",
    "MODEL_SELECTION_TEST_TIMEOUT_MS",
    "CROK_CHAT_HISTORY_MAX",
    "STRAICO_MODEL_GPT_FULL",
    "STRAICO_MODEL_GPT_MINI",
    "STRAICO_MODEL_GPT_NANO",
    "STRAICO_MODEL_GEMINI_FLASH",
    "STRAICO_MODEL_CLAUDE_SONNET",
    "STRAICO_MODEL_GROK_FAST",
    "STRAICO_WEB_MODELS",
    "STRAICO_STORY_MODEL",
    "STRAICO_FALLBACK_MODEL",
    "STRAICO_MAX_TOKENS_SHORT",
    "STRAICO_MAX_TOKENS_LONG",
    "STRAICO_MAX_TOKENS_LONG_CHUNK",
    "STRAICO_LONG_CHUNK_MAX_CHARS",
    "STRAICO_INTERACTIVE_TIMEOUT_MS",
    "STRAICO_STORY_TIMEOUT_MS",
    "STRAICO_EXPLAIN_TIMEOUT_MS",
    "STRAICO_STORY_MAX_TOKENS",
    "STRAICO_STORY_CHUNK_MAX_CHARS",
    "STRAICO_GENERIC_CHUNK_MAX_TOKENS",
    "STRAICO_GENERIC_CHUNK_MAX_CHARS",
    "PENDING_RESPONSE_TTL_MS",
    "STRAICO_HISTORY_ITEM_MAX_CHARS",
    "STRAICO_HISTORY_MAX_CHARS",
    "STRAICO_HISTORY_KEEP_LAST",
    "STRAICO_HISTORY_SUMMARY_MAX_CHARS",
    "STRAICO_HISTORY_SUMMARY_ITEM_MAX_CHARS",
    "PROMPT_IMPROVER_DECISION_MODEL",
    "PROMPT_IMPROVER_DECISION_TIMEOUT_MS",
  ]);
  const { envPath, lines, map } = loadEnvFile();
  const nextLines = [...lines];
  const existingKeys = new Set();
  for (let i = 0; i < nextLines.length; i += 1) {
    const line = nextLines[i];
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    existingKeys.add(key);
    if (updates[key] !== undefined && allowedKeys.has(key)) {
      nextLines[i] = `${key}=${updates[key]}`;
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.has(key)) continue;
    if (existingKeys.has(key)) continue;
    nextLines.push(`${key}=${value}`);
  }
  saveEnvFile(nextLines, envPath);
};

const resetQaUsers = () => {
  const qaUsername = String(config.qaUserUsername || "").trim();
  const qaEmail = String(config.qaUserEmail || "").trim();
  const qaPassword = String(config.qaUserPassword || "").trim();
  if (!qaUsername || !qaPassword) {
    return { ok: false, error: "missing_qa_credentials" };
  }
  const removed = [];
  const users = userStore.listUsers();
  for (const user of users) {
    if (user.username.startsWith("qa_user_") || user.username === qaUsername) {
      revokeUserTokens(user.username);
      conversationStore.clearHistory(user.username);
      userStore.deleteUser(user.username);
      removed.push(user.username);
    }
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100000;
  const hash = hashPassword(qaPassword, salt, iterations);
  userStore.addUser(qaUsername, {
    hash,
    salt,
    iterations,
    email: qaEmail || qaUsername,
    firstName: "QA",
    lastName: "Test",
    verified: true,
    verifyToken: "",
    verifyUntil: 0,
    createdAt: new Date().toISOString(),
    alexaLinkedAt: "",
    usage: {},
  });
  return { ok: true, removed, created: qaUsername };
};

const REPORTS_DIR = process.env.LOG_REPORTS_DIR || "/app/logs";
const REPORT_FILE_RE = /^(daily|manual)-log-report-\d{8}.*\.txt$/;
const PROMPT_LOG_DIR = path.join(REPORTS_DIR, "prompt-debug");
const PROMPT_LOG_ALEXA_DIR = path.join(PROMPT_LOG_DIR, "alexa");
const PROMPT_LOG_BG_DIR = path.join(PROMPT_LOG_DIR, "background");

const ensureReportsDir = () => {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
};

const getDateStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

const cleanupPromptLogs = () => {
  ensureReportsDir();
  if (!fs.existsSync(PROMPT_LOG_DIR)) {
    fs.mkdirSync(PROMPT_LOG_DIR, { recursive: true });
  }
  const now = Date.now();
  const keepAfterMs = 7 * 24 * 60 * 60 * 1000;
  const sweepDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      try {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) continue;
        if (now - stat.mtimeMs > keepAfterMs) {
          fs.unlinkSync(full);
        }
      } catch {}
    }
  };
  sweepDir(PROMPT_LOG_DIR);
  sweepDir(PROMPT_LOG_ALEXA_DIR);
  sweepDir(PROMPT_LOG_BG_DIR);
};

const isAlexaRequestId = (requestId) =>
  typeof requestId === "string" && requestId.startsWith("amzn1.echo-api.request");

const logPromptDebug = ({ label, modelId, requestId, messages, payloadChars }) => {
  try {
    ensureReportsDir();
    const targetDir = isAlexaRequestId(requestId) ? PROMPT_LOG_ALEXA_DIR : PROMPT_LOG_BG_DIR;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const file = path.join(targetDir, `prompt-${getDateStamp()}.log`);
    const flattenContent = (content) => {
      if (!content) return "";
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((part) => (typeof part?.text === "string" ? part.text : ""))
          .filter(Boolean)
          .join(" ");
      }
      if (typeof content === "object" && typeof content.text === "string") {
        return content.text;
      }
      return "";
    };
    const safeMessages = Array.isArray(messages)
      ? messages.map((m) => ({
          role: m.role,
          content: flattenContent(m.content).slice(0, 4000),
        }))
      : [];
    const entry = {
      ts: new Date().toISOString(),
      label,
      modelId,
      requestId,
      payloadChars,
      messages: safeMessages,
    };
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`);
  } catch {}
};

const formatBytes = (value) => {
  const size = Number(value) || 0;
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const listReportFiles = () => {
  try {
    if (!fs.existsSync(REPORTS_DIR)) return [];
    return fs
      .readdirSync(REPORTS_DIR)
      .filter((name) => REPORT_FILE_RE.test(name))
      .map((name) => {
        const full = path.join(REPORTS_DIR, name);
        const stat = fs.statSync(full);
        return { name, size: stat.size, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return [];
  }
};

const tailFile = (filePath, maxLines = 200) => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    return lines.slice(-maxLines).join("\n");
  } catch {
    return "";
  }
};

const createManualReport = async () => {
  ensureReportsDir();
  const stamp = new Date();
  const datePart = stamp.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = stamp.toISOString().slice(11, 19).replace(/:/g, "");
  const filename = `manual-log-report-${datePart}-${timePart}.txt`;
  const lines = [];
  lines.push(`Manual Log Report ${stamp.toISOString()}`);
  lines.push("");

  if (dbPool) {
    try {
      const totalRes = await dbPool.query(
        "select count(*)::int as total from conversation_events where event_ts >= now() - interval '24 hours'"
      );
      const errorRes = await dbPool.query(
        "select count(*)::int as total from conversation_events where event_ts >= now() - interval '24 hours' and event_type in ('llm_error','llm_timeout','conversation_timeout')"
      );
      const topRes = await dbPool.query(
        "select event_type, count(*)::int as total from conversation_events where event_ts >= now() - interval '24 hours' group by event_type order by total desc limit 10"
      );
      const recentErrors = await dbPool.query(
        "select event_ts, event_type, payload from conversation_events where event_ts >= now() - interval '24 hours' and event_type in ('llm_error','llm_timeout','conversation_timeout') order by event_ts desc limit 20"
      );

      lines.push(`Eventlog (24h): total=${totalRes.rows[0]?.total ?? 0}, errors=${errorRes.rows[0]?.total ?? 0}`);
      lines.push("");
      lines.push("Top Events:");
      topRes.rows.forEach((row) => {
        lines.push(`- ${row.event_type}: ${row.total}`);
      });
      lines.push("");
      lines.push("Recent Errors:");
      if (!recentErrors.rows.length) {
        lines.push("- Keine Fehler in den letzten 24h.");
      } else {
        recentErrors.rows.forEach((row) => {
          lines.push(
            `- ${row.event_ts.toISOString()} ${row.event_type} ${JSON.stringify(
              row.payload || {}
            )}`
          );
        });
      }
    } catch (err) {
      lines.push("Eventlog-Auswertung fehlgeschlagen.");
      lines.push(String(err.message || err));
    }
  } else {
    lines.push("Eventlog ist derzeit nicht verfuegbar.");
  }

  const caddyLog = path.join(REPORTS_DIR, "caddy", "access.log");
  if (fs.existsSync(caddyLog)) {
    lines.push("");
    lines.push("Caddy access.log (letzte 200 Zeilen):");
    lines.push(tailFile(caddyLog, 200));
  }

  fs.writeFileSync(path.join(REPORTS_DIR, filename), lines.join("\n"), "utf8");
  return filename;
};

const smtpSend = async ({ to, subject, text }) => {
  if (!config.smtpHost) return { ok: false, error: "smtp_not_configured" };
  const net = require("net");
  const tls = require("tls");
  const port = config.smtpPort || 587;
  const useTls = Boolean(config.smtpSecure);
  let socket = useTls ? tls.connect(port, config.smtpHost) : net.connect(port, config.smtpHost);
  const send = (line) => socket.write(`${line}\r\n`);
  let lastResponse = "";
  const ensureResponse = (resp, allowedPrefixes, label) => {
    const ok = allowedPrefixes.some((prefix) => resp.startsWith(prefix));
    if (!ok) {
      const err = new Error(`smtp_${label}_failed`);
      err.lastResponse = resp;
      throw err;
    }
  };
  const readResponse = () =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("smtp_timeout")), 8000);
      socket.once("data", (data) => {
        clearTimeout(timeout);
        lastResponse = data.toString();
        resolve(lastResponse);
      });
    });
  const upgradeToTls = async () => {
    await new Promise((resolve, reject) => {
      const tlsSocket = tls.connect(
        { socket, servername: config.smtpHost },
        () => resolve(tlsSocket)
      );
      tlsSocket.once("error", reject);
      socket = tlsSocket;
    });
  };
  try {
    const banner = await readResponse();
    ensureResponse(banner, ["220"], "banner");
    send(`EHLO ${config.appHost || "localhost"}`);
    let ehloResp = await readResponse();
    if (!useTls && /STARTTLS/i.test(ehloResp)) {
      send("STARTTLS");
      const tlsResp = await readResponse();
      if (!/^220/.test(tlsResp)) {
        throw new Error("smtp_starttls_failed");
      }
      await upgradeToTls();
      send(`EHLO ${config.appHost || "localhost"}`);
      ehloResp = await readResponse();
    }
    ensureResponse(ehloResp, ["250"], "ehlo");
    if (config.smtpUser && config.smtpPass) {
      send("AUTH LOGIN");
      ensureResponse(await readResponse(), ["334"], "auth_login");
      send(Buffer.from(config.smtpUser).toString("base64"));
      ensureResponse(await readResponse(), ["334"], "auth_user");
      send(Buffer.from(config.smtpPass).toString("base64"));
      ensureResponse(await readResponse(), ["235"], "auth_pass");
    }
    const headerFrom = config.smtpFrom || config.smtpUser;
    const envelopeFrom = config.smtpUser || config.smtpFrom || headerFrom;
    send(`MAIL FROM:<${envelopeFrom}>`);
    ensureResponse(await readResponse(), ["250"], "mail_from");
    send(`RCPT TO:<${to}>`);
    ensureResponse(await readResponse(), ["250", "251"], "rcpt_to");
    send("DATA");
    ensureResponse(await readResponse(), ["354"], "data");
    send(`Subject: ${subject}\r\n`);
    send(`From: ${headerFrom}\r\n`);
    if (headerFrom) {
      send(`Reply-To: ${headerFrom}\r\n`);
    }
    send(`To: ${to}\r\n`);
    send("\r\n");
    send(text);
    send("\r\n.");
    ensureResponse(await readResponse(), ["250"], "data_end");
    send("QUIT");
    socket.end();
    console.info("SMTP sent", { to, subject });
    return { ok: true };
  } catch (err) {
    socket.end();
    return { ok: false, error: err.message, lastResponse: err.lastResponse || lastResponse };
  }
};

const sendVerificationEmail = async ({ username, email }) => {
  const verifyToken = randomToken(24);
  const verifyUntil = Date.now() + VERIFY_LINK_TTL_MS;
  userStore.updateUser(username, { verifyToken, verifyUntil });
  const baseUrl = process.env.APP_BASE_URL || `https://${config.appHost}`;
  const verifyUrl = `${baseUrl}/verify?user=${encodeURIComponent(
    username
  )}&token=${encodeURIComponent(verifyToken)}`;
  const mail = await smtpSend({
    to: email,
    subject: "Bestaetige deinen K. I. Zugang",
    text: `Bitte bestaetige deinen Zugang:\n${verifyUrl}\n\nLink ist ${VERIFY_LINK_TTL_TEXT} gueltig.`,
  });
  return { mail, verifyToken, verifyUntil, verifyUrl };
};

const postActivepiecesWebhook = async ({ name, firstName, lastName, email }) => {
  if (!config.activepiecesWebhookUrl) return { ok: false, error: "webhook_missing" };
  const payload = JSON.stringify({ name, firstName, lastName, email });
  return new Promise((resolve) => {
    const url = new URL(config.activepiecesWebhookUrl);
    const req = https.request(
      {
        method: "POST",
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        port: url.port || 443,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          if (!ok) {
            return resolve({ ok: false, error: `status_${res.statusCode}`, body });
          }
          return resolve({ ok: true, body });
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.write(payload);
    req.end();
  });
};

const perplexityChatCompletion = async ({ messages, maxTokens, timeoutMs }) => {
  if (!config.perplexityApiKey) {
    return { ok: false, status: 401, json: { error: "perplexity_missing_key" } };
  }
  const payload = JSON.stringify({
    model: config.perplexityModel,
    messages,
    max_tokens: maxTokens || config.perplexityMaxTokens,
    temperature: 0.2,
  });
  return new Promise((resolve) => {
    const url = new URL(config.perplexityApiBase);
    const req = https.request(
      {
        method: "POST",
        hostname: url.hostname,
        path: "/chat/completions",
        port: url.port || 443,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
          authorization: `Bearer ${config.perplexityApiKey}`,
        },
        timeout: timeoutMs || config.perplexityTimeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = { error: "invalid_json", body };
          }
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          return resolve({ ok, status: res.statusCode, json: parsed });
        });
      }
    );
    req.on("error", (err) =>
      resolve({ ok: false, status: 500, json: { error: "request_failed", detail: err.message } })
    );
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.write(payload);
    req.end();
  });
};

const extractPerplexityText = (json) => {
  return (
    json?.choices?.[0]?.message?.content ||
    json?.choices?.[0]?.text ||
    json?.answer ||
    ""
  );
};

const shouldAskForLocation = (text) => {
  const t = normalizeCommand(text || "");
  return t.endsWith("?") && /stadt|ort|land/.test(t);
};

const getPerplexityTimeout = (responseBudgetMs) => {
  const base = Number(config.perplexityTimeoutMs) || 2600;
  if (!responseBudgetMs) return base;
  const budget = Math.max(
    1200,
    responseBudgetMs - config.alexaTimeoutBufferMs - 200
  );
  return Math.min(base, budget);
};

const runPerplexityWeather = async ({
  query,
  preferredLocation,
  detectedLocation,
  responseBudgetMs,
  requestId,
}) => {
  const systemPrompt =
    "Du bist ein Wetterassistent. Antworte auf Deutsch mit 2 bis 3 Saetzen. " +
    "Wenn kein eindeutiger Ort genannt wurde und kein Standard-Ort vorliegt, " +
    "frage einmal gezielt nach Stadt und Land. Keine langen Listen.";
  const userPromptParts = [
    `Frage: ${query}`,
    `Standard-Ort: ${preferredLocation || "kein"}`,
    `Genannter Ort: ${detectedLocation || "kein"}`,
  ];
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPromptParts.join("\n") },
  ];
  console.info("Perplexity weather context", {
    requestId: requestId || "",
    messageCount: messages.length,
    queryChars: String(query || "").length,
  });
  const timeoutMs = getPerplexityTimeout(responseBudgetMs);
  const maxTokens = Math.min(config.perplexityMaxTokens, 260);
  let lastStatus;
  let lastError;
  if (config.perplexityApiKey) {
    console.info("Perplexity weather via direct API", { timeoutMs });
    const search = await perplexityChatCompletion({
      messages,
      maxTokens,
      timeoutMs,
    });
    if (search.ok) {
      const text = extractPerplexityText(search.json);
      if (text) return { text, usedStraico: false };
    } else {
      lastStatus = search.status;
      lastError = search.json?.error;
      console.warn("Perplexity weather direct failed", {
        status: lastStatus,
        error: lastError,
      });
    }
  }
  const webModel = getPerplexityWebModelOnly();
  if (webModel) {
    console.info("Perplexity weather via Straico", {
      model: webModel,
      requestId: requestId || "",
      timeoutMs,
    });
    const straico = await straicoChatCompletions(messages, {
      model: webModel,
      useAutoSelector: false,
      fallbackModel: null,
      maxTokens,
      timeoutMs,
      requestId: requestId || "",
    });
    if (straico.ok) {
      const text = extractStraicoText(straico.json);
      if (text) return { text, usedStraico: true };
    }
    if (!straico.ok) {
      lastStatus = straico.status;
      lastError = straico.json?.error;
      console.warn("Perplexity weather Straico failed", {
        status: lastStatus,
        error: lastError,
        requestId: requestId || "",
      });
    }
  } else {
    console.warn("Perplexity weather: no Straico Perplexity model available");
  }
  return {
    text: "",
    usedStraico: Boolean(webModel),
    status: lastStatus || 500,
    error: lastError || "request_failed",
  };
};

const parseJsonFromText = (text) => {
  if (!text) return null;
  const trimmed = String(text || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }
  return null;
};

const resolveLocationWithPerplexity = async (query) => {
  if (!config.perplexityApiKey) return null;
  const messages = [
    {
      role: "system",
      content:
        "Extrahiere aus der Nutzeranfrage den Ort (Stadt/Region/Land). " +
        "Antworte nur als JSON mit Feldern location und confidence (0-1). " +
        'Beispiel: {"location":"Heubach, Thueringen, Deutschland","confidence":0.78}.',
    },
    { role: "user", content: query },
  ];
  const result = await perplexityChatCompletion({
    messages,
    maxTokens: 120,
    timeoutMs: Math.min(config.perplexityTimeoutMs, 3500),
  });
  if (!result.ok) return null;
  const text = extractPerplexityText(result.json);
  const parsed = parseJsonFromText(text);
  if (!parsed || !parsed.location) return null;
  const confidence = Number(parsed.confidence || 0);
  return {
    location: String(parsed.location || "").trim(),
    confidence: Number.isFinite(confidence) ? confidence : 0,
  };
};

const perplexityClarifyLocation = async (query) => {
  if (!config.perplexityApiKey) return "";
  const messages = [
    {
      role: "system",
      content:
        "Du bist ein Sprachassistent. Stelle eine kurze Rueckfrage, um den Ort zu klaeren. " +
        "Nur eine Frage, kein extra Text.",
    },
    { role: "user", content: query },
  ];
  const result = await perplexityChatCompletion({
    messages,
    maxTokens: 80,
    timeoutMs: Math.min(config.perplexityTimeoutMs, 3500),
  });
  if (!result.ok) return "";
  return extractPerplexityText(result.json) || "";
};

const buildWeatherPromptWithLocation = (prompt, location) => {
  const normalizedPrompt = normalizeCommand(prompt || "");
  const normalizedLocation = normalizeCommand(location || "");
  if (normalizedPrompt && normalizedLocation && normalizedPrompt.includes(normalizedLocation)) {
    return String(prompt || "").trim();
  }
  return prompt ? `${prompt} in ${location}` : `Wetter in ${location}`;
};

const resolveWeatherLocation = async (locationText, fallbackText = "") => {
  const seed = String(locationText || fallbackText || "").trim();
  if (!seed) return null;
  const resolved = await resolveLocationWithPerplexity(seed);
  const resolvedLocation =
    resolved?.location ||
    extractLocationFromUtterance(seed) ||
    seed;
  if (!resolvedLocation) return null;
  const candidates = await getLocationCandidates(resolvedLocation);
  let picked = pickBestLocation(resolvedLocation, candidates);
  if (!picked && candidates.length) picked = candidates[0];
  return picked || null;
};

const escapeHtml = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const signSession = (userId) => {
  const ts = Date.now().toString();
  const payload = `${userId}:${ts}`;
  const sig = crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
  return `${payload}:${sig}`;
};

const verifySession = (cookie) => {
  if (!cookie) return null;
  const [userId, ts, sig] = cookie.split(":");
  if (!userId || !ts || !sig) return null;
  const payload = `${userId}:${ts}`;
  const expected = crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const ageMs = Date.now() - Number(ts);
  if (Number.isNaN(ageMs) || ageMs > 12 * 60 * 60 * 1000) return null; // 12h session
  return userId;
};

const parseCookies = (header) => {
  const out = {};
  if (!header) return out;
  const parts = header.split(";");
  for (const p of parts) {
    const [k, v] = p.trim().split("=");
    if (k && v) out[k] = v;
  }
  return out;
};

const parseBasicAuth = (header) => {
  if (!header) return null;
  const [scheme, encoded] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "basic" || !encoded) return null;
  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch (err) {
    return null;
  }
  const idx = decoded.indexOf(":");
  if (idx === -1) return null;
  const id = decoded.slice(0, idx);
  const secret = decoded.slice(idx + 1);
  if (!id || !secret) return null;
  return { id, secret };
};

const getJson = async (urlString, timeoutMs) => {
  return new Promise((resolve) => {
    const url = new URL(urlString);
    const req = https.request(
      {
        method: "GET",
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        port: url.port || 443,
        timeout: timeoutMs || 2500,
      },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = { error: "invalid_json", body };
          }
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          return resolve({ ok, status: res.statusCode, json: parsed });
        });
      }
    );
    req.on("error", (err) =>
      resolve({ ok: false, status: 500, json: { error: "request_failed", detail: err.message } })
    );
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.end();
  });
};

const resolveAccessToken = (token) => {
  if (!token) return null;
  const cached = accessTokens.get(token) || tokenStore.getAccessToken(token);
  if (!cached) return null;
  if (cached.exp && cached.exp < Date.now()) {
    accessTokens.delete(token);
    tokenStore.deleteAccessToken(token);
    return null;
  }
  accessTokens.set(token, cached);
  return cached;
};

const getPreferredLocation = (accountUserId) => {
  if (!accountUserId) return "";
  const user = userStore.getUser(accountUserId);
  return user?.preferredLocation || "";
};

const savePreferredLocation = (accountUserId, location) => {
  if (!accountUserId || !location) return;
  const user = userStore.getUser(accountUserId);
  if (!user) return;
  if (user.preferredLocation) return;
  userStore.updateUser(accountUserId, { preferredLocation: location });
};

const getWeatherForLocation = async (location, options = {}) => {
  const mode = options.mode || "current";
  const name = encodeURIComponent(location);
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${name}&count=1&language=de&format=json`;
  const geo = await getJson(geoUrl, 2500);
  if (!geo.ok || !geo.json?.results?.length) {
    return { ok: false, error: "geocode_failed" };
  }
  const place = geo.json.results[0];
  const lat = place.latitude;
  const lon = place.longitude;
  const forecastUrl =
    mode === "tomorrow"
      ? "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${lat}&longitude=${lon}` +
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max" +
        "&timezone=auto"
      : "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${lat}&longitude=${lon}` +
        "&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m" +
        "&timezone=auto";
  const forecast = await getJson(forecastUrl, 2500);
  if (!forecast.ok || (mode === "current" && !forecast.json?.current)) {
    return { ok: false, error: "forecast_failed" };
  }
  return {
    ok: true,
    location: place.name || location,
    current: forecast.json.current,
    daily: forecast.json.daily,
  };
};

const revokeUserTokens = (userId) => {
  if (!userId) return;
  for (const [token, payload] of accessTokens.entries()) {
    if (payload?.userId === userId) {
      accessTokens.delete(token);
    }
  }
  for (const [token, payload] of refreshTokens.entries()) {
    if (payload?.userId === userId) {
      refreshTokens.delete(token);
    }
  }
  tokenStore.deleteTokensForUser(userId);
};

const recordUserUsage = (userId, costValue) => {
  if (!userId) return;
  const user = userStore.getUser(userId);
  if (!user) return;
  const year = String(new Date().getFullYear());
  const usage = user.usage || {};
  const entry = usage[year] || { requests: 0, cost: 0 };
  entry.requests += 1;
  if (typeof costValue === "number" && Number.isFinite(costValue)) {
    entry.cost += costValue;
  }
  usage[year] = entry;
  userStore.updateUser(userId, { usage });
};

const extractStraicoCost = (json) => {
  const price = json?.price || json?.pricing;
  const candidates = [
    json?.overall_price?.total,
    json?.overall_price?.total_coins,
    json?.overall_price?.totalCoins,
    price?.total,
    price?.total_coins,
    price?.totalCoins,
    json?.price_total,
    json?.cost,
  ];
  for (const value of candidates) {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const renderLogin = (message = "") => {
  const statusClass = message
    ? /erfolg|gesendet|bestaetigt|aktualisiert/i.test(message)
      ? "status success"
      : "status error"
    : "";
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K. I. - Anmeldung</title>
  ${uiHead()}
</head>
<body>
  <div class="page">
    <section class="card form-card">
      <div class="top-nav">
        <a class="home-link" href="/"><span class="home-dot"></span> Zur Startseite</a>
      </div>
      <div class="brand">
        ${logoImg}
        <div>
          <h1 class="hero-title">Konto-Anmeldung</h1>
          <p class="lead">Melde dich an, um dein Konto zu verwalten.</p>
        </div>
      </div>
      ${message ? `<div class="${statusClass}">${escapeHtml(message)}</div>` : ""}
      <form method="POST" action="/login">
        <label>Benutzername oder E-Mail
          <input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" />
        </label>
        <label>Passwort
          <input type="password" name="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" />
        </label>
        <div class="actions">
          <button class="btn" type="submit">Anmelden</button>
        </div>
      </form>
      <div class="form-help">Noch kein Konto? <a href="/register">Jetzt registrieren</a> - <a href="/reset">Passwort vergessen</a> - <a href="/verify/resend">Bestaetigungslink anfordern</a></div>
    </section>
  </div>
</body>
</html>`;
};

const renderAuthorizePage = ({ clientId = "", redirectUri = "", state = "", scope = "", message = "" }) => {
  const statusClass = message
    ? /erfolg|bestaetigt|ok/i.test(message)
      ? "status success"
      : "status error"
    : "";
  const notice = message ? `<div class="${statusClass}">${escapeHtml(message)}</div>` : "";
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K. I. - Skill-Verknuepfung</title>
  ${uiHead()}
</head>
<body>
  <div class="page">
    <section class="hero-grid">
      <div class="card hero">
        <div class="brand">
          ${logoImg}
          <div>
            <h1 class="hero-title">K. I. mit Alexa verbinden</h1>
            <p class="lead">Bitte melde dich an, um den Skill sicher mit deinem Konto zu verknuepfen.</p>
          </div>
        </div>
        <div class="form-help">Du kannst die Verknuepfung jederzeit in der Alexa App trennen.</div>
      </div>
      <div class="card form-card">
        <h2 class="section-title">Verknuepfung bestaetigen</h2>
        ${notice}
        <form method="POST" action="/oauth/authorize">
          <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
          <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
          <input type="hidden" name="state" value="${escapeHtml(state)}" />
          <input type="hidden" name="scope" value="${escapeHtml(scope)}" />
          <label>Benutzername oder E-Mail
            <input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" />
          </label>
          <label>Passwort
            <input type="password" name="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" />
          </label>
          <div class="actions">
            <button class="btn" type="submit">Zugriff erlauben</button>
          </div>
        </form>
        <div class="status">Kein Konto? <a href="/register">Jetzt registrieren</a>. <a href="/reset">Passwort vergessen</a>. <a href="/verify/resend">Bestaetigungslink anfordern</a>.</div>
        <div class="form-help">Diese Seite dient nur der Verknuepfung des Skills.</div>
      </div>
    </section>
  </div>
</body>
</html>`;
};

const renderAdminLogin = (message = "") => {
  const statusClass = message
    ? /erfolg|gesendet|bestaetigt|aktualisiert/i.test(message)
      ? "status success"
      : "status error"
    : "";
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K. I. - Admin Login</title>
  ${uiHead()}
</head>
<body>
  <div class="page">
    <section class="card form-card">
      <div class="top-nav">
        <a class="home-link" href="/"><span class="home-dot"></span> Zur Startseite</a>
      </div>
      <div class="brand">
        ${logoImg}
        <div>
          <h1 class="hero-title">Admin-Anmeldung</h1>
          <p class="lead">Zugang fuer die Verwaltung des Skills und der Nutzerkonten.</p>
        </div>
      </div>
      ${message ? `<div class="${statusClass}">${escapeHtml(message)}</div>` : ""}
      <form method="POST" action="/admin/login">
        <label>Admin-User
          <input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" />
        </label>
        <label>Admin-Passwort
          <input type="password" name="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" />
        </label>
        <div class="actions">
          <button class="btn" type="submit">Admin Login</button>
        </div>
      </form>
      <div class="form-help">Zur Nutzer-Anmeldung: <a href="/login">/login</a></div>
    </section>
  </div>
</body>
</html>`;
};

const renderRegister = (message = "") => {
  const statusClass = message
    ? /erfolg|gesendet|bestaetigt|aktualisiert/i.test(message)
      ? "status success"
      : "status error"
    : "";
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K. I. - Registrierung</title>
  ${uiHead()}
</head>
<body>
  <div class="page">
    <section class="card form-card">
      <div class="top-nav">
        <a class="home-link" href="/"><span class="home-dot"></span> Zur Startseite</a>
      </div>
      <div class="brand">
        ${logoImg}
        <div>
          <h1 class="hero-title">Konto erstellen</h1>
          <p class="lead">Schritt 1 von 2 - lege deinen Zugang fuer den Skill an.</p>
        </div>
      </div>
      ${message ? `<div class="${statusClass}">${escapeHtml(message)}</div>` : ""}
      <form method="POST" action="/register">
        <label>Vorname
          <input name="firstName" autocomplete="given-name" autocapitalize="words" autocorrect="off" spellcheck="false" />
        </label>
        <label>Nachname
          <input name="lastName" autocomplete="family-name" autocapitalize="words" autocorrect="off" spellcheck="false" />
        </label>
        <label>Benutzername
          <input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" />
        </label>
        <label>E-Mail
          <input type="email" name="email" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false" />
        </label>
        <label>Passwort
          <input type="password" name="password" autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false" />
        </label>
        <div class="form-help">Mindestens 8 Zeichen, bitte ein sicheres Passwort verwenden.</div>
        <label>Passwort bestaetigen
          <input type="password" name="passwordConfirm" autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false" />
        </label>
        <label class="consent">
          <input type="checkbox" name="privacyConsent" required />
          <span>Ich stimme der <a href="/privacy" target="_blank" rel="noopener">Datenschutzerklaerung</a> zu (notwendig fuer die Nutzung).</span>
        </label>
        <label class="consent">
          <input type="checkbox" name="termsConsent" required />
          <span>Ich akzeptiere die <a href="/terms" target="_blank" rel="noopener">Nutzungsbedingungen</a>.</span>
        </label>
        <div class="actions">
          <button class="btn" type="submit">Registrieren</button>
          <a class="btn secondary" href="/login">Zum Login</a>
        </div>
      </form>
    </section>
  </div>
</body>
</html>`;
};

const renderLanding = (message = "") => {
  const notice = message
    ? `<div class=\"status\">${escapeHtml(message)}</div>`
    : `<div class=\"status\">Klarer Dialog, sichere Kontenfuehrung, optimiert fuer Sprache.</div>`;
  return `<!doctype html>
<html lang=\"de\">
<head>
  <meta charset=\"utf-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
  <title>K. I. Alexa Skill</title>
  ${uiHead()}
</head>
<body>
  <div class=\"page\">
    <section class=\"hero-grid\">
      <div class=\"card hero\">
        <div class=\"brand\">
          ${logoImg}
          <div>
            <h1 class=\"hero-title\">K. I. - Dein persoenlicher Alexa-Assistent</h1>
            <p class=\"lead\">Der Skill fuer natuerliche, gesprochene Gespraeche auf Deutsch. Schnell, fokussiert und fuer den Alltag optimiert.</p>
          </div>
        </div>
        <div class=\"cta-row\">
          <a class=\"btn\" href=\"/register\">Jetzt registrieren</a>
          <a class=\"btn secondary\" href=\"/login\">Login</a>
          <a class=\"btn secondary\" href=\"/reset\">Passwort vergessen</a>
        </div>
        ${notice}
      </div>
      <div class=\"card\">
        <h2 class=\"section-title\">So funktioniert es in 3 Schritten</h2>
        <div class=\"grid steps\">
          <div class=\"step\">
            <span>Schritt 1</span>
            <h3>Konto erstellen</h3>
            <p class=\"lead\">Registriere dich in weniger als zwei Minuten und bestaetige deine E-Mail.</p>
          </div>
          <div class=\"step\">
            <span>Schritt 2</span>
            <h3>Skill verknuepfen</h3>
            <p class=\"lead\">Melde dich in der Alexa App an und verbinde deinen Account mit K. I.</p>
          </div>
          <div class=\"step\">
            <span>Schritt 3</span>
            <h3>Lossprechen</h3>
            <p class=\"lead\">Sag einfach KI. K. I. fuehrt dich durch das Gespraech.</p>
          </div>
        </div>
      </div>
    </section>

    <section class=\"grid cols-3\" style=\"margin-top: 24px\">
      <div class=\"card\">
        <h2 class=\"section-title\">Account & Betrieb</h2>
        <p class=\"lead\">Dieses Konto verwaltet den offiziellen K. I. Skill. Hier laufen Tests, Konfiguration und Betrieb.</p>
        <p class=\"lead\">Sprache: de-DE. Fokus auf klare Rueckfragen und natuerliche Antworten.</p>
        <p class=\"lead\">Hinweis: Der Account ist derzeit nicht bezahlt. Die Nutzung kann daher eingeschraenkt sein.</p>
      </div>
      <div class=\"card\">
        <h2 class=\"section-title\">Datenschutz & Nutzung</h2>
        <p class=\"lead\">Wir speichern nur, was fuer die Funktion erforderlich ist. Details findest du in den Richtlinien.</p>
        <div class=\"cta-row\">
          <a class=\"btn secondary\" href=\"/privacy\">Datenschutz</a>
          <a class=\"btn secondary\" href=\"/terms\">Nutzungsbedingungen</a>
        </div>
      </div>
      <div class=\"card\">
        <h2 class=\"section-title\">Kontakt</h2>
        <form method=\"POST\" action=\"/contact\">
          <label>Name
            <input name=\"name\" required />
          </label>
          <label>E-Mail
            <input name=\"email\" type=\"email\" required />
          </label>
          <label>Nachricht
            <textarea name=\"message\" required></textarea>
          </label>
          <div class=\"actions\">
            <button class=\"btn\" type=\"submit\">Nachricht senden</button>
          </div>
        </form>
      </div>
    </section>

    <footer class=\"footer\">
      Kontakt: info@jkce.de - <a href=\"/register\">Registrieren</a> - <a href=\"/reset\">Passwort reset</a> -
      <a href=\"/privacy\">Datenschutz</a> - <a href=\"/terms\">Nutzungsbedingungen</a> - <a href=\"/impressum\">Impressum</a>
    </footer>
  </div>
</body>
</html>`;
};

const renderPrivacy = () => `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Datenschutz</title>
    ${uiHead()}
  </head>
  <body>
    <div class="page">
      <section class="card">
        <div class="brand">
          ${logoImg}
          <div>
            <h1 class="hero-title">Datenschutzerklaerung fuer den Alexa Skill "K. I."</h1>
            <p class="lead">Informationen zur Verarbeitung personenbezogener Daten fuer Skill und Webanwendung.</p>
          </div>
        </div>
      </section>

      <section class="card" style="margin-top: 16px">
        <div class="grid">
          <div class="doc-section">
            <h3>1. Verantwortlicher</h3>
            <p class="lead">Christian Eichhorn<br />Weinbergstr. 3<br />96523 Steinach<br /><a href="mailto:info@jkce.de">info@jkce.de</a></p>
          </div>
          <div class="doc-section">
            <h3>2. Allgemeines zur Datenverarbeitung</h3>
            <p class="lead">Der Schutz personenbezogener Daten ist uns ein wichtiges Anliegen. Diese Datenschutzerklaerung informiert darueber, welche personenbezogenen Daten im Zusammenhang mit der Nutzung des Alexa Skills "K. I." sowie der zugehoerigen Webanwendung verarbeitet werden.</p>
            <p class="lead">Die Verarbeitung erfolgt ausschliesslich im Rahmen der geltenden datenschutzrechtlichen Vorschriften, insbesondere der DSGVO.</p>
          </div>
          <div class="doc-section">
            <h3>3. Nutzung des Alexa Skills "K. I."</h3>
            <p class="lead">Der Skill "K. I." ist eine sprachbasierte Anwendung, die ueber Amazon Alexa genutzt wird. Zur Bereitstellung personalisierter Funktionen kann eine Verknuepfung zwischen dem Alexa-Konto und einem Benutzerkonto des Anbieters erfolgen (Account Linking).</p>
          </div>
          <div class="doc-section">
            <h3>4.1 Session- und Nutzungsdaten</h3>
            <p class="lead">Zur Bereitstellung der Funktionen des Skills werden Session-Daten verarbeitet, insbesondere:</p>
            <ul>
              <li>interne Benutzer-IDs</li>
              <li>Dialog- und Konversationszustaende</li>
              <li>Zeitstempel und Statusinformationen</li>
            </ul>
            <p class="lead">Diese Daten werden verwendet, um Konversationen fortzusetzen, Eingaben zu beruecksichtigen und eine konsistente Nutzererfahrung sicherzustellen. Eine Profilbildung oder Auswertung zu Marketing- oder Analysezwecken findet nicht statt.</p>
          </div>
          <div class="doc-section">
            <h3>4.2 E-Mail-Adresse</h3>
            <p class="lead">Sofern der Nutzer ein Benutzerkonto anlegt oder den Skill mit einem bestehenden Konto verknuepft, wird die E-Mail-Adresse verarbeitet.</p>
            <ul>
              <li>eindeutige Zuordnung des Nutzerkontos</li>
              <li>Durchfuehrung des Account-Linkings mit Amazon Alexa</li>
              <li>sicherheitsrelevante Kommunikation (z. B. Passwort-Reset, Verifizierung)</li>
            </ul>
            <p class="lead">Eine Nutzung zu Werbe- oder Marketingzwecken erfolgt nicht.</p>
          </div>
          <div class="doc-section">
            <h3>4.3 Verarbeitung durch Amazon Alexa</h3>
            <p class="lead">Bei der Nutzung des Skills werden zusaetzliche Daten durch Amazon verarbeitet, insbesondere Sprachaufzeichnungen, technische Geraete- und Nutzungsinformationen sowie Skill-Interaktionsdaten.</p>
            <p class="lead">Diese Datenverarbeitung erfolgt ausschliesslich in der Verantwortung von Amazon. Es gelten die Datenschutzbestimmungen von Amazon: <a href="https://www.amazon.de/privacy">https://www.amazon.de/privacy</a>.</p>
            <p class="lead">Der Anbieter erhaelt keinen Zugriff auf Sprachaufzeichnungen.</p>
          </div>
          <div class="doc-section">
            <h3>5. Rechtsgrundlagen der Verarbeitung</h3>
            <ul>
              <li>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung) zur Bereitstellung der Skill-Funktionen und zum Account Linking</li>
              <li>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) zur Sicherstellung einer stabilen Nutzererfahrung</li>
              <li>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) sofern zusaetzliche freiwillige Verarbeitung erfolgt</li>
            </ul>
          </div>
          <div class="doc-section">
            <h3>6. Speicherung und Loeschung</h3>
            <p class="lead">Session- und Nutzungsdaten werden nur so lange gespeichert, wie dies fuer die Nutzung des Skills erforderlich ist.</p>
            <p class="lead">Benutzerkontodaten werden geloescht, sobald das Nutzerkonto geloescht wird oder der Zweck der Verarbeitung entfaellt.</p>
            <p class="lead">Spaetestens erfolgt eine Loeschung nach 180 Tagen Inaktivitaet, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
          </div>
          <div class="doc-section">
            <h3>7. Weitergabe von Daten und Drittanbieter</h3>
            <p class="lead">Eine Weitergabe personenbezogener Daten an Dritte erfolgt nicht, es sei denn dies ist gesetzlich vorgeschrieben oder technisch erforderlich (z. B. Hosting bei Amazon Web Services).</p>
            <p class="lead">Eine Uebermittlung in Drittlaender erfolgt nur im Rahmen der von Amazon bereitgestellten Infrastruktur.</p>
          </div>
          <div class="doc-section">
            <h3>8. Rechte der betroffenen Personen</h3>
            <ul>
              <li>Auskunft (Art. 15 DSGVO)</li>
              <li>Berichtigung (Art. 16 DSGVO)</li>
              <li>Loeschung (Art. 17 DSGVO)</li>
              <li>Einschraenkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Widerspruch (Art. 21 DSGVO)</li>
              <li>Datenuebertragbarkeit (Art. 20 DSGVO)</li>
            </ul>
            <p class="lead">Anfragen koennen jederzeit an die oben genannte Kontaktadresse gerichtet werden.</p>
          </div>
          <div class="doc-section">
            <h3>9. Datensicherheit</h3>
            <p class="lead">Es werden angemessene technische und organisatorische Massnahmen eingesetzt, um personenbezogene Daten vor Verlust, Missbrauch oder unbefugtem Zugriff zu schuetzen.</p>
          </div>
          <div class="doc-section">
            <h3>10. Aktualisierung der Datenschutzerklaerung</h3>
            <p class="lead">Diese Datenschutzerklaerung kann angepasst werden, sofern sich rechtliche Anforderungen oder der Funktionsumfang des Skills aendern. Es gilt jeweils die aktuelle Version.</p>
          </div>
        </div>
      </section>

      <footer class="footer">
        <a href="/">Zurueck zur Startseite</a> - <a href="/terms">Nutzungsbedingungen</a> - <a href="/impressum">Impressum</a>
      </footer>
    </div>
  </body>
</html>`;

const renderTerms = () => `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nutzungsbedingungen</title>
    ${uiHead()}
  </head>
  <body>
    <div class="page">
      <section class="card">
        <div class="brand">
          ${logoImg}
          <div>
            <h1 class="hero-title">Nutzungsbedingungen fuer den Alexa Skill "K. I."</h1>
            <p class="lead">Bitte lies diese Bedingungen vor der Nutzung des Skills.</p>
          </div>
        </div>
      </section>

      <section class="card" style="margin-top: 16px">
        <div class="grid">
          <div class="doc-section">
            <h3>1. Geltungsbereich</h3>
            <p class="lead">Diese Nutzungsbedingungen regeln die Nutzung des Alexa Skills "K. I.", bereitgestellt durch:</p>
            <p class="lead">Christian Eichhorn<br />Weinbergstr. 3<br />96523 Steinach<br /><a href="mailto:info@jkce.de">info@jkce.de</a></p>
            <p class="lead">Mit der Nutzung des Skills erkennt der Nutzer diese Nutzungsbedingungen an.</p>
          </div>
          <div class="doc-section">
            <h3>2. Leistungsbeschreibung</h3>
            <p class="lead">Der Skill stellt eine sprachbasierte Anwendung dar, die ueber Amazon Alexa genutzt wird.</p>
            <p class="lead">Ein Anspruch auf bestimmte Funktionen, Inhalte oder eine dauerhafte Verfuegbarkeit besteht nicht.</p>
          </div>
          <div class="doc-section">
            <h3>3. Nutzungsvoraussetzungen</h3>
            <p class="lead">Die Nutzung setzt ein aktives Amazon-Konto, ein Alexa-faehiges Endgeraet sowie eine Internetverbindung voraus.</p>
          </div>
          <div class="doc-section">
            <h3>4. Pflichten des Nutzers</h3>
            <ul>
              <li>den Skill nur im vorgesehenen Rahmen zu verwenden,</li>
              <li>keine missbraeuchlichen oder rechtswidrigen Eingaben zu taetigen,</li>
              <li>keine Manipulation oder Umgehung technischer Schutzmassnahmen zu versuchen.</li>
            </ul>
          </div>
          <div class="doc-section">
            <h3>5. Datenschutz</h3>
            <p class="lead">Die Verarbeitung personenbezogener Daten erfolgt gemaess der Datenschutzerklaerung des Skills: <a href="/privacy">Datenschutzerklaerung</a>.</p>
          </div>
          <div class="doc-section">
            <h3>6. Haftung (Option A - maximal zulaessiger Haftungsausschluss, B2B / intern)</h3>
            <p class="lead">Die Nutzung des Skills erfolgt ausschliesslich auf eigenes Risiko des Nutzers.</p>
            <p class="lead">Der Anbieter uebernimmt keine Gewaehr fuer die jederzeitige oder ununterbrochene Verfuegbarkeit des Skills, die technische Fehlerfreiheit, die inhaltliche Richtigkeit, Vollstaendigkeit, Aktualitaet oder Eignung der bereitgestellten Informationen sowie fuer das Erreichen bestimmter Ergebnisse durch die Nutzung des Skills.</p>
            <p class="lead">Der Anbieter haftet nicht fuer Schaeden oder Nachteile, die aus der Nutzung oder der zeitweisen oder dauerhaften Nichtverfuegbarkeit des Skills entstehen, insbesondere nicht fuer technische Stoerungen, Ausfaelle oder Unterbrechungen, Datenverluste oder Datenbeschaedigungen, fehlerhafte oder missverstaendliche Sprachverarbeitung, Fehlentscheidungen oder Massnahmen auf Grundlage der bereitgestellten Inhalte sowie Schaeden durch Systeme oder Dienste von Amazon Alexa, AWS oder sonstigen Drittanbietern.</p>
            <p class="lead">Bei einfacher Fahrlaessigkeit haftet der Anbieter ausschliesslich bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). In diesem Fall ist die Haftung auf den vorhersehbaren, typischerweise eintretenden Schaden begrenzt.</p>
            <p class="lead">Eine Haftung fuer entgangenen Gewinn, mittelbare Schaeden oder Folgeschaeden ist ausgeschlossen. Die Haftung fuer Vorsatz, grobe Fahrlaessigkeit, Verletzung von Leben, Koerper oder Gesundheit sowie zwingende gesetzliche Haftung bleibt unberuehrt.</p>
          </div>
          <div class="doc-section">
            <h3>7. Verfuegbarkeit und Aenderungen</h3>
            <p class="lead">Der Anbieter behaelt sich vor, den Skill jederzeit zu aendern, einzuschraenken oder einzustellen.</p>
          </div>
          <div class="doc-section">
            <h3>8. Beendigung der Nutzung</h3>
            <p class="lead">Die Nutzung endet durch Deaktivierung des Skills in der Alexa App.</p>
          </div>
          <div class="doc-section">
            <h3>9. Geistiges Eigentum</h3>
            <p class="lead">Alle Inhalte und Konzepte des Skills unterliegen dem Urheberrecht.</p>
          </div>
          <div class="doc-section">
            <h3>10. Anwendbares Recht</h3>
            <p class="lead">Es gilt das Recht der Bundesrepublik Deutschland.</p>
          </div>
          <div class="doc-section">
            <h3>11. Salvatorische Klausel</h3>
            <p class="lead">Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der uebrigen Regelungen unberuehrt.</p>
          </div>
        </div>
      </section>

      <footer class="footer">
        <a href="/">Zurueck zur Startseite</a> - <a href="/privacy">Datenschutzerklaerung</a> - <a href="/impressum">Impressum</a>
      </footer>
    </div>
  </body>
</html>`;

const renderImpressum = () => `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Impressum</title>
    ${uiHead()}
  </head>
  <body>
    <div class="page">
      <section class="card">
        <div class="brand">
          ${logoImg}
          <div>
            <h1 class="hero-title">Impressum</h1>
            <p class="lead">Angaben gemaess § 5 Digitale-Dienste-Gesetz (DDG).</p>
          </div>
        </div>
      </section>

      <section class="card" style="margin-top: 16px">
        <div class="grid">
          <div class="doc-section">
            <h3>Betreiber</h3>
            <p class="lead">Christian Eichhorn<br />Weinbergstr. 3<br />96523 Steinach<br />Deutschland</p>
            <p class="lead">Kontakt: <a href="mailto:info@jkce.de">info@jkce.de</a></p>
          </div>
          <div class="doc-section">
            <h3>Verantwortlich fuer den Inhalt nach § 18 Abs. 2 MStV</h3>
            <p class="lead">Christian Eichhorn<br />Weinbergstr. 3<br />96523 Steinach</p>
          </div>
          <div class="doc-section">
            <h3>Hinweis zum Angebot</h3>
            <p class="lead">Diese Website dient der Bereitstellung und Verwaltung des Alexa Skills "K. I." sowie der zugehoerigen Nutzerkonten und Funktionen. Inhalte werden fortlaufend gepflegt und koennen angepasst werden, wenn sich der Funktionsumfang aendert.</p>
          </div>
        </div>
      </section>

      <footer class="footer">
        <a href="/">Zurueck zur Startseite</a> - <a href="/privacy">Datenschutzerklaerung</a> - <a href="/terms">Nutzungsbedingungen</a>
      </footer>
    </div>
  </body>
</html>`;

const renderUserDashboard = (userId, message = "") => {
  const statusClass = message
    ? /aktualisiert|erfolg|gesendet|bestaetigt/i.test(message)
      ? "status success"
      : "status error"
    : "";
  const note = message ? `<div class=\"${statusClass}\">${escapeHtml(message)}</div>` : "";
  const record = userStore.getUser(userId) || {};
  const linkedAt = record.alexaLinkedAt ? new Date(record.alexaLinkedAt) : null;
  const linkStatus = linkedAt ? `verbunden seit ${linkedAt.toLocaleDateString("de-DE")}` : "nicht verbunden";
  const usageYear = String(new Date().getFullYear());
  const usage = record.usage?.[usageYear] || { requests: 0 };
  const requestCount = Number(usage.requests || 0);
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K. I. Nutzerkonto</title>
  ${uiHead()}
</head>
<body>
  <div class="page">
    <header class="card hero" style="margin-bottom: 16px">
      <div class="brand">
        ${logoImg}
        <div>
          <h1 class="hero-title">Dein Konto</h1>
          <p class="lead">Angemeldet als ${escapeHtml(userId)}.</p>
        </div>
      </div>
      <div class="cta-row">
        <a class="btn secondary" href="/logout">Logout</a>
      </div>
    </header>

    ${note}

    <section class="grid cols-2">
      <div class="card">
        <h2 class="section-title">Account-Status</h2>
        <p class="lead">Status: Aktiv</p>
        <p class="lead">Dein Konto ist bereit fuer die Verknuepfung mit dem Skill.</p>
      </div>
      <div class="card">
        <h2 class="section-title">Skill-Verknuepfung</h2>
        <p class="lead">Status: ${linkStatus}</p>
        <p class="lead">Wenn du den Skill neu verknuepfen willst, kannst du die Verbindung hier trennen.</p>
        ${
          linkedAt
            ? `<form method="POST" action="/account/unlink">
                <div class="actions">
                  <button class="btn secondary" type="submit">Verknuepfung trennen</button>
                </div>
              </form>`
            : ""
        }
      </div>
    </section>

    <section class="card" style="margin-top: 16px">
      <h2 class="section-title">Nutzung (${usageYear})</h2>
      <p class="lead">Requests: ${requestCount}</p>
    </section>

    <section class="card" style="margin-top: 16px">
      <h2 class="section-title">Standard-Ort</h2>
      <p class="lead">Aktuell: ${escapeHtml(record.preferredLocation || "nicht gesetzt")}</p>
      <form method="POST" action="/account/location">
        <label>Neuen Standard-Ort setzen
          <input name="preferredLocation" type="text" placeholder="z. B. Berlin" />
        </label>
        <div class="actions">
          <button class="btn" type="submit">Speichern</button>
        </div>
      </form>
    </section>

    <section class="card" style="margin-top: 16px">
      <h2 class="section-title">Passwort aendern</h2>
      <form method="POST" action="/account/password">
        <label>Aktuelles Passwort
          <input name="currentPassword" type="password" required />
        </label>
        <label>Neues Passwort
          <input name="newPassword" type="password" required />
        </label>
        <label>Neues Passwort bestaetigen
          <input name="newPasswordConfirm" type="password" required />
        </label>
        <div class="actions">
          <button class="btn" type="submit">Speichern</button>
        </div>
      </form>
    </section>

    <section class="card" style="margin-top: 16px">
      <h2 class="section-title">Konto loeschen</h2>
      <p class="lead">Wenn du dein Konto loeschst, werden alle gespeicherten Daten entfernt.</p>
      <form method="POST" action="/account/delete">
        <label>Passwort bestaetigen
          <input name="password" type="password" required />
        </label>
        <label class="consent">
          <input type="checkbox" name="confirmDelete" required />
          <span>Ich moechte mein Konto dauerhaft loeschen.</span>
        </label>
        <div class="actions">
          <button class="btn secondary" type="submit">Konto loeschen</button>
        </div>
      </form>
    </section>
  </div>
</body>
</html>`;
};

const normalizeEventFilter = (raw) => {
  const key = String(raw || "all").toLowerCase();
  const map = {
    all: null,
    errors: ["llm_error", "llm_timeout", "conversation_timeout"],
    timeouts: ["conversation_timeout", "llm_timeout"],
    fallbacks: ["fallback_intent"],
    link_required: ["link_required"],
    llm_error: ["llm_error"],
  };
  return map[key] ? { key, types: map[key] } : { key: "all", types: null };
};

const normalizeEventRange = (raw) => {
  const key = String(raw || "24h").toLowerCase();
  const map = {
    "24h": "24 hours",
    "7d": "7 days",
    "30d": "30 days",
  };
  return map[key] ? { key, interval: map[key] } : { key: "24h", interval: "24 hours" };
};

const buildEventQuery = ({ filter, range, limit }) => {
  const values = [];
  const where = [];
  values.push(range.interval);
  where.push(`event_ts >= now() - $${values.length}::interval`);
  if (filter.types && filter.types.length) {
    values.push(filter.types);
    where.push(`event_type = ANY($${values.length})`);
  }
  const limitClause = typeof limit === "number" ? `limit ${limit}` : "";
  return {
    text: `select event_ts, user_id, account_user_id, event_type, payload from conversation_events where ${where.join(
      " and "
    )} order by event_ts desc ${limitClause}`.trim(),
    values,
  };
};

const handleRegisterRequest = async (req, res) => {
  if (!config.registrationEnabled) {
    return sendHtml(res, 403, renderRegister("Registrierung ist derzeit deaktiviert."));
  }
  if (req.method === "GET") {
    return sendHtml(res, 200, renderRegister());
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "method_not_allowed" });
  }
  const { parsed: body } = await parseBody(req, "form");
  const firstName = String(body?.firstName || "").trim();
  const lastName = String(body?.lastName || "").trim();
  const username = String(body?.username || "").trim();
  const email = String(body?.email || "").trim();
  const password = String(body?.password || "").trim();
  const passwordConfirm = String(body?.passwordConfirm || "").trim();
  const privacyConsent = String(body?.privacyConsent || "").trim();
  const termsConsent = String(body?.termsConsent || "").trim();
  if (!firstName || !lastName || !username || !email || !password) {
    return sendHtml(res, 400, renderRegister("Bitte fuelle alle Felder aus."));
  }
  if (!privacyConsent) {
    return sendHtml(res, 400, renderRegister("Bitte stimme der Datenschutzerklaerung zu."));
  }
  if (!termsConsent) {
    return sendHtml(res, 400, renderRegister("Bitte akzeptiere die Nutzungsbedingungen."));
  }
  if (!email.includes("@")) {
    return sendHtml(res, 400, renderRegister("Bitte eine gueltige E-Mail angeben."));
  }
  if (password.length < 8) {
    return sendHtml(res, 400, renderRegister("Passwort muss mindestens 8 Zeichen haben."));
  }
  if (password !== passwordConfirm) {
    return sendHtml(res, 400, renderRegister("Passwoerter stimmen nicht ueberein."));
  }
  if (userStore.getUser(username)) {
    return sendHtml(res, 400, renderRegister("Benutzername ist bereits vergeben."));
  }
  if (userStore.findByEmail(email)) {
    return sendHtml(res, 400, renderRegister("E-Mail ist bereits registriert."));
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100000;
  const hash = hashPassword(password, salt, iterations);
  const verifyToken = randomToken(24);
  const verifyUntil = Date.now() + VERIFY_LINK_TTL_MS;
  userStore.addUser(username, {
    hash,
    salt,
    iterations,
    email,
    firstName,
    lastName,
    verified: false,
    verifyToken,
    verifyUntil,
    createdAt: new Date().toISOString(),
  });
  const baseUrl = process.env.APP_BASE_URL || `https://${config.appHost}`;
  const verifyUrl = `${baseUrl}/verify?user=${encodeURIComponent(
    username
  )}&token=${encodeURIComponent(verifyToken)}`;
  const mail = await smtpSend({
    to: email,
    subject: "Bestaetige deinen K. I. Zugang",
    text: `Bitte bestaetige deinen Zugang:\n${verifyUrl}\n\nLink ist ${VERIFY_LINK_TTL_TEXT} gueltig.`,
  });
  if (!mail.ok) {
    console.error("Registration email failed", {
      user: username,
      to: email,
      error: mail.error,
      lastResponse: mail.lastResponse,
    });
    return sendHtml(
      res,
      500,
      renderRegister(
        "E-Mail konnte nicht gesendet werden. Bitte SMTP konfigurieren oder spaeter erneut versuchen."
      )
    );
  }
  console.info("Registration email sent", { user: username, to: email });
  const webhook = await postActivepiecesWebhook({
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email,
  });
  if (!webhook.ok) {
    console.error("Activepieces webhook failed", {
      user: username,
      email,
      error: webhook.error,
      body: webhook.body,
    });
  } else {
    console.info("Activepieces webhook delivered", { user: username, email });
  }
  return sendHtml(
    res,
    200,
    renderLogin("Registrierung erfolgreich. Bitte E-Mail bestaetigen und dann einloggen.")
  );
};

const handleResetRequest = async (req, res) => {
  if (req.method === "GET") {
    return sendHtml(res, 200, renderResetRequest());
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "method_not_allowed" });
  }
  const { parsed: body } = await parseBody(req, "form");
  const email = String(body?.email || "").trim();
  if (!email || !email.includes("@")) {
    return sendHtml(res, 400, renderResetRequest("Bitte eine gueltige E-Mail angeben."));
  }
  const user = userStore.findByEmail(email);
  if (!user) {
    return sendHtml(res, 200, renderResetRequest("Wenn die E-Mail existiert, wurde ein Link gesendet."));
  }
  const resetToken = randomToken(24);
  const resetUntil = Date.now() + 24 * 60 * 60 * 1000;
  userStore.updateUser(user.username, { resetToken, resetUntil });
  const baseUrl = process.env.APP_BASE_URL || `https://${config.appHost}`;
  const resetUrl = `${baseUrl}/reset/confirm?user=${encodeURIComponent(
    user.username
  )}&token=${encodeURIComponent(resetToken)}`;
  const mail = await smtpSend({
    to: email,
    subject: "Passwort zuruecksetzen",
    text: `Setze dein Passwort zurueck:\n${resetUrl}\n\nLink ist 24h gueltig.`,
  });
  if (!mail.ok) {
    return sendHtml(
      res,
      500,
      renderResetRequest("E-Mail konnte nicht gesendet werden. Bitte SMTP konfigurieren.")
    );
  }
  return sendHtml(res, 200, renderLogin("Reset-Link gesendet. Bitte E-Mail pruefen."));
};

const handleVerifyResendRequest = async (req, res, url) => {
  if (req.method === "GET") {
    const prefill = url ? String(url.searchParams.get("user") || "").trim() : "";
    return sendHtml(res, 200, renderVerifyResend("", prefill));
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "method_not_allowed" });
  }
  const { parsed: body } = await parseBody(req, "form");
  const identifier = String(body?.identifier || "").trim();
  if (!identifier) {
    return sendHtml(res, 400, renderVerifyResend("Bitte Benutzername oder E-Mail angeben.", identifier));
  }
  const resolved = identifier.includes("@")
    ? userStore.findByEmail(identifier)
    : userStore.findByUsernameInsensitive(identifier);
  if (resolved?.verified !== false) {
    const message = resolved
      ? "Konto ist bereits bestaetigt. Bitte einloggen."
      : "Wenn dein Konto existiert und noch nicht bestaetigt ist, wurde ein Link gesendet.";
    return sendHtml(res, 200, renderVerifyResend(message, identifier));
  }
  if (!resolved?.email) {
    return sendHtml(res, 400, renderVerifyResend("E-Mail fehlt. Bitte Support kontaktieren.", identifier));
  }
  const { mail } = await sendVerificationEmail({
    username: resolved.username,
    email: resolved.email,
  });
  if (!mail.ok) {
    console.error("Resend verification failed", {
      user: resolved.username,
      to: resolved.email,
      error: mail.error,
      lastResponse: mail.lastResponse,
    });
    return sendHtml(
      res,
      500,
      renderVerifyResend("E-Mail konnte nicht gesendet werden. Bitte spaeter erneut versuchen.", identifier)
    );
  }
  console.info("Resend verification sent", { user: resolved.username, to: resolved.email });
  return sendHtml(res, 200, renderVerifyResend("Neuer Bestaetigungslink wurde gesendet.", identifier));
};

const handleResetConfirm = async (req, res, url) => {
  if (req.method === "GET") {
    const username = String(url.searchParams.get("user") || "").trim();
    const token = String(url.searchParams.get("token") || "").trim();
    return sendHtml(res, 200, renderResetConfirm("", username, token));
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "method_not_allowed" });
  }
  const { parsed: body } = await parseBody(req, "form");
  const username = String(body?.user || "").trim();
  const token = String(body?.token || "").trim();
  const password = String(body?.password || "").trim();
  const passwordConfirm = String(body?.passwordConfirm || "").trim();
  const user = userStore.getUser(username);
  if (
    !user ||
    !user.resetToken ||
    user.resetToken !== token ||
    Date.now() > Number(user.resetUntil || 0)
  ) {
    return sendHtml(res, 400, renderResetConfirm("Link ungueltig oder abgelaufen.", username, token));
  }
  if (password.length < 8) {
    return sendHtml(res, 400, renderResetConfirm("Passwort muss mindestens 8 Zeichen haben.", username, token));
  }
  if (password !== passwordConfirm) {
    return sendHtml(res, 400, renderResetConfirm("Passwoerter stimmen nicht ueberein.", username, token));
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100000;
  const hash = hashPassword(password, salt, iterations);
  userStore.updateUser(username, { hash, salt, iterations, resetToken: "", resetUntil: 0 });
  return sendHtml(res, 200, renderLogin("Passwort aktualisiert. Bitte einloggen."));
};

const renderResetRequest = (message = "") => {
  const statusClass = message
    ? /nicht|ungueltig|fehler|abgelaufen|konfigurier/i.test(message)
      ? "status error"
      : "status success"
    : "";
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K. I. - Passwort zuruecksetzen</title>
  ${uiHead()}
</head>
<body>
  <div class="page">
    <section class="card form-card">
      <div class="top-nav">
        <a class="home-link" href="/"><span class="home-dot"></span> Zur Startseite</a>
      </div>
      <div class="brand">
        ${logoImg}
        <div>
          <h1 class="hero-title">Passwort zuruecksetzen</h1>
          <p class="lead">Wir senden dir einen sicheren Link, um dein Passwort neu zu setzen.</p>
        </div>
      </div>
      ${message ? `<div class="${statusClass}">${escapeHtml(message)}</div>` : ""}
      <form method="POST" action="/reset">
        <label>E-Mail
          <input type="email" name="email" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false" />
        </label>
        <div class="actions">
          <button class="btn" type="submit">Link senden</button>
          <a class="btn secondary" href="/login">Zurueck zur Anmeldung</a>
        </div>
      </form>
      <div class="form-help">Der Link ist 24 Stunden gueltig.</div>
    </section>
  </div>
</body>
</html>`;
};

const renderVerifyResend = (message = "", identifier = "") => {
  const statusClass = message
    ? /nicht|ungueltig|fehler|abgelaufen|kein/i.test(message)
      ? "status error"
      : "status success"
    : "";
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K. I. - Bestaetigungslink</title>
  ${uiHead()}
</head>
<body>
  <div class="page">
    <section class="card form-card">
      <div class="top-nav">
        <a class="home-link" href="/"><span class="home-dot"></span> Zur Startseite</a>
      </div>
      <div class="brand">
        ${logoImg}
        <div>
          <h1 class="hero-title">Bestaetigungslink anfordern</h1>
          <p class="lead">Wir senden dir einen neuen Link zur E-Mail-Bestaetigung.</p>
        </div>
      </div>
      ${message ? `<div class="${statusClass}">${escapeHtml(message)}</div>` : ""}
      <form method="POST" action="/verify/resend">
        <label>Benutzername oder E-Mail
          <input name="identifier" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" value="${escapeHtml(identifier)}" />
        </label>
        <div class="actions">
          <button class="btn" type="submit">Link senden</button>
          <a class="btn secondary" href="/login">Zurueck zur Anmeldung</a>
        </div>
      </form>
      <div class="form-help">Der Link ist ${VERIFY_LINK_TTL_TEXT} gueltig.</div>
    </section>
  </div>
</body>
</html>`;
};

const renderResetConfirm = (message = "", user = "", token = "") => {
  const statusClass = message
    ? /ungueltig|abgelaufen|stimmen nicht|mindestens|fehler/i.test(message)
      ? "status error"
      : "status success"
    : "";
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K. I. - Neues Passwort</title>
  ${uiHead()}
</head>
<body>
  <div class="page">
    <section class="card form-card">
      <div class="top-nav">
        <a class="home-link" href="/"><span class="home-dot"></span> Zur Startseite</a>
      </div>
      <div class="brand">
        ${logoImg}
        <div>
          <h1 class="hero-title">Neues Passwort setzen</h1>
          <p class="lead">Bitte vergebe ein neues Passwort fuer dein Konto.</p>
        </div>
      </div>
      ${message ? `<div class="${statusClass}">${escapeHtml(message)}</div>` : ""}
      <form method="POST" action="/reset/confirm">
        <input type="hidden" name="user" value="${escapeHtml(user)}" />
        <input type="hidden" name="token" value="${escapeHtml(token)}" />
        <label>Neues Passwort
          <input type="password" name="password" autocomplete="new-password" />
        </label>
        <label>Passwort bestaetigen
          <input type="password" name="passwordConfirm" autocomplete="new-password" />
        </label>
        <div class="actions">
          <button class="btn" type="submit">Speichern</button>
        </div>
      </form>
    </section>
  </div>
</body>
</html>`;
};

const renderAdmin = (userId, message = "", events = [], eventMeta = {}) => {
  const { map } = loadEnvFile();
  const envValue = (key, fallback = "") =>
    map.get(key) ?? process.env[key] ?? fallback;
  const usageYear = String(new Date().getFullYear());
  const notice = message
    ? `<div class="notice">${escapeHtml(message)}</div>`
    : "";
  const users = userStore.listUsers();
  const filter = eventMeta.filter || "all";
  const range = eventMeta.range || "24h";
  const eventsNotice = eventMeta.error
    ? `<div class="notice">Eventlog konnte nicht geladen werden.</div>`
    : "";
  const reports = listReportFiles();
  const llmStats = eventMeta.llmStats || { errors: 0, timeouts: 0 };
  const llmCallStats = eventMeta.llmCallStats || [];
  const modelSelection = eventMeta.modelSelection || null;
  const modelSelectionUpdated = modelSelection?.updatedAt
    ? new Date(modelSelection.updatedAt).toISOString()
    : "noch nie";
  const modelSelectionRows = modelSelection?.results
    ? ["dialog", "facts", "explain", "trend", "creative"]
        .map((useCase) => {
          const info = modelSelection.results?.[useCase] || {};
          const selected = info.selected || "";
          const selectedTest = (info.tests || []).find((test) => test.id === selected);
          const selectedLabel = selected
            ? `${selected}${selectedTest?.elapsedMs ? ` (${selectedTest.elapsedMs} ms)` : ""}`
            : "-";
          const tests = (info.tests || [])
            .filter((test) => test.ok && test.latencyOk)
            .map((test) => {
              const ms = test.elapsedMs ? `${test.elapsedMs} ms` : "-";
              const webTag = test.web ? " [WEB]" : "";
              return `${escapeHtml(test.id || "")}${webTag} (score ${Math.round(
                test.score || 0
              )}, ${ms})`;
            })
            .join("<br>") || "keine schnellen OK-Tests";
          return `<tr>
            <td>${escapeHtml(useCase)}</td>
    <td>${escapeHtml(
      selectedLabel ? `${selectedLabel}${selectedTest?.web ? " [WEB]" : ""}` : "-"
    )}</td>
    <td>${tests}</td>
          </tr>`;
        })
        .join("")
    : "";
  const webModels = (modelSelection?.webModels || []).length
    ? modelSelection.webModels
    : config.straicoWebModels;
  const inactiveSnapshot = getInactiveModelsSnapshot();
  const filterLinks = [
    { key: "all", label: "Alle" },
    { key: "errors", label: "Fehler" },
    { key: "timeouts", label: "Timeouts" },
    { key: "fallbacks", label: "Fallbacks" },
    { key: "link_required", label: "Link required" },
    { key: "llm_error", label: "LLM Error" },
  ];
  const rangeLinks = [
    { key: "24h", label: "24h" },
    { key: "7d", label: "7 Tage" },
    { key: "30d", label: "30 Tage" },
  ];
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K. I. - Admin</title>
  ${logoHead}
  <style>
    :root {
      --bg: #f7f1e8;
      --ink: #1b1a16;
      --muted: #6f665e;
      --card: #fffdf8;
      --accent: #2b5f4a;
      --accent-dark: #244e3d;
      --ring: rgba(43, 95, 74, 0.22);
      --shadow: 0 24px 60px rgba(24, 18, 12, 0.18);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Cormorant Garamond", "Garamond", "Palatino Linotype", serif;
      color: var(--ink);
      background: var(--bg);
      padding: 32px 16px;
    }
    .wrap {
      width: min(1100px, 100%);
      margin: 0 auto;
      display: grid;
      gap: 24px;
    }
    .card {
      background: var(--card);
      border-radius: 20px;
      padding: 24px;
      border: 1px solid #efe5dc;
      box-shadow: var(--shadow);
    }
    .logo {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #fffdf8;
      padding: 4px;
      box-shadow: var(--shadow);
      object-fit: contain;
      margin-right: 10px;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h1 { margin: 0 0 8px; }
    h2 { margin: 0 0 14px; }
    .muted { color: var(--muted); font-size: 14px; }
    label { display: grid; gap: 6px; font-size: 14px; font-weight: 600; }
    input, select {
      font: inherit;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #daccc0;
      background: #fffdfb;
    }
    input:focus, select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px var(--ring);
      outline: none;
    }
    button {
      border: none;
      border-radius: 10px;
      padding: 10px 14px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      color: #fff;
      background: linear-gradient(135deg, #2b5f4a 0%, #3b8b67 100%);
    }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #eee0d6; }
    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
    .notice {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      background: #eef6f0;
      border-left: 4px solid var(--accent);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="title-row">
        ${logoImg}
        <h1>K. I. Admin</h1>
      </div>
      <div class="muted">Angemeldet als ${escapeHtml(userId)} · <a href="/admin/logout">Logout</a></div>
      ${notice}
    </div>

    <div class="card">
      <h2>Registrierung</h2>
      <form method="POST" action="/admin/env">
        <div class="grid">
          <label>Registrierung aktiv
            <select name="REGISTRATION_ENABLED">
              <option value="true" ${envValue("REGISTRATION_ENABLED", config.registrationEnabled ? "true" : "false") === "true" ? "selected" : ""}>true</option>
              <option value="false" ${envValue("REGISTRATION_ENABLED", config.registrationEnabled ? "true" : "false") === "false" ? "selected" : ""}>false</option>
            </select>
          </label>
          <label>Activepieces Webhook<input name="ACTIVEPIECES_WEBHOOK_URL" value="${escapeHtml(envValue("ACTIVEPIECES_WEBHOOK_URL", config.activepiecesWebhookUrl))}" /></label>
        </div>
        <p class="muted">Aenderungen erfordern einen Neustart des Containers.</p>
        <button type="submit">Speichern</button>
      </form>
    </div>

    <div class="card">
      <h2>QA Nutzer</h2>
      <form method="POST" action="/admin/env">
        <div class="grid">
          <label>QA Username<input name="QA_USER_USERNAME" value="${escapeHtml(envValue("QA_USER_USERNAME", config.qaUserUsername))}" /></label>
          <label>QA E-Mail<input name="QA_USER_EMAIL" value="${escapeHtml(envValue("QA_USER_EMAIL", config.qaUserEmail))}" /></label>
          <label>QA Passwort<input name="QA_USER_PASSWORD" type="password" placeholder="Neues Passwort setzen" /></label>
        </div>
        <p class="muted">Passwort wird nur gespeichert, wenn du ein neues Passwort angibst.</p>
        <button type="submit">Speichern</button>
      </form>
      <form method="POST" action="/admin/qa/reset" style="margin-top: 12px;">
        <button type="submit">QA Nutzer zuruecksetzen</button>
      </form>
    </div>

    <div class="card">
      <h2>LLM Monitoring</h2>
      <div class="muted" style="margin-bottom: 12px;">
        24h: LLM Fehler ${llmStats.errors} · Timeouts ${llmStats.timeouts} ·
        <a href="/admin?filter=llm_error&range=24h">LLM Error Filter</a> ·
        <a href="/admin?filter=timeouts&range=24h">Timeouts Filter</a>
      </div>
      ${
        llmCallStats.length
          ? `<table>
              <thead>
                <tr><th>Modell</th><th>Calls</th><th>Errors</th><th>Timeouts</th><th>Avg ms</th><th>Max ms</th></tr>
              </thead>
              <tbody>
                ${llmCallStats
                  .map((entry) => {
                    return `<tr>
                      <td>${escapeHtml(entry.model)}</td>
                      <td>${entry.count}</td>
                      <td>${entry.errorCount}</td>
                      <td>${entry.timeoutCount}</td>
                      <td>${entry.avgMs}</td>
                      <td>${entry.maxMs}</td>
                    </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>`
          : `<div class="muted">Noch keine LLM-Aufrufe erfasst.</div>`
      }
      ${
        inactiveSnapshot.length
          ? `<div class="muted" style="margin-bottom: 8px;">Inaktive Modelle:</div>
             <table>
              <thead><tr><th>Modell</th><th>Restzeit</th></tr></thead>
              <tbody>
                ${inactiveSnapshot
                  .map((entry) => {
                    const minutes = Math.max(1, Math.round(entry.remainingMs / 60000));
                    return `<tr><td>${escapeHtml(entry.id)}</td><td>${minutes} min</td></tr>`;
                  })
                  .join("")}
              </tbody>
             </table>`
          : `<div class="muted">Keine inaktiven Modelle.</div>`
      }
      <form method="POST" action="/admin/llm/clear-inactive" style="margin-top: 12px;">
        <button type="submit">Inaktive Modelle reaktivieren</button>
      </form>
    </div>

    <div class="card">
      <h2>Model-Auswahl (Straico)</h2>
      <div class="muted" style="margin-bottom: 12px;">
        Letzte Aktualisierung: ${escapeHtml(modelSelectionUpdated)} ·
        Status: ${
          modelSelection?.refreshing
            ? "aktualisiere..."
            : modelSelection?.error
            ? `Fehler: ${escapeHtml(modelSelection.error)}`
            : "bereit"
        }
      </div>
      <div class="muted" style="margin-bottom: 12px;">
        Web-Modelle (Perplexity/Websearch): ${
          webModels.length ? escapeHtml(webModels.join(", ")) : "keine"
        }
      </div>
      <form method="POST" action="/admin/models/refresh" style="margin-bottom: 12px;">
        <button type="submit">Model-Auswahl aktualisieren</button>
      </form>
      ${
        modelSelectionRows
          ? `<table>
              <thead>
                <tr><th>Use-Case</th><th>Ausgewaehlt</th><th>Tests</th></tr>
              </thead>
              <tbody>${modelSelectionRows}</tbody>
            </table>`
          : `<div class="muted">Noch keine Modelle ausgewertet.</div>`
      }
    </div>

    <div class="card">
      <h2>SMTP / E-Mail</h2>
      <form method="POST" action="/admin/env">
        <div class="grid">
          <label>SMTP Host<input name="SMTP_HOST" value="${escapeHtml(envValue("SMTP_HOST", config.smtpHost))}" /></label>
          <label>SMTP Port<input name="SMTP_PORT" value="${escapeHtml(envValue("SMTP_PORT", String(config.smtpPort || 587)))}" /></label>
          <label>SMTP User<input name="SMTP_USER" value="${escapeHtml(envValue("SMTP_USER", config.smtpUser))}" /></label>
          <label>SMTP Pass<input name="SMTP_PASS" placeholder="(unveraendert lassen)" /></label>
          <label>SMTP From<input name="SMTP_FROM" value="${escapeHtml(envValue("SMTP_FROM", config.smtpFrom))}" /></label>
          <label>SMTP Secure
            <select name="SMTP_SECURE">
              <option value="true" ${envValue("SMTP_SECURE", config.smtpSecure ? "true" : "false") === "true" ? "selected" : ""}>true</option>
              <option value="false" ${envValue("SMTP_SECURE", config.smtpSecure ? "true" : "false") === "false" ? "selected" : ""}>false</option>
            </select>
          </label>
        </div>
        <p class="muted">SMTP_PASS wird nur gespeichert, wenn du ein neues Passwort angibst.</p>
        <button type="submit">Speichern</button>
      </form>
    </div>

    <div class="card">
      <h2>Routing-Modelle</h2>
      <form method="POST" action="/admin/env">
        <div class="grid">
          <label>GPT Full<input name="STRAICO_MODEL_GPT_FULL" value="${escapeHtml(envValue("STRAICO_MODEL_GPT_FULL", config.straicoModelGptFull))}" /></label>
          <label>GPT Mini<input name="STRAICO_MODEL_GPT_MINI" value="${escapeHtml(envValue("STRAICO_MODEL_GPT_MINI", config.straicoModelGptMini))}" /></label>
          <label>GPT Nano<input name="STRAICO_MODEL_GPT_NANO" value="${escapeHtml(envValue("STRAICO_MODEL_GPT_NANO", config.straicoModelGptNano))}" /></label>
          <label>Gemini Flash<input name="STRAICO_MODEL_GEMINI_FLASH" value="${escapeHtml(envValue("STRAICO_MODEL_GEMINI_FLASH", config.straicoModelGeminiFlash))}" /></label>
          <label>Claude Sonnet<input name="STRAICO_MODEL_CLAUDE_SONNET" value="${escapeHtml(envValue("STRAICO_MODEL_CLAUDE_SONNET", config.straicoModelClaudeSonnet))}" /></label>
          <label>Grok Fast<input name="STRAICO_MODEL_GROK_FAST" value="${escapeHtml(envValue("STRAICO_MODEL_GROK_FAST", config.straicoModelGrokFast))}" /></label>
          <label>Web-Modelle<input name="STRAICO_WEB_MODELS" value="${escapeHtml(envValue("STRAICO_WEB_MODELS", config.straicoWebModels.join(", ")))}" /></label>
          <label>Story Modell<input name="STRAICO_STORY_MODEL" value="${escapeHtml(envValue("STRAICO_STORY_MODEL", config.straicoStoryModel))}" /></label>
          <label>Fallback<input name="STRAICO_FALLBACK_MODEL" value="${escapeHtml(envValue("STRAICO_FALLBACK_MODEL", config.straicoFallbackModel))}" /></label>
        </div>
        <button type="submit">Speichern</button>
      </form>
    </div>

    <div class="card">
      <h2>Web-Suche (Perplexity)</h2>
      <form method="POST" action="/admin/env">
        <div class="grid">
          <label>API Key<input name="PERPLEXITY_API_KEY" placeholder="(unveraendert lassen)" /></label>
          <label>Model<input name="PERPLEXITY_MODEL" value="${escapeHtml(envValue("PERPLEXITY_MODEL", config.perplexityModel))}" /></label>
          <label>Timeout ms<input name="PERPLEXITY_TIMEOUT_MS" value="${escapeHtml(envValue("PERPLEXITY_TIMEOUT_MS", String(config.perplexityTimeoutMs)))}" /></label>
          <label>Max Tokens<input name="PERPLEXITY_MAX_TOKENS" value="${escapeHtml(envValue("PERPLEXITY_MAX_TOKENS", String(config.perplexityMaxTokens)))}" /></label>
        </div>
        <p class="muted">API Key wird nur gespeichert, wenn du einen neuen Wert angibst.</p>
        <button type="submit">Speichern</button>
      </form>
    </div>

    <div class="card">
      <h2>Antwortgrenzen</h2>
      <form method="POST" action="/admin/env">
        <div class="grid">
          <label>MAX_TOKENS_SHORT<input name="STRAICO_MAX_TOKENS_SHORT" value="${escapeHtml(envValue("STRAICO_MAX_TOKENS_SHORT", String(config.straicoMaxTokensShort)))}" /></label>
          <label>MAX_TOKENS_LONG<input name="STRAICO_MAX_TOKENS_LONG" value="${escapeHtml(envValue("STRAICO_MAX_TOKENS_LONG", String(config.straicoMaxTokensLong)))}" /></label>
          <label>MAX_TOKENS_LONG_CHUNK<input name="STRAICO_MAX_TOKENS_LONG_CHUNK" value="${escapeHtml(envValue("STRAICO_MAX_TOKENS_LONG_CHUNK", String(config.straicoMaxTokensLongChunk)))}" /></label>
          <label>LONG_CHUNK_MAX_CHARS<input name="STRAICO_LONG_CHUNK_MAX_CHARS" value="${escapeHtml(envValue("STRAICO_LONG_CHUNK_MAX_CHARS", String(config.straicoLongChunkMaxChars)))}" /></label>
          <label>INTERACTIVE_TIMEOUT_MS<input name="STRAICO_INTERACTIVE_TIMEOUT_MS" value="${escapeHtml(envValue("STRAICO_INTERACTIVE_TIMEOUT_MS", String(config.straicoInteractiveTimeoutMs)))}" /></label>
          <label>STORY_TIMEOUT_MS<input name="STRAICO_STORY_TIMEOUT_MS" value="${escapeHtml(envValue("STRAICO_STORY_TIMEOUT_MS", String(config.straicoStoryTimeoutMs)))}" /></label>
          <label>ALEXA_TIMEOUT_BUFFER_MS<input name="ALEXA_TIMEOUT_BUFFER_MS" value="${escapeHtml(envValue("ALEXA_TIMEOUT_BUFFER_MS", String(config.alexaTimeoutBufferMs)))}" /></label>
          <label>STORY_MAX_TOKENS<input name="STRAICO_STORY_MAX_TOKENS" value="${escapeHtml(envValue("STRAICO_STORY_MAX_TOKENS", String(config.straicoStoryMaxTokens)))}" /></label>
          <label>STORY_CHUNK_MAX_CHARS<input name="STRAICO_STORY_CHUNK_MAX_CHARS" value="${escapeHtml(envValue("STRAICO_STORY_CHUNK_MAX_CHARS", String(config.straicoStoryChunkMaxChars)))}" /></label>
          <label>GENERIC_CHUNK_MAX_TOKENS<input name="STRAICO_GENERIC_CHUNK_MAX_TOKENS" value="${escapeHtml(envValue("STRAICO_GENERIC_CHUNK_MAX_TOKENS", String(config.straicoGenericChunkMaxTokens)))}" /></label>
          <label>GENERIC_CHUNK_MAX_CHARS<input name="STRAICO_GENERIC_CHUNK_MAX_CHARS" value="${escapeHtml(envValue("STRAICO_GENERIC_CHUNK_MAX_CHARS", String(config.straicoGenericChunkMaxChars)))}" /></label>
          <label>PENDING_RESPONSE_TTL_MS<input name="PENDING_RESPONSE_TTL_MS" value="${escapeHtml(envValue("PENDING_RESPONSE_TTL_MS", String(config.pendingResponseTtlMs)))}" /></label>
          <label>MODEL_SELECTION_TEST_TIMEOUT_MS<input name="MODEL_SELECTION_TEST_TIMEOUT_MS" value="${escapeHtml(envValue("MODEL_SELECTION_TEST_TIMEOUT_MS", String(config.modelSelectionTestTimeoutMs)))}" /></label>
          <label>CROK_CHAT_HISTORY_MAX<input name="CROK_CHAT_HISTORY_MAX" value="${escapeHtml(envValue("CROK_CHAT_HISTORY_MAX", String(config.crokChatHistoryMax)))}" /></label>
          <label>HISTORY_KEEP_LAST<input name="STRAICO_HISTORY_KEEP_LAST" value="${escapeHtml(envValue("STRAICO_HISTORY_KEEP_LAST", String(config.straicoHistoryKeepLast)))}" /></label>
          <label>HISTORY_MAX_CHARS<input name="STRAICO_HISTORY_MAX_CHARS" value="${escapeHtml(envValue("STRAICO_HISTORY_MAX_CHARS", String(config.straicoHistoryMaxChars)))}" /></label>
          <label>HISTORY_ITEM_MAX_CHARS<input name="STRAICO_HISTORY_ITEM_MAX_CHARS" value="${escapeHtml(envValue("STRAICO_HISTORY_ITEM_MAX_CHARS", String(config.straicoHistoryItemMaxChars)))}" /></label>
          <label>SUMMARY_MAX_CHARS<input name="STRAICO_HISTORY_SUMMARY_MAX_CHARS" value="${escapeHtml(envValue("STRAICO_HISTORY_SUMMARY_MAX_CHARS", String(config.straicoHistorySummaryMaxChars)))}" /></label>
          <label>SUMMARY_ITEM_MAX_CHARS<input name="STRAICO_HISTORY_SUMMARY_ITEM_MAX_CHARS" value="${escapeHtml(envValue("STRAICO_HISTORY_SUMMARY_ITEM_MAX_CHARS", String(config.straicoHistorySummaryItemMaxChars)))}" /></label>
          <label>IMPROVER_DECISION_MODEL<input name="PROMPT_IMPROVER_DECISION_MODEL" value="${escapeHtml(envValue("PROMPT_IMPROVER_DECISION_MODEL", config.promptImproverDecisionModel))}" /></label>
          <label>IMPROVER_DECISION_TIMEOUT_MS<input name="PROMPT_IMPROVER_DECISION_TIMEOUT_MS" value="${escapeHtml(envValue("PROMPT_IMPROVER_DECISION_TIMEOUT_MS", String(config.promptImproverDecisionTimeoutMs)))}" /></label>
        </div>
        <button type="submit">Speichern</button>
      </form>
    </div>

    <div class="card">
      <h2>Nutzerverwaltung</h2>
      <table>
        <thead>
          <tr><th>Benutzer</th><th>E-Mail</th><th>Verifiziert</th><th>Skill-Link</th><th>Requests (${usageYear})</th><th>Kosten (${usageYear})</th><th>Aktion</th></tr>
        </thead>
        <tbody>
          ${
            users.length
              ? users
                  .map(
                    (u) => {
                      const usage = u.usage?.[usageYear] || null;
                      const reqCount = usage?.requests ?? 0;
                      const costTotal = usage?.cost ?? 0;
                      const costDisplay = Number.isFinite(Number(costTotal))
                        ? Number(costTotal).toFixed(4)
                        : "-";
                      return `<tr>
                      <td>${escapeHtml(u.username)}</td>
                      <td>${escapeHtml(u.email || "-")}</td>
                      <td>${u.verified ? "ja" : "nein"}</td>
                      <td>${u.alexaLinkedAt ? "verbunden" : "nicht verbunden"}</td>
                      <td>${reqCount || "-"}</td>
                      <td>${reqCount ? costDisplay : "-"}</td>
                      <td>
                        ${
                          u.verified
                            ? ""
                            : `<form method="POST" action="/admin/users/resend">
                              <input type="hidden" name="username" value="${escapeHtml(u.username)}" />
                              <button type="submit">Verifizierung neu senden</button>
                            </form>`
                        }
                        ${
                          u.verified
                            ? ""
                            : `<form method="POST" action="/admin/users/verify">
                              <input type="hidden" name="username" value="${escapeHtml(u.username)}" />
                              <button type="submit">Manuell verifizieren</button>
                            </form>`
                        }
                        ${
                          u.alexaLinkedAt
                            ? `<form method="POST" action="/admin/users/unlink">
                              <input type="hidden" name="username" value="${escapeHtml(u.username)}" />
                              <button type="submit">Verknuepfung trennen</button>
                            </form>`
                            : ""
                        }
                        <form method="POST" action="/admin/users/delete">
                          <input type="hidden" name="username" value="${escapeHtml(u.username)}" />
                          <button type="submit">Loeschen</button>
                        </form>
                      </td>
                    </tr>`;
                    }
                  )
                  .join("")
              : `<tr><td colspan="7" class="muted">Keine registrierten Nutzer.</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Eventlog (letzte 50)</h2>
      ${eventsNotice}
      <div class="muted" style="margin: 6px 0 12px;">
        Filter:
        ${filterLinks
          .map((f) => {
            const active = f.key === filter ? 'style="font-weight:700;"' : "";
            return `<a ${active} href="/admin?filter=${encodeURIComponent(
              f.key
            )}&range=${encodeURIComponent(range)}">${escapeHtml(f.label)}</a>`;
          })
          .join(" · ")}
        &nbsp;|&nbsp; Zeitraum:
        ${rangeLinks
          .map((r) => {
            const active = r.key === range ? 'style="font-weight:700;"' : "";
            return `<a ${active} href="/admin?filter=${encodeURIComponent(
              filter
            )}&range=${encodeURIComponent(r.key)}">${escapeHtml(r.label)}</a>`;
          })
          .join(" · ")}
        &nbsp;|&nbsp; Export:
        <a href="/admin/export?format=csv&filter=${encodeURIComponent(
          filter
        )}&range=${encodeURIComponent(range)}">CSV</a> ·
        <a href="/admin/export?format=json&filter=${encodeURIComponent(
          filter
        )}&range=${encodeURIComponent(range)}">JSON</a>
      </div>
      <table>
        <thead>
          <tr>
            <th>Zeit</th>
            <th>Event</th>
            <th>User</th>
            <th>Account</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${
            events.length
              ? events
                  .map((evt) => {
                    const details =
                      evt.payload && typeof evt.payload === "object"
                        ? JSON.stringify(evt.payload).slice(0, 160)
                        : evt.payload || "";
                    return `<tr>
                      <td>${escapeHtml(evt.event_ts || "")}</td>
                      <td>${escapeHtml(evt.event_type || "")}</td>
                      <td>${escapeHtml(evt.user_id || "-")}</td>
                      <td>${escapeHtml(evt.account_user_id || "-")}</td>
                      <td>${escapeHtml(details)}</td>
                    </tr>`;
                  })
                  .join("")
              : `<tr><td colspan="5" class="muted">Keine Events vorhanden.</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Log-Reports</h2>
      <form method="POST" action="/admin/reports/run" style="margin-bottom: 12px;">
        <button type="submit">Report jetzt erstellen</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Datei</th>
            <th>Datum</th>
            <th>Groesse</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          ${
            reports.length
              ? reports
                  .map((report) => {
                    const date = new Date(report.mtimeMs).toISOString();
                    const viewHref = `/admin/reports?file=${encodeURIComponent(report.name)}`;
                    const downloadHref = `${viewHref}&download=1`;
                    return `<tr>
                      <td>${escapeHtml(report.name)}</td>
                      <td>${escapeHtml(date)}</td>
                      <td>${escapeHtml(formatBytes(report.size))}</td>
                      <td>
                        <a href="${viewHref}">Ansehen</a> ·
                        <a href="${downloadHref}">Download</a>
                        <form method="POST" action="/admin/reports/delete" style="display:inline;">
                          <input type="hidden" name="file" value="${escapeHtml(report.name)}" />
                          <button type="submit">Loeschen</button>
                        </form>
                      </td>
                    </tr>`;
                  })
                  .join("")
              : `<tr><td colspan="4" class="muted">Keine Reports vorhanden.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
};

const allowedAlexaRedirects = new Set(
  [config.alexaRedirectUri, ...config.alexaRedirectUris].filter(Boolean)
);

const clientIdAllowed = (id) => {
  return [config.alexaClientId, config.alexaClientIdAlt].filter(Boolean).includes(id);
};

const clientSecretAllowed = (id, secret) => {
  if (id === config.alexaClientId && secret === config.alexaClientSecret) return true;
  if (id === config.alexaClientIdAlt && secret === config.alexaClientSecretAlt) return true;
  return false;
};

const handleAuthorize = async (req, res, url) => {
  const params = url.searchParams;
  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const state = params.get("state") || "";
  const scope = params.get("scope") || "";
  const responseType = params.get("response_type") || "code";

  if (req.method === "GET") {
    if (!clientId || !clientIdAllowed(clientId)) {
      return sendJson(res, 400, { error: "invalid_client" });
    }
    if (!redirectUri || !allowedAlexaRedirects.has(redirectUri)) {
      return sendJson(res, 400, { error: "invalid_redirect_uri" });
    }
    if (responseType !== "code") {
      return sendJson(res, 400, { error: "unsupported_response_type" });
    }
    return sendHtml(
      res,
      200,
      renderAuthorizePage({ clientId, redirectUri, state, scope })
    );
  }

  if (req.method === "POST") {
    const { parsed: body } = await parseBody(req, "form");
    const rawUser = String(body?.username || "").trim();
    const password = String(body?.password || "").trim();
    const resolvedUser = rawUser.includes("@")
      ? userStore.findByEmail(rawUser)?.username || rawUser
      : userStore.findByUsernameInsensitive(rawUser)?.username || rawUser;
    const bodyClientId = body?.client_id || clientId || "";
    const bodyRedirect = body?.redirect_uri || redirectUri || "";
    const bodyState = body?.state || state || "";
    const bodyScope = body?.scope || scope || "";

    if (!clientIdAllowed(bodyClientId)) {
      return sendJson(res, 400, {
        error: "invalid_client",
        received: bodyClientId,
        allowed: [config.alexaClientId, config.alexaClientIdAlt].filter(Boolean),
      });
    }
    if (!allowedAlexaRedirects.has(bodyRedirect)) {
      console.warn("Authorize invalid_redirect_uri", { bodyRedirect });
      return sendJson(res, 400, { error: "invalid_redirect_uri" });
    }
    if (resolvedUser === config.adminUser) {
      return sendHtml(
        res,
        403,
        renderAuthorizePage({
          clientId: bodyClientId,
          redirectUri: bodyRedirect,
          state: bodyState,
          scope: bodyScope,
          message: "Admin-Konto kann nicht verknuepft werden.",
        })
      );
    }
    const stored = userStore.getUser(resolvedUser);
    const accountUserId = stored?.username || resolvedUser || "";
    console.info("Authorize login attempt", {
      rawUser,
      resolvedUser,
      hasUser: Boolean(stored),
      verified: stored?.verified !== false,
      isAdmin: false,
    });
    if (!rawUser || !password) {
      void logConversationEvent({
        userId: resolvedUser,
        accountUserId,
        eventType: "auth_invalid",
        payload: { reason: "missing_credentials", path: "/oauth/authorize" },
      });
      return sendHtml(
        res,
        400,
        renderAuthorizePage({
          clientId: bodyClientId,
          redirectUri: bodyRedirect,
          state: bodyState,
          scope: bodyScope,
          message: "Bitte E-Mail und Passwort eingeben.",
        })
      );
    }
    const okStored = verifyStoredPassword(password, stored);
    const verified = stored?.verified !== false;
    console.info("Authorize credential check", {
      resolvedUser,
      okStored,
      verified,
      redirect: bodyRedirect,
      clientId: bodyClientId,
    });
    if (!(okStored && verified)) {
      console.warn("Authorize invalid credentials", {
        username: resolvedUser,
        usernameMatch: false,
        passwordLength: password.length,
      });
      void logConversationEvent({
        userId: resolvedUser,
        accountUserId,
        eventType: "auth_invalid",
        payload: { reason: "invalid_credentials", path: "/oauth/authorize" },
      });
      const message = stored && !verified
        ? "Bitte E-Mail bestaetigen, bevor du den Skill verknuepfst. Link erneut anfordern: /verify/resend"
        : "Anmeldung fehlgeschlagen. Bitte pruefe E-Mail/Passwort oder setze dein Passwort zurueck: /reset";
      return sendHtml(
        res,
        401,
        renderAuthorizePage({
          clientId: bodyClientId,
          redirectUri: bodyRedirect,
          state: bodyState,
          scope: bodyScope,
          message,
        })
      );
    }
    if (okStored && verified) {
      userStore.updateUser(resolvedUser, { alexaLinkedAt: new Date().toISOString() });
    }

    const code = randomToken(24);
    const exp = Date.now() + 5 * 60 * 1000; // 5 minutes
    authCodes.set(code, {
      clientId: bodyClientId,
      userId: resolvedUser,
      scope: bodyScope,
      redirectUri: bodyRedirect,
      exp,
    });
    console.info("Authorize success", {
      userId: resolvedUser,
      clientId: bodyClientId,
      redirectUri: bodyRedirect,
    });

    const redirect = new URL(bodyRedirect);
    redirect.searchParams.set("code", code);
    if (bodyState) redirect.searchParams.set("state", bodyState);
    res.writeHead(302, { Location: redirect.toString() });
    return res.end();
  }

  return sendJson(res, 405, { error: "method_not_allowed" });
};

const handleToken = async (req, res) => {
  const oauthHeaders = {
    "cache-control": "no-store",
    pragma: "no-cache",
  };
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" }, oauthHeaders);
  const { parsed: body } = await parseBody(req, "form");
  const grantType = String(body?.grant_type || "").trim();
  let clientId = String(body?.client_id || "").trim();
  let clientSecret = String(body?.client_secret || "").trim();
  const hasAuthHeader = Boolean(req.headers.authorization);
  console.info("Token request", {
    grantType,
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    hasAuthHeader,
  });
  if (!clientId || !clientSecret) {
    const basic = parseBasicAuth(req.headers.authorization || "");
    if (basic) {
      clientId = clientId || basic.id;
      clientSecret = clientSecret || basic.secret;
    }
  }

  if (!clientSecretAllowed(clientId, clientSecret)) {
    const secretFingerprint = clientSecret
      ? crypto.createHash("sha256").update(clientSecret).digest("hex").slice(0, 8)
      : "";
    const configFingerprint = config.alexaClientSecret
      ? crypto.createHash("sha256").update(config.alexaClientSecret).digest("hex").slice(0, 8)
      : "";
    console.warn("Token invalid_client", {
      clientId,
      clientSecretLen: clientSecret.length,
      configSecretLen: config.alexaClientSecret.length,
      secretFingerprint,
      configFingerprint,
      hasAuthHeader,
    });
    return sendJson(res, 401, { error: "invalid_client" }, oauthHeaders);
  }

  if (grantType === "authorization_code") {
    const code = body?.code || "";
    const redirectUri = body?.redirect_uri || "";
    const stored = authCodes.get(code);
    if (!stored) {
      console.warn("Token invalid_grant: code not found");
      return sendJson(res, 400, { error: "invalid_grant" }, oauthHeaders);
    }
    if (!allowedAlexaRedirects.has(redirectUri) || stored.redirectUri !== redirectUri) {
      console.warn("Token invalid_grant: redirect mismatch", {
        redirectUri,
        storedRedirect: stored.redirectUri,
      });
      return sendJson(res, 400, { error: "invalid_grant" }, oauthHeaders);
    }
    if (stored.exp < Date.now()) {
      authCodes.delete(code);
      console.warn("Token invalid_grant: code expired");
      return sendJson(
        res,
        400,
        { error: "invalid_grant", error_description: "code expired" },
        oauthHeaders
      );
    }
    authCodes.delete(code);
    const accessToken = randomToken(32);
    const refreshToken = randomToken(32);
    const exp = Date.now() + 60 * 60 * 1000;
    const refreshPayload = {
      clientId,
      userId: stored.userId,
      scope: stored.scope,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    refreshTokens.set(refreshToken, refreshPayload);
    tokenStore.saveRefreshToken(refreshToken, refreshPayload);
    const accessPayload = { userId: stored.userId, exp };
    accessTokens.set(accessToken, accessPayload);
    tokenStore.saveAccessToken(accessToken, accessPayload);
    console.info("Token issued", { userId: stored.userId, clientId });
    return sendJson(
      res,
      200,
      {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: stored.scope,
      },
      oauthHeaders
    );
  }

  if (grantType === "refresh_token") {
    const refreshToken = body?.refresh_token || "";
    const stored = refreshTokens.get(refreshToken) || tokenStore.getRefreshToken(refreshToken);
    if (!stored) {
      console.warn("Token invalid_grant: refresh not found");
      return sendJson(res, 400, { error: "invalid_grant" }, oauthHeaders);
    }
    if (stored.exp < Date.now()) {
      refreshTokens.delete(refreshToken);
      tokenStore.deleteRefreshToken(refreshToken);
      console.warn("Token invalid_grant: refresh expired");
      return sendJson(
        res,
        400,
        { error: "invalid_grant", error_description: "refresh expired" },
        oauthHeaders
      );
    }
    const accessToken = randomToken(32);
    const accessPayload = { userId: stored.userId, exp: Date.now() + 60 * 60 * 1000 };
    accessTokens.set(accessToken, accessPayload);
    tokenStore.saveAccessToken(accessToken, accessPayload);
    console.info("Token refreshed", { userId: stored.userId, clientId });
    return sendJson(
      res,
      200,
      {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: stored.scope,
      },
      oauthHeaders
    );
  }

  return sendJson(res, 400, { error: "unsupported_grant_type" }, oauthHeaders);
};

const certCache = new Map(); // url -> pem
const modelCache = {
  list: [],
  updatedAt: 0,
  ttlMs: 7 * 24 * 60 * 60 * 1000,
};
const inactiveModels = new Map(); // id -> untilMs
const modelSelectionCache = {
  updatedAt: 0,
  refreshing: false,
  error: "",
  results: {},
  selected: {},
  webModels: [],
};

const llmCallStats = new Map(); // model -> { count, errorCount, timeoutCount, totalMs, maxMs, lastAt }
const pendingResponsesByUser = new Map(); // userKey -> { id, userKey, status, response, prompt, history, createdAt, expiresAt, requestId }

const getPendingUserKey = (userId, accountUserId) => {
  return accountUserId || userId || "";
};

const schedulePendingResponse = ({
  userId,
  accountUserId,
  requestId,
  prompt,
  history,
  messages,
  straicoMode,
  model,
  maxTokens,
  timeoutMs,
}) => {
  const pendingUserKey = getPendingUserKey(userId, accountUserId);
  const pendingEntry = createPendingResponse({
    userKey: pendingUserKey,
    requestId: requestId || "",
    prompt,
    history,
  });
  const meta = {
    pendingUserKey,
    pendingEntry,
  };
  if (!pendingEntry) return meta;
  const retryMessages = Array.isArray(messages) ? [...messages].slice(-config.crokChatHistoryMax) : [];
  const retryTimeoutMs = Math.max(
    2000,
    Math.min(config.straicoRequestTimeoutMs, config.pendingResponseTtlMs - 1000)
  );
  if (useStraicoChat()) {
    straicoChatCompletions(retryMessages, {
      systemPrompt: straicoPromptForMode(straicoMode || "short"),
      model: model || config.straicoFallbackModel,
      maxTokens: maxTokens || config.straicoMaxTokensShort,
      useAutoSelector: false,
      fallbackModel: null,
      timeoutMs: timeoutMs || retryTimeoutMs,
      requestId: requestId || "",
    })
      .then((final) => {
        if (!pendingEntry) return;
        if (final.ok) {
          const finalText = extractStraicoText(final.json);
          if (finalText && String(finalText).trim()) {
            resolvePendingResponse({
              userKey: pendingUserKey,
              id: pendingEntry.id,
              responseText: finalText,
            });
            return;
          }
        }
        failPendingResponse({ userKey: pendingUserKey, id: pendingEntry.id });
      })
      .catch(() => {
        failPendingResponse({ userKey: pendingUserKey, id: pendingEntry.id });
      });
  }
  return meta;
};

const createPendingResponse = ({ userKey, requestId, prompt, history }) => {
  if (!userKey) return null;
  const id = randomToken(16);
  const now = Date.now();
  const entry = {
    id,
    userKey,
    status: "pending",
    response: "",
    prompt: prompt || "",
    history: Array.isArray(history) ? history : [],
    createdAt: now,
    expiresAt: now + config.pendingResponseTtlMs,
    requestId: requestId || "",
  };
  pendingResponsesByUser.set(userKey, entry);
  return entry;
};

const resolvePendingResponse = ({ userKey, id, responseText }) => {
  const entry = pendingResponsesByUser.get(userKey || "");
  if (!entry || entry.id !== id) return false;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    pendingResponsesByUser.delete(userKey);
    return false;
  }
  entry.status = "ready";
  entry.response = responseText || "";
  pendingResponsesByUser.set(userKey, entry);
  return true;
};

const failPendingResponse = ({ userKey, id }) => {
  const entry = pendingResponsesByUser.get(userKey || "");
  if (!entry || entry.id !== id) return false;
  entry.status = "failed";
  pendingResponsesByUser.set(userKey, entry);
  return true;
};

const getPendingResponse = (userKey) => {
  const entry = pendingResponsesByUser.get(userKey || "");
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    pendingResponsesByUser.delete(userKey);
    return null;
  }
  return entry;
};

const clearPendingResponse = (userKey) => {
  if (!userKey) return;
  pendingResponsesByUser.delete(userKey);
};

const getInactiveModelsSnapshot = () => {
  const now = Date.now();
  const snapshot = [];
  for (const [id, until] of inactiveModels.entries()) {
    if (!until || until <= now) {
      inactiveModels.delete(id);
      continue;
    }
    snapshot.push({ id, until, remainingMs: until - now });
  }
  return snapshot.sort((a, b) => b.remainingMs - a.remainingMs);
};

const clearInactiveModels = () => {
  inactiveModels.clear();
};

const recordLlmStat = (modelId, elapsedMs, status) => {
  const key = modelId || "unknown";
  const entry = llmCallStats.get(key) || {
    count: 0,
    errorCount: 0,
    timeoutCount: 0,
    totalMs: 0,
    maxMs: 0,
    lastAt: 0,
  };
  entry.count += 1;
  if (status === 504) entry.timeoutCount += 1;
  if (status && status >= 400) entry.errorCount += 1;
  if (typeof elapsedMs === "number") {
    entry.totalMs += elapsedMs;
    if (elapsedMs > entry.maxMs) entry.maxMs = elapsedMs;
  }
  entry.lastAt = Date.now();
  llmCallStats.set(key, entry);
};

const getLlmStatsSnapshot = () => {
  const entries = [];
  for (const [model, stat] of llmCallStats.entries()) {
    const avgMs = stat.count ? Math.round(stat.totalMs / stat.count) : 0;
    entries.push({ model, ...stat, avgMs });
  }
  return entries.sort((a, b) => (b.count || 0) - (a.count || 0));
};

const buildModelText = (model) => {
  const meta = model?.metadata || {};
  const parts = []
    .concat(meta.pros || [])
    .concat(meta.cons || [])
    .concat(meta.applications || [])
    .concat(meta.capabilities || [])
    .concat(meta.features || [])
    .concat(meta.other || []);
  return parts.join(" ").toLowerCase();
};

const scoreModelForUseCase = (model, useCase) => {
  const meta = model?.metadata || {};
  const editors = Number(meta.editors_choice_level || 0);
  const wordLimit = Number(model?.word_limit || 0);
  const coins = Number(model?.pricing?.coins || 0);
  const id = String(model?.id || "");
  const text = buildModelText(model);
  let score = editors * 2000 + Math.min(wordLimit, 200000) / 1000 - coins * 4;

  if (useCase === "dialog") {
    if (text.includes("social chat")) score += 200;
    if (text.includes("writing")) score += 120;
    if (text.includes("content")) score += 100;
    if (text.includes("tutoring")) score += 80;
    if (text.includes("reasoning")) score += 120;
  }
  if (useCase === "facts") {
    if (text.includes("classification")) score += 180;
    if (text.includes("summar")) score += 140;
    if (text.includes("translation")) score += 100;
    if (text.includes("browsing")) score += 160;
    if (text.includes("reasoning")) score += 120;
    if (text.includes("analysis")) score += 100;
  }
  if (useCase === "explain") {
    if (text.includes("reasoning")) score += 220;
    if (text.includes("tutoring")) score += 180;
    if (text.includes("complex")) score += 140;
    if (text.includes("analysis")) score += 140;
    if (text.includes("science")) score += 120;
  }
  if (useCase === "trend") {
    if (text.includes("browsing")) score += 220;
    if (text.includes("news")) score += 140;
    if (id.includes("grok") || id.includes("x-ai")) score += 200;
    if (/perplexity|pplx/i.test(id + text)) score += 4000;
  }
  if (useCase === "creative") {
    if (text.includes("writing")) score += 200;
    if (text.includes("content")) score += 160;
    if (text.includes("story")) score += 120;
    if (text.includes("creative")) score += 160;
  }
  if (text.includes("low cost") || text.includes("cost-effective")) score += 10;
  if (text.includes("fast") || text.includes("low latency")) score += 10;
  if (text.includes("high quality") || text.includes("premium")) score += 120;
  if (text.includes("state of the art") || text.includes("state-of-the-art")) score += 120;
  if (text.includes("limited")) score -= 120;
  if (text.includes("overzealous refusals")) score -= 80;

  return score;
};

const getModelTokens = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v || "").toLowerCase()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
};

const isWebCapableModel = (model) => {
  if (!model) return false;
  const id = String(model.id || "");
  if (config.straicoWebModels.includes(id)) return true;
  const textParts = [
    id,
    model.provider,
    model.name,
    model.description,
    model.pros,
    model.applications,
    model.features,
    model.capabilities,
    model?.metadata?.description,
    model?.metadata?.notes,
    model?.metadata?.pros,
    model?.metadata?.applications,
    model?.metadata?.features,
    model?.metadata?.capabilities,
  ]
    .map((v) => String(v || "").toLowerCase())
    .filter(Boolean);
  const tokens = [
    ...getModelTokens(model?.tags),
    ...getModelTokens(model?.metadata?.tags),
    ...getModelTokens(model?.metadata?.capabilities),
    ...getModelTokens(model?.capabilities),
    ...getModelTokens(model?.features),
    ...getModelTokens(model?.applications),
    ...getModelTokens(model?.pros),
  ];
  const text = [...textParts, ...tokens].join(" ");
  return /(web|browser|realtime|real-time|search|live|internet|online)/.test(text);
};

const isPerplexityModel = (model) => {
  if (!model) return false;
  const id = String(model.id || "").toLowerCase();
  const text = buildModelText(model) + " " + String(model.provider || "") + " " + String(model.name || "");
  return /(perplexity|pplx)/.test(id + text);
};

const selectTopModels = (models, useCase, max = 3) => {
  const pool = models.filter((m) => m && m.model_type === "chat" && m.id);
  if (useCase === "trend") {
    const webCandidates = pool.filter((m) => isWebCapableModel(m));
    if (webCandidates.length) {
      return webCandidates
        .map((m) => ({ id: m.id, score: scoreModelForUseCase(m, useCase), web: true }))
        .sort((a, b) => b.score - a.score)
        .slice(0, max);
    }
  }
  return pool
    .map((m) => ({
      id: m.id,
      score: scoreModelForUseCase(m, useCase),
      web: isWebCapableModel(m),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
};

const testModelOnce = async (modelId, useCase) => {
  const promptMap = {
    dialog: "Testanfrage (Dialog). Antworte nur mit OK.",
    facts: "Testanfrage (Fakten). Antworte nur mit OK.",
    explain: "Testanfrage (Erklaerung). Antworte nur mit OK.",
    trend: "Testanfrage (Trend). Antworte nur mit OK.",
    creative: "Testanfrage (Story). Antworte nur mit OK.",
  };
  const prompt = promptMap[useCase] || promptMap.dialog;
  const result = await straicoChatCompletions([{ role: "user", content: prompt }], {
    model: modelId,
    maxTokens: 16,
    useAutoSelector: false,
    fallbackModel: null,
    timeoutMs: Math.min(
      config.modelSelectionTestTimeoutMs,
      config.straicoRequestTimeoutMs
    ),
    recordStats: false,
    allowModelDeactivate: false,
    requestId: "model_selection_test",
    label: "model-test",
  });
  const text = result.ok ? extractStraicoText(result.json) : "";
  const ok = result.ok && Boolean(text && text.trim());
  return {
    ok,
    status: result.status,
    elapsedMs: result.elapsedMs || null,
    responseModel: result.responseModel || modelId,
  };
};

const refreshModelSelections = async ({ withTests = true } = {}) => {
  if (modelSelectionCache.refreshing) return;
  modelSelectionCache.refreshing = true;
  modelSelectionCache.error = "";
  try {
    const models = await fetchStraicoModels();
    modelSelectionCache.webModels = models
      .filter((m) => m && m.model_type === "chat" && isWebCapableModel(m))
      .map((m) => m.id);
    const useCases = ["dialog", "facts", "explain", "trend", "creative"];
    const results = {};
    const selected = {};
    for (const useCase of useCases) {
      const candidates = selectTopModels(models, useCase, 3).filter((c) =>
        isModelActive(c.id)
      );
      const tests = [];
      let chosen = "";
      if (withTests) {
        for (const candidate of candidates) {
          const test = await testModelOnce(candidate.id, useCase);
          const latencyOk =
            typeof test.elapsedMs === "number" &&
            test.elapsedMs > 0 &&
            test.elapsedMs <= config.modelSelectionMaxLatencyMs;
          tests.push({ ...candidate, ...test, latencyOk });
        }
        const okByQuality = tests
          .filter((test) => test.ok)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.elapsedMs || 999999) - (b.elapsedMs || 999999);
          });
        if (okByQuality.length) {
          chosen = okByQuality[0].id;
        } else if (candidates.length) {
          chosen = candidates[0].id;
        }
      } else if (candidates.length) {
        chosen = candidates[0].id;
      }
      results[useCase] = { candidates, tests, selected: chosen || "" };
      if (chosen) selected[useCase] = chosen;
    }
    modelSelectionCache.results = results;
    modelSelectionCache.selected = selected;
    modelSelectionCache.updatedAt = Date.now();
  } catch (err) {
    modelSelectionCache.error = err?.message || "model_selection_failed";
  } finally {
    modelSelectionCache.refreshing = false;
  }
};

const maybeRefreshModelSelections = () => {
  const now = Date.now();
  if (!modelSelectionCache.updatedAt || now - modelSelectionCache.updatedAt > 24 * 60 * 60 * 1000) {
    void refreshModelSelections({ withTests: config.modelSelectionAutoTests });
  }
};

const getSelectedModelForUseCase = (useCase, fallback) => {
  const picked = modelSelectionCache.selected?.[useCase];
  return picked || fallback;
};
let improverDisabledUntil = 0;

const fetchCert = (certUrl) => {
  return new Promise((resolve, reject) => {
    https
      .get(certUrl, (resp) => {
        if (resp.statusCode !== 200) {
          return reject(new Error(`Cert fetch failed: ${resp.statusCode}`));
        }
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
};

const validateCertUrl = (urlStr) => {
  const url = new URL(urlStr);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:") return false;
  if (!(host.endsWith("amazonaws.com") || host.endsWith("amazontrust.com"))) return false;
  if (url.port && url.port !== "443") return false;
  if (!url.pathname.includes("/echo.api/")) return false;
  return true;
};

const verifyAlexaSignature = async (rawBody, headers) => {
  const sig = headers["signature"] || headers["Signature"] || "";
  const certUrl = headers["signaturecertchainurl"] || headers["SignatureCertChainUrl"] || "";
  if (!sig || !certUrl) return false;
  if (!validateCertUrl(certUrl)) return false;
  let certPem = certCache.get(certUrl);
  if (!certPem) {
    certPem = await fetchCert(certUrl);
    certCache.set(certUrl, certPem);
  }
  const verifier = crypto.createVerify("sha1");
  verifier.update(rawBody);
  verifier.end();
  const signature = Buffer.from(sig, "base64");
  return verifier.verify(certPem, signature);
};

const ensureRecentTimestamp = (timestamp) => {
  if (!timestamp) return false;
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return false;
  const diff = Math.abs(Date.now() - t);
  return diff < 150 * 1000; // 150 seconds
};

const fetchStraicoModels = async () => {
  if (!config.straicoApiKey) return [];
  const now = Date.now();
  if (now - modelCache.updatedAt < modelCache.ttlMs && modelCache.list.length) {
    return modelCache.list;
  }
  try {
    const resp = await fetch(`${config.straicoApiBase}/v2/models`, {
      headers: {
        authorization: `Bearer ${config.straicoApiKey}`,
      },
    });
    if (!resp.ok) {
      console.warn("Straico models fetch failed", { status: resp.status });
      return modelCache.list;
    }
    const json = await resp.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    modelCache.list = list;
    modelCache.updatedAt = now;
    return list;
  } catch (err) {
    console.warn("Straico models fetch error", { error: err?.message });
    return modelCache.list;
  }
};

const scoreModel = (model) => {
  const editors = Number(model?.metadata?.editors_choice_level || 0);
  const wordLimit = Number(model?.word_limit || 0);
  const coins = Number(model?.pricing?.coins || 0);
  const id = String(model?.id || "");
  const providerBonus = id.startsWith("openai/") ? 1000 : 0;
  return editors * 20000 + providerBonus + Math.min(wordLimit, 200000) / 1000 - coins * 0.5;
};

const isModelActive = (id) => {
  if (!id) return false;
  const until = inactiveModels.get(id);
  if (!until) return true;
  if (Date.now() > until) {
    inactiveModels.delete(id);
    return true;
  }
  return false;
};

const markModelInactive = (id, reason) => {
  if (!id) return;
  if (id === config.straicoFallbackModel) return;
  let ttlMs = 24 * 60 * 60 * 1000;
  if (String(reason || "").includes("timeout")) {
    ttlMs = 60 * 60 * 1000;
  } else if (String(reason || "").includes("straico_500")) {
    ttlMs = 2 * 60 * 60 * 1000;
  }
  inactiveModels.set(id, Date.now() + ttlMs);
  console.warn("Model marked inactive", { id, reason, ttlMs });
};

const pickModel = async (preferred, exclude = new Set()) => {
  if (preferred && isModelActive(preferred) && !exclude.has(preferred)) return preferred;
  const list = await fetchStraicoModels();
  const candidates = list
    .filter((m) => m && m.model_type === "chat" && m.id)
    .sort((a, b) => scoreModel(b) - scoreModel(a))
    .map((m) => m.id);
  for (const id of candidates) {
    if (!exclude.has(id) && isModelActive(id)) return id;
  }
  return preferred || "";
};

const crokClient = async (pathName, options = {}) => {
  const url = `${config.crokApiBase}${pathName}`;
  const headers = {
    "content-type": "application/json",
  };
  const apiKey = options.apiKey || config.crokApiKey;
  if (apiKey) headers["x-api-key"] = apiKey;
  if (options.token) headers["authorization"] = `Bearer ${options.token}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || config.crokRequestTimeoutMs);
  try {
    const resp = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { ok: resp.ok, status: resp.status, json };
  } catch (err) {
    if (err.name === "AbortError") {
      return { ok: false, status: 504, json: { error: "timeout" } };
    }
    return { ok: false, status: 500, json: { error: "request_failed", detail: err.message } };
  } finally {
    clearTimeout(timeout);
  }
};

const crokStatus = async (apiKey, token) => {
  return crokClient(config.crokStatusPath, { method: "GET", apiKey, token });
};

const crokAction = async (actionName, params = {}, apiKey, token) => {
  return crokClient(config.crokActionPath, {
    method: "POST",
    body: {
      action: actionName,
      parameters: params,
    },
    apiKey,
    token,
  });
};

const useXaiChat = () => {
  if (config.crokChatMode) return config.crokChatMode.toLowerCase() === "xai";
  return config.crokApiBase.includes("api.x.ai");
};

const useStraicoChat = () => {
  return config.crokChatMode.toLowerCase() === "straico";
};

const summarizeHistory = (items) => {
  if (!items.length) return "";
  const parts = [];
  for (const item of items) {
    const clean = String(item.content || "").replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const snippet =
      clean.length > config.straicoHistorySummaryItemMaxChars
        ? `${clean.slice(0, config.straicoHistorySummaryItemMaxChars)}...`
        : clean;
    parts.push(`${item.role}: ${snippet}`);
  }
  const summary = parts.join(" | ");
  if (summary.length > config.straicoHistorySummaryMaxChars) {
    return `${summary.slice(0, config.straicoHistorySummaryMaxChars)}...`;
  }
  return summary;
};

const normalizeChatHistory = (history) => {
  if (!Array.isArray(history)) return [];
  const normalized = history
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.role === "string" &&
        typeof item.content === "string"
    )
    .map((item) => {
      const content = String(item.content || "");
      const trimmed =
        content.length > config.straicoHistoryItemMaxChars
          ? content.slice(0, config.straicoHistoryItemMaxChars)
          : content;
      return { role: item.role, content: trimmed };
    });
  const keepLast = Math.max(0, config.straicoHistoryKeepLast);
  const older = keepLast > 0 ? normalized.slice(0, -keepLast) : normalized;
  const recent = keepLast > 0 ? normalized.slice(-keepLast) : [];
  const summaryText = summarizeHistory(older);
  const result = [];
  if (summaryText) {
    result.push({
      role: "system",
      content: `Zusammenfassung bisher: ${summaryText}`,
    });
  }
  result.push(...recent);
  let total = 0;
  const capped = [];
  for (const item of result) {
    total += item.content.length;
    if (total > config.straicoHistoryMaxChars) {
      if (item.role === "system") {
        const allowed = Math.max(0, config.straicoHistoryMaxChars - (total - item.content.length));
        const trimmed = allowed > 20 ? item.content.slice(0, allowed) : "";
        if (trimmed) capped.push({ role: item.role, content: trimmed });
      }
      break;
    }
    capped.push(item);
  }
  return capped;
};

const crokChatCompletions = async (messages, token) => {
  const url = `${config.crokApiBase}${config.crokChatPath}`;
  const headers = {
    "content-type": "application/json",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.crokRequestTimeoutMs);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.crokChatModel,
        messages,
        temperature: config.crokChatTemperature,
      }),
      signal: controller.signal,
    });
    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    if (!resp.ok) {
      console.error("Crok error response", {
        status: resp.status,
        error: json?.error || json?.message,
        detail: json?.detail,
      });
    }
    return { ok: resp.ok, status: resp.status, json };
  } catch (err) {
    if (err.name === "AbortError") {
      return { ok: false, status: 504, json: { error: "timeout" } };
    }
    console.error("Crok request failed", { error: err?.message });
    return { ok: false, status: 500, json: { error: "request_failed", detail: err.message } };
  } finally {
    clearTimeout(timeout);
  }
};

const buildStraicoMessages = (messages, systemPrompt) => {
  const out = [];
  const pushText = (role, text) => {
    const trimmed = String(text ?? "").trim();
    if (!trimmed) return;
    out.push({
      role,
      content: [{ type: "text", text: trimmed }],
    });
  };
  if (systemPrompt) {
    pushText("system", systemPrompt);
  }
  for (const msg of messages) {
    pushText(msg.role, msg.content);
  }
  return out;
};

const estimateTokensFromText = (text) => {
  if (!text) return 0;
  const len = String(text).length;
  return Math.ceil(len / 4);
};

const estimateTokensFromMessages = (messages = []) => {
  let total = 0;
  for (const msg of messages) {
    const content = msg?.content || [];
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part?.text) total += estimateTokensFromText(part.text);
      }
    } else if (typeof content === "string") {
      total += estimateTokensFromText(content);
    }
  }
  return total;
};

const getModelTokenLimit = (modelId) => {
  if (!modelId) return 0;
  const list = Array.isArray(modelCache.list) ? modelCache.list : [];
  const match = list.find((model) => String(model?.id || "") === modelId);
  if (!match) return 0;
  const candidates = [
    Number(match.context_length || 0),
    Number(match.context_window || 0),
    Number(match.token_limit || 0),
    Number(match.max_tokens || 0),
    Number(match.word_limit || 0),
  ].filter((value) => Number.isFinite(value) && value > 0);
  return candidates.length ? candidates[0] : 0;
};

const applyModelTokenBudget = (messages = [], modelId) => {
  const limit = getModelTokenLimit(modelId);
  if (!limit) {
    return {
      messages,
      contextTokens: estimateTokensFromMessages(messages),
      contextLimit: 0,
      contextBudget: 0,
      trimmed: false,
    };
  }
  const budget = Math.min(5000, Math.max(120, Math.floor(limit * 0.25)));
  const systemMessage = messages.find((m) => m.role === "system") || null;
  const otherMessages = messages.filter((m) => m.role !== "system");
  const retained = [];
  let tokens = 0;
  if (systemMessage) {
    tokens += estimateTokensFromMessages([systemMessage]);
  }
  for (let i = otherMessages.length - 1; i >= 0; i -= 1) {
    const msg = otherMessages[i];
    const msgTokens = estimateTokensFromMessages([msg]);
    if (tokens + msgTokens > budget && retained.length > 0) break;
    tokens += msgTokens;
    retained.push(msg);
  }
  retained.reverse();
  const finalMessages = systemMessage ? [systemMessage, ...retained] : retained;
  return {
    messages: finalMessages,
    contextTokens: estimateTokensFromMessages(finalMessages),
    contextLimit: limit,
    contextBudget: budget,
    trimmed: finalMessages.length !== messages.length,
  };
};

const isContextTooLargeError = (text) => {
  const normalized = String(text || "").toLowerCase();
  return (
    normalized.includes("context length") ||
    normalized.includes("excessively large context") ||
    normalized.includes("context too large")
  );
};

const reduceToMinimalMessages = (messages) => {
  if (!Array.isArray(messages) || messages.length <= 2) return messages;
  const system = messages.find((msg) => msg?.role === "system");
  const lastUser = [...messages].reverse().find((msg) => msg?.role === "user");
  const minimal = [];
  if (system) minimal.push(system);
  if (lastUser) minimal.push(lastUser);
  return minimal.length ? minimal : messages.slice(-2);
};

const extractStraicoText = (payload) => {
  const collectText = (value, depth = 0) => {
    if (!value || depth > 4) return [];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) {
      return value.flatMap((item) => collectText(item, depth + 1));
    }
    if (typeof value === "object") {
      const parts = [];
      if (typeof value.text === "string") parts.push(value.text);
      if (typeof value.value === "string") parts.push(value.value);
      if (typeof value.content === "string") parts.push(value.content);
      if (Array.isArray(value.content)) {
        parts.push(...collectText(value.content, depth + 1));
      }
      if (typeof value.message === "string") parts.push(value.message);
      if (value.message) parts.push(...collectText(value.message, depth + 1));
      return parts;
    }
    return [];
  };
  const primary = payload?.choices?.[0]?.message?.content;
  const primaryText = collectText(primary).join(" ").trim();
  if (primaryText) return primaryText;
  const nestedChoice =
    payload?.choices?.[0]?.message?.content?.[0]?.text ||
    payload?.choices?.[0]?.message?.content?.[0]?.value;
  if (typeof nestedChoice === "string" && nestedChoice.trim()) return nestedChoice.trim();
  const direct =
    payload?.choices?.[0]?.text ||
    payload?.choices?.[0]?.message?.text ||
    payload?.message ||
    payload?.answer ||
    payload?.output ||
    payload?.data?.output ||
    payload?.data?.text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const dataChoice =
    payload?.data?.choices?.[0]?.message?.content ||
    payload?.data?.choices?.[0]?.text;
  const dataText = collectText(dataChoice).join(" ").trim();
  if (dataText) return dataText;
  if (Array.isArray(payload?.data)) {
    const first = payload.data[0];
    const dataText = collectText(first).join(" ").trim();
    if (dataText) return dataText;
  }
  if (Array.isArray(payload?.full_current_chat)) {
    const lastAssistant = [...payload.full_current_chat]
      .reverse()
      .find((item) => item?.role === "assistant");
    const chatText = collectText(lastAssistant?.content).join(" ").trim();
    if (chatText) return chatText;
    const nestedChat = collectText(lastAssistant?.message).join(" ").trim();
    if (nestedChat) return nestedChat;
  }
  return "";
};

const extractPromptCompletionText = (payload) => {
  const direct =
    payload?.output ||
    payload?.text ||
    payload?.message ||
    payload?.data?.output ||
    payload?.data?.text ||
    payload?.data?.message;
  if (typeof direct === "string") return direct;
  if (Array.isArray(payload?.data)) {
    const first = payload.data[0];
    if (typeof first?.output === "string") return first.output;
    if (typeof first?.text === "string") return first.text;
    if (typeof first?.message === "string") return first.message;
  }
  return extractStraicoText(payload);
};

const buildPromptImproverMessage = (history, userText, mode) => {
  const lastTurns = Array.isArray(history) ? history.slice(-4) : [];
  const rawHistory = lastTurns.map((m) => `${m.role}: ${m.content}`).join("\n");
  const formattedHistory =
    rawHistory.length > 2000 ? `${rawHistory.slice(0, 2000)}...` : rawHistory;
  const safeUserText =
    String(userText || "").length > 2000
      ? `${String(userText || "").slice(0, 2000)}...`
      : String(userText || "");
  const style =
    "Ausgabe muss fuer eine spaetere Sprachausgabe geeignet sein (klare Saetze, lesbares Deutsch). " +
    "Aufzaehlungen sind erlaubt. Kein Markdown, keine Emojis. " +
    "Halte die Laenge passend zur Anfrage; bei expliziter Laengenangabe strikt folgen. " +
    "Keine kurzen Bestaetigungen wie 'Okay' als alleinige Antwort.";
  const modeHint =
    mode === "long"
      ? "Erzeuge einen Prompt fuer eine lange, zusammenhaengende Geschichte."
      : mode === "develop"
      ? "Erzeuge einen Prompt fuer einen dialogorientierten Verlauf mit genau einer Rueckfrage."
      : "Erzeuge einen Prompt fuer eine klare, passende Antwort ohne kuenstliche Verkuerzung.";
  const historyBlock = formattedHistory
    ? `\nBisheriger Verlauf (gekürzt):\n${formattedHistory}\n`
    : "";
  return (
    "Du bist Prompt-Engineer. Verbessere den folgenden Roh-Prompt so, dass ein LLM " +
    "die bestmoegliche Antwort erzeugen kann.\n\n" +
    "Regeln:\n" +
    "- Intention beibehalten, keine Fakten erfinden.\n" +
    "- Keine Rueckfragen an den Nutzer stellen; triff sinnvolle Annahmen und formuliere sie im Prompt.\n" +
    "- Definiere Ziel, Kontext, Tonalitaet, Output-Format und Constraints.\n" +
    "- " +
    style +
    "\n- Ausgabe: NUR der verbesserte Prompt, keine Erklaerungen.\n\n" +
    historyBlock +
    `Modus-Hinweis: ${modeHint}\n\n` +
    "Roh-Prompt:\n<<<\n" +
    safeUserText +
    "\n>>>"
  );
};

const buildPromptDecisionMessage = (history, userText) => {
  const lastTurns = Array.isArray(history) ? history.slice(-4) : [];
  const rawHistory = lastTurns.map((m) => `${m.role}: ${m.content}`).join("\n");
  const formattedHistory =
    rawHistory.length > 1200 ? `${rawHistory.slice(0, 1200)}...` : rawHistory;
  const safeUserText =
    String(userText || "").length > 1200
      ? `${String(userText || "").slice(0, 1200)}...`
      : String(userText || "");
  const historyBlock = formattedHistory
    ? `\nBisheriger Verlauf (gekürzt):\n${formattedHistory}\n`
    : "";
  return (
    "Du bist Dialog-Controller. Entscheide, ob eine Rueckfrage zwingend noetig ist " +
    "oder ob direkt geantwortet werden kann. Gib NUR JSON aus.\n\n" +
    "Format:\n" +
    '{"action":"ask|answer","length":"short|detail|long"}\n\n' +
    "Regeln:\n" +
    "- Frage nur nach, wenn eine klare Antwort ohne Zusatzinfo nicht moeglich ist.\n" +
    "- Laenge: short = 1-2 Saetze, detail = 4-7 Saetze, long = zusammenhaengend lang.\n" +
    "- Keine Erklaerungen, nur JSON.\n\n" +
    historyBlock +
    "Nutzeranfrage:\n<<<\n" +
    safeUserText +
    "\n>>>"
  );
};

const parsePromptDecision = (text) => {
  const parsed = parseJsonFromText(text);
  if (!parsed || typeof parsed !== "object") return null;
  const action = String(parsed.action || "").trim().toLowerCase();
  const length = String(parsed.length || "").trim().toLowerCase();
  if (!action || !length) return null;
  return {
    action: action === "ask" ? "ask" : "answer",
    length: ["short", "detail", "long"].includes(length) ? length : "short",
  };
};

const straicoPromptCompletion = async (message, options = {}) => {
  const url = `${config.straicoApiBase}/v1/prompt/completion`;
  const headers = { "content-type": "application/json" };
  if (config.straicoApiKey) headers.authorization = `Bearer ${config.straicoApiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(options.timeoutMs) || config.crokRequestTimeoutMs
  );
  try {
    const body = {
      models: [options.model || config.promptImproverModel],
      message,
      temperature:
        typeof options.temperature === "number"
          ? options.temperature
          : config.promptImproverTemperature,
    };
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    if (!resp.ok) {
      console.error("Straico prompt improver error", {
        status: resp.status,
        error: json?.error || json?.message || json?.detail,
      });
      return { ok: false, status: resp.status, json };
    }
    return { ok: true, status: resp.status, json };
  } catch (err) {
    if (err.name === "AbortError") {
      return { ok: false, status: 504, json: { error: "timeout" } };
    }
    return { ok: false, status: 500, json: { error: "request_failed", detail: err.message } };
  } finally {
    clearTimeout(timeout);
  }
};

const isImproverActive = () => {
  if (!config.promptImproverEnabled) return false;
  if (!improverDisabledUntil) return true;
  if (Date.now() > improverDisabledUntil) {
    improverDisabledUntil = 0;
    return true;
  }
  return false;
};

const disableImproverForDay = (reason) => {
  improverDisabledUntil = Date.now() + 24 * 60 * 60 * 1000;
  console.warn("Prompt improver disabled for 24h", { reason });
};

const straicoChatCompletions = async (messages, options = {}) => {
  const url = `${config.straicoApiBase}${config.straicoChatPath}`;
  const headers = {
    "content-type": "application/json",
  };
  if (config.straicoApiKey) headers.authorization = `Bearer ${config.straicoApiKey}`;
  const recordStats = options.recordStats !== false;
  const allowModelDeactivate = options.allowModelDeactivate !== false;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) || config.straicoRequestTimeoutMs;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const baseBody = {
      messages: buildStraicoMessages(messages, options.systemPrompt),
      temperature: config.crokChatTemperature,
    };
    if (!baseBody.messages.length) {
      console.warn("Straico request has no messages");
    }
    const selector = options.selector ?? config.straicoChatSelector;
    const explicitModel = options.model || "";
    const useAutoSelector = options.useAutoSelector !== false;
    const hasModel = Boolean(config.straicoChatModel);

    const sendRequest = async (body, label, modelId) => {
      const resolvedModel =
        modelId || body.model || config.straicoChatModel || config.straicoFallbackModel || "";
      const tokenBudget = applyModelTokenBudget(body.messages || [], resolvedModel);
      body.messages = tokenBudget.messages;
      const hasContent = Array.isArray(body.messages)
        ? body.messages.some((msg) =>
            Array.isArray(msg?.content)
              ? msg.content.some((part) => String(part?.text || "").trim())
              : String(msg?.content || "").trim()
          )
        : false;
      if (!hasContent) {
        const messageCount = Array.isArray(body.messages) ? body.messages.length : 0;
        const payloadChars = JSON.stringify(body).length;
        console.warn("Straico request blocked (empty messages)", {
          label,
          modelId: resolvedModel,
          requestId: options.requestId || "",
          messageCount,
          payloadChars,
        });
        return {
          ok: false,
          status: 400,
          json: { error: "empty_messages" },
          elapsedMs: Date.now() - startedAt,
          responseModel: resolvedModel || modelId,
        };
      }
      const messageCount = Array.isArray(body.messages) ? body.messages.length : 0;
      const payloadChars = JSON.stringify(body).length;
      console.info("Straico request metadata", {
        label,
        messageCount,
        payloadChars,
        modelId: resolvedModel,
        contextTokens: tokenBudget.contextTokens,
        contextBudget: tokenBudget.contextBudget,
        contextLimit: tokenBudget.contextLimit,
        contextTrimmed: tokenBudget.trimmed,
        hasSelector: Boolean(body.smart_llm_selector),
        hasModel: Boolean(body.model),
        requestId: options.requestId || "",
        timeoutMs: timeoutMs,
      });
      if (options.maxTokens) body.max_tokens = options.maxTokens;
      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const elapsedMs = Date.now() - startedAt;
      const text = await resp.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
      const errorText =
        (typeof json?.error === "string" && json.error) ||
        json?.error?.error ||
        json?.detail ||
        "";
      const contextTooLarge = isContextTooLargeError(errorText);
      const responseModel = json?.model || json?.model_id || "";
      if (responseModel) {
        console.info("Straico response model", {
          label,
          responseModel,
          requestId: options.requestId || "",
        });
      }
      if (!resp.ok) {
        console.error("Straico error response", {
          status: resp.status,
          elapsedMs,
          hasBody: Boolean(json),
          error: json?.error,
          detail: json?.detail,
          label,
          requestId: options.requestId || "",
        });
        if (resp.status === 500) {
          logPromptDebug({
            label,
            modelId: resolvedModel,
            requestId: options.requestId || "",
            messages: body.messages,
            payloadChars,
          });
        }
        if (resp.status === 500 && modelId && allowModelDeactivate && !contextTooLarge) {
          markModelInactive(modelId, "straico_500");
        }
      } else if (elapsedMs > 2000) {
        console.info("Straico response latency", {
          elapsedMs,
          label,
          modelId,
          requestId: options.requestId || "",
        });
      }
      const statModel = responseModel || modelId;
      if (recordStats) recordLlmStat(statModel, elapsedMs, resp.status);
      return {
        ok: resp.ok,
        status: resp.status,
        json,
        elapsedMs,
        responseModel: statModel,
        contextTooLarge,
        errorText,
      };
    };

    const primaryBody = { ...baseBody };
    let selectedModel = "";
    if (useAutoSelector) {
      const autoSelector =
        typeof selector === "string" && selector.trim() ? selector.trim() : "quality";
      primaryBody.smart_llm_selector = autoSelector;
    } else if (explicitModel) {
      selectedModel = explicitModel;
      primaryBody.model = explicitModel;
    } else if (typeof selector === "string" && selector.trim()) {
      primaryBody.smart_llm_selector = selector.trim();
    } else if (hasModel) {
      selectedModel = await pickModel(config.straicoChatModel);
      if (selectedModel) primaryBody.model = selectedModel;
    }
    primaryBody.replace_failed_model = true;

    const primaryLabel = options.label || (selector ? "selector" : "model");
    const primaryResult = await sendRequest(primaryBody, primaryLabel, selectedModel);
    if (primaryResult.ok) return primaryResult;

    const errorText =
      primaryResult.errorText ||
      (typeof primaryResult.json?.error === "string" && primaryResult.json.error) ||
      primaryResult.json?.error?.error ||
      primaryResult.json?.detail ||
      "";
    const contextTooLarge = Boolean(primaryResult.contextTooLarge);
    if (contextTooLarge) {
      console.warn("Straico context too large; retrying with minimal messages.", {
        requestId: options.requestId || "",
        label: primaryLabel,
      });
      const minimalBody = { ...baseBody, messages: reduceToMinimalMessages(baseBody.messages) };
      const fallbackModel = options.fallbackModel || config.straicoFallbackModel || selectedModel;
      if (fallbackModel) minimalBody.model = fallbackModel;
      minimalBody.replace_failed_model = false;
      return await sendRequest(
        minimalBody,
        options.label ? `${options.label}-context-trim` : "model-context-trim",
        fallbackModel
      );
    }
    const shouldRetryWithModel =
      primaryResult.status === 422 ||
      primaryResult.status === 500 ||
      errorText.toLowerCase().includes("model not found") ||
      errorText.toLowerCase().includes("switching llms");

    if (!shouldRetryWithModel) return primaryResult;

    console.warn("Straico primary call failed, retrying without selector.");
    const fallbackModel = options.fallbackModel || config.straicoFallbackModel;
    const fallbackBody = { ...baseBody };
    if (fallbackModel) fallbackBody.model = fallbackModel;
    fallbackBody.replace_failed_model = false;
    return await sendRequest(
      fallbackBody,
      options.label ? `${options.label}-fallback` : "model-fallback",
      fallbackModel
    );
  } catch (err) {
    const elapsedMs = Date.now() - startedAt;
    console.error("Straico request failed", {
      elapsedMs,
      error: err?.message,
      requestId: options.requestId || "",
    });
    if (err.name === "AbortError") {
      if (recordStats) {
        recordLlmStat(options.model || options.fallbackModel || "unknown", elapsedMs, 504);
      }
      return { ok: false, status: 504, json: { error: "timeout" } };
    }
    if (recordStats) {
      recordLlmStat(options.model || options.fallbackModel || "unknown", elapsedMs, 500);
    }
    return { ok: false, status: 500, json: { error: "request_failed", detail: err.message } };
  } finally {
    clearTimeout(timeout);
  }
};

const classifyStraicoMode = (utterance) => {
  const text = String(utterance || "").toLowerCase();
  const longForm = [
    "ganze geschichte",
    "komplette geschichte",
    "vollstaendige geschichte",
    "vollständige geschichte",
    "lange geschichte",
    "ausfuehrlich",
    "ausführlich",
    "erzaehle mir die geschichte",
    "erzähle mir die geschichte",
    "eine stunde",
    "eine stunde lang",
    "eine halbe stunde",
    "30 minuten",
    "dreissig minuten",
    "dreißig minuten",
    "minuten",
    "stunden",
  ];
  const develop = [
    "geschichte entwickeln",
    "lass uns eine geschichte",
    "lass uns eine story",
    "lass uns die geschichte",
    "geschichte ausbauen",
    "plot entwickeln",
    "story entwickeln",
  ];
  if (longForm.some((s) => text.includes(s))) return "long";
  if (develop.some((s) => text.includes(s))) return "develop";
  return "short";
};

const straicoPromptForMode = (mode) => {
  const base =
    "Erzeuge Text, der spaeter fuer eine Sprachausgabe genutzt wird. " +
    "Nutze klare Saetze und gut lesbares Deutsch; Aufzaehlungen sind erlaubt. " +
    "Kein Markdown und keine Emojis. " +
    "Wenn eine Laenge genannt wird, halte dich daran. " +
    "Wenn Informationen fehlen, triff plausible Annahmen und antworte trotzdem. " +
    "Keine kurzen Bestaetigungen wie 'Okay' als alleinige Antwort.";
  if (mode === "long") {
    return (
      `${base} Antworte jetzt direkt und vollstaendig in einem zusammenhaengenden Text. ` +
      "Beginne sofort mit der Antwort, keine Rueckfragen."
    );
  }
  if (mode === "voice_short") {
    return `${base} Antworte wie ein Sprachassistent: maximal 2 Saetze, sehr knapp.`;
  }
  if (mode === "voice_explain_short") {
    return `${base} Antworte mit 1 Satz Definition und 1 Satz Beispiel.`;
  }
  if (mode === "voice_decide") {
    return `${base} Gib 1 Satz Empfehlung und 1 Satz Begruendung.`;
  }
  if (mode === "trend") {
    return (
      `${base} Antworte knapp mit aktuellen Informationen. ` +
      "Nutze Echtzeitdaten, falls verfuegbar. " +
      "Wenn Live-Daten fehlen, frage kurz, ob eine allgemeine Antwort reicht."
    );
  }
  if (mode === "voice_plan_short") {
    return `${base} Gib eine kurze, klare Zusammenfassung und maximal 3 Schritte.`;
  }
  if (mode === "detail") {
    return `${base} Antworte ausfuehrlich, aber kompakt mit 5 bis 7 Saetzen.`;
  }
  if (mode === "story_continue") {
    return (
      `${base} Setze die Geschichte fort in 4 bis 6 Saetzen. ` +
      "Keine neuen Optionen und keine erneuten Rueckfragen. " +
      "Bleibe bei den bisherigen Figuren und dem bisherigen Setting."
    );
  }
  if (mode === "followup") {
    return (
      `${base} Antworte inhaltlich auf die letzte Nutzerantwort. ` +
      "Keine Rueckfragen und keine kurzen Bestaetigungen."
    );
  }
  if (mode === "develop") {
    return `${base} Antworte dialogorientiert. Stelle eine Rueckfrage und biete 2-3 kurze Optionen an.`;
  }
  return `${base} Antworte passend zur Anfrage und frage nur nach, wenn etwas fehlt.`;
};

const extractSlotText = (slots = {}) => {
  const candidates = [
    slots?.Any?.value,
    slots?.any?.value,
    slots?.Query?.value,
    slots?.query?.value,
    slots?.Followup?.value,
    slots?.followup?.value,
    slots?.Choice?.value,
    slots?.choice?.value,
    slots?.Answer?.value,
    slots?.answer?.value,
    slots?.Antwort?.value,
    slots?.antwort?.value,
    slots?.Text?.value,
    slots?.text?.value,
    slots?.Utterance?.value,
    slots?.utterance?.value,
    slots?.Phrase?.value,
    slots?.phrase?.value,
    slots?.Action?.value,
    slots?.action?.value,
    slots?.Aktion?.value,
    slots?.aktion?.value,
  ].filter(Boolean);
  if (!candidates.length) return "";
  return String(candidates[0]).trim();
};

const shouldElicitFollowup = (speech) => {
  if (!speech) return false;
  if (!speech.includes("?")) return false;
  return speech.length <= 220;
};

const getShortAnswerUtterance = (intentName) => {
  const map = {
    ShortAnswerYesIntent: "ja",
    ShortAnswerNoIntent: "nein",
    ShortAnswerOkayIntent: "okay",
    ShortAnswerFirstIntent: "das erste",
    ShortAnswerSecondIntent: "das zweite",
    ShortAnswerThirdIntent: "das dritte",
    ShortAnswerLastIntent: "das letzte",
  };
  return map[intentName] || "";
};

const normalizeCommand = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .trim();

const normalizeAsr = (value) => {
  const raw = normalizeCommand(value);
  const fillers = ["ae", "aeh", "aehm", "eh", "hm", "hmm", "also", "so", "halt"];
  const parts = raw.split(/\s+/).filter(Boolean);
  const cleaned = parts.filter((p) => !fillers.includes(p));
  return cleaned.join(" ").trim();
};

const hasAnyToken = (text, tokens) => {
  for (const token of tokens) {
    if (text.includes(token)) return true;
  }
  return false;
};

const isContinuationUtterance = (text) => {
  const normalized = normalizeCommand(text);
  if (!normalized) return false;
  const tokens = [
    "weiter",
    "mach weiter",
    "naechstes",
    "nächstes",
    "fortfahren",
    "ja",
    "ok",
    "okay",
    "klar",
    "bitte",
    "gern",
    "gerne",
  ];
  return hasAnyToken(normalized, tokens);
};

const buildLongChunkPrompt = (topic, part) => {
  const safeTopic = String(topic || "").trim();
  return (
    `Erstelle Teil ${part} einer mehrteiligen Antwort. ` +
    `Thema: ${safeTopic}. ` +
    "Liefere ca. 2 Minuten Text fuer eine spaetere Sprachausgabe, maximal 1200 Zeichen. " +
    "Beginne sofort mit dem Inhalt. Keine Rueckfragen."
  );
};

const buildStoryChunkPrompt = (topic, part, maxChars) => {
  const safeTopic = String(topic || "").trim();
  const limit = Number(maxChars) || 800;
  return (
    `Erzaehle Teil ${part} der Geschichte. ` +
    `Thema: ${safeTopic}. ` +
    `Liefere ca. 60-90 Sekunden Text fuer eine spaetere Sprachausgabe, maximal ${limit} Zeichen. ` +
    "Beginne sofort mit dem Inhalt. Keine Rueckfragen."
  );
};

const buildGenericChunkPrompt = (topic, part, maxChars) => {
  const safeTopic = String(topic || "").trim();
  const limit = Number(maxChars) || 650;
  return (
    `Erstelle Teil ${part} der Antwort. ` +
    `Thema: ${safeTopic}. ` +
    `Liefere ca. 45-60 Sekunden Text fuer eine spaetere Sprachausgabe, maximal ${limit} Zeichen. ` +
    "Beginne sofort mit dem Inhalt. Keine Rueckfragen."
  );
};

const appendContinuationPrompt = (speech, nextPart) => {
  const suffix = ` Soll ich mit Teil ${nextPart} weitermachen?`;
  return `${speech}${suffix}`;
};

const isNegativeResponse = (text) => {
  const normalized = normalizeCommand(text);
  if (!normalized) return false;
  const tokens = ["nein", "nee", "no", "nicht", "falsch", "auf keinen fall", "niemals"];
  return hasAnyToken(normalized, tokens);
};

const isPositiveResponse = (text) => {
  const normalized = normalizeCommand(text);
  if (!normalized) return false;
  const tokens = ["ja", "klar", "ok", "okay", "gerne", "gern", "bitte", "mach weiter"];
  return hasAnyToken(normalized, tokens);
};

const isShortAck = (text) => {
  const normalized = normalizeCommand(text);
  if (!normalized) return true;
  const shortSet = new Set([
    "ok",
    "okay",
    "klar",
    "gut",
    "verstanden",
    "alles klar",
    "in ordnung",
    "alles gut",
  ]);
  if (shortSet.has(normalized)) return true;
  const words = normalized.split(/\s+/).filter(Boolean);
  return words.length <= 2 && normalized.length <= 12;
};

const isNoAnswerResponse = (text) => {
  const normalized = normalizeCommand(text);
  if (!normalized) return true;
  const tokens = [
    "keine antwort",
    "nicht beantwortet",
    "nicht verfuegbar",
    "nicht verfügbar",
    "schiefgelaufen",
    "instabil",
    "bitte versuche es erneut",
    "bitte versuche es noch einmal",
    "entschuldigung",
    "kein internet",
    "keinen internetzugriff",
    "kein zugriff aufs internet",
    "keinen zugriff auf das internet",
    "keine live-daten",
    "keine live daten",
    "keine echtzeitdaten",
    "keine echtzeit daten",
  ];
  return hasAnyToken(normalized, tokens) || isShortAck(normalized);
};

const isNoInternetResponse = (text) => {
  const normalized = normalizeCommand(text);
  if (!normalized) return false;
  const tokens = [
    "kein internet",
    "keinen internetzugriff",
    "kein zugriff aufs internet",
    "keinen zugriff auf das internet",
    "keine live-daten",
    "keine live daten",
    "keine echtzeitdaten",
    "keine echtzeit daten",
    "keine aktuellen daten",
  ];
  return hasAnyToken(normalized, tokens);
};

const isWaitPromptEligible = (speech) => {
  const normalized = normalizeCommand(speech);
  if (!normalized) return false;
  if (isShortAck(normalized)) return false;
  const blocked = [
    "die ki hat nicht rechtzeitig",
    "die verbindung zur ki ist gerade instabil",
    "die ki konnte nicht antworten",
    "unbekannte anfrage",
  ];
  return !blocked.some((phrase) => normalized.includes(phrase));
};

const classifyScenario = (history, utterance) => {
  const text = normalizeCommand(utterance);
  const wantsLong = shouldForceLongResponse(history, utterance);
  if (wantsLong) return { mode: "long", chunked: true };
  const develop = [
    "geschichte entwickeln",
    "story entwickeln",
    "plot entwickeln",
    "lass uns eine geschichte",
    "lass uns eine story",
    "geschichte ausbauen",
    "idee entwickeln",
  ];
  if (hasAnyToken(text, develop)) return { mode: "develop", chunked: false };
  return { mode: "short", chunked: false };
};

const classifyModelScenario = (utterance) => {
  const text = normalizeCommand(utterance);
  const trend = [
    "trend",
    "trends",
    "news",
    "nachrichten",
    "heute",
    "jetzt",
    "aktuell",
    "breaking",
    "live",
    "wetter",
    "vorhersage",
    "temperatur",
    "regen",
    "wind",
    "schnee",
    "wie spaet",
    "wie spät",
    "uhrzeit",
  ];
  if (hasAnyToken(text, trend)) return "trend";
  const explain = [
    "erklaere",
    "erkläre",
    "erklaerung",
    "erklärung",
    "warum",
    "wie funktioniert",
    "schritte",
    "schritt",
    "detail",
    "detailliert",
    "ausfuehrlich",
    "ausführlich",
  ];
  if (hasAnyToken(text, explain)) return "explain";
  const facts = [
    "fakt",
    "fakten",
    "kurz",
    "schnell",
    "wie viel",
    "wieviel",
    "wie hoch",
    "wann",
    "datum",
    "uhr",
    "preis",
    "zahl",
  ];
  if (hasAnyToken(text, facts)) return "facts";
  return "dialog";
};

const looksLikeFactQuery = (text) => {
  const t = normalizeCommand(text);
  if (!t) return false;
  const prefixes = [
    "wie spaet",
    "wie spät",
    "wieviel",
    "wie viel",
    "wie hoch",
    "wetter",
    "hauptstadt",
    "umrechnen",
    "kurs",
    "temperatur",
    "uhr",
  ];
  if (prefixes.some((p) => t.startsWith(p))) return true;
  const hasNumbers = /\d+\s*(euro|usd|km|meter|grad|prozent|uhr)?/.test(t);
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  return hasNumbers && wordCount <= 10;
};

const looksLikeSmalltalk = (text) => {
  const t = normalizeCommand(text);
  const tokens = [
    "wie geht",
    "was machst du",
    "wer bist du",
    "hi",
    "hallo",
    "guten tag",
    "guten morgen",
    "guten abend",
  ];
  return hasAnyToken(t, tokens);
};

const isWeatherQuery = (text) => {
  const t = normalizeCommand(text);
  return hasAnyToken(t, [
    "wetter",
    "temperatur",
    "vorhersage",
    "regen",
    "wind",
    "schnee",
  ]);
};

const isTimeQuery = (text) => {
  const t = normalizeCommand(text);
  if (!t) return false;
  return (
    hasAnyToken(t, ["wie spaet", "wie spät", "uhrzeit", "zeit jetzt", "aktuelle zeit"]) ||
    (t.includes("uhr") && (t.includes(" in ") || t.startsWith("uhrzeit")))
  );
};

const extractLocationFromUtterance = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const match = lower.match(/\b(in|bei|fuer|für)\s+([a-zA-ZäöüÄÖÜß0-9\s-]+)/);
  let location = "";
  if (match && match[2]) {
    location = match[2];
  } else {
    return "";
  }
  location = location
    .split(/\b(heute|morgen|jetzt|aktuell|bitte|wird|ist|sei|sein|werden|vorhersage|regen|wind|schnee|temperatur)\b/)[0]
    .replace(/\b(heute|morgen|jetzt|aktuell|bitte)\b/g, "")
    .replace(/[?.!]+/g, "")
    .trim();
  if (location.length < 2) return "";
  return location;
};

const isTomorrowQuery = (text) => {
  const t = normalizeCommand(text);
  return hasAnyToken(t, ["morgen", "vorhersage", "spaeter", "spater"]);
};

const isClothingQuery = (text) => {
  const t = normalizeCommand(text);
  return hasAnyToken(t, [
    "anziehen",
    "kleidung",
    "outfit",
    "skifahren",
    "ski",
    "snowboard",
    "schnee",
  ]);
};

const buildWeatherSpeech = (weather, wantsTomorrow) => {
  let summary = "Aktuell liegen keine Messwerte vor.";
  if (wantsTomorrow && weather.daily) {
    const daily = weather.daily;
    const max = daily.temperature_2m_max?.[1];
    const min = daily.temperature_2m_min?.[1];
    const rain = daily.precipitation_sum?.[1];
    const wind = daily.wind_speed_10m_max?.[1];
    const parts = [];
    if (Number.isFinite(min) && Number.isFinite(max)) {
      parts.push(`zwischen ${min} und ${max} Grad`);
    } else if (Number.isFinite(max)) {
      parts.push(`maximal ${max} Grad`);
    }
    if (Number.isFinite(rain)) parts.push(`Niederschlag ${rain} mm`);
    if (Number.isFinite(wind)) parts.push(`Wind bis ${wind} km/h`);
    summary = parts.length ? parts.join(", ") : summary;
    return `Wetter morgen in ${weather.location}: ${summary}.`;
  }
  const current = weather.current || {};
  const temp = current.temperature_2m;
  const feels = current.apparent_temperature;
  const wind = current.wind_speed_10m;
  const rain = current.precipitation;
  const parts = [];
  if (Number.isFinite(temp)) parts.push(`Aktuell ${temp} Grad`);
  if (Number.isFinite(feels)) parts.push(`gefuehlt ${feels} Grad`);
  if (Number.isFinite(rain)) parts.push(`Niederschlag ${rain} mm`);
  if (Number.isFinite(wind)) parts.push(`Wind ${wind} km/h`);
  summary = parts.length ? parts.join(", ") : summary;
  return `Wetter in ${weather.location}: ${summary}.`;
};

const buildSkiClothingAdvice = (location, whenText) => {
  const place = location ? ` in ${location}` : "";
  const when = whenText ? ` ${whenText}` : "";
  return (
    `Zum Skifahren${place}${when}: ` +
    "Trage das Zwiebelprinzip mit Funktionsunterwaesche, Fleece oder Midlayer und einer wasserdichten Jacke. " +
    "Dazu Schneehose, warme Socken, Handschuhe, Muetze oder Helm-Inlay und eine Skibrille. " +
    "Wenn es kalt ist, nimm zusaetzlich einen Halswaermer."
  );
};

const looksLikeLocationCandidate = (text) => {
  const t = normalizeCommand(text);
  if (!t) return false;
  if (t.includes(" in ") || t.includes(" bei ") || t.startsWith("in ") || t.startsWith("bei ")) {
    return true;
  }
  const deny = [
    "was",
    "wie",
    "warum",
    "soll",
    "mach",
    "mache",
    "anziehen",
    "erklaer",
    "erkl",
    "hilfe",
    "bitte",
    "sag",
    "erz",
    "geschichte",
    "weiter",
  ];
  if (hasAnyToken(t, deny)) return false;
  const words = t.split(/\s+/).filter(Boolean).length;
  return words > 0 && words <= 4;
};

const deriveLocationFromWeatherQuery = (text) => {
  const t = normalizeCommand(text);
  if (!t) return "";
  let cleaned = t
    .replace(/\b(sag|sage|mir|bitte|wie|ist|wird|das|der|die|den|ein|eine)\b/g, " ")
    .replace(/\b(wetter|temperatur|vorhersage|morgen|heute|aktuell|jetzt)\b/g, " ")
    .replace(/\b(in|bei|fuer|für)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned;
};

const getWeatherForCoordinates = async (label, lat, lon, options = {}) => {
  const mode = options.mode || "current";
  const forecastUrl =
    mode === "tomorrow"
      ? "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${lat}&longitude=${lon}` +
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max" +
        "&timezone=auto"
      : "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${lat}&longitude=${lon}` +
        "&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m" +
        "&timezone=auto";
  const forecast = await getJson(forecastUrl, 2500);
  if (!forecast.ok || (mode === "current" && !forecast.json?.current)) {
    return { ok: false, error: "forecast_failed" };
  }
  return {
    ok: true,
    location: label,
    current: forecast.json.current,
    daily: forecast.json.daily,
  };
};

const getLocationCandidates = async (location) => {
  const name = encodeURIComponent(location);
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${name}&count=10&language=de&format=json`;
  const geo = await getJson(geoUrl, 2500);
  if (!geo.ok || !geo.json?.results?.length) {
    return [];
  }
  const seen = new Set();
  const results = [];
  for (const place of geo.json.results) {
    const parts = [place.name, place.admin1, place.country].filter(Boolean);
    const label = parts.join(", ");
    if (seen.has(label)) continue;
    seen.add(label);
    results.push({
      name: place.name,
      label,
      latitude: place.latitude,
      longitude: place.longitude,
      admin1: place.admin1 || "",
      country: place.country || "",
    });
  }
  return results;
};

const pickBestLocation = (query, candidates) => {
  if (!candidates.length) return null;
  const tokens = normalizeCommand(query)
    .split(/\s+/)
    .filter((t) => t && !["in", "bei", "fuer", "für", "der", "die", "das"].includes(t));
  let bestScore = -1;
  let best = null;
  let tie = false;
  for (const cand of candidates) {
    const name = normalizeCommand(cand.name);
    const admin1 = normalizeCommand(cand.admin1 || "");
    const country = normalizeCommand(cand.country || "");
    let score = 0;
    for (const token of tokens) {
      if (name.includes(token)) score += 2;
      if (admin1.includes(token)) score += 3;
      if (country.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cand;
      tie = false;
    } else if (score === bestScore) {
      tie = true;
    }
  }
  if (bestScore < 2 || tie) return null;
  return best;
};

const getTopLocationChoices = (query, candidates, limit = 3) => {
  const tokens = normalizeCommand(query)
    .split(/\s+/)
    .filter((t) => t && !["in", "bei", "fuer", "für", "der", "die", "das"].includes(t));
  const scored = candidates.map((cand) => {
    const name = normalizeCommand(cand.name);
    const admin1 = normalizeCommand(cand.admin1 || "");
    const country = normalizeCommand(cand.country || "");
    let score = 0;
    for (const token of tokens) {
      if (name.includes(token)) score += 2;
      if (admin1.includes(token)) score += 3;
      if (country.includes(token)) score += 1;
    }
    return { cand, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.cand).slice(0, limit);
};

const estimateComplexity = (text, history) => {
  const t = normalizeCommand(text);
  let score = 0;
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  if (wordCount > 18) score += 0.2;
  if (t.includes("und dann") || t.includes("anschliessend") || t.includes("anschließend")) {
    score += 0.2;
  }
  if (t.includes("schritte") || t.includes("schritt") || t.includes("plan")) score += 0.2;
  if ((t.match(/\?/g) || []).length > 1) score += 0.2;
  const historyText = Array.isArray(history)
    ? normalizeCommand(history.map((m) => m.content).join(" "))
    : "";
  if (historyText && !historyText.includes(t)) score += 0.2;
  return Math.min(score, 1);
};

const isLiveDataQuery = (text) => {
  const t = normalizeCommand(text);
  const keywords = [
    "aktuell",
    "gerade",
    "heute",
    "jetzt",
    "live",
    "echtzeit",
    "kurs",
    "aktie",
    "aktien",
    "boerse",
    "börse",
    "dax",
    "dow",
    "nasdaq",
    "s&p",
    "sp500",
    "s&p 500",
    "bitcoin",
    "btc",
    "ethereum",
    "eth",
    "krypto",
    "goldpreis",
    "oelpreis",
    "ölpreis",
    "preis",
    "stand",
    "news",
    "nachrichten",
  ];
  if (hasAnyToken(t, keywords)) return true;
  if (/(\bwie\s+steht\b|\bwie\s+liegt\b|\baktueller\s+stand\b)/.test(t)) return true;
  if (/\b(?:aktie|aktien|kurs|preis)\b/.test(t)) return true;
  if (/\b[A-Z]{1,5}\b/.test(text) && /\b(kurs|aktie|aktien|preis)\b/.test(t)) return true;
  return false;
};

const classifyIntent = (text, history) => {
  const t = normalizeCommand(text);
  const isStory = hasAnyToken(t, [
    "geschichte",
    "story",
    "maerchen",
    "märchen",
    "erzaehl",
    "erzähle",
    "erzaehle",
    "erzähl",
  ]);
  const signals = {
    isRealtime: hasAnyToken(t, [
      "aktuell",
      "gerade",
      "trend",
      "twitter",
      "x",
      "boerse",
      "boerse",
      "kurs",
      "wetter",
      "vorhersage",
      "temperatur",
      "regen",
      "wind",
      "schnee",
    ]) || isTimeQuery(t) || isLiveDataQuery(t),
    isTask: hasAnyToken(t, ["erinnere", "termin", "kalender", "mail", "todo", "notiz", "plane"]),
    isFact: looksLikeFactQuery(t),
    isExplain: hasAnyToken(t, ["erklaer", "erklär", "was bedeutet", "was ist", "unterschied"]),
    isRecommend: hasAnyToken(t, ["soll ich", "empfiehl", "was wuerdest du", "besser", "empfehlung"]),
    isSmalltalk: looksLikeSmalltalk(t),
    complexity: estimateComplexity(t, history),
  };
  if (signals.isTask) return { intent: "TASK_TOOL", complexity: signals.complexity };
  if (isStory) return { intent: "STORY", complexity: signals.complexity };
  if (signals.isRealtime) return { intent: "REALTIME_TREND", complexity: signals.complexity };
  if (signals.isFact && signals.complexity < 0.35) return { intent: "FACT_SHORT", complexity: signals.complexity };
  if (signals.isExplain && signals.complexity < 0.55) return { intent: "EXPLAIN", complexity: signals.complexity };
  if (signals.isRecommend) return { intent: "RECOMMEND", complexity: signals.complexity };
  if (signals.isSmalltalk) return { intent: "CHAT_SMALLTALK", complexity: signals.complexity };
  return { intent: signals.complexity > 0.65 ? "COMPLEX" : "HOWTO_SIMPLE", complexity: signals.complexity };
};

const getScenarioModel = (scenario) => {
  if (scenario === "trend") {
    return getSelectedModelForUseCase("trend", config.straicoScenarioTrendModel);
  }
  if (scenario === "facts") {
    return getSelectedModelForUseCase("facts", config.straicoScenarioFactsModel);
  }
  if (scenario === "explain") {
    return getSelectedModelForUseCase("explain", config.straicoScenarioExplainModel);
  }
  return getSelectedModelForUseCase("dialog", config.straicoScenarioDialogModel);
};

const getWebModelOverride = () => {
  if (config.straicoWebModels.length) {
    const preferred = config.straicoWebModels.find((id) => /perplexity|pplx/i.test(id));
    if (preferred && isModelActive(preferred)) return preferred;
    for (const id of config.straicoWebModels) {
      if (isModelActive(id)) return id;
    }
  }
  const cacheList = Array.isArray(modelSelectionCache.webModels)
    ? modelSelectionCache.webModels
    : [];
  const preferredCache = cacheList.find((id) => /perplexity|pplx/i.test(id));
  if (preferredCache && isModelActive(preferredCache)) return preferredCache;
  for (const id of cacheList) {
    if (isModelActive(id)) return id;
  }
  const modelList = Array.isArray(modelCache.list) ? modelCache.list : [];
  const preferredModel = modelList.find(
    (model) => isWebCapableModel(model) && isPerplexityModel(model)
  );
  if (preferredModel && isModelActive(preferredModel.id)) return preferredModel.id;
  for (const model of modelList) {
    if (isWebCapableModel(model) && isModelActive(model.id)) return model.id;
  }
  return "";
};

const getPerplexityWebModelOnly = () => {
  const fromConfig = config.straicoWebModels.find((id) => /perplexity|pplx/i.test(id));
  if (fromConfig && isModelActive(fromConfig)) return fromConfig;
  const cacheList = Array.isArray(modelSelectionCache.webModels)
    ? modelSelectionCache.webModels
    : [];
  const fromCache = cacheList.find((id) => /perplexity|pplx/i.test(id));
  if (fromCache && isModelActive(fromCache)) return fromCache;
  const modelList = Array.isArray(modelCache.list) ? modelCache.list : [];
  const preferredModel = modelList.find(
    (model) => isWebCapableModel(model) && isPerplexityModel(model)
  );
  if (preferredModel && isModelActive(preferredModel.id)) return preferredModel.id;
  return "";
};

const getIntentRoute = (intentInfo) => {
  const { intent, complexity } = intentInfo;
  const dialogModel = getSelectedModelForUseCase("dialog", config.straicoModelGptMini);
  const factsModel = getSelectedModelForUseCase("facts", config.straicoModelGeminiFlash);
  const speedModel =
    config.straicoFallbackModel || config.straicoModelGptMini || config.straicoModelGptFull;
  const explainModel = speedModel;
  const trendModel = getSelectedModelForUseCase("trend", config.straicoModelGrokFast);
  const creativeModel = getSelectedModelForUseCase(
    "creative",
    config.straicoModelClaudeSonnet
  );
  if (intent === "STORY") {
    const storyModel =
      config.straicoStoryModel || creativeModel || config.straicoModelClaudeSonnet;
    return {
      model: storyModel,
      mode: "voice_plan_short",
      maxTokens: 260,
      maxChars: 1000,
      maxSentences: 5,
    };
  }
  if (intent === "FACT_SHORT") {
    return {
      model: factsModel,
      mode: "voice_short",
      maxTokens: 220,
      maxChars: 420,
      maxSentences: 2,
    };
  }
  if (intent === "REALTIME_TREND") {
    const webOverride = getPerplexityWebModelOnly();
    return {
      model: webOverride || trendModel,
      mode: "trend",
      maxTokens: 220,
      maxChars: 520,
      maxSentences: 2,
    };
  }
  if (intent === "TASK_TOOL") {
    return {
      model: dialogModel,
      mode: "voice_short",
      maxTokens: 240,
      maxChars: 520,
      maxSentences: 2,
    };
  }
  if (intent === "EXPLAIN") {
    return {
      model: explainModel,
      mode: "voice_explain_short",
      maxTokens: 420,
      maxChars: 700,
      maxSentences: 3,
    };
  }
  if (intent === "RECOMMEND") {
    return {
      model: complexity > 0.7 ? speedModel : dialogModel,
      mode: "voice_decide",
      maxTokens: 360,
      maxChars: 760,
      maxSentences: 2,
    };
  }
  if (intent === "COMPLEX") {
    return {
      model: speedModel,
      mode: "voice_plan_short",
      maxTokens: 480,
      maxChars: 780,
      maxSentences: 3,
    };
  }
  if (intent === "CHAT_SMALLTALK") {
    return {
      model: dialogModel,
      mode: "voice_short",
      maxTokens: 240,
      maxChars: 420,
      maxSentences: 2,
    };
  }
  return {
    model: dialogModel,
    mode: "voice_short",
    maxTokens: 240,
    maxChars: 520,
    maxSentences: 2,
  };
};

const selectActiveModel = async (preferred) => {
  if (preferred && isModelActive(preferred)) return preferred;
  if (config.straicoFallbackModel && isModelActive(config.straicoFallbackModel)) {
    return config.straicoFallbackModel;
  }
  const picked = await pickModel(config.straicoFallbackModel || preferred);
  return picked || preferred || config.straicoFallbackModel;
};

const reduceChunkText = (text, maxChars) => {
  const clean = String(text || "").trim();
  if (!clean) return "";
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars);
  const lastSentence = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("?")
  );
  if (lastSentence > 200) return slice.slice(0, lastSentence + 1).trim();
  return slice.trim();
};

const reduceVoiceText = (text, maxChars, maxSentences) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  let output = clean;
  if (typeof maxSentences === "number" && maxSentences > 0) {
    const sentences = clean.split(/(?<=[.!?])\s+/);
    output = sentences.slice(0, maxSentences).join(" ").trim();
  }
  if (typeof maxChars === "number" && maxChars > 0 && output.length > maxChars) {
    output = reduceChunkText(output, maxChars);
  }
  return output;
};

const shouldForceLongResponse = (history, utterance) => {
  const u = normalizeCommand(utterance);
  const durationTokens = [
    "zehn minuten",
    "10 minuten",
    "fuenfzehn minuten",
    "fünfzehn minuten",
    "15 minuten",
    "zwanzig minuten",
    "20 minuten",
    "dreissig minuten",
    "dreißig minuten",
    "30 minuten",
    "stunde",
    "stunden",
  ];
  return hasAnyToken(u, durationTokens);
};

const isDetailedRequest = (utterance) => {
  const u = normalizeCommand(utterance);
  const tokens = [
    "ausfuehrlich",
    "ausführlich",
    "detailliert",
    "im detail",
    "genau erklaer",
    "genau erklären",
    "erlaeutere",
    "erläutere",
    "umfangreich",
  ];
  return hasAnyToken(u, tokens);
};

const isStoryExit = (utterance) => {
  const u = normalizeCommand(utterance);
  if (!u) return false;
  const tokens = [
    "neues thema",
    "anderes thema",
    "andere frage",
    "etwas anderes",
    "keine geschichte",
    "keine story",
    "abbrechen",
  ];
  return hasAnyToken(u, tokens);
};

const applyDetailLimits = (route) => {
  if (!route) return route;
  return {
    ...route,
    maxTokens: Math.max(route.maxTokens || 0, 260),
    maxChars: Math.max(route.maxChars || 0, 1200),
    maxSentences: Math.max(route.maxSentences || 0, 5),
  };
};

const resumeCommands = new Set([
  "fruehere unterhaltung fortfuehren",
  "letzte unterhaltung fortfuehren",
  "unterhaltung fortfuehren",
  "frueheres gespraech fortsetzen",
  "gespraech fortsetzen",
  "weiterreden",
  "weitermachen",
]);

const getRecentHistory = (userId, maxAgeMs = 60_000) => {
  if (!userId) return null;
  const record = conversationStore.getRecord(userId);
  if (!record?.history?.length || !record.updatedAt) return null;
  const updatedAt = Date.parse(record.updatedAt);
  if (Number.isNaN(updatedAt)) return null;
  if (Date.now() - updatedAt > maxAgeMs) return null;
  return record.history;
};

const handleChatUtterance = async ({
  utterance,
  fallbackTranscript,
  sessionAttributes,
  userId,
  accountUserId,
  userAccessToken,
  userApiKey,
  sessionIsNew,
  responseBudgetMs,
  requestMeta,
  skipPersistHistory,
}) => {
  const startedAt = Date.now();
  let speech = "";
  let shouldEndSession = true;
  let repromptText = "";
  let elicitFollowup = false;
  let improverElapsedMs = null;
  let llmElapsedMs = null;
  let forceYesNoReprompt = false;
  let liveFallbackPrompt = "";

  const wasExpectingFollowup = Boolean(sessionAttributes.expectingFollowup);
  sessionAttributes.expectingFollowup = false;

  const trimmed = String(utterance || "").trim();
  const fallback = String(fallbackTranscript || "").trim();
  if (!trimmed) {
    if (fallback) {
      return handleChatUtterance({
        utterance: fallback,
        sessionAttributes,
        userId,
        accountUserId,
        userAccessToken,
        userApiKey,
        sessionIsNew,
        responseBudgetMs,
      });
    }
    speech = "Ich habe dich nicht verstanden. Was soll ich an die KI schicken?";
    shouldEndSession = false;
    repromptText = "Sag zum Beispiel: erzaehle eine Geschichte.";
    return { speech, shouldEndSession, repromptText, elicitFollowup };
  }

  if (sessionIsNew && userId) {
    const stored = conversationStore.getHistory(userId);
    if (stored?.length) {
      sessionAttributes.chatHistory = stored;
    }
  }

  if (resumeCommands.has(normalizeCommand(trimmed))) {
    const stored = userId ? conversationStore.getHistory(userId) : null;
    if (stored?.length) {
      sessionAttributes.chatHistory = stored;
      speech = "Ich habe die letzte Unterhaltung wiederhergestellt. Womit soll ich weitermachen?";
      shouldEndSession = false;
      repromptText = "Sag einfach weiter.";
    } else {
      speech = "Ich habe keine fruehere Unterhaltung gefunden.";
      shouldEndSession = false;
      repromptText = "Sag zum Beispiel: erzaehle eine Geschichte.";
    }
    return { speech, shouldEndSession, repromptText, elicitFollowup };
  }

  const history = normalizeChatHistory(sessionAttributes.chatHistory);
  const chatToken = config.xaiApiKey || userAccessToken || null;
  const normalizedUtterance = normalizeAsr(trimmed);
  const scenario = classifyScenario(history, normalizedUtterance);
  const intentInfo = classifyIntent(normalizedUtterance, history);
  const preferredLocation = getPreferredLocation(accountUserId);
  const detectedLocation = extractLocationFromUtterance(trimmed);
  const locationContext = sessionAttributes.lastWeatherLocation || preferredLocation;
  const normalizedPreferredLocation = normalizeCommand(preferredLocation || "");
  const normalizedDetectedLocation = normalizeCommand(detectedLocation || "");
  const storyExit = isStoryExit(normalizedUtterance);
  const storyActive = Boolean(sessionAttributes.storyActive) && !storyExit;
  if (storyExit) {
    sessionAttributes.storyActive = false;
    sessionAttributes.storyStage = "";
  }
  const isStoryIntent = intentInfo.intent === "STORY";
  const shouldTreatAsStory = storyActive || isStoryIntent;
  let route = getIntentRoute(intentInfo);
  const wantsDetail = !shouldTreatAsStory && isDetailedRequest(normalizedUtterance);
  let responseLimits = wantsDetail ? applyDetailLimits(route) : route;
  let straicoMode = scenario.mode === "short" ? responseLimits.mode : scenario.mode;
  if (shouldTreatAsStory) {
    route = getIntentRoute({ intent: "STORY", complexity: intentInfo.complexity });
    responseLimits = route;
    if (storyActive && sessionAttributes.storyStage === "options") {
      straicoMode = "story_continue";
    } else if (storyActive) {
      straicoMode = "story_continue";
    } else if (scenario.mode === "develop") {
      straicoMode = "develop";
    } else {
      straicoMode = "story_continue";
    }
  }
  if (wantsDetail && straicoMode === "voice_short") {
    straicoMode = "detail";
  }
  let improverDecision = null;
  if (
    useStraicoChat() &&
    isImproverActive() &&
    !shouldTreatAsStory &&
    !isWeatherQuery(normalizedUtterance)
  ) {
    const decisionBudget = config.promptImproverDecisionTimeoutMs;
    const elapsedMs = Date.now() - startedAt;
    const remainingMs =
      typeof responseBudgetMs === "number" ? responseBudgetMs - elapsedMs : null;
    if (!remainingMs || remainingMs > decisionBudget + 600) {
      const decisionMessage = buildPromptDecisionMessage(history, trimmed);
      const decisionResult = await straicoPromptCompletion(decisionMessage, {
        model: config.promptImproverDecisionModel,
        temperature: 0,
        timeoutMs: decisionBudget,
      });
      if (decisionResult.ok) {
        const decisionText = extractPromptCompletionText(decisionResult.json);
        improverDecision = parsePromptDecision(decisionText);
      }
    }
  }
  if (improverDecision?.action === "ask") {
    straicoMode = "develop";
    responseLimits = applyDetailLimits(route);
  } else if (improverDecision?.length === "long") {
    straicoMode = "long";
    responseLimits = applyDetailLimits(route);
  } else if (improverDecision?.length === "detail") {
    straicoMode = "detail";
    responseLimits = applyDetailLimits(route);
  }
  let userPrompt = normalizedUtterance;
  if (locationContext && !isWeatherQuery(normalizedUtterance)) {
    userPrompt = `Kontext: Ort ist ${locationContext}. ${normalizedUtterance}`.trim();
  }
  const forceLongResponse = useStraicoChat() && scenario.chunked;
  let longChunkActive = false;
  const genericChunkIntents = new Set([
    "EXPLAIN",
    "HOWTO_SIMPLE",
    "COMPLEX",
    "RECOMMEND",
  ]);

  const pendingWeatherQuery = String(sessionAttributes.pendingWeatherQuery || "").trim();
  const locationOnlyFollowup =
    Boolean(pendingWeatherQuery) &&
    !isWeatherQuery(normalizedUtterance) &&
    Boolean(trimmed);

  if (isWeatherQuery(normalizedUtterance) || locationOnlyFollowup) {
    const weatherQueryText = locationOnlyFollowup
      ? `${pendingWeatherQuery} ${trimmed}`.trim()
      : trimmed;
    sessionAttributes.locationPromptAttempts =
      Number(sessionAttributes.locationPromptAttempts || 0);
    sessionAttributes.lastWeatherQuery = weatherQueryText;
    if (locationOnlyFollowup) {
      delete sessionAttributes.pendingWeatherQuery;
    }
    const locationNote = detectedLocation || preferredLocation || "";
    if (detectedLocation && !preferredLocation) {
      savePreferredLocation(accountUserId, detectedLocation);
    }
    const result = await runPerplexityWeather({
      query: weatherQueryText,
      preferredLocation,
      detectedLocation,
      responseBudgetMs,
      requestId: requestMeta?.requestId || "",
    });
    if (result.text) {
      speech = result.text;
      shouldEndSession = false;
      repromptText = /[\?]$/.test(speech)
        ? "Sag bitte den Ort."
        : "Moechtest du noch etwas wissen?";
      if (shouldAskForLocation(speech)) {
        sessionAttributes.locationPromptAttempts += 1;
        if (sessionAttributes.locationPromptAttempts <= 1) {
          sessionAttributes.pendingWeatherQuery = weatherQueryText;
          sessionAttributes.expectingFollowup = true;
        } else {
          delete sessionAttributes.pendingWeatherQuery;
          sessionAttributes.expectingFollowup = false;
        }
      } else {
        delete sessionAttributes.pendingWeatherQuery;
        sessionAttributes.locationPromptAttempts = 0;
      }
      sessionAttributes.awaitingLocationPrompt = false;
      sessionAttributes.awaitingLocationChoice = false;
      delete sessionAttributes.locationPrompt;
      delete sessionAttributes.locationChoiceOptions;
      sessionAttributes.lastWeatherLocation =
        locationNote || sessionAttributes.lastWeatherLocation;
      const nextHistory = [
        ...history,
        { role: "user", content: trimmed },
        { role: "assistant", content: speech },
      ].slice(-config.crokChatHistoryMax);
      sessionAttributes.chatHistory = nextHistory;
      if (!skipPersistHistory && userId) {
        conversationStore.setHistory(userId, sessionAttributes.chatHistory);
      }
      return { speech, shouldEndSession, repromptText, elicitFollowup };
    }
    console.warn("Perplexity weather request failed", {
      usedStraico: result.usedStraico,
      status: result.status,
      error: result.error,
    });
    speech = "Ich kann das Wetter gerade nicht abrufen. Bitte versuche es erneut.";
    shouldEndSession = false;
    repromptText = "Moechtest du es nochmal versuchen?";
    return { speech, shouldEndSession, repromptText, elicitFollowup };
  }
  if (requestMeta?.requestId) {
    console.info("Chat routing", {
      requestId: requestMeta.requestId,
      intent: intentInfo.intent,
      scenario: scenario.mode,
      routeModel: route.model,
      mode: straicoMode,
      forceLong: forceLongResponse,
      story: isStoryIntent,
    });
  }
  if (useStraicoChat() && sessionAttributes.longFormActive) {
    if (isContinuationUtterance(trimmed) || wasExpectingFollowup) {
      const nextPart = Number(sessionAttributes.longFormPart || 1) + 1;
      sessionAttributes.longFormPart = nextPart;
      longChunkActive = true;
      straicoMode = "long";
      const kind = sessionAttributes.longFormKind || "generic";
      if (kind === "story") {
        userPrompt = buildStoryChunkPrompt(
          sessionAttributes.longFormTopic || trimmed,
          nextPart,
          config.straicoStoryChunkMaxChars
        );
      } else {
        userPrompt = buildGenericChunkPrompt(
          sessionAttributes.longFormTopic || trimmed,
          nextPart,
          config.straicoGenericChunkMaxChars
        );
      }
    } else {
      sessionAttributes.longFormActive = false;
      delete sessionAttributes.longFormPart;
      delete sessionAttributes.longFormTopic;
      delete sessionAttributes.longFormModelScenario;
      delete sessionAttributes.longFormKind;
    }
  }
  if (forceLongResponse) {
    straicoMode = "long";
    longChunkActive = true;
    sessionAttributes.longFormActive = true;
    sessionAttributes.longFormPart = 1;
    sessionAttributes.longFormTopic = normalizedUtterance;
    sessionAttributes.longFormModelScenario = route.model;
    sessionAttributes.longFormKind = isStoryIntent ? "story" : "generic";
    userPrompt = isStoryIntent
      ? buildStoryChunkPrompt(normalizedUtterance, 1, config.straicoStoryChunkMaxChars)
      : buildGenericChunkPrompt(normalizedUtterance, 1, config.straicoGenericChunkMaxChars);
  } else if (
    useStraicoChat() &&
    isImproverActive() &&
    intentInfo.intent !== "REALTIME_TREND"
  ) {
    const elapsedMs = Date.now() - startedAt;
    const remainingMs =
      typeof responseBudgetMs === "number" ? responseBudgetMs - elapsedMs : null;
    if (typeof responseBudgetMs === "number" && responseBudgetMs < 3000) {
      // Skip improver when total budget is too tight for voice response.
    } else if (typeof remainingMs === "number" && remainingMs < 1500) {
      // Skip improver when we don't have enough time left for the main response.
    } else if (improverDecision?.action === "ask") {
      // Skip prompt improvement when we need a clarifying question.
    } else {
      const improverBudgetMs =
        typeof remainingMs === "number"
          ? Math.min(800, Math.max(0, remainingMs - 4200))
          : 800;
      if (typeof improverBudgetMs === "number" && improverBudgetMs <= 0) {
        // Skip improver when we don't have enough time left for the main LLM response.
      } else {
      const improverMessage = buildPromptImproverMessage(history, trimmed, straicoMode);
      const improverStart = Date.now();
      let improved = await straicoPromptCompletion(improverMessage, {
        model: config.promptImproverModel,
        timeoutMs: improverBudgetMs,
      });
      if (!improved.ok && improved.status === 500) {
        improved = await straicoPromptCompletion(improverMessage, {
          model: "openai/gpt-5-nano",
          temperature: 0.2,
          timeoutMs: improverBudgetMs,
        });
        if (!improved.ok && improved.status === 500) {
          disableImproverForDay("straico_500");
        }
      }
      if (improved.ok) {
        const improvedText = extractPromptCompletionText(improved.json);
        if (typeof improvedText === "string" && improvedText.trim()) {
          userPrompt = improvedText.trim();
        }
      }
      improverElapsedMs = Date.now() - improverStart;
      }
    }
  }
  if (useStraicoChat()) {
    sessionAttributes.lastChatMode = straicoMode;
    sessionAttributes.lastChatMaxTokens = responseLimits.maxTokens;
    sessionAttributes.lastChatIsStory = isStoryIntent;
  }
  const messages = [...history, { role: "user", content: userPrompt }].slice(
    -config.crokChatHistoryMax
  );
  let result;
  let usedStraico = false;
  let usedPerplexity = false;
  let chosenModel = "";
  if (useStraicoChat() && intentInfo.intent === "REALTIME_TREND") {
    const perplexityMessages = [
      {
        role: "system",
        content:
          "Du hast Zugriff auf aktuelle Web-Informationen. Antworte kurz, direkt und auf Deutsch.",
      },
      { role: "user", content: userPrompt },
    ];
    const maxTokens = Math.min(config.perplexityMaxTokens, responseLimits.maxTokens || 220);
    const timeoutMs = getPerplexityTimeout(responseBudgetMs);
    const webModel = getPerplexityWebModelOnly();
    console.info("Perplexity trend context", {
      requestId: requestMeta?.requestId || "",
      messageCount: perplexityMessages.length,
      userPromptChars: String(userPrompt || "").length,
    });
    if (config.perplexityApiKey) {
      console.info("Perplexity trend via direct API", { timeoutMs });
      const searchStart = Date.now();
      const search = await perplexityChatCompletion({
        messages: perplexityMessages,
        maxTokens,
        timeoutMs,
      });
      llmElapsedMs = Date.now() - searchStart;
      if (search.ok) {
        const text = extractPerplexityText(search.json);
        if (text && text.trim()) {
          usedPerplexity = true;
          result = {
            ok: true,
            json: { choices: [{ message: { content: text } }] },
            elapsedMs: llmElapsedMs,
          };
        }
      } else {
        console.warn("Perplexity request failed", {
          status: search.status,
        });
      }
    }
    if (!result && webModel) {
      console.info("Perplexity trend via Straico", {
        model: webModel,
        requestId: requestMeta?.requestId || "",
        timeoutMs,
      });
      const searchStart = Date.now();
      const straico = await straicoChatCompletions(perplexityMessages, {
        model: webModel,
        useAutoSelector: false,
        fallbackModel: null,
        maxTokens,
        timeoutMs,
        requestId: requestMeta?.requestId || "",
      });
      llmElapsedMs = Date.now() - searchStart;
      if (straico.ok) {
        const text = extractStraicoText(straico.json);
        if (text && text.trim()) {
          usedPerplexity = true;
          usedStraico = true;
          result = {
            ok: true,
            json: { choices: [{ message: { content: text } }] },
            elapsedMs: llmElapsedMs,
          };
        }
      } else {
        console.warn("Straico Perplexity request failed", {
          status: straico.status,
          requestId: requestMeta?.requestId || "",
        });
      }
    } else if (!result) {
      console.warn("Perplexity trend: no Straico Perplexity model available");
    }
  }

  if (!result && useXaiChat()) {
    result = await crokChatCompletions(messages, chatToken);
  } else if (!result && useStraicoChat()) {
    usedStraico = true;
    const maxTokens = longChunkActive
      ? sessionAttributes.longFormKind === "story"
        ? Math.min(config.straicoStoryMaxTokens, config.straicoMaxTokensLongChunk)
        : Math.min(config.straicoGenericChunkMaxTokens, config.straicoMaxTokensLongChunk)
      : straicoMode === "long"
      ? config.straicoMaxTokensLong
      : config.straicoMaxTokensShort;
    const preferredModel = longChunkActive
      ? sessionAttributes.longFormModelScenario || route.model
      : route.model;
    const modelToUse = await selectActiveModel(preferredModel);
    chosenModel = modelToUse;
    if (useStraicoChat()) {
      sessionAttributes.lastChatModel = modelToUse;
    }
    let timeoutCapMs =
      intentInfo.intent === "STORY" || forceLongResponse
        ? config.straicoStoryTimeoutMs
        : config.straicoInteractiveTimeoutMs;
    if (intentInfo.intent === "EXPLAIN" || intentInfo.intent === "HOWTO_SIMPLE") {
      timeoutCapMs = Math.min(timeoutCapMs, config.straicoExplainTimeoutMs);
    }
    const elapsedMs = Date.now() - startedAt;
    const remainingMs =
      typeof responseBudgetMs === "number"
        ? responseBudgetMs - elapsedMs - 400
        : config.straicoRequestTimeoutMs;
    const timeoutBudget = Math.max(
      1200,
      Math.min(
        config.straicoRequestTimeoutMs,
        timeoutCapMs,
        remainingMs || timeoutCapMs
      )
    );
    result = await straicoChatCompletions(messages, {
      systemPrompt: straicoPromptForMode(straicoMode),
      model: modelToUse,
      maxTokens: longChunkActive ? maxTokens : responseLimits.maxTokens,
      useAutoSelector: false,
      fallbackModel: config.straicoFallbackModel,
      timeoutMs: timeoutBudget,
      requestId: requestMeta?.requestId || "",
    });
    llmElapsedMs = result.elapsedMs || llmElapsedMs;
    if (!result.ok && (result.status === 504 || result.status === 500)) {
      if (!result.contextTooLarge) {
        markModelInactive(modelToUse, "timeout_or_500");
      }
      const nextModel = await selectActiveModel(config.straicoFallbackModel || "");
      if (nextModel && nextModel !== modelToUse) {
        chosenModel = nextModel;
        const retryBudget = Math.max(1200, timeoutBudget);
        result = await straicoChatCompletions(messages, {
          systemPrompt: straicoPromptForMode("short"),
          model: nextModel,
          maxTokens: Math.min(80, responseLimits.maxTokens || 80),
          useAutoSelector: false,
          fallbackModel: null,
          timeoutMs: retryBudget,
          requestId: requestMeta?.requestId || "",
        });
        llmElapsedMs = result.elapsedMs || llmElapsedMs;
      }
    }
  } else {
    result = await crokAction(
      config.crokChatActionName,
      sessionAttributes.conversationId
        ? { [config.crokChatParamName]: trimmed, conversationId: sessionAttributes.conversationId }
        : { [config.crokChatParamName]: trimmed },
      userApiKey || config.crokApiKey,
      userAccessToken
    );
  }

  if (result.ok) {
    let assistantReply = usedStraico
      ? extractStraicoText(result.json)
      : result.json?.choices?.[0]?.message?.content ||
        result.json?.choices?.[0]?.text ||
        result.json?.message ||
        result.json?.answer ||
        "Okay.";
    if (usedStraico && accountUserId) {
      const costValue = extractStraicoCost(result.json);
      recordUserUsage(accountUserId, costValue);
    }
    if (usedStraico && !assistantReply) {
      const finishReason = result.json?.choices?.[0]?.finish_reason || "";
      const contentPreview = result.json?.choices?.[0]?.message?.content;
      if (
        chosenModel &&
        (finishReason === "length" || finishReason === "content_filter") &&
        (!contentPreview || !String(contentPreview).trim())
      ) {
        markModelInactive(chosenModel, "empty_response");
      }
      const fallbackCandidates = [
        config.straicoFallbackModel,
        config.straicoModelGptMini,
        config.straicoModelGptNano,
        config.straicoModelGptFull,
      ]
        .filter(Boolean)
        .filter((id) => id !== chosenModel);
      const fallbackModel = fallbackCandidates[0] || "";
      if (fallbackModel) {
        console.warn("Straico response missing text; retrying with alternate model.", {
          fallbackModel,
          previousModel: chosenModel,
        });
        const strictMode = shouldTreatAsStory ? "story_continue" : "followup";
        const retry = await straicoChatCompletions(messages, {
          systemPrompt: straicoPromptForMode(strictMode),
          model: fallbackModel,
          maxTokens: longChunkActive ? maxTokens : responseLimits.maxTokens,
          useAutoSelector: false,
          fallbackModel: null,
          timeoutMs: Math.max(
            1500,
            Math.min(config.straicoRequestTimeoutMs, config.alexaResponseTimeoutMs - 700)
          ),
          requestId: requestMeta?.requestId || "",
        });
        if (retry.ok) {
          const retryText = extractStraicoText(retry.json);
          if (retryText) assistantReply = retryText;
        }
      }
    }
    if (usedStraico && !assistantReply) {
      const choiceSample = result.json?.choices?.[0];
      let choicePreview = "";
      let chatPreview = "";
      try {
        choicePreview = JSON.stringify(choiceSample || {}).slice(0, 2000);
        chatPreview = JSON.stringify(result.json?.full_current_chat || []).slice(0, 2000);
      } catch {
        choicePreview = "[unserializable]";
        chatPreview = "[unserializable]";
      }
      console.warn("Straico response missing text", {
        keys: Object.keys(result.json || {}),
        hasChoices: Array.isArray(result.json?.choices),
        hasData: Array.isArray(result.json?.data),
        choicePreview,
        chatPreview,
      });
    }
    if (usedStraico && !assistantReply) {
      const pending = schedulePendingResponse({
        userId,
        accountUserId,
        requestId: requestMeta?.requestId || "",
        prompt: trimmed,
        history: sessionAttributes.chatHistory,
        messages,
        straicoMode,
        model: config.straicoFallbackModel || chosenModel || route.model,
        maxTokens: responseLimits.maxTokens,
      });
      sessionAttributes.pendingResponseId = pending.pendingEntry?.id || "";
      sessionAttributes.pendingResponseKey = pending.pendingUserKey;
      sessionAttributes.pendingResponseUntil = Date.now() + config.pendingResponseTtlMs;
      sessionAttributes.pendingResponseRequestId = requestMeta?.requestId || "";
      sessionAttributes.pendingResponsePrompt = trimmed;
      sessionAttributes.pendingResponseHistory = sessionAttributes.chatHistory || [];
      speech = "Die Antwort dauert etwas laenger. Moechtest du warten?";
      shouldEndSession = false;
      repromptText = "Sag: ja oder nein.";
      void logConversationEvent({
        userId,
        accountUserId,
        eventType: "conversation_timeout",
        payload: { reason: "empty_response" },
      });
      return { speech, shouldEndSession, repromptText, elicitFollowup };
    }
    const isFollowupContext =
      wasExpectingFollowup || (history.length && isContinuationUtterance(trimmed));
    if (
      usedStraico &&
      !longChunkActive &&
      isFollowupContext &&
      assistantReply &&
      isShortAck(assistantReply)
    ) {
      const followupRetry = await straicoChatCompletions(messages, {
        systemPrompt: straicoPromptForMode("followup"),
        model: chosenModel || config.straicoFallbackModel,
        maxTokens: responseLimits.maxTokens,
        useAutoSelector: false,
        fallbackModel: null,
        timeoutMs: Math.min(2000, config.straicoInteractiveTimeoutMs),
        requestId: requestMeta?.requestId || "",
      });
      if (followupRetry.ok) {
        const retryText = extractStraicoText(followupRetry.json);
        if (retryText) assistantReply = retryText;
      }
    }
    if (
      usedStraico &&
      intentInfo.intent === "REALTIME_TREND" &&
      assistantReply &&
      isNoInternetResponse(assistantReply)
    ) {
      const webOverride = getPerplexityWebModelOnly();
      const trendModel = getSelectedModelForUseCase("trend", config.straicoModelGrokFast);
      const webModel = webOverride || trendModel;
      if (webModel && webModel !== chosenModel) {
        const retry = await straicoChatCompletions(messages, {
          systemPrompt: straicoPromptForMode("trend"),
          model: webModel,
          maxTokens: responseLimits.maxTokens,
          useAutoSelector: false,
          fallbackModel: null,
          timeoutMs: Math.min(2600, config.straicoInteractiveTimeoutMs),
          requestId: requestMeta?.requestId || "",
        });
        if (retry.ok) {
          const retryText = extractStraicoText(retry.json);
          if (retryText) assistantReply = retryText;
        }
      }
    }
    const needsLongRetry =
      usedStraico &&
      (straicoMode === "long" || forceLongResponse) &&
      (!assistantReply || isShortAck(assistantReply));
    if (needsLongRetry) {
      const retryPrompt =
        "Antworte jetzt direkt und ausfuehrlich auf die letzte Nutzeranfrage. " +
        "Keine Rueckfragen, keine kurzen Bestaetigungen. Beginne sofort mit der Antwort. " +
        "Falls Informationen fehlen, triff plausible Annahmen und fahre fort. " +
        `Nutzerwunsch: ${trimmed}.`;
      const retryMessages = [...history, { role: "user", content: retryPrompt }].slice(
        -config.crokChatHistoryMax
      );
      const retry = await straicoChatCompletions(retryMessages, {
        systemPrompt: straicoPromptForMode("long"),
        maxTokens: config.straicoMaxTokensLong,
        requestId: requestMeta?.requestId || "",
      });
      if (retry.ok) {
        const retryText = extractStraicoText(retry.json);
        if (retryText) assistantReply = retryText;
      }
    }
    if (usedStraico && !assistantReply) {
      if (intentInfo.intent === "REALTIME_TREND") {
        assistantReply =
          "Ich kann Live-Daten gerade nicht abrufen. Soll ich dir eine allgemeine Antwort geben?";
        forceYesNoReprompt = true;
        liveFallbackPrompt = trimmed;
      }
    }
    if (usedStraico && !assistantReply) {
      if (shouldTreatAsStory) {
        assistantReply =
          "Alles klar, lass uns die Geschichte zusammen starten. " +
          "Moechtest du eine lustige, spannende oder magische Geschichte?";
      } else if (isClothingQuery(normalizedUtterance)) {
        const when = isTomorrowQuery(normalizedUtterance) ? "morgen" : "";
        assistantReply = buildSkiClothingAdvice(locationContext || "", when);
      } else {
        assistantReply =
          "Entschuldigung, ich habe keine Antwort erhalten. Bitte versuche es erneut.";
      }
    }
    if ((straicoMode === "long" || forceLongResponse) && assistantReply) {
      const preview = String(assistantReply || "").slice(0, 300);
      console.info("Long response preview", {
        length: assistantReply ? assistantReply.length : 0,
        preview,
      });
    }
    if (longChunkActive && assistantReply) {
      const kind = sessionAttributes.longFormKind || (isStoryIntent ? "story" : "generic");
      const chunkMaxChars =
        kind === "story"
          ? config.straicoStoryChunkMaxChars
          : config.straicoGenericChunkMaxChars || config.straicoLongChunkMaxChars;
      const reduced = reduceChunkText(assistantReply, chunkMaxChars);
      assistantReply = appendContinuationPrompt(
        reduced,
        Number(sessionAttributes.longFormPart || 1) + 1
      );
      sessionAttributes.expectingFollowup = true;
    }
    if (!longChunkActive && assistantReply) {
      const reduceSentences =
        shouldTreatAsStory && scenario.mode === "develop"
          ? null
          : responseLimits.maxSentences;
      const reduced = reduceVoiceText(
        assistantReply,
        responseLimits.maxChars,
        reduceSentences
      );
      if (shouldTreatAsStory && scenario.mode === "develop") {
        console.info("Story develop output", {
          rawLen: assistantReply.length,
          reducedLen: reduced.length,
          reducedPreview: reduced.slice(0, 300),
        });
      }
      assistantReply = reduced;
    }
    if (
      assistantReply &&
      isWeatherQuery(normalizedUtterance) &&
      (isNoInternetResponse(assistantReply) ||
        /live-daten|live daten/i.test(assistantReply))
    ) {
      const result = await runPerplexityWeather({
        query: trimmed,
        preferredLocation,
        detectedLocation,
        responseBudgetMs,
        requestId: requestMeta?.requestId || "",
      });
      if (result.text) {
        assistantReply = result.text;
        if (shouldAskForLocation(assistantReply)) {
          sessionAttributes.pendingWeatherQuery = trimmed;
          sessionAttributes.locationPromptAttempts =
            Number(sessionAttributes.locationPromptAttempts || 0) + 1;
        }
        repromptText = /[\?]$/.test(assistantReply) ? "Sag bitte den Ort." : repromptText;
      }
    }
    speech = assistantReply;
    if (useStraicoChat() && /^okay\.?$/i.test(assistantReply)) {
      console.warn("Assistant returned short ack; prompt may need refinement.", {
        mode: straicoMode,
        userPromptLength: userPrompt.length,
      });
    }
    if (!useXaiChat() && !useStraicoChat()) {
      const convoId =
        result.json?.conversationId || result.json?.conversation_id || result.json?.sessionId;
      if (convoId) {
        sessionAttributes.conversationId = String(convoId);
      }
    }
    const nextHistory = [...messages, { role: "assistant", content: assistantReply }].slice(
      -config.crokChatHistoryMax
    );
    sessionAttributes.chatHistory = nextHistory;
    if (!skipPersistHistory && userId) {
      conversationStore.setHistory(userId, nextHistory);
    }
    shouldEndSession = false;
    elicitFollowup =
      Boolean(sessionAttributes.expectingFollowup) ||
      shouldElicitFollowup(assistantReply) ||
      (useStraicoChat() && (straicoMode === "develop" || shouldTreatAsStory));
    if (elicitFollowup) {
      sessionAttributes.expectingFollowup = true;
      repromptText = forceYesNoReprompt ? "Sag: ja oder nein." : "Bitte antworte kurz.";
    } else {
      repromptText = "Sag gern noch etwas zur KI.";
    }
    if (forceYesNoReprompt) {
      sessionAttributes.awaitingLiveFallbackConfirm = true;
      sessionAttributes.liveFallbackPrompt = liveFallbackPrompt || trimmed;
    }
    if (shouldTreatAsStory) {
      sessionAttributes.storyActive = true;
      sessionAttributes.storyStage = straicoMode === "develop" ? "options" : "story";
    }
  } else if (result.status === 504) {
    let recovered = false;
    if (useStraicoChat() && typeof responseBudgetMs === "number") {
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = responseBudgetMs - elapsedMs - 200;
      if (remainingMs > 1200) {
        const quickRetry = await straicoChatCompletions(messages, {
          systemPrompt: straicoPromptForMode("short"),
          model: config.straicoFallbackModel,
          maxTokens: Math.min(80, responseLimits.maxTokens || 80),
          useAutoSelector: false,
          fallbackModel: null,
          timeoutMs: Math.min(2000, remainingMs),
          requestId: requestMeta?.requestId || "",
        });
        if (quickRetry.ok) {
          const quickText = extractStraicoText(quickRetry.json);
          if (quickText) {
            speech = reduceVoiceText(
              quickText,
              responseLimits.maxChars,
              responseLimits.maxSentences
            );
            recovered = true;
          }
        }
      }
    }
    if (!recovered) {
      console.warn("LLM timeout", {
        requestId: requestMeta?.requestId || "",
        model: route.model,
        elapsedMs: result.elapsedMs,
        timeoutMs: config.straicoInteractiveTimeoutMs,
        intent: intentInfo.intent,
      });
      const pending = schedulePendingResponse({
        userId,
        accountUserId,
        requestId: requestMeta?.requestId || "",
        prompt: trimmed,
        history: sessionAttributes.chatHistory,
        messages,
        straicoMode,
        model: config.straicoFallbackModel || route.model,
        maxTokens: responseLimits.maxTokens,
      });
      sessionAttributes.pendingResponseId = pending.pendingEntry?.id || "";
      sessionAttributes.pendingResponseKey = pending.pendingUserKey;
      sessionAttributes.pendingResponseUntil = Date.now() + config.pendingResponseTtlMs;
      sessionAttributes.pendingResponseRequestId = requestMeta?.requestId || "";
      sessionAttributes.pendingResponsePrompt = trimmed;
      sessionAttributes.pendingResponseHistory = sessionAttributes.chatHistory || [];
      speech = "Die Antwort dauert etwas laenger. Moechtest du warten?";
      shouldEndSession = false;
      repromptText = "Sag: ja oder nein.";
      void logConversationEvent({
        userId,
        accountUserId,
        eventType: "llm_timeout",
        payload: { status: 504 },
      });
    }
  } else {
    speech = `Die KI konnte nicht antworten${result.status ? ` (Fehler ${result.status})` : ""}.`;
    void logConversationEvent({
      userId,
      accountUserId,
      eventType: "llm_error",
      payload: { status: result.status || null },
    });
  }

  if (requestMeta?.requestId) {
    console.info("Chat timing", {
      requestId: requestMeta.requestId,
      intent: intentInfo.intent,
      mode: straicoMode,
      model: route.model,
      totalMs: Date.now() - startedAt,
      improverMs: improverElapsedMs,
      llmMs: llmElapsedMs,
    });
  }

  return { speech, shouldEndSession, repromptText, elicitFollowup };
};

const handleAlexaConversations = async ({
  body,
  res,
  sessionAttributes,
  userId,
  accountUserId,
  userAccessToken,
  userApiKey,
}) => {
  const intent = body?.request?.intent?.name || "";
  const apiName = body?.request?.apiRequest?.name || "";
  const args = body?.request?.apiRequest?.arguments || {};
  const utterance = String(args.query || args.utterance || args.text || "").trim();
  const inputTranscript = String(body?.request?.inputTranscript || "").trim();

  let speech = "";
  let shouldEndSession = false;
  let repromptText = "";

  if (apiName && apiName !== "SendToLLM") {
    console.warn("Unhandled Alexa Conversations API", {
      apiName,
      requestType: body?.request?.type || "unknown",
    });
    speech = "Unbekannte Anfrage.";
  } else {
    const chat = await runChatWithTimeout({
      utterance,
      fallbackTranscript: inputTranscript,
      sessionAttributes,
      userId,
      accountUserId,
      userAccessToken,
      userApiKey,
      sessionIsNew: body?.session?.new,
      responseBudgetMs: config.alexaResponseTimeoutMs,
      requestId: body?.request?.requestId || "",
      intent,
    });
    speech = chat.speech;
    shouldEndSession = chat.shouldEndSession;
    repromptText = chat.repromptText;
  }

  const safeSpeech = normalizeSpeech(speech, "Entschuldigung, da ist etwas schiefgelaufen.");
  const response = {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text: safeSpeech },
      shouldEndSession,
      directives: [
        {
          type: "Dialog.API.Response",
          apiResponse: { reply: safeSpeech },
        },
      ],
    },
  };
  if (Object.keys(sessionAttributes).length) {
    response.sessionAttributes = sessionAttributes;
  }
  if (!shouldEndSession && repromptText) {
    response.response.reprompt = { outputSpeech: { type: "PlainText", text: repromptText } };
  }
  return sendJson(res, 200, response);
};

const handleAlexa = async (req, res) => {
  const { parsed: body, raw } = await parseBody(req, "json");
  if (!config.disableAlexaSignatureValidation) {
    const validSig = await verifyAlexaSignature(raw, req.headers);
    if (!validSig) {
      return sendJson(res, 401, { error: "invalid_signature" });
    }
    const tsOk = ensureRecentTimestamp(body?.request?.timestamp);
    if (!tsOk) {
      return sendJson(res, 400, { error: "stale_request" });
    }
  } else {
    console.warn("Signature validation disabled for Alexa requests; do not use in production.");
  }

  let intent = body?.request?.intent?.name || "";
  let forcedUtterance = "";
  const slots = body?.request?.intent?.slots || {};
  const inputTranscript = String(body?.request?.inputTranscript || "").trim();
  let speech = "Unknown request.";
  let shouldEndSession = true;
  let repromptText = "";
  const sessionAttributes = body?.session?.attributes || {};
  const userAccessToken = body?.context?.System?.user?.accessToken || null;
  const accountToken = resolveAccessToken(userAccessToken || "");
  const accountUserId = accountToken?.userId || null;
  const accountUser = accountUserId ? userStore.getUser(accountUserId) : null;
  const userId =
    body?.session?.user?.userId ||
    body?.context?.System?.user?.userId ||
    null;
  const pendingUserKey = getPendingUserKey(userId, accountUserId);
  const shortAnswerUtterance = getShortAnswerUtterance(intent);

  if (sessionAttributes.pendingResponseId || sessionAttributes.pendingResponseKey) {
    const pending = pendingUserKey ? getPendingResponse(pendingUserKey) : null;
    const isYes =
      intent === "ShortAnswerYesIntent" ||
      isPositiveResponse(inputTranscript || extractSlotText(slots) || "");
    const isNo =
      intent === "ShortAnswerNoIntent" ||
      isNegativeResponse(inputTranscript || extractSlotText(slots) || "");
    const isNewQuestion =
      intent === "CrokChatIntent" ||
      (shortAnswerUtterance && !isYes && !isNo) ||
      (inputTranscript && !isYes && !isNo);
    if (isNewQuestion) {
      clearPendingResponse(pendingUserKey);
      delete sessionAttributes.pendingResponseId;
      delete sessionAttributes.pendingResponseUntil;
      delete sessionAttributes.pendingResponseRequestId;
      delete sessionAttributes.pendingResponseKey;
    } else if (isYes) {
      if (!pending || pending.requestId !== sessionAttributes.pendingResponseRequestId) {
        const storedPrompt = sessionAttributes.pendingResponsePrompt || "";
        if (storedPrompt) {
          clearPendingResponse(pendingUserKey);
          delete sessionAttributes.pendingResponseId;
          delete sessionAttributes.pendingResponseUntil;
          delete sessionAttributes.pendingResponseRequestId;
          delete sessionAttributes.pendingResponseKey;
          delete sessionAttributes.pendingResponsePrompt;
          delete sessionAttributes.pendingResponseHistory;
          const retryChat = await handleChatUtterance({
            utterance: storedPrompt,
            fallbackTranscript: "",
            sessionAttributes,
            userId,
            accountUserId,
            userAccessToken,
            userApiKey: accountUser?.apiKey || null,
            sessionIsNew: false,
            responseBudgetMs: config.alexaResponseTimeoutMs,
            requestMeta: {
              requestId: requestId || "",
              intent: "CrokChatIntent",
            },
          });
          return sendResponse(res, retryChat);
        }
        clearPendingResponse(pendingUserKey);
        delete sessionAttributes.pendingResponseId;
        delete sessionAttributes.pendingResponseUntil;
        delete sessionAttributes.pendingResponseRequestId;
        delete sessionAttributes.pendingResponseKey;
        delete sessionAttributes.pendingResponsePrompt;
        delete sessionAttributes.pendingResponseHistory;
        speech = "Die vorherige Anfrage ist nicht mehr verfuegbar. Bitte stelle sie erneut.";
        shouldEndSession = false;
        repromptText = "Was moechtest du wissen?";
        return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
      }
      if (pending && pending.status === "ready" && pending.response) {
        if (!isNoAnswerResponse(pending.response)) {
          speech = pending.response;
          shouldEndSession = false;
          const nextHistory = [
            ...(Array.isArray(pending.history) ? pending.history : []),
            { role: "user", content: pending.prompt || "" },
            { role: "assistant", content: pending.response },
          ].filter((entry) => entry.content && String(entry.content).trim());
          if (nextHistory.length) {
            sessionAttributes.chatHistory = nextHistory.slice(-config.crokChatHistoryMax);
            if (userId) conversationStore.setHistory(userId, sessionAttributes.chatHistory);
          }
          sessionAttributes.expectingFollowup = shouldElicitFollowup(pending.response);
          repromptText = sessionAttributes.expectingFollowup
            ? "Bitte antworte kurz."
            : "Sag gern noch etwas zur KI.";
          clearPendingResponse(pendingUserKey);
          delete sessionAttributes.pendingResponseId;
          delete sessionAttributes.pendingResponseUntil;
          delete sessionAttributes.pendingResponseRequestId;
          delete sessionAttributes.pendingResponseKey;
          delete sessionAttributes.pendingResponsePrompt;
          delete sessionAttributes.pendingResponseHistory;
          return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
        }
      }
      if (pending && pending.status === "pending") {
        speech = "Die Antwort ist noch nicht fertig. Moechtest du weiter warten?";
        shouldEndSession = false;
        repromptText = "Sag: ja oder nein.";
        return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
      }
      if (pending && pending.prompt) {
        const storedMode = sessionAttributes.lastChatMode || "short";
        const storedModel = sessionAttributes.lastChatModel || config.straicoFallbackModel;
        const storedMaxTokens = Number(sessionAttributes.lastChatMaxTokens) || 120;
        const retryMode = storedMode || "short";
        const retryMaxTokens = Math.min(
          storedMaxTokens || 120,
          config.straicoMaxTokensLong
        );
        const retryMessages = [
          ...(Array.isArray(pending.history) ? pending.history : []),
          { role: "user", content: pending.prompt },
        ].slice(-config.crokChatHistoryMax);
        const retry = await straicoChatCompletions(retryMessages, {
          systemPrompt: straicoPromptForMode(retryMode),
          model: storedModel || config.straicoFallbackModel,
          maxTokens: retryMaxTokens,
          useAutoSelector: false,
          fallbackModel: null,
          timeoutMs: Math.min(
            config.straicoInteractiveTimeoutMs,
            Math.max(1800, config.alexaResponseTimeoutMs - 800)
          ),
          requestId: sessionAttributes.pendingResponseRequestId || "",
        });
        if (retry.ok) {
          const retryText = extractStraicoText(retry.json);
          if (retryText) {
            speech = reduceVoiceText(retryText, 520, 2);
            shouldEndSession = false;
            const nextHistory = [
              ...(Array.isArray(pending.history) ? pending.history : []),
              { role: "user", content: pending.prompt || "" },
              { role: "assistant", content: speech },
            ].filter((entry) => entry.content && String(entry.content).trim());
            if (nextHistory.length) {
              sessionAttributes.chatHistory = nextHistory.slice(-config.crokChatHistoryMax);
              if (userId) conversationStore.setHistory(userId, sessionAttributes.chatHistory);
            }
            sessionAttributes.expectingFollowup = shouldElicitFollowup(speech);
            repromptText = sessionAttributes.expectingFollowup
              ? "Bitte antworte kurz."
              : "Sag gern noch etwas zur KI.";
            clearPendingResponse(pendingUserKey);
            delete sessionAttributes.pendingResponseId;
            delete sessionAttributes.pendingResponseUntil;
            delete sessionAttributes.pendingResponseRequestId;
            delete sessionAttributes.pendingResponseKey;
            delete sessionAttributes.pendingResponsePrompt;
            delete sessionAttributes.pendingResponseHistory;
            return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
          }
        }
      }
      speech = "Die Antwort ist leider nicht verfuegbar. Bitte stelle die Frage erneut.";
      shouldEndSession = false;
      clearPendingResponse(pendingUserKey);
      delete sessionAttributes.pendingResponseId;
      delete sessionAttributes.pendingResponseUntil;
      delete sessionAttributes.pendingResponseRequestId;
      delete sessionAttributes.pendingResponseKey;
      delete sessionAttributes.pendingResponsePrompt;
      delete sessionAttributes.pendingResponseHistory;
      return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
    }
    if (isNo) {
      speech = "Alles klar. Sag mir einfach, wobei ich helfen kann.";
      shouldEndSession = false;
      repromptText = "Was moechtest du wissen?";
      clearPendingResponse(pendingUserKey);
      delete sessionAttributes.pendingResponseId;
      delete sessionAttributes.pendingResponseUntil;
      delete sessionAttributes.pendingResponseRequestId;
      delete sessionAttributes.pendingResponseKey;
      delete sessionAttributes.pendingResponsePrompt;
      delete sessionAttributes.pendingResponseHistory;
      return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
    }
  }

  {
    const candidateUtterance =
      forcedUtterance || extractSlotText(slots) || inputTranscript || "";
    const normalizedCandidate = normalizeCommand(candidateUtterance);
    const isYes =
      intent === "ShortAnswerYesIntent" || isPositiveResponse(normalizedCandidate);
    const isNo =
      intent === "ShortAnswerNoIntent" || isNegativeResponse(normalizedCandidate);
    if (
      candidateUtterance &&
      !isYes &&
      !isNo &&
      !isWeatherQuery(candidateUtterance)
    ) {
      if (
        sessionAttributes.awaitingLocationPrompt ||
        sessionAttributes.awaitingLocationChoice ||
        sessionAttributes.awaitingLocationOverwrite
      ) {
        sessionAttributes.awaitingLocationPrompt = false;
        sessionAttributes.awaitingLocationChoice = false;
        sessionAttributes.awaitingLocationOverwrite = false;
        delete sessionAttributes.locationPrompt;
        delete sessionAttributes.locationChoiceOptions;
        delete sessionAttributes.locationOverwriteValue;
        delete sessionAttributes.selectedLocationCoords;
      }
    }
  }

  if (sessionAttributes.awaitingLiveFallbackConfirm) {
    const responseText = forcedUtterance || inputTranscript || "";
    const isYes =
      intent === "ShortAnswerYesIntent" || isPositiveResponse(responseText);
    const isNo =
      intent === "ShortAnswerNoIntent" || isNegativeResponse(responseText);
    if (isNo) {
      sessionAttributes.awaitingLiveFallbackConfirm = false;
      delete sessionAttributes.liveFallbackPrompt;
      speech = "Alles klar. Sag mir einfach, wobei ich helfen kann.";
      shouldEndSession = false;
      repromptText = "Was moechtest du wissen?";
      return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
    }
    if (isYes) {
      const fallbackTopic = sessionAttributes.liveFallbackPrompt || inputTranscript || "";
      sessionAttributes.awaitingLiveFallbackConfirm = false;
      delete sessionAttributes.liveFallbackPrompt;
      forcedUtterance = `Allgemeine Antwort ohne Live-Daten: ${fallbackTopic}`.trim();
      intent = "CrokChatIntent";
    } else {
      speech = "Sag bitte: ja oder nein.";
      shouldEndSession = false;
      repromptText = "Sag: ja oder nein.";
      return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
    }
  }

  if (sessionAttributes.awaitingLocationPrompt || sessionAttributes.awaitingLocationChoice) {
    sessionAttributes.awaitingLocationPrompt = false;
    sessionAttributes.awaitingLocationChoice = false;
    sessionAttributes.locationPromptAttempts = 0;
    delete sessionAttributes.locationPrompt;
    delete sessionAttributes.locationChoiceOptions;
    delete sessionAttributes.selectedLocationCoords;
  }

  if (sessionAttributes.awaitingLocationOverwrite) {
    const responseText = forcedUtterance || inputTranscript || "";
    const isYes =
      intent === "ShortAnswerYesIntent" || isPositiveResponse(responseText);
    const isNo =
      intent === "ShortAnswerNoIntent" || isNegativeResponse(responseText);
    const overwriteValue = String(sessionAttributes.locationOverwriteValue || "").trim();
    if (isYes && overwriteValue) {
      if (accountUserId) {
        userStore.updateUser(accountUserId, { preferredLocation: overwriteValue });
      }
      sessionAttributes.awaitingLocationOverwrite = false;
      delete sessionAttributes.locationOverwriteValue;
      speech = `Alles klar, ich nutze ab jetzt ${overwriteValue} als Standard-Ort.`;
      shouldEndSession = false;
      repromptText = "Moechtest du noch etwas wissen?";
      return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
    }
    if (isNo) {
      sessionAttributes.awaitingLocationOverwrite = false;
      delete sessionAttributes.locationOverwriteValue;
      speech = "Alles klar, ich lasse deinen Standard-Ort unveraendert.";
      shouldEndSession = false;
      repromptText = "Moechtest du noch etwas wissen?";
      return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
    }
    speech = "Sag bitte: ja oder nein.";
    shouldEndSession = false;
    repromptText = "Sag: ja oder nein.";
    return sendResponse(res, { speech, shouldEndSession, repromptText, sessionAttributes });
  }


  if (
    !forcedUtterance &&
    shortAnswerUtterance &&
    !sessionAttributes.pendingResponseId &&
    !sessionAttributes.pendingResponseKey &&
    !sessionAttributes.awaitingResumeConfirm &&
    (sessionAttributes.expectingFollowup || !inputTranscript)
  ) {
    forcedUtterance = shortAnswerUtterance;
    intent = "CrokChatIntent";
  }

  if (!userAccessToken) {
    console.warn("Access token missing; forcing relink.", { userId });
    void logConversationEvent({
      userId,
      accountUserId: null,
      eventType: "link_required",
      payload: { reason: "missing_access_token" },
    });
    return sendLinkAccountResponse(res, "Bitte verknuepfe dein Konto, um den Skill zu nutzen.");
  }
  if (userAccessToken && !accountToken) {
    console.warn("Access token not recognized; forcing relink.", {
      userId,
    });
    accessTokens.delete(userAccessToken);
    tokenStore.deleteAccessToken(userAccessToken);
    void logConversationEvent({
      userId,
      accountUserId: null,
      eventType: "link_required",
      payload: { reason: "unknown_access_token" },
    });
    return sendLinkAccountResponse(res);
  }
  if (!accountUser || !accountUser.alexaLinkedAt || accountUser.verified === false) {
    console.warn("Access token user not linked; forcing relink.", {
      userId,
      accountUserId,
      linked: Boolean(accountUser?.alexaLinkedAt),
      verified: accountUser?.verified,
    });
    accessTokens.delete(userAccessToken);
    tokenStore.deleteAccessToken(userAccessToken);
    void logConversationEvent({
      userId,
      accountUserId,
      eventType: "link_required",
      payload: { reason: "not_linked_or_unverified" },
    });
    return sendLinkAccountResponse(res);
  }
  const userApiKey = config.allowUserApiKey
    ? slots?.ApiKey?.value ||
      slots?.apiKey?.value ||
      null
    : null;

  console.info("Alexa request", {
    requestType: body?.request?.type || "unknown",
    intent,
    inputTranscript,
    slots: body?.request?.intent?.slots || {},
    hasAccessToken: Boolean(userAccessToken),
    accountUserId,
    applicationId: body?.context?.System?.application?.applicationId || body?.session?.application?.applicationId,
    locale: body?.request?.locale,
  });
  void logConversationEvent({
    userId,
    accountUserId,
    eventType: "request_received",
    payload: {
      requestType: body?.request?.type || "unknown",
      intent,
      locale: body?.request?.locale,
    },
  });

  const shortAnswerMap = {
    ShortAnswerYesIntent: { default: "ja" },
    ShortAnswerNoIntent: { default: "nein" },
    ShortAnswerOkayIntent: { default: "okay" },
    ShortAnswerFirstIntent: { default: "das erste" },
    ShortAnswerSecondIntent: { default: "das zweite" },
    ShortAnswerThirdIntent: { default: "das dritte" },
    ShortAnswerLastIntent: { default: "das letzte" },
  };

  if (shortAnswerMap[intent]) {
    const shortDefault = shortAnswerMap[intent].default;
    intent = "CrokChatIntent";
    forcedUtterance = inputTranscript || shortDefault;
  }

  if (sessionAttributes.awaitingResumeConfirm) {
    const responseText = forcedUtterance || inputTranscript || "";
    if (isNegativeResponse(responseText)) {
      sessionAttributes.awaitingResumeConfirm = false;
      sessionAttributes.restoredFromRecent = false;
      sessionAttributes.chatHistory = [];
      speech = "Alles klar, wir starten neu. Was soll ich tun?";
      shouldEndSession = false;
      repromptText = "Sag zum Beispiel: erzähle eine Geschichte.";
      return sendResponse(res, {
        speech,
        shouldEndSession,
        repromptText,
        sessionAttributes,
      });
    }
    if (isPositiveResponse(responseText)) {
      sessionAttributes.awaitingResumeConfirm = false;
      speech = "Alles klar, wir machen weiter. Sag einfach weiter.";
      shouldEndSession = false;
      repromptText = "Sag einfach weiter.";
      return sendResponse(res, {
        speech,
        shouldEndSession,
        repromptText,
        sessionAttributes,
      });
    }
  }

  if (sessionAttributes.expectingFollowup && inputTranscript) {
    intent = "CrokChatIntent";
    forcedUtterance = inputTranscript;
  }

  if (intent === "AMAZON.YesIntent") {
    intent = "CrokChatIntent";
    forcedUtterance = "ja";
  }
  if (intent === "AMAZON.NoIntent") {
    intent = "CrokChatIntent";
    forcedUtterance = "nein";
  }
  if (intent === "AMAZON.FallbackIntent" && inputTranscript) {
    intent = "CrokChatIntent";
    forcedUtterance = inputTranscript;
  }
  if (intent === "FreeReplyIntent") {
    intent = "CrokChatIntent";
  }

  if (body?.session?.new && userId) {
    const recent = getRecentHistory(userId);
    if (recent?.length) {
      sessionAttributes.chatHistory = recent;
      sessionAttributes.restoredFromRecent = true;
    }
  }

  if (body?.request?.type === "Dialog.API.Invoked") {
    return handleAlexaConversations({
      body,
      res,
      sessionAttributes,
      userId,
      accountUserId,
      userAccessToken,
      userApiKey,
    });
  }

  if (intent === "GetCrokStatusIntent") {
    if (useStraicoChat()) {
      speech = "Die KI bietet keinen Status-Endpunkt. Bitte stelle eine Frage.";
      shouldEndSession = false;
      repromptText = "Sag zum Beispiel: erzähle eine Geschichte.";
    } else {
      const result = await crokStatus(userApiKey || config.crokApiKey, userAccessToken);
      if (result.ok) {
        const statusText =
          typeof result.json?.status === "string"
            ? result.json.status
            : result.json?.message || "Status ok";
        speech = `Die KI meldet: ${statusText}.`;
      } else if (result.status === 504) {
        speech = "Die KI antwortet nicht rechtzeitig. Bitte versuche es gleich noch einmal.";
      } else {
        speech = "Die KI antwortet nicht. Bitte versuche es später erneut.";
      }
    }
  } else if (intent === "TriggerCrokActionIntent") {
    const actionSlot = extractSlotText(slots);
    const targetSlot = slots?.Target?.value || slots?.target?.value;
    let actionName = actionSlot ? actionSlot.toLowerCase() : "";
    if (!actionName) {
      speech = "Welche Aktion soll ich ausführen?";
      shouldEndSession = false;
      repromptText = "Du kannst zum Beispiel sagen: erzähle eine Geschichte.";
    } else {
      if (useStraicoChat()) {
        speech = "Die KI unterstützt keine Aktions-Aufrufe. Bitte stelle eine Frage.";
        shouldEndSession = false;
        repromptText = "Sag zum Beispiel: erzähle eine Geschichte.";
      } else {
        const params = targetSlot ? { target: targetSlot } : {};
        const result = await crokAction(actionName, params, userApiKey || config.crokApiKey, userAccessToken);
        if (result.ok) {
          const msg =
            result.json?.message ||
            (result.json?.status ? `Status: ${result.json.status}` : "Aktion gestartet.");
          speech = msg;
        } else if (result.status === 504) {
          speech = "Die KI hat nicht rechtzeitig geantwortet. Bitte erneut versuchen.";
        } else {
          speech = `Aktion konnte nicht ausgeführt werden${result.status ? ` (Fehler ${result.status})` : ""}.`;
        }
      }
    }
  } else if (intent === "CrokChatIntent") {
    const utterance =
      forcedUtterance ||
      extractSlotText(slots) ||
      inputTranscript;
    const chat = await runChatWithTimeout({
      utterance: forcedUtterance || utterance,
      fallbackTranscript: inputTranscript,
      sessionAttributes,
      userId,
      accountUserId,
      userAccessToken,
      userApiKey,
      sessionIsNew: body?.session?.new,
      responseBudgetMs: config.alexaResponseTimeoutMs,
      requestId: body?.request?.requestId || "",
      intent,
    });
    speech = chat.speech;
    shouldEndSession = chat.shouldEndSession;
    repromptText = chat.repromptText;
  } else if (intent === "AMAZON.StopIntent" || intent === "AMAZON.CancelIntent") {
    speech = "Alles klar, bis zum nächsten Mal.";
    shouldEndSession = true;
    void logConversationEvent({
      userId,
      accountUserId,
      eventType: "conversation_end",
      payload: { reason: intent },
    });
  } else if (intent === "AMAZON.FallbackIntent") {
    speech =
      "Ich konnte dich nicht verstehen. Antworte bitte im Satz oder beginne mit bitte.";
    shouldEndSession = false;
    repromptText = "Bitte antworte im Satz oder beginne mit bitte.";
    void logConversationEvent({
      userId,
      accountUserId,
      eventType: "fallback_intent",
      payload: { intent },
    });
  } else if (body?.request?.type === "LaunchRequest") {
    if (sessionAttributes.restoredFromRecent) {
      speech = "Willkommen zurück. Soll ich dort weitermachen?";
      shouldEndSession = false;
      repromptText = "Sag einfach weiter.";
      sessionAttributes.awaitingResumeConfirm = true;
      void logConversationEvent({
        userId,
        accountUserId,
        eventType: "conversation_resume_prompted",
        payload: {},
      });
    } else {
      speech = "Willkommen bei deiner KI. Was soll ich tun?";
      shouldEndSession = false;
      repromptText = "Du kannst zum Beispiel sagen: erzähle eine Geschichte.";
      void logConversationEvent({
        userId,
        accountUserId,
        eventType: "conversation_start",
        payload: {},
      });
    }
  } else if (inputTranscript) {
    console.warn("Unhandled Alexa intent; routing to chat", {
      intent,
      requestType: body?.request?.type || "unknown",
    });
    const chat = await runChatWithTimeout({
      utterance: inputTranscript,
      fallbackTranscript: inputTranscript,
      sessionAttributes,
      userId,
      accountUserId,
      userAccessToken,
      userApiKey,
      sessionIsNew: body?.session?.new,
      responseBudgetMs: config.alexaResponseTimeoutMs,
      requestId: body?.request?.requestId || "",
      intent,
    });
    speech = chat.speech;
    shouldEndSession = chat.shouldEndSession;
    repromptText = chat.repromptText;
  } else {
    console.warn("Unhandled Alexa intent", {
      intent,
      requestType: body?.request?.type || "unknown",
    });
  }

  const safeSpeech = normalizeSpeech(speech, "Entschuldigung, da ist etwas schiefgelaufen.");
  const response = {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text: safeSpeech },
      shouldEndSession,
    },
  };
  if (Object.keys(sessionAttributes).length) {
    response.sessionAttributes = sessionAttributes;
  }
  if (!shouldEndSession && repromptText) {
    response.response.reprompt = { outputSpeech: { type: "PlainText", text: repromptText } };
  }
  return sendJson(res, 200, response);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { status: "ok" });
    }
    if (req.method === "GET" && url.pathname === "/logo.png") {
      const logoPath = path.join(process.cwd(), "logo.png");
      if (!fs.existsSync(logoPath)) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        return res.end("Not found");
      }
      const data = fs.readFileSync(logoPath);
      res.writeHead(200, { "content-type": "image/png" });
      return res.end(data);
    }

    if (url.pathname === "/oauth/authorize") {
      return handleAuthorize(req, res, url);
    }

    if (url.pathname === "/oauth/token") {
      return handleToken(req, res);
    }

    if (url.pathname === "/" && req.method === "GET") {
      return sendHtml(res, 200, renderLanding());
    }

    if (url.pathname === "/privacy" && req.method === "GET") {
      return sendHtml(res, 200, renderPrivacy());
    }
    if (url.pathname === "/terms" && req.method === "GET") {
      return sendHtml(res, 200, renderTerms());
    }
    if (url.pathname === "/impressum" && req.method === "GET") {
      return sendHtml(res, 200, renderImpressum());
    }

    if (url.pathname === "/register" || url.pathname === "/admin/register") {
      return handleRegisterRequest(req, res);
    }

    if (url.pathname === "/reset" || url.pathname === "/admin/reset") {
      return handleResetRequest(req, res);
    }

    if (url.pathname === "/reset/confirm" || url.pathname === "/admin/reset/confirm") {
      return handleResetConfirm(req, res, url);
    }

    if (url.pathname === "/verify/resend") {
      return handleVerifyResendRequest(req, res, url);
    }

    if (url.pathname === "/contact" && req.method === "POST") {
      const { parsed: body } = await parseBody(req, "form");
      const name = String(body?.name || "").trim();
      const email = String(body?.email || "").trim();
      const message = String(body?.message || "").trim();
      if (!name || !email || !message) {
        return sendHtml(res, 400, renderLanding("Bitte alle Felder ausfuellen."));
      }
      const mail = await smtpSend({
        to: "info@jkce.de",
        subject: `Kontaktformular: ${name}`,
        text: `Name: ${name}\nE-Mail: ${email}\n\n${message}`,
      });
      if (!mail.ok) {
        console.error("Contact form SMTP failed", {
          error: mail.error,
          lastResponse: mail.lastResponse,
          to: "info@jkce.de",
        });
        return sendHtml(res, 500, renderLanding("Nachricht konnte nicht gesendet werden."));
      }
      return sendHtml(res, 200, renderLanding("Danke! Deine Nachricht wurde gesendet."));
    }

    if (url.pathname === "/login") {
      if (req.method === "GET") {
        return sendHtml(res, 200, renderLogin());
      }
      if (req.method === "POST") {
        const { parsed: body } = await parseBody(req, "form");
        const rawUser = String(body?.username || "").trim();
        const password = String(body?.password || "").trim();
        const resolvedUser = rawUser.includes("@")
          ? userStore.findByEmail(rawUser)?.username || rawUser
          : userStore.findByUsernameInsensitive(rawUser)?.username || rawUser;
        if (!rawUser || !password) {
          void logConversationEvent({
            userId: resolvedUser,
            accountUserId,
            eventType: "auth_invalid",
            payload: { reason: "missing_credentials", path: "/login" },
          });
          return sendHtml(res, 400, renderLogin("Bitte E-Mail und Passwort eingeben."));
        }
        if (resolvedUser === config.adminUser && password === config.adminPass) {
          return sendHtml(res, 401, renderLogin("Bitte fuer Admin-Zugang /admin/login verwenden."));
        }
        const stored = userStore.getUser(resolvedUser);
        const okStored = verifyStoredPassword(password, stored);
        const verified = stored?.verified !== false;
        if (okStored && verified) {
          const sid = signSession(resolvedUser);
          res.setHeader(
            "Set-Cookie",
            `sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Secure`
          );
          res.writeHead(302, { Location: "/account" });
          return res.end();
        }
        if (okStored && !verified) {
          return sendHtml(res, 401, renderLogin("Bitte E-Mail bestaetigen, bevor du dich anmeldest."));
        }
        void logConversationEvent({
          userId: resolvedUser,
          accountUserId,
          eventType: "auth_invalid",
          payload: { reason: "invalid_credentials", path: "/login" },
        });
        return sendHtml(
          res,
          401,
          renderLogin("Anmeldung fehlgeschlagen. Bitte pruefe E-Mail/Passwort oder setze dein Passwort zurueck: /reset")
        );
      }
      return sendJson(res, 405, { error: "method_not_allowed" });
    }

    if (url.pathname === "/admin/login") {
      if (req.method === "GET") {
        return sendHtml(res, 200, renderAdminLogin());
      }
      if (req.method === "POST") {
        const { parsed: body } = await parseBody(req, "form");
        const username = String(body?.username || "").trim();
        const password = String(body?.password || "").trim();
        if (username === config.adminUser && password === config.adminPass) {
          const sid = signSession(username);
          res.setHeader(
            "Set-Cookie",
            `sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Secure`
          );
          res.writeHead(302, { Location: "/admin" });
          return res.end();
        }
        return sendHtml(res, 401, renderAdminLogin("Invalid credentials"));
      }
      return sendJson(res, 405, { error: "method_not_allowed" });
    }

    if (url.pathname === "/admin/verify" || url.pathname === "/verify") {
      const username = String(url.searchParams.get("user") || "").trim();
      const token = String(url.searchParams.get("token") || "").trim();
      const user = userStore.getUser(username);
      if (
        !user ||
        !user.verifyToken ||
        user.verifyToken !== token
      ) {
        return sendHtml(res, 400, renderLogin("Verifizierung fehlgeschlagen oder abgelaufen."));
      }
      if (Date.now() > Number(user.verifyUntil || 0)) {
        if (user.verified === false) {
          return sendHtml(
            res,
            400,
            renderVerifyResend(
              "Link ist abgelaufen und Nutzer noch nicht bestaetigt.",
              user.email || username
            )
          );
        }
        return sendHtml(res, 400, renderLogin("Verifizierung fehlgeschlagen oder abgelaufen."));
      }
      userStore.updateUser(username, { verified: true, verifyToken: "", verifyUntil: 0 });
      return sendHtml(res, 200, renderLogin("E-Mail bestaetigt. Bitte einloggen."));
    }

    if (url.pathname === "/logout" || url.pathname === "/admin/logout") {
      res.setHeader("Set-Cookie", "sid=deleted; Max-Age=0; Path=/; SameSite=Lax; Secure");
      res.writeHead(302, { Location: "/login" });
      return res.end();
    }

    if (url.pathname.startsWith("/account")) {
      const cookies = parseCookies(req.headers.cookie);
      const userId = verifySession(cookies.sid);
      if (!userId) {
        res.writeHead(302, { Location: "/login" });
        return res.end();
      }
      if (req.method === "POST" && url.pathname === "/account/password") {
        const { parsed: body } = await parseBody(req, "form");
        const currentPassword = String(body?.currentPassword || "").trim();
        const newPassword = String(body?.newPassword || "").trim();
        const newPasswordConfirm = String(body?.newPasswordConfirm || "").trim();
        const stored = userStore.getUser(userId);
        if (!verifyStoredPassword(currentPassword, stored)) {
          return sendHtml(res, 400, renderUserDashboard(userId, "Aktuelles Passwort ist falsch."));
        }
        if (newPassword.length < 8) {
          return sendHtml(res, 400, renderUserDashboard(userId, "Neues Passwort muss mindestens 8 Zeichen haben."));
        }
        if (newPassword !== newPasswordConfirm) {
          return sendHtml(res, 400, renderUserDashboard(userId, "Passwoerter stimmen nicht ueberein."));
        }
        const salt = crypto.randomBytes(16).toString("hex");
        const iterations = 100000;
        const hash = hashPassword(newPassword, salt, iterations);
        userStore.updateUser(userId, { hash, salt, iterations });
        return sendHtml(res, 200, renderUserDashboard(userId, "Passwort wurde aktualisiert."));
      }
      if (req.method === "POST" && url.pathname === "/account/delete") {
        const { parsed: body } = await parseBody(req, "form");
        const password = String(body?.password || "").trim();
        const confirmDelete = String(body?.confirmDelete || "").trim();
        const stored = userStore.getUser(userId);
        if (!verifyStoredPassword(password, stored)) {
          return sendHtml(res, 400, renderUserDashboard(userId, "Passwort ist falsch."));
        }
        if (!confirmDelete) {
          return sendHtml(res, 400, renderUserDashboard(userId, "Bitte bestaetige das Loeschen des Kontos."));
        }
        revokeUserTokens(userId);
        userStore.deleteUser(userId);
        res.setHeader("Set-Cookie", "sid=deleted; Max-Age=0; Path=/; SameSite=Lax; Secure");
        return sendHtml(res, 200, renderLanding("Konto wurde geloescht."));
      }
      if (req.method === "POST" && url.pathname === "/account/unlink") {
        userStore.updateUser(userId, { alexaLinkedAt: "" });
        revokeUserTokens(userId);
        return sendHtml(res, 200, renderUserDashboard(userId, "Verknuepfung wurde getrennt."));
      }
      if (req.method === "POST" && url.pathname === "/account/location") {
        const { parsed: body } = await parseBody(req, "form");
        const preferredLocation = String(body?.preferredLocation || "").trim();
        if (!preferredLocation) {
          return sendHtml(res, 400, renderUserDashboard(userId, "Bitte einen Ort angeben."));
        }
        userStore.updateUser(userId, { preferredLocation });
        return sendHtml(res, 200, renderUserDashboard(userId, "Standard-Ort wurde aktualisiert."));
      }
      return sendHtml(res, 200, renderUserDashboard(userId));
    }

    if (url.pathname.startsWith("/admin")) {
      const cookies = parseCookies(req.headers.cookie);
      const userId = verifySession(cookies.sid);
      if (!userId) {
        res.writeHead(302, { Location: "/admin/login" });
        return res.end();
      }
      if (!isAdminUser(userId)) {
        res.writeHead(302, { Location: "/account" });
        return res.end();
      }
      if (req.method === "GET" && url.pathname === "/admin/export") {
        const filter = normalizeEventFilter(url.searchParams.get("filter"));
        const range = normalizeEventRange(url.searchParams.get("range"));
        const format = String(url.searchParams.get("format") || "json").toLowerCase();
        if (!dbPool) {
          return sendJson(res, 503, { error: "eventlog_unavailable" });
        }
        try {
          const query = buildEventQuery({ filter, range, limit: 1000 });
          const result = await dbPool.query(query.text, query.values);
          const rows = result.rows || [];
          if (format === "csv") {
            const header = "event_ts,event_type,user_id,account_user_id,payload";
            const csv = rows
              .map((row) => {
                const payload = row.payload ? JSON.stringify(row.payload) : "";
                const parts = [
                  row.event_ts,
                  row.event_type,
                  row.user_id || "",
                  row.account_user_id || "",
                  payload,
                ];
                return parts
                  .map((val) => `"${String(val || "").replace(/\"/g, '""')}"`)
                  .join(",");
              })
              .join("\n");
            res.writeHead(200, {
              "content-type": "text/csv; charset=utf-8",
              "content-disposition": "attachment; filename=eventlog.csv",
            });
            return res.end(`${header}\n${csv}`);
          }
          return sendJson(res, 200, { data: rows });
        } catch (err) {
          console.warn("Eventlog export failed", { error: err.message });
          return sendJson(res, 500, { error: "eventlog_export_failed" });
        }
      }
      if (req.method === "POST" && url.pathname === "/admin/llm/clear-inactive") {
        clearInactiveModels();
        return sendHtml(res, 200, renderAdmin(userId, "Inaktive Modelle wurden reaktiviert."));
      }
      if (req.method === "POST" && url.pathname === "/admin/qa/reset") {
        const result = resetQaUsers();
        if (!result.ok) {
          return sendHtml(
            res,
            400,
            renderAdmin(
              userId,
              "QA Nutzer konnte nicht zurueckgesetzt werden. Bitte QA Passwort setzen."
            )
          );
        }
        const removed = result.removed?.length ? ` Entfernt: ${result.removed.join(", ")}` : "";
        return sendHtml(
          res,
          200,
          renderAdmin(userId, `QA Nutzer reset: ${result.created}.${removed}`)
        );
      }
      if (req.method === "GET" && url.pathname === "/admin/reports") {
        const file = String(url.searchParams.get("file") || "");
        const download = url.searchParams.get("download") === "1";
        if (!REPORT_FILE_RE.test(file)) {
          return sendHtml(res, 400, renderAdmin(userId, "Ungueltiger Report-Name."));
        }
        const filePath = path.join(REPORTS_DIR, file);
        if (!fs.existsSync(filePath)) {
          return sendHtml(res, 404, renderAdmin(userId, "Report nicht gefunden."));
        }
        const payload = fs.readFileSync(filePath, "utf8");
        res.writeHead(200, {
          "content-type": "text/plain; charset=utf-8",
          ...(download
            ? { "content-disposition": `attachment; filename=${file}` }
            : {}),
        });
        return res.end(payload);
      }
      if (req.method === "POST" && url.pathname === "/admin/reports/delete") {
        const { parsed: body } = await parseBody(req, "form");
        const file = String(body?.file || "");
        if (!REPORT_FILE_RE.test(file)) {
          return sendHtml(res, 400, renderAdmin(userId, "Ungueltiger Report-Name."));
        }
        const filePath = path.join(REPORTS_DIR, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return sendHtml(res, 200, renderAdmin(userId, "Report wurde geloescht."));
      }
      if (req.method === "POST" && url.pathname === "/admin/reports/run") {
        try {
          const filename = await createManualReport();
          return sendHtml(
            res,
            200,
            renderAdmin(userId, `Report erstellt: ${filename}`)
          );
        } catch (err) {
          console.warn("Manual report failed", { error: err.message });
          return sendHtml(res, 500, renderAdmin(userId, "Report konnte nicht erstellt werden."));
        }
      }
      if (req.method === "POST" && url.pathname === "/admin/models/refresh") {
        await refreshModelSelections({ withTests: true });
        return sendHtml(res, 200, renderAdmin(userId, "Model-Auswahl wurde aktualisiert."));
      }
      if (req.method === "POST" && url.pathname === "/admin/env") {
        if (!isAdminUser(userId)) {
          return sendHtml(res, 403, renderAdmin(userId));
        }
        const { parsed: body } = await parseBody(req, "form");
        const updates = { ...body };
        if (!updates.SMTP_PASS) {
          delete updates.SMTP_PASS;
        }
        if (!updates.PERPLEXITY_API_KEY) {
          delete updates.PERPLEXITY_API_KEY;
        }
        if (!updates.QA_USER_PASSWORD) {
          delete updates.QA_USER_PASSWORD;
        }
        updateEnvFile(updates);
        res.writeHead(302, { Location: "/admin" });
        return res.end();
      }
      if (req.method === "POST" && url.pathname === "/admin/users/resend") {
        if (!isAdminUser(userId)) {
          return sendHtml(res, 403, renderAdmin(userId));
        }
        const { parsed: body } = await parseBody(req, "form");
        const username = String(body?.username || "").trim();
        const user = userStore.getUser(username);
        if (user && user.email && user.verified === false) {
          const { mail } = await sendVerificationEmail({
            username,
            email: user.email,
          });
          if (!mail.ok) {
            console.error("Resend verification failed", {
              user: username,
              to: user.email,
              error: mail.error,
              lastResponse: mail.lastResponse,
            });
            return sendHtml(
              res,
              500,
              renderAdmin(userId, "Verifizierung konnte nicht gesendet werden.")
            );
          }
          console.info("Resend verification sent", { user: username, to: user.email });
          return sendHtml(
            res,
            200,
            renderAdmin(userId, "Verifizierung wurde erneut gesendet.")
          );
        }
        return sendHtml(res, 400, renderAdmin(userId, "Kein unbestaetigter Nutzer gefunden."));
      }
      if (req.method === "POST" && url.pathname === "/admin/users/verify") {
        if (!isAdminUser(userId)) {
          return sendHtml(res, 403, renderAdmin(userId));
        }
        const { parsed: body } = await parseBody(req, "form");
        const username = String(body?.username || "").trim();
        const user = userStore.getUser(username);
        if (user && user.verified === false) {
          userStore.updateUser(username, { verified: true, verifyToken: "", verifyUntil: 0 });
          return sendHtml(res, 200, renderAdmin(userId, "Nutzer wurde manuell verifiziert."));
        }
        return sendHtml(res, 400, renderAdmin(userId, "Kein unbestaetigter Nutzer gefunden."));
      }
      if (req.method === "POST" && url.pathname === "/admin/users/delete") {
        if (!isAdminUser(userId)) {
          return sendHtml(res, 403, renderAdmin(userId));
        }
        const { parsed: body } = await parseBody(req, "form");
        const username = String(body?.username || "").trim();
        if (username && username !== config.adminUser) {
          revokeUserTokens(username);
          userStore.deleteUser(username);
        }
        res.writeHead(302, { Location: "/admin" });
        return res.end();
      }
      if (req.method === "POST" && url.pathname === "/admin/users/unlink") {
        if (!isAdminUser(userId)) {
          return sendHtml(res, 403, renderAdmin(userId));
        }
        const { parsed: body } = await parseBody(req, "form");
        const username = String(body?.username || "").trim();
        if (username) {
          userStore.updateUser(username, { alexaLinkedAt: "" });
          revokeUserTokens(username);
        }
        res.writeHead(302, { Location: "/admin" });
        return res.end();
      }
      maybeRefreshModelSelections();
      const filter = normalizeEventFilter(url.searchParams.get("filter"));
      const range = normalizeEventRange(url.searchParams.get("range"));
      let events = [];
      let eventsError = false;
      let llmStats = { errors: 0, timeouts: 0, authInvalid: 0 };
      const modelSelectionSnapshot = {
        updatedAt: modelSelectionCache.updatedAt,
        refreshing: modelSelectionCache.refreshing,
        error: modelSelectionCache.error,
        results: modelSelectionCache.results,
        selected: modelSelectionCache.selected,
        webModels: modelSelectionCache.webModels,
      };
      const llmCallStats = getLlmStatsSnapshot();
      if (dbPool) {
        try {
          const query = buildEventQuery({ filter, range, limit: 50 });
          const result = await dbPool.query(query.text, query.values);
          events = result.rows || [];
          const stats = await dbPool.query(
            "select event_type, count(*)::int as total from conversation_events where event_ts >= now() - interval '24 hours' and event_type in ('llm_error','llm_timeout','auth_invalid') group by event_type"
          );
          for (const row of stats.rows || []) {
            if (row.event_type === "llm_error") llmStats.errors = row.total;
            if (row.event_type === "llm_timeout") llmStats.timeouts = row.total;
            if (row.event_type === "auth_invalid") llmStats.authInvalid = row.total;
          }
        } catch (err) {
          eventsError = true;
          console.warn("Eventlog fetch failed", { error: err.message });
        }
      }
      return sendHtml(
        res,
        200,
        renderAdmin(userId, "", events, {
          filter: filter.key,
          range: range.key,
          error: eventsError,
          llmStats,
          llmCallStats,
          modelSelection: modelSelectionSnapshot,
        })
      );
    }

    if (req.method === "POST" && url.pathname === "/alexa") {
      try {
        return await handleAlexa(req, res);
      } catch (err) {
        console.error("Alexa handler error", err);
        return sendResponse(res, {
          speech: "Entschuldigung, da ist etwas schiefgelaufen.",
          shouldEndSession: false,
          repromptText: "Bitte versuche es noch einmal.",
          sessionAttributes: {},
        });
      }
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (err) {
    console.error("Unhandled error", err);
    return sendJson(res, 500, { error: "internal_error" });
  }
});

initEventLog().catch((err) => console.warn("Event log init error", err?.message));
maybeRefreshModelSelections();
setInterval(maybeRefreshModelSelections, 24 * 60 * 60 * 1000);
cleanupPromptLogs();
setInterval(cleanupPromptLogs, 7 * 24 * 60 * 60 * 1000);
server.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
});
