require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found. Add it to your .env file.');
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────
const daysFromNow  = (d) => new Date(Date.now() + d * 86400000);
const daysAgo      = (d) => new Date(Date.now() - d * 86400000);
const hash         = (p) => bcrypt.hash(p, 10);
const pad          = (n, z = 3) => String(n).padStart(z, '0');

async function main() {
  console.log('🗑️  Clearing existing data...\n');

  // Delete in strict FK order (children first)
  await prisma.returnItem.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.location.deleteMany();
  await prisma.company.deleteMany();

  console.log('✅ All previous data removed.\n');
  console.log('🌱 Seeding fresh data...\n');

  // ─── SUPER ADMIN ──────────────────────────────────────────────────────
  const superAdmin = await prisma.user.create({
    data: {
      email:    'admin@stockerp.com',
      password: await hash('Admin@1234'),
      name:     'Super Admin',
      role:     'SUPER_ADMIN',
    },
  });
  console.log('👤 Super Admin       admin@stockerp.com       / Admin@1234');

  // ─── COMPANIES ────────────────────────────────────────────────────────
  const companiesData = [
    {
      name:    'Mio Amore',
      gst:     '19AABCU9603R1ZM',
      address: '14 Park Street, Kolkata, West Bengal 700016',
      contact: '+91 98765 43210',
      prefix:  'MIO',
      city:    'Kolkata',
    },
    {
      name:    'Monginis',
      gst:     '27AABBC1234E1ZP',
      address: '42 Hill Road, Bandra West, Mumbai 400050',
      contact: '+91 98765 43211',
      prefix:  'MON',
      city:    'Mumbai',
    },
    {
      name:    'Kookie Jar',
      gst:     '29AADCK5678F1ZQ',
      address: '7 Church Street, Bengaluru, Karnataka 560001',
      contact: '+91 98765 43212',
      prefix:  'KKJ',
      city:    'Bengaluru',
    },
  ];

  for (const [ci, compData] of companiesData.entries()) {
    const { prefix, city, ...coreData } = compData;

    const company = await prisma.company.create({ data: coreData });
    console.log(`\n🏢 Company: ${company.name}`);

    // Company Admin
    const compAdmin = await prisma.user.create({
      data: {
        email:     `admin@${prefix.toLowerCase()}.com`,
        password:  await hash('Company@1234'),
        name:      `${company.name} Admin`,
        role:      'COMPANY_ADMIN',
        companyId: company.id,
      },
    });
    console.log(`   👤 Company Admin     ${compAdmin.email}   / Company@1234`);

    // ─── PRODUCTS (4 per company) ────────────────────────────────────
    const productDefs = [
      { suffix: 'Chocolate Cake',  sku: `${prefix}-CHOC-001`, price: 450,  shelf: 7  },
      { suffix: 'Butter Cookies',  sku: `${prefix}-COOK-002`, price: 120,  shelf: 60 },
      { suffix: 'Cream Puff',      sku: `${prefix}-CRMP-003`, price: 85,   shelf: 3  },
      { suffix: 'Fruit Tart',      sku: `${prefix}-TART-004`, price: 220,  shelf: 5  },
    ];

    const products = [];
    for (const pd of productDefs) {
      const product = await prisma.product.create({
        data: {
          name:          `${company.name} ${pd.suffix}`,
          sku:           pd.sku,
          defaultPrice:  pd.price,
          shelfLifeDays: pd.shelf,
          companyId:     company.id,
        },
      });
      products.push({ ...product, price: pd.price });
    }
    console.log(`   📦 ${products.length} products created`);

    // ─── LOCATIONS (3 per company) ────────────────────────────────────
    const locationNames = [
      `${city} Central Hub`,
      `${city} North Depot`,
      `${city} East Warehouse`,
    ];

    const locations = [];
    for (const [li, locName] of locationNames.entries()) {
      const location = await prisma.location.create({
        data: {
          name:      locName,
          address:   `Warehouse ${li + 1}, Industrial Area, ${city}`,
          companyId: company.id,
        },
      });
      locations.push(location);

      // Location Manager
      const locMgr = await prisma.user.create({
        data: {
          email:      `mgr.loc${li + 1}@${prefix.toLowerCase()}.com`,
          password:   await hash('Location@1234'),
          name:       `${locName} Manager`,
          role:       'LOCATION_MANAGER',
          companyId:  company.id,
          locationId: location.id,
        },
      });

      // ─── SHOPS (2 per location) ──────────────────────────────────
      const shopAreas = ['Main Market', 'Mall Outlet'];
      for (const [si, area] of shopAreas.entries()) {
        const shop = await prisma.shop.create({
          data: {
            name:       `${company.name} — ${locName.split(' ').slice(-1)[0]} ${area}`,
            address:    `Shop ${si + 1}, ${area}, ${city}`,
            locationId: location.id,
          },
        });

        // Shop Owner
        await prisma.user.create({
          data: {
            email:      `owner.l${li + 1}s${si + 1}@${prefix.toLowerCase()}.com`,
            password:   await hash('Shop@1234'),
            name:       `${shop.name} Owner`,
            role:       'SHOP_OWNER',
            companyId:  company.id,
            locationId: location.id,
            shopId:     shop.id,
          },
        });

        // Shop Employee
        await prisma.user.create({
          data: {
            email:      `emp.l${li + 1}s${si + 1}@${prefix.toLowerCase()}.com`,
            password:   await hash('Employee@1234'),
            name:       `${shop.name} Staff`,
            role:       'SHOP_EMPLOYEE',
            companyId:  company.id,
            locationId: location.id,
            shopId:     shop.id,
          },
        });

        // ── Stock IN SHOP ──────────────────────────────────────────
        for (const [pi, product] of products.entries()) {
          // Mix of fresh, near-expiry, and already-expired batches
          const batchScenarios = [
            { daysExp: 2,   qty: 15, label: 'NEAR' },   // expiring in 2 days
            { daysExp: 25,  qty: 30, label: 'GOOD' },   // normal stock
          ];
          for (const s of batchScenarios) {
            await prisma.stock.create({
              data: {
                batchNumber:       `${prefix}-SHOP-${pad(li+1)}-${pad(si+1)}-${pad(pi+1)}-${s.label}`,
                manufacturingDate: daysAgo(product.shelfLifeDays + 10),
                expiryDate:        daysFromNow(s.daysExp),
                quantity:          s.qty,
                price:             product.price,
                productId:         product.id,
                companyId:         company.id,
                locationId:        location.id,
                shopId:            shop.id,
                status:            'IN_SHOP',
              },
            });
          }
        }
      }

      // ── Stock IN LOCATION ────────────────────────────────────────
      for (const [pi, product] of products.entries()) {
        await prisma.stock.create({
          data: {
            batchNumber:       `${prefix}-LOC-${pad(li+1)}-${pad(pi+1)}-MAIN`,
            manufacturingDate: daysAgo(20),
            expiryDate:        daysFromNow(40),
            quantity:          150,
            price:             product.price,
            productId:         product.id,
            companyId:         company.id,
            locationId:        location.id,
            status:            'IN_LOCATION',
          },
        });
        // A second batch expiring in 5 days
        await prisma.stock.create({
          data: {
            batchNumber:       `${prefix}-LOC-${pad(li+1)}-${pad(pi+1)}-WARN`,
            manufacturingDate: daysAgo(product.shelfLifeDays - 5),
            expiryDate:        daysFromNow(5),
            quantity:          40,
            price:             product.price,
            productId:         product.id,
            companyId:         company.id,
            locationId:        location.id,
            status:            'IN_LOCATION',
          },
        });
      }
    }

    // ── Stock IN COMPANY warehouse ───────────────────────────────────
    for (const [pi, product] of products.entries()) {
      await prisma.stock.create({
        data: {
          batchNumber:       `${prefix}-WH-MASTER-${pad(pi+1)}-A`,
          manufacturingDate: daysAgo(5),
          expiryDate:        daysFromNow(90),
          quantity:          500,
          price:             product.price,
          productId:         product.id,
          companyId:         company.id,
          status:            'IN_COMPANY',
        },
      });
      await prisma.stock.create({
        data: {
          batchNumber:       `${prefix}-WH-MASTER-${pad(pi+1)}-B`,
          manufacturingDate: daysAgo(45),
          expiryDate:        daysFromNow(6),   // expiring in 6 days — shows in alerts
          quantity:          60,
          price:             product.price,
          productId:         product.id,
          companyId:         company.id,
          status:            'IN_COMPANY',
        },
      });
    }

    // ── Return Requests ──────────────────────────────────────────────
    const allShops = await prisma.shop.findMany({
      where: { location: { companyId: company.id } },
    });
    const shopStock = await prisma.stock.findMany({
      where: { shopId: allShops[0].id },
      take:  2,
    });

    if (shopStock.length >= 2) {
      // PENDING return
      await prisma.returnRequest.create({
        data: {
          requestNumber: `RET-${prefix}-${pad(ci + 1)}-001`,
          shopId:        allShops[0].id,
          status:        'PENDING',
          items: {
            create: [
              { stockId: shopStock[0].id, quantity: 5,  reason: 'Near expiry' },
              { stockId: shopStock[1].id, quantity: 3,  reason: 'Damaged packaging' },
            ],
          },
        },
      });

      // APPROVED return
      await prisma.returnRequest.create({
        data: {
          requestNumber: `RET-${prefix}-${pad(ci + 1)}-002`,
          shopId:        allShops[0].id,
          status:        'APPROVED',
          items: {
            create: [
              { stockId: shopStock[0].id, quantity: 2, reason: 'Overstock' },
            ],
          },
        },
      });

      // COMPLETED return (second shop if available)
      if (allShops.length >= 2) {
        const shop2Stock = await prisma.stock.findMany({
          where: { shopId: allShops[1].id },
          take:  1,
        });
        if (shop2Stock.length) {
          await prisma.returnRequest.create({
            data: {
              requestNumber: `RET-${prefix}-${pad(ci + 1)}-003`,
              shopId:        allShops[1].id,
              status:        'COMPLETED',
              items: {
                create: [
                  { stockId: shop2Stock[0].id, quantity: 4, reason: 'Quality issue' },
                ],
              },
            },
          });
        }
      }
    }

    console.log(`   ✅ ${locations.length} locations, ${locations.length * 2} shops, stock & returns seeded`);
  }

  // ─── SUMMARY ──────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 Seeding complete!\n');

  const counts = await Promise.all([
    prisma.company.count(),
    prisma.location.count(),
    prisma.shop.count(),
    prisma.user.count(),
    prisma.product.count(),
    prisma.stock.count(),
    prisma.returnRequest.count(),
  ]);
  console.log(`   Companies  : ${counts[0]}`);
  console.log(`   Locations  : ${counts[1]}`);
  console.log(`   Shops      : ${counts[2]}`);
  console.log(`   Users      : ${counts[3]}`);
  console.log(`   Products   : ${counts[4]}`);
  console.log(`   Stock rows : ${counts[5]}`);
  console.log(`   Returns    : ${counts[6]}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Login Credentials\n');
  console.log('   Super Admin   admin@stockerp.com        Admin@1234');
  console.log('   Company Admin admin@mio.com             Company@1234');
  console.log('   Company Admin admin@mon.com             Company@1234');
  console.log('   Company Admin admin@kkj.com             Company@1234');
  console.log('   Loc Manager   mgr.loc1@mio.com          Location@1234');
  console.log('   Shop Owner    owner.l1s1@mio.com        Shop@1234');
  console.log('   Shop Employee emp.l1s1@mio.com          Employee@1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => { console.error('❌ Seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });