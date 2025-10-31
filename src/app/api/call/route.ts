import { NextResponse } from "next/server";
import twilio from "twilio";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_CALLER_ID } = process.env;

// ✅ Define a type for the response body instead of `any`
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type JsonBody = Record<string, JsonValue>;

// ✅ Helper for JSON + CORS
function corsResponse(body: JsonBody, status = 200): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "";
  if (origin.endsWith(".mskcc.org") || origin === "https://mskcc.org") {
    const res = new Response(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    res.headers.set("Access-Control-Max-Age", "86400");
    return res;
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin") || "";
    const allowed =
      origin.endsWith(".mskcc.org") || origin === "https://mskcc.org";

    if (!allowed) {
      return corsResponse({ error: "Forbidden" }, 403);
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_CALLER_ID) {
      return corsResponse({ error: "Missing Twilio env vars." }, 500);
    }

    const { phoneA, phoneB } = (await req.json()) as {
      phoneA: string;
      phoneB: string;
    };

    const e164 = /^\+\d{7,15}$/;
    if (!e164.test(phoneA) || !e164.test(phoneB)) {
      return corsResponse(
        { error: "Numbers must be in E.164 (e.g., +12125551234)." },
        400
      );
    }

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const twiml = `
      <Response>
        <Say voice="alice">Connecting you now. Please hold.</Say>
        <Dial callerId="${TWILIO_CALLER_ID}">${phoneB}</Dial>
      </Response>
    `.trim();

    const call = await client.calls.create({
      to: phoneA,
      from: TWILIO_CALLER_ID,
      twiml,
    });

    const res = NextResponse.json({ ok: true, sid: call.sid });
    res.headers.set("Access-Control-Allow-Origin", origin);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return corsResponse({ error: msg }, 500);
  }
}
