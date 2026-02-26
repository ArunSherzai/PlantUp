// ============================================================
// Task 5 — Edge Function: mentor_daily
// ============================================================
// Supabase Edge Function (Deno Deploy)
//
// POST /mentor_daily
// Body: { plant_id: string, date?: string }
// Headers: Authorization: Bearer <JWT>
//
// 1. Auth user
// 2. Build DailyMentorInput
// 3. Hash it → check cache
// 4. If cache hit → return cached advice
// 5. Else → call LLM → store → return
// ============================================================

// @ts-ignore – Deno imports
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

// ---------- types (mirrored from app, keep in sync) ----------

interface HealthResult {
  health_percent: number;
  status: 'GOOD' | 'WARNING' | 'BAD';
  subscores: Record<string, number>;
  deviations: Array<{
    metric: string;
    direction: 'low' | 'high';
    severity: 'mild' | 'moderate' | 'severe';
    value: number;
    ideal_min: number;
    ideal_max: number;
  }>;
  trends: {
    ec_14d?: 'rising' | 'stable' | 'falling';
    moisture_var_7d?: 'low' | 'med' | 'high';
  };
}

interface DailyMentorInput {
  plant_id: string;
  plant_type: string;
  season: 'winter' | 'spring' | 'summer' | 'autumn';
  age_days?: number;
  growth_stage?: 'seedling' | 'veg' | 'mature' | 'dormant';
  environment?: 'indoor' | 'outdoor';
  health: HealthResult;
  notes?: string;
}

interface MentorAdvice {
  headline: string;
  summary: string;
  risks: string[];
  next_actions: string[];
  watch_out_for: string[];
  confidence: 'high' | 'medium' | 'low';
}

// ---------- helpers ----------------------------------------------------------

function deriveSeason(): 'winter' | 'spring' | 'summer' | 'autumn' {
  const month = new Date().getMonth();
  if (month <= 1 || month === 11) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}

function inferGrowthStage(ageDays?: number) {
  if (ageDays == null) return undefined;
  if (ageDays < 21) return 'seedling';
  if (ageDays < 60) return 'veg';
  return 'mature';
}

/** Lightweight health scoring (server-side, no profile files). */
function scoreSensor(value: number, idealMin: number, idealMax: number, min: number, max: number): number {
  if (value >= idealMin && value <= idealMax) return 100;
  if (value < idealMin) return value <= min ? 0 : ((value - min) / (idealMin - min)) * 100;
  return value >= max ? 0 : ((max - value) / (max - idealMax)) * 100;
}

function computeHealthServer(r: any): HealthResult {
  const sensorDefs: Array<{
    key: string; min: number; idealMin: number; idealMax: number; max: number; weight: number;
  }> = [
    { key: 'temperature',            min: 10, idealMin: 18, idealMax: 28, max: 38, weight: 0.20 },
    { key: 'humidity',               min: 20, idealMin: 40, idealMax: 70, max: 90, weight: 0.15 },
    { key: 'soil_moisture',          min: 10, idealMin: 30, idealMax: 65, max: 90, weight: 0.25 },
    { key: 'light',                  min: 200, idealMin: 1000, idealMax: 15000, max: 50000, weight: 0.20 },
    { key: 'electrical_conductivity', min: 0.2, idealMin: 0.8, idealMax: 2.5, max: 4.0, weight: 0.20 },
  ];

  const subscores: Record<string, number> = {};
  const deviations: HealthResult['deviations'] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const s of sensorDefs) {
    const v = r?.[s.key];
    if (v == null) continue;
    const sub = scoreSensor(v, s.idealMin, s.idealMax, s.min, s.max);
    subscores[s.key] = Math.round(sub);
    weightedSum += sub * s.weight;
    totalWeight += s.weight;

    if (sub < 100) {
      deviations.push({
        metric: s.key,
        direction: v < s.idealMin ? 'low' : 'high',
        severity: sub >= 60 ? 'mild' : sub >= 30 ? 'moderate' : 'severe',
        value: v,
        ideal_min: s.idealMin,
        ideal_max: s.idealMax,
      });
    }
  }

  const hp = totalWeight > 0 ? Math.round(Math.max(0, Math.min(100, weightedSum / totalWeight))) : 0;
  return {
    health_percent: hp,
    status: hp >= 70 ? 'GOOD' : hp >= 40 ? 'WARNING' : 'BAD',
    subscores,
    deviations,
    trends: {},
  };
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  // @ts-ignore – Deno / Web Crypto
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------- system prompt for the LLM ---------------------------------------

const SYSTEM_PROMPT = `You are PlantUp Mentor — a friendly, knowledgeable plant care advisor.

RULES:
- Respond ONLY with a valid JSON object — no markdown, no commentary.
- Do NOT change the health_percent; it was computed deterministically.
- If uncertain, say so honestly inside the JSON.
- Do NOT give medical, hazardous, or chemical-safety advice.
- Keep your language warm, encouraging, and concise.

Return this exact JSON shape:
{
  "headline": "One short sentence summarizing the state",
  "summary": "2-3 sentence overview of the plant's health",
  "risks": ["risk 1", "risk 2"],
  "next_actions": ["action 1", "action 2"],
  "watch_out_for": ["thing 1"],
  "confidence": "high" | "medium" | "low"
}`;

// ---------- LLM call ---------------------------------------------------------

async function callLLM(input: DailyMentorInput): Promise<MentorAdvice> {
  // @ts-ignore – Deno env
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const userMessage = `Here is today's plant data:\n\n${JSON.stringify(input, null, 2)}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      max_completion_tokens: 1000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? '';

  console.log('LLM raw response:', raw);

  if (!raw || raw.trim().length === 0) {
    throw new Error('LLM returned empty response');
  }

  // Parse — strip possible markdown fences
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const advice: MentorAdvice = JSON.parse(cleaned);
    return advice;
  } catch (parseErr: any) {
    console.error('Failed to parse LLM response:', cleaned);
    throw new Error(`LLM JSON parse error: ${parseErr.message}. Raw: ${cleaned.substring(0, 200)}`);
  }
}

// ---------- Supabase client helpers ------------------------------------------

function createSchemaClient(url: string, key: string, schema: string) {
  return createClient(url, key, { db: { schema } });
}

// ---------- main handler -----------------------------------------------------

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401 });

    // @ts-ignore – Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create separate clients for each schema
    const dbPublic = createClient(supabaseUrl, supabaseServiceKey);
    const dbSocial = createSchemaClient(supabaseUrl, supabaseServiceKey, 'social_media_schema');
    const dbMicro = createSchemaClient(supabaseUrl, supabaseServiceKey, 'microcontroller_schema');

    // Verify JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await dbPublic.auth.getUser(token);
    if (authErr || !user) {
      console.error('Auth error:', authErr);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 2. Parse body
    const body = await req.json();
    const plantId: string = body.plant_id;
    const dateStr: string = body.date ?? new Date().toISOString().split('T')[0];

    if (!plantId) {
      return new Response(JSON.stringify({ error: 'plant_id required' }), { status: 400 });
    }

    console.log(`Mentor request: user=${user.id}, plant=${plantId}, date=${dateStr}`);

    // 3. Build DailyMentorInput (server-side version)
    // Fetch plant from social_media_schema
    const { data: plant, error: plantErr } = await dbSocial
      .from('Plants')
      .select('id, nickname, plant_data_id')
      .eq('id', plantId)
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('Plant query result:', { plant, plantErr });

    if (!plant) {
      return new Response(JSON.stringify({
        error: 'Plant not found',
        debug: { plantId, userId: user.id, queryError: plantErr?.message }
      }), { status: 404 });
    }

    // Resolve plant type name
    let plantTypeName = 'unknown';
    if (plant.plant_data_id) {
      const { data: typeRow } = await dbSocial
        .from('Plant_data')
        .select('common_name')
        .eq('id', plant.plant_data_id)
        .maybeSingle();
      if (typeRow?.common_name) plantTypeName = typeRow.common_name;
    }

    // Latest reading from microcontroller_schema
    const { data: latest } = await dbMicro
      .from('Controllers')
      .select('temperature, humidity, soil_moisture, light, electrical_conductivity, created_at')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // No created_at on Plants table — skip age calculation
    const ageDays = undefined;

    const season = deriveSeason();
    const growthStage = inferGrowthStage(ageDays);
    const health = latest ? computeHealthServer(latest) : {
      health_percent: 0, status: 'BAD' as const, subscores: {}, deviations: [], trends: {},
    };

    const mentorInput: DailyMentorInput = {
      plant_id: plantId,
      plant_type: plantTypeName,
      season,
      age_days: ageDays,
      growth_stage: growthStage as any,
      environment: 'indoor',
      health,
    };

    // 4. Hash & cache check
    const inputJson = JSON.stringify(mentorInput);
    const inputHash = await sha256(inputJson);

    const { data: cached } = await dbPublic
      .from('mentor_daily_advice')
      .select('advice_json')
      .eq('user_id', user.id)
      .eq('plant_id', plantId)
      .eq('date', dateStr)
      .eq('input_hash', inputHash)
      .maybeSingle();

    if (cached) {
      console.log('Cache hit — returning stored advice');
      return new Response(JSON.stringify({
        advice: cached.advice_json,
        cached: true,
        health: mentorInput.health,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Call LLM
    console.log('Cache miss — calling LLM...');
    const advice = await callLLM(mentorInput);

    // 6. Upsert result
    const { error: upsertErr } = await dbPublic
      .from('mentor_daily_advice')
      .upsert(
        {
          user_id: user.id,
          plant_id: plantId,
          date: dateStr,
          input_hash: inputHash,
          advice_json: advice,
        },
        { onConflict: 'user_id,plant_id,date' }
      );

    if (upsertErr) console.error('Upsert error:', upsertErr);

    return new Response(JSON.stringify({
      advice,
      cached: false,
      health: mentorInput.health,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('mentor_daily error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
