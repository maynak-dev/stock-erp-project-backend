const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Import route files
const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/company.routes');
const locationRoutes = require('./routes/location.routes');
const shopRoutes = require('./routes/shop.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const stockRoutes = require('./routes/stock.routes');
const expiryRoutes = require('./routes/expiry.routes');
const returnRoutes = require('./routes/return.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Setup Prisma Client with PostgreSQL adapter (required for Prisma 7)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Attach prisma to app.locals so it can be used in controllers
app.locals.prisma = prisma;

// Health check endpoint (optional)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/reports', reportRoutes);

// Export for Vercel serverless
module.exports = app;