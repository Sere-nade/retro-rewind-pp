const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      ...init.headers,
    },
    ...init,
  });

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST,OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    const url = new URL(request.url);

    // Only allow your intended action
    const action = url.searchParams.get("action");
    if (action !== "submitPublic") {
      return json({ error: "Not found" }, { status: 404 });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    if (!env.GAS_URL) {
      return json({ error: "Missing GAS_URL secret" }, { status: 500 });
    }

    // Optional: simple shared secret so randoms can't spam your GAS
    // If you set WORKER_KEY, your frontend must send header: x-worker-key
    if (env.WORKER_KEY) {
      const key = request.headers.get("x-worker-key") || "";
      if (key !== env.WORKER_KEY) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Forward request body to Apps Script Web App
    const target = new URL(env.GAS_URL);
    target.searchParams.set("action", "submitPublic");

    const bodyText = await request.text();

    const gasRes = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: bodyText,
    });

    const gasText = await gasRes.text();

    // Pass-through: keep GAS status, return its body
    return new Response(gasText, {
      status: gasRes.status,
      headers: {
        "content-type": gasRes.headers.get("content-type") || "text/plain; charset=utf-8",
        "access-control-allow-origin": "*",
      },
    });
  },
};
