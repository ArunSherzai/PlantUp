const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 1. Load .env manually to get credentials
const envPath = path.resolve(__dirname, '../.env');
let SUPABASE_URL, SUPABASE_KEY;

try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) {
            SUPABASE_URL = line.split('=')[1].trim();
        }
        if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
            SUPABASE_KEY = line.split('=')[1].trim();
        }
    });
} catch (e) {
    console.error('Could not read .env file at', envPath);
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    console.log('--- Mock Message Sender ---');

    // 1. Fetch recent conversations from correct schema
    const { data: convs, error } = await supabase
        .schema('social_media_schema')
        .from('dm_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching conversations:', error);
        process.exit(1);
    }

    if (!convs || convs.length === 0) {
        console.log('No conversations found.');
        process.exit(0);
    }

    console.log('\nSelect a conversation to spam:');
    convs.forEach((c, i) => {
        console.log(`${i + 1}. ID: ${c.id} (Last msg: ${c.last_message_text || 'None'})`);
    });

    rl.question('\nEnter number (1-5): ', async (answer) => {
        const idx = parseInt(answer) - 1;
        if (isNaN(idx) || idx < 0 || idx >= convs.length) {
            console.log('Invalid selection.');
            rl.close();
            return;
        }

        const selectedConv = convs[idx];
        const convId = selectedConv.id;
        const senderId = selectedConv.user_high;

        console.log(`\nSending mock message to Convo ${convId} from User ${senderId}...`);

        const mockText = `Mock msg ${new Date().toLocaleTimeString()}`;

        const { error: sendError } = await supabase
            .schema('social_media_schema')
            .from('dm_messages')
            .insert({
                conversation_id: convId,
                sender_id: senderId,
                content: mockText,
                message_type: 'text'
            });

        if (sendError) {
            console.error('Error sending message:', sendError);
        } else {
            console.log('SUCCESS! Message sent:', mockText);
            console.log('Check your app inbox. It should move to top and update text.');
        }

        rl.close();
        process.exit(0);
    });
}

main();
