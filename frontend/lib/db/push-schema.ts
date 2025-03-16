import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// For one-off script execution (node push-schema.js)
async function main() {
  console.log('🔄 Starting database schema push...');
  
  // Get connection string from environment variables
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // Create a Postgres connection
  console.log('🔌 Connecting to database...');
  const sql = postgres(connectionString, { max: 1 });
  
  try {
    // Push schema changes to the database
    console.log('📝 Creating tables if they don\'t exist...');
    
    // Create form_data table
    await sql`
      CREATE TABLE IF NOT EXISTS form_data (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        yaml_data JSONB,
        current_tab TEXT DEFAULT 'personal',
        accordion_values JSONB DEFAULT '{}',
        retrieve_mode TEXT DEFAULT 'new',
        location TEXT DEFAULT 'ENGLAND, LONDON',
        secret_question TEXT,
        secret_answer TEXT,
        application_id TEXT,
        surname TEXT,
        birth_year TEXT,
        last_updated TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Create form_versions table with application_id column
    await sql`
      CREATE TABLE IF NOT EXISTS form_versions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        yaml_data JSONB,
        version_name TEXT,
        application_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;  
    
    // Add application_id column to form_versions if it doesn't exist
    // This handles the case where the table already exists but without this column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'form_versions' AND column_name = 'application_id'
        ) THEN
          ALTER TABLE form_versions ADD COLUMN application_id TEXT;
        END IF;
      END
      $$;
    `;
    
    console.log('✅ Database schema pushed successfully!');
  } catch (error) {
    console.error('❌ Error pushing schema:', error);
    throw error;
  } finally {
    // Close the connection
    await sql.end();
    console.log('🔌 Database connection closed');
  }
}

// Execute the function
main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 