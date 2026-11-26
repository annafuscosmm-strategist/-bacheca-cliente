export default async (req) => {
  const headers = { "content-type": "application/json" };
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method" }), { status: 200, headers });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: "no_key" }), { status: 200, headers });
  let body = {};
  try { body = await req.json(); } catch (e) {}
  const prompt = String(body.prompt || "").slice(0, 8000);
  const model = process.env.AI_MODEL || "claude-haiku-5-5";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 400, messages: [{ role: "user", content: prompt }] })
    });
    const j = await r.json();
    if (j.error) return new Response(JSON.stringify({ error: "api", detail: (j.error && j.error.message) || "" }), { status: 200, headers });
    const text = (j.content && j.content[0] && j.content[0].text) || "";
    return new Response(JSON.stringify({ text }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: "fetch" }), { status: 200, headers });
  }
};
