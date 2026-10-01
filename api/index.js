// api/index.js - Unified Serverless API Router for Vercel
// Consolidates all routes into a single lambda instance so memory and state are 100% shared

let _botCache = {
    stats: {
        total_accounts: 0,
        total_matches: 0,
        total_matches_started: 0,
        total_active_matches: 0,
        total_gained_exp: 0,
        exp_per_hour: 0,
        accounts: [],
        logs: [],
        uptime: 0,
        last_sync_timestamp: 0,
        bot_connected: false
    },
    pendingCommands: []
};

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const BOT_URL = process.env.BOT_URL || "";
const BOT_SECRET = process.env.BOT_SECRET || "";

async function redisCommand(command, ...args) {
    if (!REDIS_URL || !REDIS_TOKEN) return null;
    try {
        const response = await fetch(`${REDIS_URL}/${command}/${args.map(encodeURIComponent).join("/")}`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
        });
        const data = await response.json();
        return data.result;
    } catch (e) {
        return null;
    }
}

async function getStats() {
    let stats = _botCache.stats;
    if (REDIS_URL && REDIS_TOKEN) {
        const stored = await redisCommand("get", "ff_bot_stats");
        if (stored) {
            try { stats = JSON.parse(stored); } catch (e) {}
        }
    }
    const now = Math.floor(Date.now() / 1000);
    const lastSync = stats.last_sync_timestamp || 0;
    const isConnected = (now - lastSync) <= 20;

    return {
        ...stats,
        bot_connected: isConnected,
        seconds_since_last_sync: now - lastSync
    };
}

async function updateBotSync(data) {
    const now = Math.floor(Date.now() / 1000);
    const updatedStats = {
        total_accounts: data.total_accounts ?? (data.accounts ? data.accounts.length : 0),
        total_matches: data.total_matches ?? 0,
        total_matches_started: data.total_matches_started ?? 0,
        total_active_matches: data.total_active_matches ?? 0,
        total_gained_exp: data.total_gained_exp ?? 0,
        exp_per_hour: data.exp_per_hour ?? 0,
        accounts: Array.isArray(data.accounts) ? data.accounts : [],
        logs: Array.isArray(data.logs) ? data.logs : [],
        uptime: data.uptime ?? 0,
        last_sync_timestamp: now,
        bot_connected: true
    };

    _botCache.stats = updatedStats;

    if (REDIS_URL && REDIS_TOKEN) {
        await redisCommand("set", "ff_bot_stats", JSON.stringify(updatedStats));
    }

    let commands = [];
    if (REDIS_URL && REDIS_TOKEN) {
        const cmdStr = await redisCommand("get", "ff_bot_commands");
        if (cmdStr) {
            try { commands = JSON.parse(cmdStr); } catch (e) {}
            await redisCommand("del", "ff_bot_commands");
        }
    } else {
        commands = [..._botCache.pendingCommands];
        _botCache.pendingCommands = [];
    }

    return { stats: updatedStats, commands };
}

async function queueCommand(action, payload = {}) {
    const commandObj = {
        id: "cmd_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        action,
        payload,
        created_at: Math.floor(Date.now() / 1000)
    };

    if (REDIS_URL && REDIS_TOKEN) {
        let existing = [];
        const cmdStr = await redisCommand("get", "ff_bot_commands");
        if (cmdStr) {
            try { existing = JSON.parse(cmdStr); } catch (e) {}
        }
        existing.push(commandObj);
        await redisCommand("set", "ff_bot_commands", JSON.stringify(existing));
    } else {
        _botCache.pendingCommands.push(commandObj);
    }

    return commandObj;
}

function setCors(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bot-Token");
}

module.exports = async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(200).end();

    const url = req.url.split("?")[0].replace(/\/+$/, "");

    // 1. STATS
    if (url === "/api/stats") {
        if (BOT_URL) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const r = await fetch(`${BOT_URL.replace(/\/+$/, "")}/api/stats`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (r.ok) {
                    const data = await r.json();
                    return res.status(200).json({ ...data, bot_connected: true, proxy_mode: true });
                }
            } catch (e) {}
        }
        const data = await getStats();
        return res.status(200).json(data);
    }

    // 2. BOT SYNC
    if (url === "/api/bot/sync") {
        if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Use POST" });

        if (BOT_SECRET) {
            const token = req.headers["x-bot-token"] || req.headers["authorization"] || "";
            if (!token.includes(BOT_SECRET)) {
                return res.status(401).json({ status: "error", error: "Unauthorized: Invalid bot secret" });
            }
        }

        let body = req.body;
        if (typeof body === "string") {
            try { body = JSON.parse(body); } catch (e) {}
        }
        if (!body || typeof body !== "object") {
            return res.status(400).json({ status: "error", error: "Invalid JSON" });
        }

        const { stats, commands } = await updateBotSync(body);
        return res.status(200).json({
            status: "ok",
            timestamp: Math.floor(Date.now() / 1000),
            commands_count: commands.length,
            commands
        });
    }

    // 3. ACCOUNT ACTIONS
    let body = req.body;
    if (typeof body === "string") {
        try { body = JSON.parse(body); } catch (e) {}
    }

    if (url === "/api/account/add") {
        if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Use POST" });
        const cmd = await queueCommand("add_account", body || {});
        return res.status(200).json({ status: "ok", message: "Account queued for bot", command_id: cmd.id });
    }

    if (url === "/api/account/delete") {
        if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Use POST" });
        const cmd = await queueCommand("delete_account", body || {});
        return res.status(200).json({ status: "ok", message: "Delete queued for bot", command_id: cmd.id });
    }

    if (url === "/api/account/pause") {
        if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Use POST" });
        const uid = body ? body.uid : null;
        if (!uid) return res.status(400).json({ status: "error", error: "UID required" });
        const cmd = await queueCommand("pause_account", { uid });
        return res.status(200).json({ status: "ok", message: "Pause toggled", command_id: cmd.id });
    }

    if (url === "/api/account/pause_all") {
        if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Use POST" });
        const cmd = await queueCommand("pause_all", {});
        return res.status(200).json({ status: "ok", message: "Pause all queued", command_id: cmd.id });
    }

    if (url === "/api/account/refresh") {
        if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Use POST" });
        const uid = body ? body.uid : null;
        const cmd = await queueCommand("refresh_account", { uid });
        return res.status(200).json({ status: "ok", command_id: cmd.id });
    }

    if (url === "/api/account/restart") {
        if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Use POST" });
        const uid = body ? body.uid : null;
        const cmd = await queueCommand("restart_account", { uid });
        return res.status(200).json({ status: "ok", command_id: cmd.id });
    }

    if (url === "/api/logs/clear") {
        if (req.method !== "POST") return res.status(405).json({ status: "error", error: "Use POST" });
        _botCache.stats.logs = [];
        const cmd = await queueCommand("clear_logs", {});
        return res.status(200).json({ status: "ok", command_id: cmd.id });
    }

    return res.status(404).json({ status: "error", error: "Endpoint not found: " + url });
};
