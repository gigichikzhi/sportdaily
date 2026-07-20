import { getStore } from "@netlify/blobs";

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
                return Response.json({ userMap });
            }
            if (req.method === "POST") {
                const userMap = body.userMap || {};
                await store.setJSON("userMap", userMap);
                return Response.json({ success: true });
            }
        }

        // 2. 人员管理
        if (mode === "person") {
            if (req.method === "GET") {
                const allPersons = await readJSON(store, "allPersons", []);
                const bindPids = user
                    ? await readJSON(store, `bind_${user}`, [])
                    : [];
                return Response.json({ allPersons, bindPids });
            }
            if (req.method === "POST") {
                const { allPersons, bindPids } = body;
                await store.setJSON("allPersons", allPersons || []);
                if (user) {
                    await store.setJSON(`bind_${user}`, bindPids || []);
                }
                return Response.json({ success: true });
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
            return Response.json({ success: true });
        }

        // 3. 运动记录
        const recKey = `rec_${pid}`;
        if (req.method === "GET") {
            const data = await readJSON(store, recKey, []);
            return Response.json({ data });
        }
        if (req.method === "POST") {
            await store.setJSON(recKey, body.list || []);
            return Response.json({ success: true });
        }

        return new Response("Method Not Allowed", { status: 405 });
    } catch (err) {
        console.error(err);
        return Response.json(
            { success: false, error: err.message || String(err) },
            { status: 500 }
        );
    }
};
