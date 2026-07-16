import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    try {
        const store = getStore("sportData");
        const url = new URL(req.url);
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

        // 1. 用户注册库管理
        if (mode === "getUser" || mode === "saveUser") {
            if (req.method === "GET") {
                const userMap = (await store.get("userMap", { type: "json" })) || {};
                return Response.json({ userMap });
            }
            if (req.method === "POST") {
                const userMap = body.userMap || {};
                await store.set("userMap", userMap, { type: "json" });
                return Response.json({ success: true });
            }
        }

        // 2. 人员管理接口
        if (mode === "person") {
            if (req.method === "GET") {
                const allPersons = (await store.get("allPersons", { type: "json" })) || [];
                const bindKey = `bind_${user}`;
                const bindPids = (await store.get(bindKey, { type: "json" })) || [];
                return Response.json({ allPersons, bindPids });
            }
            if (req.method === "POST") {
                const { allPersons, bindPids } = body;
                await store.set("allPersons", allPersons || [], { type: "json" });
                if (user) {
                    await store.set(`bind_${user}`, bindPids || [], { type: "json" });
                }
                return Response.json({ success: true });
            }
        }

        // 删除人员
        if (mode === "delPerson") {
            const { delPid, allPersons } = body;
            await store.set("allPersons", allPersons || [], { type: "json" });
            if (delPid) {
                try {
                    await store.delete(`rec_${delPid}`);
                } catch (_) {}
                if (user) {
                    const bindKey = `bind_${user}`;
                    const bindPids = (await store.get(bindKey, { type: "json" })) || [];
                    await store.set(
                        bindKey,
                        bindPids.filter((id) => id !== delPid),
                        { type: "json" }
                    );
                }
            }
            return Response.json({ success: true });
        }

        // 3. 运动记录：按人员 PID 隔离
        const recKey = `rec_${pid}`;
        if (req.method === "GET") {
            const data = (await store.get(recKey, { type: "json" })) || [];
            return Response.json({ data });
        }
        if (req.method === "POST") {
            const list = body.list || [];
            await store.set(recKey, list, { type: "json" });
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
