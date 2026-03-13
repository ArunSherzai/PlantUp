import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_URL';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data, error } = await supabase.from('Plants').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'Empty table');
    }
}

checkSchema();
