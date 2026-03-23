// ============================================================
// Task 5 (client) + Task 6 — Mentor API client
// ============================================================
// Client-side functions to interact with the mentor_daily edge
// function and manage cached advice locally.
// ============================================================

import { db } from '../../../utils/supabase';
import { MentorAdvice, HealthResult } from '../types/mentor.types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

// --- cache keys ---
const MENTOR_CACHE_KEY = 'mentor_advice_';
const MENTOR_LAST_FETCH_KEY = 'mentor_last_fetch_';

// ---- types ---

export type MentorResponse = {
  advice: MentorAdvice;
  cached: boolean;
  health: HealthResult;
};

// ---- local cache ---

async function getLocalCache(plantId: string, date: string): Promise<MentorResponse | null> {
  try {
    const key = MENTOR_CACHE_KEY + plantId + '_' + date;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getLocalMentorCache(
  plantId: string,
  date?: string,
): Promise<MentorResponse | null> {
  const today = date ?? new Date().toISOString().split('T')[0];
  return getLocalCache(plantId, today);
}

async function setLocalCache(plantId: string, date: string, data: MentorResponse): Promise<void> {
  try {
    const key = MENTOR_CACHE_KEY + plantId + '_' + date;
    await AsyncStorage.setItem(key, JSON.stringify(data));
    await AsyncStorage.setItem(MENTOR_LAST_FETCH_KEY + plantId, new Date().toISOString());
  } catch {
    // silent
  }
}

/**
 * Check if we already fetched mentor advice today for this plant.
 */
export async function hasAlreadyFetchedToday(plantId: string): Promise<boolean> {
  try {
    const last = await AsyncStorage.getItem(MENTOR_LAST_FETCH_KEY + plantId);
    if (!last) return false;
    const lastDate = new Date(last).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return lastDate === today;
  } catch {
    return false;
  }
}

// ---- Layer D — Trigger rules ----

/**
 * Should we auto-fetch mentor advice?
 *
 * Returns true if:
 * - status != 'GOOD', OR
 * - any trend is concerning (rising EC / high moisture variance), OR
 * - user explicitly asked (force = true)
 *
 * This keeps LLM costs low by skipping calls when everything is fine.
 */
export function shouldFetchMentor(
  health: HealthResult | null,
  force: boolean = false
): boolean {
  if (force) return true;
  if (!health) return false;

  // Always fetch if plant isn't doing well
  if (health.status !== 'GOOD') return true;

  // Fetch if any trend is concerning
  if (health.trends.ec_14d === 'rising') return true;
  if (health.trends.moisture_var_7d === 'high') return true;

  // Any severe deviation
  if (health.deviations.some(d => d.severity === 'severe')) return true;

  return false;
}

// ---- main API ----

/**
 * Fetch daily mentor advice for a plant.
 *
 * Flow:
 * 1. Check local cache first (instant)
 * 2. If no local cache → call the edge function
 * 3. Edge function itself has a DB cache (so LLM is only called if needed)
 * 4. Store result in local cache too
 */
export async function fetchMentorAdvice(
  plantId: string,
  date?: string,
): Promise<MentorResponse> {
  const today = date ?? new Date().toISOString().split('T')[0];

  // 1. Local cache check
  const localCached = await getLocalCache(plantId, today);
  if (localCached) {
    return { ...localCached, cached: true };
  }

  // 2. Get auth token
  const { data: { session } } = await db.public.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  // 3. Call edge function
  const res = await fetch(`${SUPABASE_URL}/functions/v1/mentor_daily`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ plant_id: plantId, date: today }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Mentor API error ${res.status}: ${errBody}`);
  }

  const data: MentorResponse = await res.json();

  // 4. Store in local cache
  await setLocalCache(plantId, today, data);

  return data;
}

/**
 * Fetch cached advice from Supabase directly (no LLM call).
 * Useful for showing stale advice if the edge function is down.
 */
export async function fetchCachedAdviceFromDB(
  plantId: string,
  date?: string
): Promise<MentorAdvice | null> {
  const today = date ?? new Date().toISOString().split('T')[0];

  const { data: { user } } = await db.public.auth.getUser();
  if (!user) return null;

  const { data } = await db.public
    .from('mentor_daily_advice')
    .select('advice_json')
    .eq('user_id', user.id)
    .eq('plant_id', plantId)
    .eq('date', today)
    .maybeSingle();

  return data?.advice_json ?? null;
}
