// ============================================================
// Layer A – Health scoring types
// ============================================================

/** Per-sensor target range used by the scoring function. */
export type SensorRange = {
  min: number;
  ideal_min: number;
  ideal_max: number;
  max: number;
};

/** Complete plant-type configuration (loaded from JSON / Supabase). */
export type PlantProfile = {
  type_key: string;                       // e.g. "tomato", "basil"
  display_name: string;
  sensors: Record<string, {
    range: SensorRange;
    weight: number;                       // 0..1, all weights should sum to 1
    unit: string;
  }>;
  stage_modifiers?: Record<string, {
    /** Multiply the base weight by this factor. */
    weight_scale?: number;
    /** Override min/max per sensor. */
    range_overrides?: Partial<SensorRange>;
  }>;
  season_modifiers?: Record<string, {
    range_overrides?: Partial<SensorRange>;
  }>;
};

/** A single sensor deviation from ideal. */
export type Deviation = {
  metric: string;
  direction: 'low' | 'high';
  severity: 'mild' | 'moderate' | 'severe';
  value: number;
  ideal_min: number;
  ideal_max: number;
};

/** Output of `calculateHealth()`. */
export type HealthResult = {
  health_percent: number;                 // 0..100
  status: 'GOOD' | 'WARNING' | 'BAD';
  subscores: Record<string, number>;      // per-sensor 0..100
  deviations: Deviation[];
  trends: {
    ec_14d?: 'rising' | 'stable' | 'falling';
    moisture_var_7d?: 'low' | 'med' | 'high';
  };
};

// ============================================================
// Layer B – Daily summary types
// ============================================================

export type DailyMentorInput = {
  plant_id: string;
  plant_type: string;
  season: 'winter' | 'spring' | 'summer' | 'autumn';
  age_days?: number;
  growth_stage?: 'seedling' | 'veg' | 'mature' | 'dormant';
  environment?: 'indoor' | 'outdoor';
  health: HealthResult;
  notes?: string;
};

// ============================================================
// Layer C – Mentor LLM response types
// ============================================================

export type MentorAdvice = {
  headline: string;
  summary: string;
  risks: string[];
  next_actions: string[];
  watch_out_for: string[];
  confidence: 'high' | 'medium' | 'low';
};

/** Row shape for mentor_daily_advice table. */
export type MentorDailyAdviceRow = {
  id?: string;
  user_id: string;
  plant_id: string;
  date: string;           // YYYY-MM-DD
  input_hash: string;
  advice_json: MentorAdvice;
  created_at?: string;
};
