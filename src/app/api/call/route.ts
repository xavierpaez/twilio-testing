import { NextResponse } from "next/server";
import twilio from "twilio";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_CALLER_ID } = process.env;

export async function POST(req: Request) {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_CALLER_ID) {
      return NextResponse.json(
        { error: "Missing Twilio env vars." },
        { status: 500 }
      );
    }

    const { phoneA, phoneB } = await req.json();

    // Basic sanity checks (expects E.164)
    const e164 = /^\+\d{7,15}$/;
    if (!e164.test(phoneA) || !e164.test(phoneB)) {
      return NextResponse.json(
        { error: "Numbers must be in E.164 (e.g., +12125551234)." },
        { status: 400 }
      );
    }

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // We inline the TwiML so no webhook is required:
    // 1) Call Phone A from your Twilio number.
    // 2) When A answers, say a short line and dial Phone B to bridge.
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
      // Optional: get live status events to your server (must be public)
      // statusCallback: 'https://your-domain.com/api/call/status',
      // statusCallbackEvent: ['initiated','ringing','answered','completed'],
      // statusCallbackMethod: 'POST',
    });

    return NextResponse.json({ ok: true, sid: call.sid });
  } catch (err) {
    if (err instanceof Error) {
      console.error("Twilio API error:", err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    // fallback for unknown thrown values (shouldn't happen)
    console.error("Unknown error:", err);
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
