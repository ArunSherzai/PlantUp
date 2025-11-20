import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// --- One client under the hood ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: { schema: 'public' }, // default
});

// --- Schema aliases (all share same auth + connection) ---
export const db = {
  public: supabase,
  micro: supabase.schema('microcontroller_schema'),
  user: supabase.schema('user_schema'),
  social: supabase.schema('social_media_schema'),
  webshop: supabase.schema('webshop_schema'),
  gamification: supabase.schema('gamification'),
};

console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key:', SUPABASE_KEY ? 'Key Loaded' : 'Key Missing');
