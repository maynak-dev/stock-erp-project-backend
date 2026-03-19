require('dotenv').config();
const { execSync } = require('child_process');
const { Pool }     = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const run = (cmd, label) => {
  console.log(`\n🔄 ${label}...`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
  console.log(`✅ ${label} done`);
};

async function dropAllTables() {
  console.log('\n🗑️  Dropping all tables from database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Drop all tables + enums in one shot using CASCADE
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        -- Drop all tables
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        -- Drop all enums
        FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace) LOOP
          EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('✅ All tables and enums dropped');
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🚀 Fresh start — resetting everything\n');

  // Step 1: Drop everything from the database
  await dropAllTables();

  // Step 2: Apply fresh migration from current schema
  run('npx prisma migrate dev --name init', 'Creating fresh migration');

  // Step 3: Regenerate Prisma client
  run('npx prisma generate', 'Generating Prisma client');

  // Step 4: Seed
  run('node prisma/seed.js', 'Running seed');
}

main().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });
