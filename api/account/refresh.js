// api/account/refresh.js - Refresh account info
const { queueCommand, setCorsHeaders, BOT_URL } = require("../lib/store");

module.exports = async (req, res) => {
    setCorsHeaders(res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Method not allowed" });

    try {
        let body = req.body;
        if (typeof body === "string") {
            try { body = JSON.parse(body); } catch (e) {}
        }
        const uid = body ? body.uid : null;
        if (!uid) return res.status(400).json({ status: "error", error: "UID is required" });

        if (BOT_URL) {
            try {
                const r = await fetch(`${BOT_URL.replace(/\/+$/, "")}/api/account/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid })
                });
                const d = await r.json();
                return res.status(r.status).json(d);
            } catch (e) {}
        }

        const cmd = await queueCommand("refresh_account", { uid });
        return res.status(200).json({ status: "ok", command_id: cmd.id });
    } catch (e) {
        return res.status(500).json({ status: "error", error: e.message });
    }
};
