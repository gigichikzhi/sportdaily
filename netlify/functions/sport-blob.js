import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const blobStore = getStore({ name: "sport-data" });
  const { method } = req;

  // GET 读取云端数据
  if (method === "GET") {
    let data = await blobStore.get("kidSportData");
    return new Response(JSON.stringify({ data: data ? JSON.parse(data) : [] }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // POST 写入云端数据
  if (method === "POST") {
    const body = await req.json();
    await blobStore.set("kidSportData", JSON.stringify(body.list));
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = {
  path: "/api/sport"
};