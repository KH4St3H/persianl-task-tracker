import { cookies } from "next/headers";

export const SESSION_COOKIE = "ptt_session";
const SESSION_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

async function hmac(data: string, key: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return Buffer.from(sig).toString("base64url");
}

export async function createSessionToken() {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const payload = `v1.${exp}`;
  return `${payload}.${await hmac(payload, secret())}`;
}

export async function verifySessionToken(token: string | undefined, key = process.env.SESSION_SECRET) {
  if (!token || !key) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [v, exp, sig] = parts;
  if (v !== "v1" || Number(exp) < Date.now()) return false;
  const expected = await hmac(`${v}.${exp}`, key);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export async function setSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function passwordMatches(input: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  if (expected.length !== input.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ input.charCodeAt(i);
  return diff === 0;
}
