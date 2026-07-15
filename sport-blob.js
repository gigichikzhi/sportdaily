import { getStore } from "@netlify/blobs";
export default async function handler(req, ctx) {
    const store = getStore("sportData");
    const q = new URLSearchParams(req.url.slice(1));
    const mode = q.get("mode") || "record";
    const user = q.get("user") || req.body?.user || "";
    const pid = q.get("pid") || req.body?.pid || "";

    // 1. 用户注册库管理
    if(mode === "getUser"){
        if(req.method === "GET"){
            const userMap = await store.get("userMap",{type:"json"}) || {};
            return new Response(JSON.stringify({userMap}),{headers:{"Content-Type":"application/json"}});
        }
        if(req.method === "POST"){
            const {userMap} = req.body;
            await store.set("userMap", userMap, {type:"json"});
            return new Response(JSON.stringify({success:true}),{headers:{"Content-Type":"application/json"}});
        }
    }

    // 2. 人员管理接口（全局人员、账号绑定列表）
    if(mode === "person"){
        if(req.method === "GET"){
            const allPersons = await store.get("allPersons",{type:"json"}) || [];
            const bindKey = `bind_${user}`;
            const bindPids = await store.get(bindKey,{type:"json"}) || [];
            return new Response(JSON.stringify({allPersons, bindPids}),{headers:{"Content-Type":"application/json"}});
        }
        if(req.method === "POST"){
            const {allPersons, bindPids} = req.body;
            await store.set("allPersons", allPersons, {type:"json"});
            await store.set(`bind_${user}`, bindPids, {type:"json"});
            return new Response(JSON.stringify({success:true}),{headers:{"Content-Type":"application/json"}});
        }
    }
    // 删除人员：清除人员记录+更新全局人员库
    if(mode === "delPerson"){
        const {delPid, allPersons} = req.body;
        await store.set("allPersons", allPersons, {type:"json"});
        await store.delete(`rec_${delPid}`);
        return new Response(JSON.stringify({success:true}),{headers:{"Content-Type":"application/json"}});
    }
    // 3. 运动记录：按人员PID隔离存储
    const recKey = `rec_${pid}`;
    if(req.method === "GET"){
        const data = await store.get(recKey,{type:"json"}) || [];
        return new Response(JSON.stringify({data}),{headers:{"Content-Type":"application/json"}});
    }
    if(req.method === "POST"){
        const {list} = req.body;
        await store.set(recKey, list, {type:"json"});
        return new Response(JSON.stringify({success:true}),{headers:{"Content-Type":"application/json"}});
    }
    return new Response("Method Not Allowed",{status:405});
}