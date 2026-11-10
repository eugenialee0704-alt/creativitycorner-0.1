import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const ALLOWED_ORIGIN = "https://eugenialee0704-alt.github.io";
const DIFY_CHAT_URL = "https://api.dify.ai/v1/chat-messages";
const DIFY_APP_CODE = "TqQd9UYVwS5yh1rN";
const DIFY_WEB_API = "https://udify.app/api";
const ADMIN_USERNAME = "CreativityCorner";
const SORT_BOXES: Record<string, string> = {
  "1": "Things we can do right now",
  "2": "Things we can do, but need help from others",
  "3": "Hard to do",
  "4": "Fun ideas but not really helpful",
};
const AUT_OBJECTS: Record<string, string> = {
  book: "Book",
  sticky: "Sticky Note",
  brick: "Brick",
  newspaper: "Newspaper",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function jsonResponse(status: number, payload: unknown, origin: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CC-Admin, apikey",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  if (origin === ALLOWED_ORIGIN || origin.startsWith("http://127.0.0.1") || origin.startsWith("http://localhost")) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function loadJson(text: unknown, fallback: unknown) {
  if (typeof text !== "string" || !text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function activityIds(values: unknown) {
  const found: number[] = [];
  if (!Array.isArray(values)) return found;
  for (const value of values) {
    const number = Number(value);
    if (Number.isInteger(number) && number >= 1 && number <= 5 && !found.includes(number)) found.push(number);
  }
  return found;
}

function cleanUsername(value: unknown) {
  const text = String(value ?? "").split(/\s+/).filter(Boolean).join(" ");
  if (text.length < 3 || text.length > 20) return "";
  return text;
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt?: string) {
  const usedSalt = salt ?? bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(usedSalt), iterations: 120000, hash: "SHA-256" },
    key,
    256,
  );
  return `${usedSalt}:${bytesToHex(new Uint8Array(bits))}`;
}

function passwordMatches(stored: string, passwordHash: string) {
  if (!stored || stored.length !== passwordHash.length) return false;
  let diff = 0;
  for (let i = 0; i < stored.length; i++) diff |= stored.charCodeAt(i) ^ passwordHash.charCodeAt(i);
  return diff === 0;
}

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function userPublic(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    username: row.username ?? "",
    age: row.age,
    email: row.email,
    language: row.language,
    fontSize: row.font_size,
    joinedDate: row.joined_date,
    completedActivities: loadJson(row.completed_activities, []),
    mustChangePassword: Boolean(row.must_change_password),
  };
}

async function usernameTaken(username: string, exceptId = "") {
  const { data } = await supabase.from("users").select("id,username").ilike("username", username);
  return (data ?? []).some((row) => row.id !== exceptId);
}

async function userByToken(token: string) {
  if (!token) return null;
  const { data: session } = await supabase.from("sessions").select("user_id,expires_at").eq("token", token).maybeSingle();
  if (!session || String(session.expires_at) <= nowIso()) return null;
  const { data: user } = await supabase.from("users").select("*").eq("id", session.user_id).maybeSingle();
  return user;
}

async function startSession(userId: string) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(18)));
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  await supabase.from("sessions").insert({ token, user_id: userId, expires_at: expires });
  return token;
}

async function drawingDataUrl(userId: string, metadata: Record<string, unknown>) {
  const downloaded = await supabase.storage.from("drawings").download(`${userId}.png`);
  if (downloaded.data) {
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `data:image/png;base64,${btoa(binary)}`;
  }
  const saved = metadata.animalDrawingDataUrl;
  return typeof saved === "string" && saved.startsWith("data:image") ? saved : "";
}

async function saveDrawing(userId: string, dataUrl: unknown) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image") || !dataUrl.includes(",")) return null;
  try {
    const binary = atob(dataUrl.split(",", 2)[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const saved = await supabase.storage.from("drawings").upload(`${userId}.png`, bytes, {
      upsert: true,
      contentType: "image/png",
    });
    if (saved.error) return null;
    return `data/drawings/${userId}.png`;
  } catch {
    return null;
  }
}

function submissionFromRow(row: Record<string, unknown>) {
  return {
    activityId: row.activity_id,
    responses: loadJson(row.responses_json, {}),
    completedActivities: loadJson(row.completed_activities, []),
    metadata: loadJson(row.metadata_json, {}),
    savedAt: row.saved_at,
  };
}

async function accountPayload(row: Record<string, unknown>, token = "") {
  const user = userPublic(row);
  const { data: consentRow } = await supabase.from("consents").select("consent_json").eq("user_id", user.id).maybeSingle();
  const { data: rows } = await supabase.from("submissions").select("*").eq("user_id", user.id).order("activity_id");
  const submissions = (rows ?? []).map((item) => submissionFromRow(item));
  const consent = consentRow ? loadJson(consentRow.consent_json, null) : null;
  const activities = [];
  const creativity: Record<string, unknown> = { pre: null, post: null };
  let drawing = "";
  let puzzleProgress = null;
  for (const item of submissions) {
    const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata as Record<string, unknown> : {};
    if (metadata.puzzleProgress != null) puzzleProgress = metadata.puzzleProgress;
    const activityId = Number(item.activityId);
    if (activityId === 1) drawing = await drawingDataUrl(String(user.id), metadata);
    if (activityId === 101 || activityId === 102) {
      creativity[activityId === 101 ? "pre" : "post"] = item.responses;
      continue;
    }
    if (activityId >= 1 && activityId <= 5) {
      activities.push({ id: activityId, savedAt: item.savedAt, responses: item.responses || {} });
    }
  }
  const payload: Record<string, unknown> = {
    user,
    consentSigned: Boolean(consent),
    drawingDataUrl: drawing,
    puzzleProgress,
    activities,
    creativityCheck: creativity,
    mustChangePassword: user.mustChangePassword,
  };
  if (token) payload.token = token;
  return payload;
}

async function signUp(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const age = String(body.age ?? "").trim();
  const username = cleanUsername(body.username);
  const password = String(body.password ?? "");
  if (!name || !email || !email.includes("@") || !age) return [400, { error: "missing-details" }] as const;
  if (!username) return [400, { error: "username-invalid" }] as const;
  if (password.length < 4) return [400, { error: "password-short" }] as const;
  if (await usernameTaken(username)) return [409, { error: "username-taken" }] as const;
  const { data: existing } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
  if (existing?.password_hash) return [409, { error: "email-taken" }] as const;
  const passwordHash = await hashPassword(password);
  const userId = existing?.id ?? crypto.randomUUID();
  const record = {
    id: userId,
    name,
    age,
    email,
    language: body.language ?? null,
    font_size: body.fontSize ?? null,
    username,
    password_hash: passwordHash,
    must_change_password: 0,
    updated_at: nowIso(),
    joined_date: existing?.joined_date ?? body.joinedDate ?? nowIso(),
    completed_activities: existing?.completed_activities ?? "[]",
  };
  const saved = existing
    ? await supabase.from("users").update(record).eq("id", userId).select("*").single()
    : await supabase.from("users").insert(record).select("*").single();
  if (!saved.data) return [500, { error: "save-failed" }] as const;
  const token = await startSession(String(saved.data.id));
  return [200, await accountPayload(saved.data, token)] as const;
}

async function signIn(body: Record<string, unknown>) {
  const username = cleanUsername(body.username);
  const password = String(body.password ?? "");
  if (!username || !password) return [401, { error: "sign-in-failed" }] as const;
  const { data: rows } = await supabase.from("users").select("*").ilike("username", username);
  const row = (rows ?? [])[0];
  if (!row?.password_hash) return [401, { error: "sign-in-failed" }] as const;
  const salt = String(row.password_hash).split(":", 1)[0];
  const candidate = await hashPassword(password, salt);
  if (!passwordMatches(String(row.password_hash), candidate)) return [401, { error: "sign-in-failed" }] as const;
  const token = await startSession(String(row.id));
  return [200, await accountPayload(row, token)] as const;
}

async function sendAccountEmail(recipient: string, username: string, temporary: string) {
  const host = Deno.env.get("MAIL_HOST") ?? "";
  const from = Deno.env.get("MAIL_FROM") ?? "";
  const usernameMail = Deno.env.get("MAIL_USERNAME") ?? "";
  const password = Deno.env.get("MAIL_PASSWORD") ?? "";
  const port = Number(Deno.env.get("MAIL_PORT") ?? "465");
  if (!host || !from || !usernameMail || !password) return false;
  const content = [
    "Creativity Corner",
    "",
    `Your username is: ${username}`,
    `Your temporary password is: ${temporary}`,
    "",
    "Sign in with these, then choose a new password. You can also choose a new username.",
    "",
    "創意角落",
    "",
    `你的用戶名是：${username}`,
    `你的臨時密碼是：${temporary}`,
    "",
    "請用以上資料登入，然後設定新密碼。你也可以更改用戶名。",
  ].join("\n");
  try {
    const client = new SMTPClient({
      connection: { hostname: host, port, tls: port === 465, auth: { username: usernameMail, password } },
    });
    await client.send({
      from,
      to: recipient,
      subject: "Creativity Corner account / 創意角落帳戶",
      content,
    });
    await client.close();
    return true;
  } catch {
    return false;
  }
}

async function spareUsername(name: string, email: string) {
  let stem = (name.match(/[A-Za-z0-9]/g) ?? []).join("").slice(0, 12);
  if (stem.length < 3) stem = (email.split("@")[0].match(/[A-Za-z0-9]/g) ?? []).join("").slice(0, 12);
  if (stem.length < 3) stem = "user";
  let candidate = stem;
  let number = 1;
  while (await usernameTaken(candidate)) {
    number += 1;
    candidate = `${stem.slice(0, 16)}${number}`.slice(0, 20);
  }
  return candidate;
}

async function forgotAccount(body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) return [400, { error: "missing-email" }] as const;
  const { data: row } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
  if (!row) return [200, { ok: true }] as const;
  const username = row.username || await spareUsername(String(row.name ?? ""), email);
  const temporary = temporaryPassword();
  if (!await sendAccountEmail(email, username, temporary)) return [503, { error: "email-failed" }] as const;
  await supabase.from("users").update({
    username,
    password_hash: await hashPassword(temporary),
    must_change_password: 1,
    updated_at: nowIso(),
  }).eq("id", row.id);
  return [200, { ok: true }] as const;
}

async function setPassword(body: Record<string, unknown>) {
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  const username = cleanUsername(body.username);
  if (password.length < 4) return [400, { error: "password-short" }] as const;
  if (!username) return [400, { error: "username-invalid" }] as const;
  const row = await userByToken(token);
  if (!row) return [401, { error: "sign-in-failed" }] as const;
  if (await usernameTaken(username, String(row.id))) return [409, { error: "username-taken" }] as const;
  const saved = await supabase.from("users").update({
    username,
    password_hash: await hashPassword(password),
    must_change_password: 0,
    updated_at: nowIso(),
  }).eq("id", row.id).select("*").single();
  if (!saved.data) return [500, { error: "save-failed" }] as const;
  return [200, await accountPayload(saved.data, token)] as const;
}

async function myAccount(body: Record<string, unknown>) {
  const token = String(body.token ?? "");
  if (token) {
    const row = await userByToken(token);
    if (!row) return [401, { error: "sign-in-failed" }] as const;
    return [200, await accountPayload(row, token)] as const;
  }
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!name || !email) return [400, { error: "Name and email are required" }] as const;
  const { data: row } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
  if (!row) return [404, { error: "No account found" }] as const;
  if (String(row.name ?? "").trim().toLowerCase() !== name.toLowerCase()) {
    return [401, { error: "Name and email do not match" }] as const;
  }
  return [200, await accountPayload(row)] as const;
}

async function upsertUser(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const age = String(body.age ?? "").trim();
  if (!name || !email) return [400, { error: "Name and email are required" }] as const;
  const { data: existing } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
  const userId = existing?.id ?? crypto.randomUUID();
  const record = {
    id: userId,
    name,
    age,
    email,
    language: body.language ?? existing?.language ?? null,
    font_size: body.fontSize ?? existing?.font_size ?? null,
    updated_at: nowIso(),
    joined_date: existing?.joined_date ?? body.joinedDate ?? nowIso(),
    completed_activities: existing?.completed_activities ?? "[]",
  };
  const saved = existing
    ? await supabase.from("users").update(record).eq("id", userId).select("id").single()
    : await supabase.from("users").insert(record).select("id").single();
  if (!saved.data) return [500, { error: "save-failed" }] as const;
  return [200, { userId: saved.data.id }] as const;
}

async function saveConsent(body: Record<string, unknown>) {
  const userId = body.userId;
  const consent = body.consentData;
  if (!userId || !consent || typeof consent !== "object") return [400, { error: "userId and consentData are required" }] as const;
  const { data: found } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
  if (!found) return [404, { error: "User not found" }] as const;
  await supabase.from("consents").upsert({
    user_id: userId,
    consent_json: JSON.stringify(consent),
    saved_at: nowIso(),
  });
  return [200, { ok: true }] as const;
}

async function saveSubmission(body: Record<string, unknown>) {
  const userId = String(body.userId ?? "");
  const activityId = Number(body.activityId);
  const responses = body.responses;
  if (!userId || !responses || typeof responses !== "object") return [400, { error: "userId and responses are required" }] as const;
  if (![1, 2, 3, 4, 5, 101, 102].includes(activityId)) return [400, { error: "Unknown activity" }] as const;
  const { data: found } = await supabase.from("users").select("completed_activities").eq("id", userId).maybeSingle();
  if (!found) return [404, { error: "User not found" }] as const;
  const metadata = body.metadata && typeof body.metadata === "object" ? { ...body.metadata as Record<string, unknown> } : {};
  const drawingFile = await saveDrawing(userId, metadata.animalDrawingDataUrl);
  if (drawingFile) metadata.drawingFile = drawingFile;
  const completed = activityIds(body.completedActivities);
  const merged = activityIds([...(loadJson(found.completed_activities, []) as unknown[]), ...completed]);
  await supabase.from("users").update({ completed_activities: JSON.stringify(merged), updated_at: nowIso() }).eq("id", userId);
  await supabase.from("submissions").upsert({
    user_id: userId,
    activity_id: activityId,
    responses_json: JSON.stringify(responses),
    completed_activities: JSON.stringify(completed),
    metadata_json: JSON.stringify(metadata),
    saved_at: nowIso(),
  });
  return [200, { ok: true }] as const;
}

async function chatbotAnswer(payload: Record<string, unknown>) {
  const data = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};
  return String(payload.answer || data.answer || "");
}

async function rateWithPublicApp(query: string, user: string) {
  const passportResponse = await fetch(`${DIFY_WEB_API}/passport`, { headers: { "X-App-Code": DIFY_APP_CODE } });
  const passport = await passportResponse.json();
  const token = String(passport.access_token ?? "");
  if (!token) return "";
  const response = await fetch(`${DIFY_WEB_API}/chat-messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Passport": token,
      "X-App-Code": DIFY_APP_CODE,
    },
    body: JSON.stringify({ inputs: {}, query, response_mode: "blocking", user, conversation_id: "" }),
  });
  return chatbotAnswer(await response.json());
}

async function rateWithChatbot(body: Record<string, unknown>) {
  const query = String(body.query ?? "").trim();
  const user = String(body.user ?? "participant").slice(0, 80);
  if (!query) return [400, { error: "query is required" }] as const;
  const key = Deno.env.get("DIFY_API_KEY") ?? "";
  if (key.startsWith("app-")) {
    try {
      const response = await fetch(DIFY_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ inputs: {}, query, response_mode: "blocking", user, conversation_id: "" }),
      });
      if (response.ok) {
        const answer = await chatbotAnswer(await response.json());
        if (answer) return [200, { answer }] as const;
      }
    } catch {
      // The public app is the backup scorer.
    }
  }
  try {
    const answer = await rateWithPublicApp(query, user);
    if (answer) return [200, { answer }] as const;
  } catch {
    return [502, { error: "The creativity chatbot could not score this answer" }] as const;
  }
  return [502, { error: "The creativity chatbot could not score this answer" }] as const;
}

function sortedTexts(raw: unknown) {
  const parsed = typeof raw === "string" ? loadJson(raw, null) : raw;
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => typeof item === "object" && item ? String((item as Record<string, unknown>).text ?? "").trim() : String(item).trim()).filter(Boolean);
}

function autAnalysis(result: Record<string, unknown>) {
  const objects = Array.isArray(result.objects) ? result.objects : [];
  return objects.map((obj) => {
    const objectResult = obj && typeof obj === "object" ? obj as Record<string, unknown> : {};
    const items = Array.isArray(objectResult.items) ? objectResult.items : [];
    return {
      object: objectResult.en || "",
      fluency: objectResult.fluency,
      flexibility: objectResult.flexibility,
      total: objectResult.total,
      items: items.map((item) => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return { answer: row.answer || "", record: row.status || "", category: row.categoryEn || "" };
      }),
    };
  });
}

function autScore(result: Record<string, unknown>, savedAt: unknown) {
  return {
    fluency: result.fluency,
    flexibility: result.flexibility,
    totalCreativityScore: result.total,
    analysis: autAnalysis(result),
    savedAt,
  };
}

function autRecord(submission: ReturnType<typeof submissionFromRow> | undefined) {
  if (!submission) return null;
  const payload = submission.responses && typeof submission.responses === "object" ? submission.responses as Record<string, unknown> : {};
  const result = payload.result && typeof payload.result === "object" ? payload.result as Record<string, unknown> : {};
  const answers = payload.answers && typeof payload.answers === "object" ? payload.answers as Record<string, unknown> : {};
  const named: Record<string, unknown> = {};
  for (const [objectId, lines] of Object.entries(answers)) named[AUT_OBJECTS[objectId] ?? objectId] = Array.isArray(lines) ? lines : [];
  const record: Record<string, unknown> = autScore(result, payload.savedAt || submission.savedAt);
  record.answers = named;
  const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];
  if (attempts.length) {
    record.attempts = attempts.map((attempt) => {
      const row = attempt && typeof attempt === "object" ? attempt as Record<string, unknown> : {};
      const attemptResult = row.result && typeof row.result === "object" ? row.result as Record<string, unknown> : {};
      return autScore(attemptResult, row.savedAt);
    });
  }
  return record;
}

async function userDetails(userId: string) {
  const { data: row } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (!row) return [404, { error: "User not found" }] as const;
  const { data: consentRow } = await supabase.from("consents").select("consent_json").eq("user_id", userId).maybeSingle();
  const { data: rows } = await supabase.from("submissions").select("*").eq("user_id", userId).order("activity_id");
  const submissions = (rows ?? []).map((item) => submissionFromRow(item));
  let drawing = "";
  for (const item of submissions) {
    if (Number(item.activityId) === 1) drawing = await drawingDataUrl(userId, (item.metadata ?? {}) as Record<string, unknown>);
  }
  return [200, {
    user: userPublic(row),
    consent: consentRow ? loadJson(consentRow.consent_json, null) : null,
    submissions,
    drawingDataUrl: drawing,
  }] as const;
}

function scoreChange(post: unknown, pre: unknown) {
  if (typeof post !== "number" || typeof pre !== "number") return null;
  return post - pre;
}

async function adminOk(request: Request) {
  const header = request.headers.get("X-CC-Admin") || request.headers.get("Authorization") || "";
  const token = header.startsWith("Basic ") ? header.slice(6).trim() : header.trim();
  if (!token) return false;
  try {
    const decoded = atob(token);
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return username === ADMIN_USERNAME && password === (Deno.env.get("ADMIN_PASSWORD") ?? "");
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") ?? "";
  if (request.method === "OPTIONS") {
    const headers: Record<string, string> = {
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CC-Admin, apikey",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    };
    if (origin === ALLOWED_ORIGIN || origin.startsWith("http://127.0.0.1") || origin.startsWith("http://localhost")) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Vary"] = "Origin";
    }
    return new Response(null, { status: 204, headers });
  }
  const url = new URL(request.url);
  let path = url.pathname;
  const marker = path.indexOf("/creativity-api");
  if (marker >= 0) path = path.slice(marker + "/creativity-api".length);
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/$/, "") || "/";
  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return jsonResponse(400, { error: "Invalid JSON" }, origin);
      body = parsed as Record<string, unknown>;
    } catch {
      return jsonResponse(400, { error: "Invalid JSON" }, origin);
    }
  }
  const routes: Record<string, () => Promise<readonly [number, unknown]>> = {
    "POST /api/public/sign-up": () => signUp(body),
    "POST /api/public/sign-in": () => signIn(body),
    "POST /api/public/forgot-account": () => forgotAccount(body),
    "POST /api/public/set-password": () => setPassword(body),
    "POST /api/public/my-account": () => myAccount(body),
    "POST /api/public/upsert-user": () => upsertUser(body),
    "POST /api/public/consent": () => saveConsent(body),
    "POST /api/public/aut-rate": () => rateWithChatbot(body),
    "POST /api/public/activity-submission": () => saveSubmission(body),
  };
  const route = routes[`${request.method} ${path}`];
  if (route) {
    const [status, payload] = await route();
    return jsonResponse(status, payload, origin);
  }
  if (path.startsWith("/api/admin/")) {
    if (!await adminOk(request)) return jsonResponse(401, { error: "Invalid username or password" }, origin);
    if (request.method === "GET" && path === "/api/admin/users") {
      const { data } = await supabase.from("users").select("*").order("joined_date");
      return jsonResponse(200, { users: (data ?? []).map((row) => userPublic(row)) }, origin);
    }
    if (request.method === "POST" && path === "/api/admin/delete-user") {
      const userId = String(body.userId ?? "").trim();
      if (!userId) return jsonResponse(400, { error: "missing-user" }, origin);
      const { data: existing } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
      if (!existing) return jsonResponse(404, { error: "User not found" }, origin);
      await supabase.from("submissions").delete().eq("user_id", userId);
      await supabase.from("consents").delete().eq("user_id", userId);
      await supabase.from("sessions").delete().eq("user_id", userId);
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) return jsonResponse(500, { error: "delete-failed" }, origin);
      await supabase.storage.from("drawings").remove([`${userId}.png`]);
      return jsonResponse(200, { deleted: true }, origin);
    }
    if (request.method === "POST" && path === "/api/admin/clear-users") {
      await supabase.from("submissions").delete().neq("user_id", "");
      await supabase.from("consents").delete().neq("user_id", "");
      await supabase.from("sessions").delete().neq("token", "");
      await supabase.from("users").delete().neq("id", "");
      const listed = await supabase.storage.from("drawings").list();
      const names = (listed.data ?? []).map((item) => item.name).filter((name) => name.endsWith(".png"));
      if (names.length) await supabase.storage.from("drawings").remove(names);
      return jsonResponse(200, { cleared: true }, origin);
    }
    if (request.method === "GET" && path.startsWith("/api/admin/users/")) {
      const [status, payload] = await userDetails(decodeURIComponent(path.slice("/api/admin/users/".length)));
      return jsonResponse(status, payload, origin);
    }
  }
  if (path === "/api/admin/export") {
    if (!await adminOk(request)) return jsonResponse(401, { error: "Invalid username or password" }, origin);
    const { data: users } = await supabase.from("users").select("*").order("joined_date");
    const participants = [];
    for (const row of users ?? []) {
      const { data: consentRow } = await supabase.from("consents").select("consent_json").eq("user_id", row.id).maybeSingle();
      const { data: submissionRows } = await supabase.from("submissions").select("*").eq("user_id", row.id).order("activity_id");
      const submissions = (submissionRows ?? []).map((item) => submissionFromRow(item));
      const byActivity = new Map(submissions.map((item) => [Number(item.activityId), item]));
      const responseOf = (id: number) => {
        const item = byActivity.get(id);
        return item?.responses && typeof item.responses === "object" ? item.responses as Record<string, unknown> : {};
      };
      const pre = autRecord(byActivity.get(101));
      const post = autRecord(byActivity.get(102));
      const brainstorm = responseOf(5);
      participants.push({
        name: row.name,
        age: row.age,
        email: row.email,
        language: row.language,
        joinedDate: row.joined_date,
        consent: consentRow ? {
          participantName: (loadJson(consentRow.consent_json, {}) as Record<string, unknown>).participantName,
          signingDate: (loadJson(consentRow.consent_json, {}) as Record<string, unknown>).participantDate,
          signedAt: (loadJson(consentRow.consent_json, {}) as Record<string, unknown>).signedDate,
        } : null,
        animalActivity: {
          nameOfNewAnimal: responseOf(1).animalName ?? "",
          descriptionOfNewAnimal: responseOf(1).animalDescription ?? "",
          drawingFile: ((byActivity.get(1)?.metadata ?? {}) as Record<string, unknown>).drawingFile ?? null,
        },
        whatIfChallenge: Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`result${n}`, responseOf(2)[`Result${n}`] ?? ""])),
        wordAssociation: {
          word1: responseOf(3).word1 ?? "",
          word2: responseOf(3).word2 ?? "",
          word3: responseOf(3).word3 ?? "",
          word4: responseOf(3).word4 ?? "",
          word5: responseOf(3).word5 ?? "",
          story: responseOf(3).wordStory ?? "",
        },
        penguinInTheDesert: Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`idea${n}`, responseOf(4)[`idea${n}`] ?? ""])),
        brainstorming: {
          solution1: brainstorm.solution1 ?? "",
          solution2: brainstorm.solution2 ?? "",
          solution3: brainstorm.solution3 ?? "",
          solution4: brainstorm.solution4 ?? "",
          sortedBoxes: Object.fromEntries(Object.entries(SORT_BOXES).map(([key, label]) => [label, sortedTexts(brainstorm[`category${key}`])])),
        },
        creativityAssessment: {
          pretest: pre,
          posttest: post,
          improvement: pre && post ? {
            fluencyChange: scoreChange(post.fluency, pre.fluency),
            flexibilityChange: scoreChange(post.flexibility, pre.flexibility),
            totalScoreChange: scoreChange(post.totalCreativityScore, pre.totalCreativityScore),
          } : null,
        },
      });
    }
    return jsonResponse(200, { savedAt: nowIso(), participants }, origin);
  }
  return jsonResponse(404, { error: "Not found" }, origin);
});
