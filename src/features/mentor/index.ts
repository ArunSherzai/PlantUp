// ============================================================
// Mentor Feature — Barrel Exports
// ============================================================

// Types
export type {
  PlantProfile,
  SensorRange,
  Deviation,
  HealthResult,
  DailyMentorInput,
  MentorAdvice,
  MentorDailyAdviceRow,
} from './types/mentor.types';

// Config (Layer A)
export { PLANT_PROFILES, DEFAULT_PROFILE, getProfile } from './config/plantProfiles';

// Scoring (Layer A)
export { calculateHealth, calculateHealthLegacy, ecTrend, moistureVariance } from './scoring/calculateHealth';

// Builder (Layer B)
export { buildDailyMentorInput, deriveSeason } from './builder/buildDailyMentorInput';

// API (Layer C + D)
export {
  fetchMentorAdvice,
  fetchCachedAdviceFromDB,
  shouldFetchMentor,
  hasAlreadyFetchedToday,
} from './api/mentorApi';

// Components (Layer UI)
export { default as DailyMentorCard } from './components/DailyMentorCard';
