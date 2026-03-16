const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
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

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

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

const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;