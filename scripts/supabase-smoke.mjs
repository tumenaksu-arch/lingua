/**
 * Love-Vox self-hosted Supabase smoke test (NOT part of jest).
 *
 * Runs against the local prototype only (never production):
 *   SUPA_URL=http://127.0.0.1:35143 SUPA_ANON=<anon key> node scripts/supabase-smoke.mjs
 *
 * Covers: sign-up, one upsert per table with the exact repo row shapes (onConflict
 * targets), read-back, RLS isolation (user B cannot read user A's rows), and the
 * e-mail OTP login flow through the prototype's mail catcher (port 35144).
 */
import { createClient } from '@supabase/supabase-js';

// The smoke test never uses realtime channels; supabase-js only needs a WebSocket
// constructor to EXIST at client creation (Node < 22 has none), so stub it.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class {};
}

const SUPA_URL = process.env.SUPA_URL;
const SUPA_ANON = process.env.SUPA_ANON;
const MAIL_URL = process.env.MAIL_URL ?? 'http://127.0.0.1:35144';

if (!SUPA_URL || !SUPA_ANON) {
  console.error('FAIL: SUPA_URL and SUPA_ANON env vars are required');
  process.exit(1);
}

const rand = Math.random().toString(36).slice(2, 8);
const EMAIL_A = `smoke-a-${rand}@example.test`;
const EMAIL_B = `smoke-b-${rand}@example.test`;
const EMAIL_C = `smoke-c-${rand}@example.test`;

const ON_CONFLICT = {
  user_stats: 'user_id',
  user_progress: 'user_id,lesson_id',
  srs_cards: 'user_id,vocab_id',
  events: 'user_id,id',
};

const iso = (d = new Date()) => d.toISOString();
let failures = 0;

function ok(name) {
  console.log(`OK: ${name}`);
}
function fail(name, detail) {
  failures++;
  console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
}
function check(cond, name, detail) {
  if (cond) ok(name);
  else fail(name, detail);
}

/** The exact server-row shapes the app repos produce (snake_case, ISO timestamps). */
function rowsFor(uid) {
  const now = iso();
  return {
    user_stats: {
      user_id: uid, xp: 10, streak: 1, last_active_date: '2026-10-25', streak_freezes: 0,
      hearts: 5, hearts_updated_at: now, daily_goal_xp: 20, xp_today: 10, updated_at: now,
    },
    user_progress: {
      user_id: uid, lesson_id: 'smoke.l1', crowns: 1, completed_at: now, updated_at: now,
    },
    srs_cards: {
      user_id: uid, vocab_id: 'smoke.v1', ease: 2.5, interval_days: 1, reps: 1,
      due_at: now, last_reviewed_at: null, updated_at: now,
    },
    events: {
      user_id: uid, id: `smoke-evt-${rand}`, type: 'lesson_completed', payload: { xp: 10 },
      created_at: now, updated_at: now,
    },
  };
}

async function signUp(email) {
  const sb = createClient(SUPA_URL, SUPA_ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await sb.auth.signUp({ email, password: 'smokePass123' });
  if (error || !data.session) throw new Error(`signup ${email}: ${error?.message}`);
  return { sb, uid: data.user.id };
}

async function latestCodeFor(email) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    if (res.ok) {
      const body = await res.json();
      const list = Array.isArray(body) ? body : (body.messages ?? []);
      const latest = list[list.length - 1];
      if (latest?.ID) {
        // The search listing has no full body — read the message itself.
        const msgRes = await fetch(`${MAIL_URL}/api/v1/message/${latest.ID}`);
        if (msgRes.ok) {
          const msg = await msgRes.json();
          const m = String(msg.Text ?? '').match(/\b(\d{6})\b/);
          if (m) return m[1];
        }
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function main() {
  // 1) Two fresh users (signup auto-confirms on the prototype).
  const a = await signUp(EMAIL_A);
  ok(`signup A (${EMAIL_A})`);
  const b = await signUp(EMAIL_B);
  ok(`signup B (${EMAIL_B})`);

  // 2) User A upserts one row per table with the repo row shapes + onConflict targets.
  const rows = rowsFor(a.uid);
  for (const [table, row] of Object.entries(rows)) {
    const { error } = await a.sb.from(table).upsert(row, { onConflict: ON_CONFLICT[table] });
    check(!error, `A upserts ${table}`, error?.message);
  }

  // 3) A reads its rows back (timestamptz normalises to a parseable ISO string).
  for (const [table, row] of Object.entries(rows)) {
    const { data, error } = await a.sb.from(table).select('*').eq('user_id', a.uid);
    const got = data?.[0];
    const want = Object.entries(row).filter(([, v]) => typeof v !== 'string' || !/^\d{4}-/.test(v));
    const shapeOk =
      !error &&
      data?.length === 1 &&
      want.every(([k, v]) => JSON.stringify(got[k]) === JSON.stringify(v));
    check(shapeOk, `A reads back ${table}`, error?.message ?? JSON.stringify(got));
    if (got && Number.isNaN(Date.parse(got.updated_at))) fail(`${table}.updated_at parses as a date`, got.updated_at);
  }

  // 4) RLS: B cannot see any of A's rows, even when querying by A's uid.
  for (const table of Object.keys(rows)) {
    const { data, error } = await b.sb.from(table).select('*').eq('user_id', a.uid);
    check(!error && (data ?? []).length === 0, `B cannot read A's ${table}`, error?.message);
  }

  // 5) Passwordless OTP login through the mail catcher.
  const c = createClient(SUPA_URL, SUPA_ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: otpErr } = await c.auth.signInWithOtp({ email: EMAIL_C, options: { shouldCreateUser: true } });
  check(!otpErr, `OTP code sent to ${EMAIL_C}`, otpErr?.message);
  const code = await latestCodeFor(EMAIL_C);
  check(Boolean(code), 'mail catcher delivered the 6-digit code');
  if (code) {
    const { data, error } = await c.auth.verifyOtp({ email: EMAIL_C, token: code, type: 'email' });
    check(!error && Boolean(data.session), 'verifyOtp signs C in with the code', error?.message);
  }
}

main()
  .then(() => {
    if (failures > 0) {
      console.error(`\nSMOKE FAILED (${failures} failure(s))`);
      process.exit(1);
    }
    console.log('\nSMOKE OK');
  })
  .catch((e) => {
    console.error(`\nSMOKE FAILED: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
