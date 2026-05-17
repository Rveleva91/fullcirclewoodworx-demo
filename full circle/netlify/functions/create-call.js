// netlify/functions/create-call.js
//
// Mints a short-lived Retell access_token server-side so the browser
// never sees your secret Retell API key.
//
// Required Netlify env vars (Site configuration -> Environment variables):
//   RETELL_API_KEY   (your SECRET key from https://dashboard.retellai.com/apiKeys, starts with "key_")
//   RETELL_AGENT_ID  (e.g. agent_e09c2b7a00b74ada285de1a858)
//
// Endpoint: POST /.netlify/functions/create-call
// Returns:  { access_token, call_id }

exports.handler = async function (event) {
  // Allow simple CORS for your own site (Netlify serves same-origin so this is belt-and-suspenders)
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
  }

  const apiKey  = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;

  if (!apiKey || !agentId) {
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server is missing RETELL_API_KEY or RETELL_AGENT_ID env vars"
      })
    };
  }

  try {
    const resp = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ agent_id: agentId })
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("Retell create-web-call failed:", resp.status, text);
      return {
        statusCode: resp.status,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Retell API error", details: text })
      };
    }

    const data = JSON.parse(text);
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: data.access_token,
        call_id: data.call_id
      })
    };
  } catch (err) {
    console.error("create-call function error:", err);
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(err) })
    };
  }
};
