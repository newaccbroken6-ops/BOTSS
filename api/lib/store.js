// lib/store.js - Centralized Serverless Store & Relay for Vercel
// Supports:
// 1. In-memory global instance caching (zero configuration, works out of the box)
// 2. Upstash Redis / Vercel KV persistence (if UPSTASH_REDIS_REST_URL or KV_REST_API_URL are set)
// 3. Direct Proxy mode (if BOT_URL is set to a Cloudflare Tunnel / Ngrok / VPS URL)

if (!globalThis._botCache) {
    globalThis._botCache = {
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
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redisCommand(command, ...args) {
    if (!REDIS_URL || !REDIS_TOKEN) return null;
    try {
        const response = await fetch(`${REDIS_URL}/${command}/${args.map(encodeURIComponent).join("/")}`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
        });
        const data = await response.json();
        return data.result;
    } catch (e) {
        console.error("Redis command error:", e);
        return null;
    }
}

async function getStats() {
    let stats = globalThis._botCache.stats;
    if (REDIS_URL && REDIS_TOKEN) {
        const stored = await redisCommand("get", "ff_bot_stats");
        if (stored) {
            try {
                stats = JSON.parse(stored);
            } catch (e) {}
        }
    }

    const now = Math.floor(Date.now() / 1000);
    const lastSync = stats.last_sync_timestamp || 0;
    const isConnected = (now - lastSync) <= 15; // bot considered online if synced within 15s

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

    globalThis._botCache.stats = updatedStats;

    if (REDIS_URL && REDIS_TOKEN) {
        await redisCommand("set", "ff_bot_stats", JSON.stringify(updatedStats));
    }

    // Retrieve pending commands to return to bot
    let commands = [];
    if (REDIS_URL && REDIS_TOKEN) {
        const cmdStr = await redisCommand("get", "ff_bot_commands");
        if (cmdStr) {
            try {
                commands = JSON.parse(cmdStr);
            } catch (e) {}
            await redisCommand("del", "ff_bot_commands");
        }
    } else {
        commands = [...globalThis._botCache.pendingCommands];
        globalThis._botCache.pendingCommands = [];
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
        globalThis._botCache.pendingCommands.push(commandObj);
    }

    return commandObj;
}

// Set CORS headers helper
function setCorsHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bot-Token");
}

module.exports = {
    getStats,
    updateBotSync,
    queueCommand,
    setCorsHeaders,
    BOT_URL: process.env.BOT_URL || ""
};
