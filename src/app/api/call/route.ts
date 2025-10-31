import { NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_CALLER_ID } = process.env;

// ✅ Fully recursive JSON-safe type (no `any`)
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonBody = Record<string, JsonValue>;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // browsers: allow any origin
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

function withCors(body: JsonBody, status = 200) {
  const res = NextResponse.json(body, { status });
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    const isBrowser = !!origin;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_CALLER_ID) {
      return withCors({ error: "Missing Twilio env vars." }, 500);
    }

    const { phoneA, phoneB } = (await req.json()) as {
      phoneA: string;
      phoneB: string;
    };

    const e164 = /^\+\d{7,15}$/;
    if (!e164.test(phoneA) || !e164.test(phoneB)) {
      return withCors(
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
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    if (isBrowser) res.headers.set("Vary", "Origin");
    return res;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : JSON.stringify(err, null, 2);
    return withCors({ error: "Internal Server Error", detail: message }, 500);
  }
}
