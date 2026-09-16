import { Redis } from "@upstash/redis";
import type { FreeAnalysisReport } from "./types";

// TEMPORARILY raised (EMAIL/DOMAIN from 2, IP from 5) so Odelya can test
// freely without self-blocking. Revert all three to their real values once
// she confirms the app is working correctly end-to-end.
const EMAIL_LIMIT = 50;
const EMAIL_WINDOW_SECONDS = 30 * 24 * 60 * 60;
const DOMAIN_LIMIT = 50;
const DOMAIN_WINDOW_SECONDS = 30 * 24 * 60 * 60;
const IP_LIMIT = 50;
const IP_WINDOW_SECONDS = 24 * 60 * 60;
const CACHE_TTL_SECONDS = 48 * 60 * 60;

export interface QuotaResult {
  allowed: boolean;
  message?: string;
}

let redisClient: Redis | null | undefined;

/**
 * Rate limiting and result caching both need state shared across Vercel's
 * isolated function instances — in-memory storage would not work. All of
 * this is a no-op (requests always allowed, cache always misses) until Redis
 * is configured (connect "Upstash for Redis" from the Vercel project's
 * Storage tab). This keeps local dev and any deploy without Redis working,
 * just unprotected.
 *
 * Vercel's Marketplace integration for Upstash injects KV_REST_API_URL /
 * KV_REST_API_TOKEN (its own "KV" naming), not the UPSTASH_REDIS_REST_* names
 * from Upstash's own docs — support both so either connection method works.
 */
function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.warn("Redis env vars not set — rate limiting and result caching are disabled.");
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function extractDomain(url: string): string {
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

async function slidingWindowCheck(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const client = getRedis();
  if (!client) return true;

  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  await client.zremrangebyscore(key, 0, windowStart);
  const count = await client.zcard(key);
  if (count >= limit) return false;

  await client.zadd(key, { score: now, member: `${now}-${Math.random().toString(36).slice(2)}` });
  await client.expire(key, windowSeconds);
  return true;
}

export async function checkEmailQuota(email: string): Promise<QuotaResult> {
  const allowed = await slidingWindowCheck(`quota:email:${normalizeEmail(email)}`, EMAIL_LIMIT, EMAIL_WINDOW_SECONDS);
  return allowed
    ? { allowed }
    : { allowed, message: `כתובת האימייל הזו כבר ניצלה את ${EMAIL_LIMIT} הבדיקות החינמיות ב-30 הימים האחרונים.` };
}

export async function checkDomainQuota(url: string): Promise<QuotaResult> {
  const domain = extractDomain(url);
  const allowed = await slidingWindowCheck(`quota:domain:${domain}`, DOMAIN_LIMIT, DOMAIN_WINDOW_SECONDS);
  return allowed
    ? { allowed }
    : { allowed, message: `האתר ${domain} כבר נבדק ${DOMAIN_LIMIT} פעמים ב-30 הימים האחרונים במסגרת הבדיקה החינמית.` };
}

export async function checkIpQuota(ip: string): Promise<QuotaResult> {
  const allowed = await slidingWindowCheck(`quota:ip:${ip}`, IP_LIMIT, IP_WINDOW_SECONDS);
  return allowed ? { allowed } : { allowed, message: "בוצעו יותר מדי בדיקות מהרשת שלך היום. נסו שוב מחר." };
}

export async function getCachedReport(url: string): Promise<FreeAnalysisReport | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    return await client.get<FreeAnalysisReport>(`cache:report:${extractDomain(url)}`);
  } catch (err) {
    console.error("Failed to read cached report", err);
    return null;
  }
}

export async function setCachedReport(url: string, report: FreeAnalysisReport): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(`cache:report:${extractDomain(url)}`, report, { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    console.error("Failed to write cached report", err);
  }
}
