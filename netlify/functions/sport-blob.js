import { getStore } from "@netlify/blobs";

const NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, max-age=0",
};

function jsonResponse(data, status = 200) {
    return Response.json(data, { status, headers: NO_CACHE_HEADERS });
}

async function readJSON(store, key, fallback) {
    try {
        const raw = await store.get(key);
        if (raw == null || raw === "") return fallback;
        if (typeof raw !== "string") return raw ?? fallback;
        // 旧错误数据：曾把对象直接 set 成 "[object Object]"
        if (raw === "[object Object]") {
            await store.setJSON(key, fallback);
            return fallback;
        }
        return JSON.parse(raw);
    } catch (err) {
        console.error("readJSON", key, err);
        return fallback;
    }
}

export default async (req, context) => {
    try {
        const store = getStore("sportData");
        const url = new URL(req.url, "https://enjoysportdaily.netlify.app");
        let body = {};
        if (req.method !== "GET" && req.method !== "HEAD") {
            try {
                body = await req.json();
            } catch {
                body = {};
            }
        }

        const mode = url.searchParams.get("mode") || body.mode || "record";
        const user = url.searchParams.get("user") || body.user || "";
        const pid = url.searchParams.get("pid") || body.pid || "";

        // 1. 用户注册库
        if (mode === "getUser" || mode === "saveUser") {
            if (req.method === "GET") {
                const userMap = await readJSON(store, "userMap", {});
                return jsonResponse({ userMap });
            }
            if (req.method === "POST") {
                const userMap = body.userMap || {};
                await store.setJSON("userMap", userMap);
                return jsonResponse({ success: true });
            }
        }

        // 2. 人员管理
        if (mode === "person") {
            if (req.method === "GET") {
                const allPersons = await readJSON(store, "allPersons", []);
                const bindPids = user
                    ? await readJSON(store, `bind_${user}`, [])
                    : [];
                return jsonResponse({ allPersons, bindPids });
            }
            if (req.method === "POST") {
                const { allPersons, bindPids } = body;
                await store.setJSON("allPersons", allPersons || []);
                if (user) {
                    await store.setJSON(`bind_${user}`, bindPids || []);
                }
                return jsonResponse({ success: true });
            }
        }

        // 删除人员
        if (mode === "delPerson") {
            const { delPid, allPersons } = body;
            await store.setJSON("allPersons", allPersons || []);
            if (delPid) {
                try {
                    await store.delete(`rec_${delPid}`);
                } catch (_) {}
                if (user) {
                    const bindKey = `bind_${user}`;
                    const bindPids = await readJSON(store, bindKey, []);
                    await store.setJSON(
                        bindKey,
                        bindPids.filter((id) => id !== delPid)
                    );
                }
            }
            return jsonResponse({ success: true });
        }

        // 2.5 运动类型（按账号）
        if (mode === "sportTypes") {
            if (!user) {
                return jsonResponse({ success: false, error: "缺少用户" }, 400);
            }
            const typesKey = `sportTypes_${user}`;
            if (req.method === "GET") {
                const types = await readJSON(store, typesKey, []);
                return jsonResponse({ types: Array.isArray(types) ? types : [] });
            }
            if (req.method === "POST") {
                const types = Array.isArray(body.types) ? body.types : [];
                await store.setJSON(typesKey, types);
                return jsonResponse({ success: true });
            }
        }

        // 3. 运动记录
        const recKey = `rec_${pid}`;
        if (req.method === "GET") {
            const data = await readJSON(store, recKey, []);
            return jsonResponse({ data });
        }
        if (req.method === "POST") {
            await store.setJSON(recKey, body.list || []);
            return jsonResponse({ success: true });
        }

        return new Response("Method Not Allowed", {
            status: 405,
            headers: NO_CACHE_HEADERS,
        });
    } catch (err) {
        console.error(err);
        return jsonResponse(
            { success: false, error: err.message || String(err) },
            500
        );
    }
};
