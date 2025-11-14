const DEFAULT_SUPABASE_URL = 'https://abrflrvbvtqztuvyaeel.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicmZscnZidnRxenR1dnlhZWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MTU2NzUsImV4cCI6MjA3MzE5MTY3NX0.vY51xMd7RcM2yuXZ_QYnOrYXNi2ZjEdWCYCkKM06b-w';

const selectEnvValue = (key: string | undefined, fallback?: string) => {
  if (key && key.length > 0) {
    return key;
  }
  if (fallback && fallback.length > 0) {
    return fallback;
  }
  return undefined;
};

const env = typeof process !== 'undefined' ? process.env : undefined;

const resolvedUrl = selectEnvValue(env?.EXPO_PUBLIC_SUPABASE_URL, DEFAULT_SUPABASE_URL);
const resolvedAnonKey = selectEnvValue(
  env?.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_ANON_KEY,
);

if (!resolvedUrl || !resolvedAnonKey) {
  throw new Error('Supabase credentials are not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const SUPABASE_URL = resolvedUrl;
export const SUPABASE_ANON_KEY = resolvedAnonKey;

const serviceRoleCandidates = [
  env?.SUPABASE_SERVICE_ROLE_KEY,
  env?.SUPABASE_SERVICE_KEY,
];

export const SUPABASE_SERVICE_ROLE_KEY = serviceRoleCandidates.find(
  (key): key is string => Boolean(key && key.length > 0),
);
