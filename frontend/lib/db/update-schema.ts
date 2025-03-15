import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔄 Starting database schema update...');
  
  // Get connection string from environment variables
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // Create a Postgres connection
  console.log('🔌 Connecting to database...');
  const sql = postgres(connectionString, { max: 1 });
  
  try {
    // Add the form_fields column to the form_data table
    console.log('📝 Adding form_fields column...');
    
    await sql`
      ALTER TABLE form_data
      ADD COLUMN IF NOT EXISTS form_fields JSONB;
    `;
    
    console.log('✅ Database schema updated successfully!');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
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