import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Initialize Postgres client using the Supabase connection string
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

// Initialize Drizzle with Postgres client
export const db = drizzle(client);

// Export a function for easier server component/action access
export const getDb = () => db;

// We don't need supabaseClient directly for Drizzle, but keep it for other potential uses
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
); 