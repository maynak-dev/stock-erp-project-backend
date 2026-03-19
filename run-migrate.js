require('dotenv').config();
const { execSync } = require('child_process');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

console.log('✅ DATABASE_URL loaded');

// Step 1: Apply migration to database
console.log('\n🔄 Step 1: Running prisma migrate deploy...');
execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
console.log('✅ Migration applied!\n');

// Step 2: Regenerate Prisma client from updated schema
console.log('🔄 Step 2: Running prisma generate...');
execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
console.log('✅ Client regenerated!\n');

// Step 3: Run seed immediately in same process so it uses the fresh client
console.log('🌱 Step 3: Running seed...\n');
execSync('node prisma/seed.js', { stdio: 'inherit', env: process.env });