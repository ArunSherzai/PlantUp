import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'my-app',
  slug: 'my-app',
  version: '1.0.0',
  android: {
    package: 'com.deinname.deinprojekt', // Ersetze mit deinem Paketnamen
  },
  extra: {
    SUPABASE_URL: 'https://uxfmopiuedhaoooyhjnw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4Zm1vcGl1ZWRoYW9vb3loam53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2OTI0OTksImV4cCI6MjA1NzI2ODQ5OX0.H9um-KnTLtJ-1HB0lOPou1ZtIQYJO6AiRW3ECAVYLXU',
  },
  scheme: 'com.deinname.deinprojekt',  // Hier das Scheme hinzufügen
};

export default config;
