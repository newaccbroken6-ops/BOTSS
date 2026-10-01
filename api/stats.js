// api/stats.js - Serves GET /api/stats for Vercel Dashboard
const { getStats, setCorsHeaders, BOT_URL } = require("./lib/store");

module.exports = async (req, res) => {
    setCorsHeaders(res);
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Optional direct proxy mode if BOT_URL is set (e.g. ngrok / cloudflare tunnel / VPS)
    if (BOT_URL) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const r = await fetch(`${BOT_URL.replace(/\/+$/, "")}/api/stats`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (r.ok) {
                const data = await r.json();
                return res.status(200).json({
                    ...data,
                    bot_connected: true,
                    proxy_mode: true
                });
            }
        } catch (e) {
            // Fall back to synced store below
        }
    }

    const data = await getStats();
    return res.status(200).json(data);
};
