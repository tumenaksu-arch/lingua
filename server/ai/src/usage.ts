export interface UsageConfig {
  restUrl: string; // SUPABASE_REST_URL (ör. https://ankaxai.ai/lovevox-api/rest/v1)
  serviceKey: string; // SUPABASE_SERVICE_KEY (apikey + Bearer)
  dailyLimit: number;
  globalCap: number;
}

function headers(cfg: UsageConfig): Record<string, string> {
  return {
    apikey: cfg.serviceKey,
    Authorization: `Bearer ${cfg.serviceKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Europe/Istanbul takvim günü (PostgREST date karşılaştırması için YYYY-MM-DD).
 */
export function istanbulToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export interface UsageTakeResult {
  /** Rezervasyondan SONRA kullanılan mesaj sayısı; sınır doluysa -1 (bir şey rezerve edilmez). */
  used: number;
  /** Rezervasyonun Europe/Istanbul günü (YYYY-MM-DD) — ai_usage_record'e geri verilir. */
  day: string;
}

/**
 * Bugün için bir mesaj rezerve eder. PostgREST rpc yanıtı tek satırlık bir dizi
 * döner: [{ used, day }]. used = rezervasyondan SONRA kullanılan mesaj sayısı;
 * sınır doluysa -1 (bir şey rezerve edilmez). day her zaman geçerlidir ve
 * gece yarısını geçen bir çağrının kaydı AYNI satıra yazılması için kullanılır.
 * Yalnızca service_role çağırabilir (bkz. 0004_ai_kullanim.sql).
 */
export async function usageTake(cfg: UsageConfig, userId: string): Promise<UsageTakeResult> {
  const res = await fetch(`${cfg.restUrl}/rpc/ai_usage_take`, {
    method: "POST",
    headers: headers(cfg),
    body: JSON.stringify({
      p_user: userId,
      p_limit: cfg.dailyLimit,
      p_global_cap: cfg.globalCap,
    }),
  });
  if (!res.ok) throw new Error(`ai_usage_take failed: HTTP ${res.status}`);
  const rows: unknown = await res.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("ai_usage_take: unexpected response");
  const row = rows[0] as { used?: unknown; day?: unknown };
  if (typeof row.used !== "number" || typeof row.day !== "string") {
    throw new Error("ai_usage_take: unexpected response shape");
  }
  return { used: row.used, day: row.day };
}

/**
 * Token kullanımını yazar; hata durumunda rezerve edilen mesajı iade eder (refund=true).
 */
export async function usageRecord(
  cfg: UsageConfig,
  userId: string,
  day: string,
  inputTokens: number,
  outputTokens: number,
  refund: boolean,
): Promise<void> {
  const res = await fetch(`${cfg.restUrl}/rpc/ai_usage_record`, {
    method: "POST",
    headers: headers(cfg),
    body: JSON.stringify({
      p_user: userId,
      p_day: day,
      p_input: inputTokens,
      p_output: outputTokens,
      p_refund: refund,
    }),
  });
  if (!res.ok) throw new Error(`ai_usage_record failed: HTTP ${res.status}`);
}

/**
 * Kullanıcının bugüne kalan mesaj hakkı; kayıt yoksa günlük limitin kendisi.
 */
export async function usageRemaining(cfg: UsageConfig, userId: string): Promise<number> {
  const day = istanbulToday();
  const res = await fetch(
    `${cfg.restUrl}/ai_usage?user_id=eq.${encodeURIComponent(userId)}&day=eq.${day}&select=messages`,
    { headers: headers(cfg) },
  );
  if (!res.ok) throw new Error(`ai_usage read failed: HTTP ${res.status}`);
  const rows = (await res.json()) as Array<{ messages: number }>;
  const used = rows.length > 0 ? rows[0].messages : 0;
  return Math.max(0, cfg.dailyLimit - used);
}
