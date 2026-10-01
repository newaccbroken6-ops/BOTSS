// api/logs/clear.js - Clear logs endpoint
const { queueCommand, setCorsHeaders, BOT_URL } = require("../lib/store");

module.exports = async (req, res) => {
    setCorsHeaders(res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Method not allowed" });

    try {
        if (BOT_URL) {
            try {
                const r = await fetch(`${BOT_URL.replace(/\/+$/, "")}/api/logs/clear`, {
                    method: "POST"
                });
                const d = await r.json();
                return res.status(r.status).json(d);
            } catch (e) {}
        }

        const cmd = await queueCommand("clear_logs", {});
        if (globalThis._botCache && globalThis._botCache.stats) {
            globalThis._botCache.stats.logs = [];
        }
        return res.status(200).json({ status: "ok", command_id: cmd.id });
    } catch (e) {
        return res.status(500).json({ status: "error", error: e.message });
    }
};
