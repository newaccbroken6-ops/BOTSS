// api/bot/sync.js - Bridge endpoint for local FreeFire bot client
const { updateBotSync, setCorsHeaders } = require("../lib/store");

module.exports = async (req, res) => {
    setCorsHeaders(res);
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ status: "error", error: "Method not allowed. Use POST." });
    }

    try {
        let body = req.body;
        if (typeof body === "string") {
            try { body = JSON.parse(body); } catch (e) {}
        }
        if (!body || typeof body !== "object") {
            return res.status(400).json({ status: "error", error: "Invalid JSON payload" });
        }

        // Optional Secret Auth Check if BOT_SECRET env var is defined
        const expectedSecret = process.env.BOT_SECRET;
        if (expectedSecret) {
            const token = req.headers["x-bot-token"] || req.headers["authorization"];
            if (!token || !token.includes(expectedSecret)) {
                return res.status(401).json({ status: "error", error: "Unauthorized: Invalid bot secret" });
            }
        }

        const { stats, commands } = await updateBotSync(body);

        return res.status(200).json({
            status: "ok",
            timestamp: Math.floor(Date.now() / 1000),
            commands_count: commands.length,
            commands: commands
        });
    } catch (err) {
        console.error("Bot sync error:", err);
        return res.status(500).json({ status: "error", error: err.message });
    }
};
