require('dotenv').config();
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

// Prisma 7 rules:
// 1. schema.prisma must NOT have url in datasource
// 2. prisma.config.ts must define the datasource url
// 3. generator must have previewFeatures = ["driverAdapters"]
// 4. prisma.config.ts must use .js extension or be compiled — 
//    BUT since this project is CommonJS we use prisma.config.js instead

const SCHEMA = `generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
}

enum Role {
  SUPER_ADMIN
  COMPANY_ADMIN
  LOCATION_MANAGER
  SHOP_OWNER
  SHOP_EMPLOYEE
}

enum StockStatus {
  IN_COMPANY
  IN_LOCATION
  IN_SHOP
  RETURNED
  EXPIRED
}

enum ReturnStatus {
  PENDING
  APPROVED
  REJECTED
  COMPLETED
}

model Company {
  id         String      @id @default(cuid())
  name       String
  gst        String?
  address    String?
  contact    String?
  locations  Location[]
  users      User[]
  products   Product[]
  stock      Stock[]
  categories Category[]
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
}

model Location {
  id        String   @id @default(cuid())
  name      String
  address   String?
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  shops     Shop[]
  users     User[]
  stock     Stock[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Shop {
  id             String          @id @default(cuid())
  name           String
  address        String?
  locationId     String
  location       Location        @relation(fields: [locationId], references: [id], onDelete: Cascade)
  users          User[]
  stock          Stock[]
  returnRequests ReturnRequest[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model User {
  id          String          @id @default(cuid())
  email       String          @unique
  password    String
  name        String
  role        Role
  companyId   String?
  locationId  String?
  shopId      String?
  company     Company?        @relation(fields: [companyId], references: [id])
  location    Location?       @relation(fields: [locationId], references: [id])
  shop        Shop?           @relation(fields: [shopId], references: [id])
  permissions UserPermission?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

model UserPermission {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  canViewProducts   Boolean  @default(true)
  canCreateProducts Boolean  @default(false)
  canEditProducts   Boolean  @default(false)
  canDeleteProducts Boolean  @default(false)
  canViewStock      Boolean  @default(true)
  canAddStock       Boolean  @default(false)
  canTransferStock  Boolean  @default(false)
  canViewReturns    Boolean  @default(true)
  canCreateReturns  Boolean  @default(false)
  canApproveReturns Boolean  @default(false)
  canViewReports    Boolean  @default(true)
  canViewUsers      Boolean  @default(false)
  canManageUsers    Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Category {
  id          String    @id @default(cuid())
  name        String
  description String?
  companyId   String
  company     Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Product {
  id            String    @id @default(cuid())
  name          String
  sku           String    @unique
  defaultPrice  Float
  shelfLifeDays Int?
  categoryId    String?
  category      Category? @relation(fields: [categoryId], references: [id])
  companyId     String
  company       Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  stockItems    Stock[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Stock {
  id                String          @id @default(cuid())
  batchNumber       String
  manufacturingDate DateTime
  expiryDate        DateTime
  quantity          Int
  price             Float?
  productId         String
  product           Product         @relation(fields: [productId], references: [id])
  shopId            String?
  shop              Shop?           @relation(fields: [shopId], references: [id])
  locationId        String?
  location          Location?       @relation(fields: [locationId], references: [id])
  companyId         String?
  company           Company?        @relation(fields: [companyId], references: [id])
  status            StockStatus     @default(IN_COMPANY)
  movements         StockMovement[]
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  returnItems       ReturnItem[]
}

model StockMovement {
  id           String   @id @default(cuid())
  stockId      String
  stock        Stock    @relation(fields: [stockId], references: [id])
  fromType     String
  fromId       String?
  toType       String
  toId         String
  quantity     Int
  movementDate DateTime @default(now())
  createdAt    DateTime @default(now())
}

model ReturnRequest {
  id            String       @id @default(cuid())
  requestNumber String       @unique
  shopId        String
  shop          Shop         @relation(fields: [shopId], references: [id])
  items         ReturnItem[]
  status        ReturnStatus @default(PENDING)
  invoicePath   String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

model ReturnItem {
  id              String        @id @default(cuid())
  returnRequestId String
  returnRequest   ReturnRequest @relation(fields: [returnRequestId], references: [id])
  stockId         String
  stock           Stock         @relation(fields: [stockId], references: [id])
  quantity        Int
  reason          String?
}
`;

// prisma.config.js — CommonJS version (works without TypeScript)
const PRISMA_CONFIG = `'use strict';
require('dotenv').config();
const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
`;

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const configPath = path.join(__dirname, 'prisma.config.js');

// Delete old .ts config (ES module, breaks CommonJS)
var oldConfig = path.join(__dirname, 'prisma.config.ts');
if (fs.existsSync(oldConfig)) { fs.unlinkSync(oldConfig); console.log('🗑️  Deleted prisma.config.ts'); }

// Write new .js config
console.log('📝 Writing prisma.config.js (CommonJS)...');
fs.writeFileSync(configPath, PRISMA_CONFIG, 'utf8');
console.log('✅ prisma.config.js written\n');

// Write schema (no url in datasource)
console.log('📝 Writing schema.prisma...');
fs.writeFileSync(schemaPath, SCHEMA, 'utf8');
console.log('✅ schema.prisma written\n');

// Wipe .prisma cache
var dotPrisma = path.join(__dirname, 'node_modules', '.prisma');
if (fs.existsSync(dotPrisma)) {
  fs.rmSync(dotPrisma, { recursive: true, force: true });
  console.log('🗑️  Cleared .prisma cache\n');
}

// Generate
console.log('🔄 Running prisma generate...');
execSync('node node_modules/prisma/build/index.js generate', {
  stdio: 'inherit',
  env:   process.env,
  shell: true,
  cwd:   __dirname,
});

// Verify
var realIndex = path.join(__dirname, 'node_modules', '.prisma', 'client', 'index.d.ts');
if (fs.existsSync(realIndex)) {
  var content = fs.readFileSync(realIndex, 'utf8');
  var hasPerm = content.includes('UserPermission');
  var hasCat  = content.includes('Category');
  console.log('\n✅ Client generated! Size:', content.length, 'chars');
  console.log('   UserPermission:', hasPerm ? '✅' : '❌');
  console.log('   Category:      ', hasCat  ? '✅' : '❌');
  if (hasPerm && hasCat) {
    console.log('\n🌱 Now run: node prisma/seed.js');
  }
} else {
  console.error('\n❌ Still not generated.');
}
