"use client";

import { useState } from "react";

export default function Home() {
  const [phoneA, setPhoneA] = useState("");
  const [phoneB, setPhoneB] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordVerified, setIsPasswordVerified] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneA, phoneB }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to start call");

      setMsg(
        "Call started! Phone A will ring first and then connect to Phone B."
      );
      setPhoneA("");
      setPhoneB("");
    } catch (err) {
      if (err instanceof Error) {
        setMsg(err.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Twilio Call Bridge POC
        </h1>
        {passwordVerified ? (
          <>
            <p className="text-sm text-gray-600 mb-6">
              Enter two numbers. We’ll call A, then bridge to B.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone A
                </label>
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+12025550123"
                  value={phoneA}
                  onChange={(e) => setPhoneA(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/80"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone B
                </label>
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+447700900123"
                  value={phoneB}
                  onChange={(e) => setPhoneB(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/80"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-black text-white font-medium py-2.5 disabled:opacity-60"
              >
                {loading ? "Starting…" : "Connect the Call"}
              </button>
            </form>

            {msg && (
              <div className="mt-4 text-sm text-gray-800 bg-gray-100 rounded-xl p-3">
                {msg}
              </div>
            )}
          </>
        ) : (
          <>
            <input
              value={password}
              type="password"
              placeholder="Enter password"
              className="border border-gray-300 rounded-md px-3 py-2 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-black/80"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                console.log("Verifying password:", password);
                if (password === "msk2025") {
                  setIsPasswordVerified(true);
                } else {
                  alert("Incorrect password. Please try again.");
                  setPassword("");
                }
              }}
              className="w-full rounded-xl bg-black text-white font-medium py-2.5 disabled:opacity-60"
            >
              Submit
            </button>
          </>
        )}
      </div>
    </main>
  );
}
