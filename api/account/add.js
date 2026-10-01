// api/account/add.js - Add account endpoint
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
        if (!body) return res.status(400).json({ status: "error", error: "No data provided" });

        // Forward to BOT_URL if available
        if (BOT_URL) {
            try {
                const r = await fetch(`${BOT_URL.replace(/\/+$/, "")}/api/account/add`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                const d = await r.json();
                return res.status(r.status).json(d);
            } catch (e) {}
        }

        // Queue command for bot client
        const cmd = await queueCommand("add_account", body);
        return res.status(200).json({
            status: "ok",
            message: "Account queued for bot rotation",
            command_id: cmd.id
        });
    } catch (e) {
        return res.status(500).json({ status: "error", error: e.message });
    }
};
