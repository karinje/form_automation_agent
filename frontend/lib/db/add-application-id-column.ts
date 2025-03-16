import { getDb } from './index';
import { sql } from 'drizzle-orm';

async function addApplicationIdColumn() {
  console.log('🔄 Starting database schema update...');
  
  const db = getDb();
  console.log('🔌 Connected to database');
  
  try {
    console.log('📝 Adding application_id column to form_versions table...');
    
    // Add the column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE form_versions 
      ADD COLUMN IF NOT EXISTS application_id TEXT;
    `);
    
    console.log('✅ Successfully added application_id column to form_versions table');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    throw error;
  } finally {
    console.log('🔌 Closing database connection');
    await db.end();
  }
}

// Run the migration
addApplicationIdColumn()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }); 