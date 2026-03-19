require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found'); process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('🗑️  Dropping all existing tables...');
  await pool.query(`
    DO $$ DECLARE r RECORD; BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
      FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e'
                AND typnamespace = 'public'::regnamespace) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  console.log('✅ Dropped\n');

  console.log('🏗️  Creating enums...');
  await pool.query(`
    CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN','COMPANY_ADMIN','LOCATION_MANAGER','SHOP_OWNER','SHOP_EMPLOYEE');
    CREATE TYPE "StockStatus" AS ENUM ('IN_COMPANY','IN_LOCATION','IN_SHOP','RETURNED','EXPIRED');
    CREATE TYPE "ReturnStatus" AS ENUM ('PENDING','APPROVED','REJECTED','COMPLETED');
  `);
  console.log('✅ Enums created\n');

  console.log('🏗️  Creating tables...');
  await pool.query(`
    CREATE TABLE "Company" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "gst" TEXT,
      "address" TEXT,
      "contact" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "Location" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "address" TEXT,
      "companyId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
    );

    CREATE TABLE "Shop" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "address" TEXT,
      "locationId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE
    );

    CREATE TABLE "Category" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "companyId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
    );

    CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "role" "Role" NOT NULL,
      "companyId" TEXT,
      "locationId" TEXT,
      "shopId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("companyId") REFERENCES "Company"("id"),
      FOREIGN KEY ("locationId") REFERENCES "Location"("id"),
      FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
    );

    CREATE TABLE "UserPermission" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "canViewProducts" BOOLEAN NOT NULL DEFAULT true,
      "canCreateProducts" BOOLEAN NOT NULL DEFAULT false,
      "canEditProducts" BOOLEAN NOT NULL DEFAULT false,
      "canDeleteProducts" BOOLEAN NOT NULL DEFAULT false,
      "canViewStock" BOOLEAN NOT NULL DEFAULT true,
      "canAddStock" BOOLEAN NOT NULL DEFAULT false,
      "canTransferStock" BOOLEAN NOT NULL DEFAULT false,
      "canViewReturns" BOOLEAN NOT NULL DEFAULT true,
      "canCreateReturns" BOOLEAN NOT NULL DEFAULT false,
      "canApproveReturns" BOOLEAN NOT NULL DEFAULT false,
      "canViewReports" BOOLEAN NOT NULL DEFAULT true,
      "canViewUsers" BOOLEAN NOT NULL DEFAULT false,
      "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    );

    CREATE TABLE "Product" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "sku" TEXT NOT NULL UNIQUE,
      "defaultPrice" FLOAT8 NOT NULL,
      "shelfLifeDays" INT,
      "categoryId" TEXT,
      "companyId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL,
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
    );

    CREATE TABLE "Stock" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "batchNumber" TEXT NOT NULL,
      "manufacturingDate" TIMESTAMP(3) NOT NULL,
      "expiryDate" TIMESTAMP(3) NOT NULL,
      "quantity" INT NOT NULL,
      "price" FLOAT8,
      "productId" TEXT NOT NULL,
      "shopId" TEXT,
      "locationId" TEXT,
      "companyId" TEXT,
      "status" "StockStatus" NOT NULL DEFAULT 'IN_COMPANY',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("productId") REFERENCES "Product"("id"),
      FOREIGN KEY ("shopId") REFERENCES "Shop"("id"),
      FOREIGN KEY ("locationId") REFERENCES "Location"("id"),
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    );

    CREATE TABLE "StockMovement" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "stockId" TEXT NOT NULL,
      "fromType" TEXT NOT NULL,
      "fromId" TEXT,
      "toType" TEXT NOT NULL,
      "toId" TEXT NOT NULL,
      "quantity" INT NOT NULL,
      "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("stockId") REFERENCES "Stock"("id")
    );

    CREATE TABLE "ReturnRequest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "requestNumber" TEXT NOT NULL UNIQUE,
      "shopId" TEXT NOT NULL,
      "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
      "invoicePath" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
    );

    CREATE TABLE "ReturnItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "returnRequestId" TEXT NOT NULL,
      "stockId" TEXT NOT NULL,
      "quantity" INT NOT NULL,
      "reason" TEXT,
      FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id"),
      FOREIGN KEY ("stockId") REFERENCES "Stock"("id")
    );
  `);
  console.log('✅ All tables created\n');

  await pool.end();

  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
  console.log('✅ Client generated\n');

  console.log('🌱 Running seed...\n');
  execSync('node prisma/seed.js', { stdio: 'inherit', env: process.env });
}

main().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });