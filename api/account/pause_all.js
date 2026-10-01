// api/account/pause_all.js - Pause/Resume all accounts endpoint
const { queueCommand, setCorsHeaders, BOT_URL } = require("../lib/store");

module.exports = async (req, res) => {
    setCorsHeaders(res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Method not allowed" });

    try {
        // Forward to BOT_URL if available
        if (BOT_URL) {
            try {
                const r = await fetch(`${BOT_URL.replace(/\/+$/, "")}/api/account/pause_all`, {
                    method: "POST"
                });
                const d = await r.json();
                return res.status(r.status).json(d);
            } catch (e) {}
        }

        const cmd = await queueCommand("pause_all", {});
        return res.status(200).json({
            status: "ok",
            message: "Pause all command queued",
            command_id: cmd.id
        });
    } catch (e) {
        return res.status(500).json({ status: "error", error: e.message });
    }
};
