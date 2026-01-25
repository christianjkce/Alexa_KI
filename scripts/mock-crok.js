const http = require("http");

const HOST = process.env.CROK_STUB_HOST || "0.0.0.0";
const PORT = Number(process.env.CROK_STUB_PORT) || 3200;

const sendJson = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
};

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url.startsWith("/status")) {
    return sendJson(res, 200, { ok: true, message: "Crok meldet: Status ok." });
  }

  if (req.method === "POST" && req.url.startsWith("/action")) {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    await new Promise((resolve) => req.on("end", resolve));
    let body;
    try {
      body = JSON.parse(data || "{}");
    } catch {
      body = {};
    }
    const action = body.action || "unbekannt";
    const params = body.parameters || {};
    if (action === "chat") {
      const incoming = params.conversationId || "";
      const convoId = incoming || `mock-${Date.now()}`;
      return sendJson(res, 200, {
        ok: true,
        message: `Chat ok (${params.text || "..."})`,
        conversationId: convoId,
      });
    }
    return sendJson(res, 200, { ok: true, message: `Aktion ${action} gestartet.` });
  }

  return sendJson(res, 404, { error: "not_found" });
});

server.listen(PORT, HOST, () => {
  console.log(`Crok stub listening on ${HOST}:${PORT}`);
});
