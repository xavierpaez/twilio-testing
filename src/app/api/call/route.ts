import { NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_CALLER_ID } = process.env;

type JsonBody = Record<
  string,
  string | number | boolean | null | JsonBody[] | { [k: string]: any }
>;

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
    // If there's an Origin, it's a browser -> CORS applies.
    // If there's NO Origin (Postman/cURL/server), allow it.
    const origin = req.headers.get("origin"); // may be null for Postman
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

    // Attach CORS for browsers; Postman doesn't need it but it's harmless.
    const res = NextResponse.json({ ok: true, sid: call.sid });
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    if (isBrowser) res.headers.set("Vary", "Origin");
    return res;
  } catch (err) {
    return withCors({ error: "Internal Server Error" }, 500);
  }
}
