const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Set up the PostgreSQL connection pool using your DATABASE_URL
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Instantiate PrismaClient with the adapter (Prisma 7+)
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Optional: Clean up existing data (uncomment if you want a fresh start)
  // await prisma.$transaction([
  //   prisma.returnItem.deleteMany(),
  //   prisma.returnRequest.deleteMany(),
  //   prisma.stockMovement.deleteMany(),
  //   prisma.stock.deleteMany(),
  //   prisma.product.deleteMany(),
  //   prisma.user.deleteMany(),
  //   prisma.shop.deleteMany(),
  //   prisma.location.deleteMany(),
  //   prisma.company.deleteMany(),
  // ]);

  // ---------- SUPER ADMIN ----------
  const superAdminEmail = 'admin@example.com';
  let superAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!superAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log('✅ Super Admin created');
  } else {
    console.log('ℹ️ Super Admin already exists');
  }

  // ---------- COMPANIES ----------
  const companiesData = [
    {
      name: 'Mio Amore',
      gst: '19AABCU9603R1ZM',
      address: 'Kolkata, West Bengal',
      contact: '+91 9876543210',
    },
    {
      name: 'Monginis',
      gst: '27AABBC1234E1ZP',
      address: 'Mumbai, Maharashtra',
      contact: '+91 9876543211',
    },
  ];

  for (const compData of companiesData) {
    let company = await prisma.company.findFirst({ where: { name: compData.name } });
    if (!company) {
      company = await prisma.company.create({ data: compData });
      console.log(`✅ Company created: ${company.name}`);
    } else {
      console.log(`ℹ️ Company already exists: ${company.name}`);
    }

    // ---------- COMPANY ADMIN ----------
    const adminEmail = `admin@${company.name.toLowerCase().replace(' ', '')}.com`;
    let companyAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!companyAdmin) {
      const hashedPassword = await bcrypt.hash('company123', 10);
      companyAdmin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: `${company.name} Admin`,
          role: 'COMPANY_ADMIN',
          companyId: company.id,
        },
      });
      console.log(`   ✅ Company Admin created: ${companyAdmin.email}`);
    }

    // ---------- LOCATIONS (2 per company) ----------
    const locations = [];
    for (let i = 1; i <= 2; i++) {
      const locName = `${company.name} Location ${i}`;
      let location = await prisma.location.findFirst({
        where: { name: locName, companyId: company.id },
      });
      if (!location) {
        location = await prisma.location.create({
          data: {
            name: locName,
            address: `${i}, Some Street, City`,
            companyId: company.id,
          },
        });
        console.log(`   ✅ Location created: ${location.name}`);
      }
      locations.push(location);

      // ---------- LOCATION MANAGER ----------
      const locManagerEmail = `manager${i}@${company.name.toLowerCase().replace(' ', '')}.com`;
      let locManager = await prisma.user.findUnique({ where: { email: locManagerEmail } });
      if (!locManager) {
        const hashedPassword = await bcrypt.hash('location123', 10);
        locManager = await prisma.user.create({
          data: {
            email: locManagerEmail,
            password: hashedPassword,
            name: `Location ${i} Manager`,
            role: 'LOCATION_MANAGER',
            companyId: company.id,
            locationId: location.id,
          },
        });
        console.log(`      ✅ Location Manager created: ${locManager.email}`);
      }

      // ---------- SHOPS (2 per location) ----------
      for (let j = 1; j <= 2; j++) {
        const shopName = `${company.name} Shop ${i}-${j}`;
        let shop = await prisma.shop.findFirst({
          where: { name: shopName, locationId: location.id },
        });
        if (!shop) {
          shop = await prisma.shop.create({
            data: {
              name: shopName,
              address: `Shop ${j}, Location ${i}`,
              locationId: location.id,
            },
          });
          console.log(`      ✅ Shop created: ${shop.name}`);
        }

        // ---------- SHOP OWNER ----------
        const ownerEmail = `owner${i}${j}@${company.name.toLowerCase().replace(' ', '')}.com`;
        let shopOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
        if (!shopOwner) {
          const hashedPassword = await bcrypt.hash('shop123', 10);
          shopOwner = await prisma.user.create({
            data: {
              email: ownerEmail,
              password: hashedPassword,
              name: `Shop Owner ${i}-${j}`,
              role: 'SHOP_OWNER',
              companyId: company.id,
              locationId: location.id,
              shopId: shop.id,
            },
          });
          console.log(`         ✅ Shop Owner created: ${shopOwner.email}`);
        }

        // ---------- SHOP EMPLOYEE ----------
        const empEmail = `emp${i}${j}@${company.name.toLowerCase().replace(' ', '')}.com`;
        let shopEmp = await prisma.user.findUnique({ where: { email: empEmail } });
        if (!shopEmp) {
          const hashedPassword = await bcrypt.hash('employee123', 10);
          shopEmp = await prisma.user.create({
            data: {
              email: empEmail,
              password: hashedPassword,
              name: `Employee ${i}-${j}`,
              role: 'SHOP_EMPLOYEE',
              companyId: company.id,
              locationId: location.id,
              shopId: shop.id,
            },
          });
          console.log(`         ✅ Shop Employee created: ${shopEmp.email}`);
        }
      }
    }

    // ---------- PRODUCTS (3 per company) ----------
    const products = [];
    for (let k = 1; k <= 3; k++) {
      const productName = `${company.name} Product ${k}`;
      let product = await prisma.product.findFirst({
        where: { name: productName, companyId: company.id },
      });
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: productName,
            sku: `${company.name.substring(0, 3).toUpperCase()}-PRD-00${k}`,
            defaultPrice: 100 + k * 10,
            shelfLifeDays: 30 + k * 10,
            companyId: company.id,
          },
        });
        console.log(`   ✅ Product created: ${product.name}`);
      }
      products.push(product);
    }

    // Helper to add stock without duplication
    async function addStock(item) {
      const exists = await prisma.stock.findFirst({
        where: {
          batchNumber: item.batchNumber,
          productId: item.productId,
          companyId: item.companyId || null,
          locationId: item.locationId || null,
          shopId: item.shopId || null,
        },
      });
      if (!exists) {
        await prisma.stock.create({ data: item });
      }
    }

    // Stock at company warehouse
    for (const product of products) {
      await addStock({
        batchNumber: `BATCH-${Date.now()}-${Math.random()}`,
        manufacturingDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        quantity: 100,
        price: product.defaultPrice,
        productId: product.id,
        companyId: company.id,
        status: 'IN_COMPANY',
      });
    }

    // Stock at locations
    for (const location of locations) {
      for (const product of products) {
        await addStock({
          batchNumber: `BATCH-${Date.now()}-${Math.random()}`,
          manufacturingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          quantity: 50,
          price: product.defaultPrice,
          productId: product.id,
          companyId: company.id,
          locationId: location.id,
          status: 'IN_LOCATION',
        });
      }
    }

    // Stock at shops (with some expiring soon)
    const shops = await prisma.shop.findMany({ where: { locationId: { in: locations.map(l => l.id) } } });
    for (const shop of shops) {
      for (const product of products) {
        const expiryDate = new Date(Date.now() + (Math.random() > 0.5 ? 5 : 30) * 24 * 60 * 60 * 1000);
        await addStock({
          batchNumber: `BATCH-${Date.now()}-${Math.random()}`,
          manufacturingDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          expiryDate,
          quantity: 20,
          price: product.defaultPrice,
          productId: product.id,
          companyId: company.id,
          locationId: shop.locationId,
          shopId: shop.id,
          status: 'IN_SHOP',
        });
      }
    }
  }

  console.log('🌱 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });