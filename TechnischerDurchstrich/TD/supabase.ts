import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';


export const supabase = createClient(Constants.expoConfig?.extra["SUPABASE_URL"], Constants.expoConfig?.extra["SUPABASE_ANON_KEY"]);
