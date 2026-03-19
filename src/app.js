const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const authRoutes     = require('./routes/auth.routes');
const companyRoutes  = require('./routes/company.routes');
const locationRoutes = require('./routes/location.routes');
const shopRoutes     = require('./routes/shop.routes');
const userRoutes     = require('./routes/user.routes');
const productRoutes  = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');   // NEW
const stockRoutes    = require('./routes/stock.routes');
const expiryRoutes   = require('./routes/expiry.routes');
const returnRoutes   = require('./routes/return.routes');
const reportRoutes   = require('./routes/report.routes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not defined');
  process.exit(1);
}

const pool    = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

app.locals.prisma = prisma;

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',       authRoutes);
app.use('/api/companies',  companyRoutes);
app.use('/api/locations',  locationRoutes);
app.use('/api/shops',      shopRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);   
app.use('/api/stock',      stockRoutes);
app.use('/api/expiry',     expiryRoutes);
app.use('/api/returns',    returnRoutes);
app.use('/api/reports',    reportRoutes);

module.exports = app;
