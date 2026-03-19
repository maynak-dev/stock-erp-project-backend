require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg }     = require('@prisma/adapter-pg');
const { Pool }         = require('pg');
const bcrypt           = require('bcryptjs');

// Set up the PostgreSQL connection pool using your DATABASE_URL
const connectionString = process.env.DATABASE_URL;
const pool    = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────
const daysFromNow = (d) => new Date(Date.now() + d * 86400000);
const daysAgo     = (d) => new Date(Date.now() - d * 86400000);
const hash        = (p)  => bcrypt.hash(p, 10);
const pad         = (n)  => String(n).padStart(3, '0');
const slug        = (s)  => s.toLowerCase().replace(/\s+/g, '');

// ─── Default permissions by role ──────────────────────────────────────────
const defaultPermissions = (role) => ({
  canViewProducts:   true,
  canCreateProducts: ['SUPER_ADMIN','COMPANY_ADMIN'].includes(role),
  canEditProducts:   ['SUPER_ADMIN','COMPANY_ADMIN'].includes(role),
  canDeleteProducts: ['SUPER_ADMIN','COMPANY_ADMIN'].includes(role),
  canViewStock:      true,
  canAddStock:       ['SUPER_ADMIN','COMPANY_ADMIN','LOCATION_MANAGER','SHOP_OWNER'].includes(role),
  canTransferStock:  ['SUPER_ADMIN','COMPANY_ADMIN','LOCATION_MANAGER'].includes(role),
  canViewReturns:    true,
  canCreateReturns:  ['SHOP_OWNER','SHOP_EMPLOYEE'].includes(role),
  canApproveReturns: ['SUPER_ADMIN','COMPANY_ADMIN'].includes(role),
  canViewReports:    true,
  canViewUsers:      ['SUPER_ADMIN','COMPANY_ADMIN','LOCATION_MANAGER'].includes(role),
  canManageUsers:    ['SUPER_ADMIN','COMPANY_ADMIN'].includes(role),
});

// ─── Create user with permissions ─────────────────────────────────────────
const createUser = async (data) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      ...data,
      password: await hash(data.password),
      permissions: { create: defaultPermissions(data.role) },
    },
  });
};

async function main() {
  console.log('🌱 Seeding database...');

  // ── Wipe all data ──────────────────────────────────────────────────────
  console.log('🗑️  Clearing existing data...');
  const safe = async (fn) => { try { await fn(); } catch (_) {} };
  await safe(() => prisma.returnItem.deleteMany());
  await safe(() => prisma.returnRequest.deleteMany());
  await safe(() => prisma.stockMovement.deleteMany());
  await safe(() => prisma.stock.deleteMany());
  await safe(() => prisma.product.deleteMany());
  await safe(() => prisma.category.deleteMany());
  await safe(() => prisma.userPermission.deleteMany());
  await safe(() => prisma.user.deleteMany());
  await safe(() => prisma.shop.deleteMany());
  await safe(() => prisma.location.deleteMany());
  await safe(() => prisma.company.deleteMany());
  console.log('✅ All previous data removed.');

  // ── Super Admin ────────────────────────────────────────────────────────
  await createUser({
    email: 'admin@stockerp.com', password: 'Admin@1234',
    name: 'Super Admin', role: 'SUPER_ADMIN',
  });
  console.log('✅ Super Admin created → admin@stockerp.com / Admin@1234');

  // ── Companies ──────────────────────────────────────────────────────────
  const companiesData = [
    {
      name: 'Mio Amore', gst: '19AABCU9603R1ZM',
      address: '14 Park Street, Kolkata, West Bengal 700016',
      contact: '+91 98765 43210', prefix: 'MIO', city: 'Kolkata',
      categoryDefs: [
        { name: 'Cakes',    description: 'Celebration and premium cakes' },
        { name: 'Pastries', description: 'Fresh cream and baked pastries' },
        { name: 'Cookies',  description: 'Butter and chocolate chip cookies' },
        { name: 'Breads',   description: 'Artisan and sandwich breads' },
      ],
      productDefs: [
        { suffix: 'Chocolate Truffle Cake', sku: 'MIO-CAKE-001', price: 650, shelf: 5,  cat: 'Cakes'    },
        { suffix: 'Black Forest Cake',      sku: 'MIO-CAKE-002', price: 550, shelf: 4,  cat: 'Cakes'    },
        { suffix: 'Cream Puff',             sku: 'MIO-PAST-001', price: 85,  shelf: 2,  cat: 'Pastries' },
        { suffix: 'Eclair',                 sku: 'MIO-PAST-002', price: 75,  shelf: 2,  cat: 'Pastries' },
        { suffix: 'Butter Cookies 200g',    sku: 'MIO-COOK-001', price: 120, shelf: 60, cat: 'Cookies'  },
        { suffix: 'Sourdough Loaf',         sku: 'MIO-BREA-001', price: 180, shelf: 3,  cat: 'Breads'   },
      ],
    },
    {
      name: 'Monginis', gst: '27AABBC1234E1ZP',
      address: '42 Hill Road, Bandra West, Mumbai 400050',
      contact: '+91 98765 43211', prefix: 'MON', city: 'Mumbai',
      categoryDefs: [
        { name: 'Cakes',     description: 'Designer and custom cakes' },
        { name: 'Muffins',   description: 'American-style muffins' },
        { name: 'Cookies',   description: 'Crunchy and soft-baked cookies' },
        { name: 'Savouries', description: 'Sandwiches, puffs and savory bites' },
      ],
      productDefs: [
        { suffix: 'Pineapple Cake',        sku: 'MON-CAKE-001', price: 480, shelf: 5,  cat: 'Cakes'     },
        { suffix: 'Red Velvet Cake',       sku: 'MON-CAKE-002', price: 580, shelf: 4,  cat: 'Cakes'     },
        { suffix: 'Blueberry Muffin',      sku: 'MON-MUFF-001', price: 65,  shelf: 3,  cat: 'Muffins'   },
        { suffix: 'Choco Chip Muffin',     sku: 'MON-MUFF-002', price: 60,  shelf: 3,  cat: 'Muffins'   },
        { suffix: 'Almond Crunch Cookies', sku: 'MON-COOK-001', price: 110, shelf: 45, cat: 'Cookies'   },
        { suffix: 'Veg Puff',              sku: 'MON-SAVR-001', price: 35,  shelf: 1,  cat: 'Savouries' },
      ],
    },
    {
      name: 'Kookie Jar', gst: '29AADCK5678F1ZQ',
      address: '7 Church Street, Bengaluru, Karnataka 560001',
      contact: '+91 98765 43212', prefix: 'KKJ', city: 'Bengaluru',
      categoryDefs: [
        { name: 'Signature Cookies', description: 'Premium hand-crafted cookies' },
        { name: 'Gift Hampers',      description: 'Curated gift boxes and hampers' },
        { name: 'Brownies',          description: 'Fudge and walnut brownies' },
        { name: 'Cakes',             description: 'Celebration cakes' },
      ],
      productDefs: [
        { suffix: 'Classic Choco Chip Cookie', sku: 'KKJ-COOK-001', price: 180,  shelf: 30, cat: 'Signature Cookies' },
        { suffix: 'Oatmeal Raisin Cookie',     sku: 'KKJ-COOK-002', price: 160,  shelf: 30, cat: 'Signature Cookies' },
        { suffix: 'Assorted Cookie Box 500g',  sku: 'KKJ-GIFT-001', price: 450,  shelf: 45, cat: 'Gift Hampers'      },
        { suffix: 'Premium Gift Hamper',       sku: 'KKJ-GIFT-002', price: 1200, shelf: 30, cat: 'Gift Hampers'      },
        { suffix: 'Walnut Brownie',            sku: 'KKJ-BROW-001', price: 90,   shelf: 7,  cat: 'Brownies'          },
        { suffix: 'Nutella Cake',              sku: 'KKJ-CAKE-001', price: 700,  shelf: 5,  cat: 'Cakes'             },
      ],
    },
  ];

  for (const [ci, compDef] of companiesData.entries()) {
    const { prefix, city, categoryDefs, productDefs, ...coreData } = compDef;

    const company = await prisma.company.create({ data: coreData });
    console.log(`
✅ Company: ${company.name}`);

    // Company Admin
    await createUser({
      email: `admin@${slug(company.name)}.com`, password: 'Company@1234',
      name: `${company.name} Admin`, role: 'COMPANY_ADMIN', companyId: company.id,
    });
    console.log(`   ✅ Company Admin → admin@${slug(company.name)}.com / Company@1234`);

    // Categories
    const categoryMap = {};
    for (const catDef of categoryDefs) {
      const cat = await prisma.category.create({
        data: { name: catDef.name, description: catDef.description, companyId: company.id },
      });
      categoryMap[cat.name] = cat.id;
    }
    console.log(`   ✅ ${categoryDefs.length} categories created`);

    // Products
    const products = [];
    for (const pd of productDefs) {
      const product = await prisma.product.create({
        data: {
          name: `${company.name} ${pd.suffix}`, sku: pd.sku,
          defaultPrice: pd.price, shelfLifeDays: pd.shelf,
          companyId: company.id,
          categoryId: categoryMap[pd.cat] ?? null,
        },
      });
      products.push({ ...product, shelfDays: pd.shelf });
    }
    console.log(`   ✅ ${products.length} products created`);

    // Locations (3 per company)
    const locationNames = [
      `${city} Central Hub`,
      `${city} North Depot`,
      `${city} East Warehouse`,
    ];
    const locations = [];

    for (const [li, locName] of locationNames.entries()) {
      const location = await prisma.location.create({
        data: { name: locName, address: `Warehouse ${li+1}, Industrial Area, ${city}`, companyId: company.id },
      });
      locations.push(location);

      await createUser({
        email: `mgr.loc${li+1}@${slug(company.name)}.com`, password: 'Location@1234',
        name: `${locName} Manager`, role: 'LOCATION_MANAGER',
        companyId: company.id, locationId: location.id,
      });

      // Shops (2 per location)
      for (const [si, area] of ['Main Market', 'Mall Outlet'].entries()) {
        const shop = await prisma.shop.create({
          data: {
            name: `${company.name} — ${locName.split(' ').slice(-1)[0]} ${area}`,
            address: `Shop ${si+1}, ${area}, ${city}`,
            locationId: location.id,
          },
        });

        await createUser({
          email: `owner.l${li+1}s${si+1}@${slug(company.name)}.com`, password: 'Shop@1234',
          name: `${shop.name} Owner`, role: 'SHOP_OWNER',
          companyId: company.id, locationId: location.id, shopId: shop.id,
        });
        await createUser({
          email: `emp.l${li+1}s${si+1}@${slug(company.name)}.com`, password: 'Employee@1234',
          name: `${shop.name} Staff`, role: 'SHOP_EMPLOYEE',
          companyId: company.id, locationId: location.id, shopId: shop.id,
        });

        // Stock IN SHOP
        for (const [pi, product] of products.entries()) {
          // Near-expiry batch (shows in alerts)
          await prisma.stock.create({ data: {
            batchNumber: `${prefix}-SHOP-L${li+1}S${si+1}-P${pad(pi+1)}-WARN`,
            manufacturingDate: daysAgo(product.shelfDays - 3),
            expiryDate: daysFromNow(3),
            quantity: 12, price: product.defaultPrice,
            productId: product.id, companyId: company.id,
            locationId: location.id, shopId: shop.id, status: 'IN_SHOP',
          }});
          // Healthy batch
          await prisma.stock.create({ data: {
            batchNumber: `${prefix}-SHOP-L${li+1}S${si+1}-P${pad(pi+1)}-GOOD`,
            manufacturingDate: daysAgo(5),
            expiryDate: daysFromNow(product.shelfDays - 5),
            quantity: 30, price: product.defaultPrice,
            productId: product.id, companyId: company.id,
            locationId: location.id, shopId: shop.id, status: 'IN_SHOP',
          }});
        }
      }

      // Stock IN LOCATION
      for (const [pi, product] of products.entries()) {
        await prisma.stock.create({ data: {
          batchNumber: `${prefix}-LOC-L${li+1}-P${pad(pi+1)}-MAIN`,
          manufacturingDate: daysAgo(15), expiryDate: daysFromNow(product.shelfDays),
          quantity: 150, price: product.defaultPrice,
          productId: product.id, companyId: company.id,
          locationId: location.id, status: 'IN_LOCATION',
        }});
        await prisma.stock.create({ data: {
          batchNumber: `${prefix}-LOC-L${li+1}-P${pad(pi+1)}-WARN`,
          manufacturingDate: daysAgo(product.shelfDays - 6), expiryDate: daysFromNow(6),
          quantity: 40, price: product.defaultPrice,
          productId: product.id, companyId: company.id,
          locationId: location.id, status: 'IN_LOCATION',
        }});
      }
    }

    // Stock IN COMPANY warehouse
    for (const [pi, product] of products.entries()) {
      await prisma.stock.create({ data: {
        batchNumber: `${prefix}-WH-P${pad(pi+1)}-A`,
        manufacturingDate: daysAgo(3), expiryDate: daysFromNow(product.shelfDays),
        quantity: 500, price: product.defaultPrice,
        productId: product.id, companyId: company.id, status: 'IN_COMPANY',
      }});
      await prisma.stock.create({ data: {
        batchNumber: `${prefix}-WH-P${pad(pi+1)}-B`,
        manufacturingDate: daysAgo(product.shelfDays - 5), expiryDate: daysFromNow(5),
        quantity: 80, price: product.defaultPrice,
        productId: product.id, companyId: company.id, status: 'IN_COMPANY',
      }});
    }

    // Return requests
    const allShops = await prisma.shop.findMany({
      where: { location: { companyId: company.id } },
    });
    for (const [ri, shop] of allShops.slice(0, 2).entries()) {
      const shopStock = await prisma.stock.findMany({ where: { shopId: shop.id }, take: 2 });
      if (!shopStock.length) continue;
      await prisma.returnRequest.create({
        data: {
          requestNumber: `RET-${prefix}-${pad(ci+1)}-${pad(ri+1)}`,
          shopId: shop.id,
          status: ['PENDING','APPROVED','COMPLETED'][ri % 3],
          items: {
            create: shopStock.slice(0, 2).map((s, idx) => ({
              stockId: s.id, quantity: idx === 0 ? 5 : 3,
              reason: idx === 0 ? 'Near expiry' : 'Damaged packaging',
            })),
          },
        },
      });
    }

    console.log(`   ✅ ${locations.length} locations, ${locations.length * 2} shops, stock & returns seeded`);
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const [cos, locs, shops, users, cats, prods, stocks, rets, perms] = await Promise.all([
    prisma.company.count(), prisma.location.count(), prisma.shop.count(),
    prisma.user.count(), prisma.category.count(), prisma.product.count(),
    prisma.stock.count(), prisma.returnRequest.count(), prisma.userPermission.count(),
  ]);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 Seeding complete!');
  console.log(`   Companies   : ${cos}   Locations : ${locs}   Shops    : ${shops}`);
  console.log(`   Users       : ${users}   Permissions: ${perms}`);
  console.log(`   Categories  : ${cats}   Products  : ${prods}`);
  console.log(`   Stock rows  : ${stocks}   Returns  : ${rets}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Credentials');
  console.log('   Super Admin     admin@stockerp.com          Admin@1234');
  console.log('   Company Admin   admin@mioamore.com          Company@1234');
  console.log('   Company Admin   admin@monginis.com          Company@1234');
  console.log('   Company Admin   admin@kookiejar.com         Company@1234');
  console.log('   Loc Manager     mgr.loc1@mioamore.com       Location@1234');
  console.log('   Shop Owner      owner.l1s1@mioamore.com     Shop@1234');
  console.log('   Shop Employee   emp.l1s1@mioamore.com       Employee@1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error('❌ Seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });