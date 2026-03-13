import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { ErrorHandlerService } from '../core/error/services/ErrorHandlerService';

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

// Explicitly set realtime auth to fix RLS issues in RN
// First, check if we already have a session and set auth immediately
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.access_token) {
    console.log('[Supabase] Setting initial realtime auth token');
    supabase.realtime.setAuth(session.access_token);
  } else {
    console.log('[Supabase] No session found on init');
  }
});

// Then listen for future session changes
supabase.auth.onAuthStateChange((_event, session) => {
  console.log('[Supabase] Auth state changed:', _event);
  if (session?.access_token) {
    console.log('[Supabase] Setting realtime auth token from state change');
    supabase.realtime.setAuth(session.access_token);
  }
});


const fetchRandomEntry = async (tableName: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_random_entry_dynamic', {
        target_table: tableName,
        target_schema: 'private_schema'
      });

    if (error) throw error;

    if (!data) {
      console.log('Table is empty or does not exist');
      return null;
    }

    console.log(`Random entry from ${tableName}:`, data);
    return data;

  } catch (err) {
    ErrorHandlerService.handle(err, { showUI: false });
  }
};

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
