// Existing getStockReport function (keep it)
exports.getStockReport = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const user = req.user;
    const { companyId, locationId, shopId } = req.query;

    const where = {};
    if (companyId) where.companyId = companyId;
    if (locationId) where.locationId = locationId;
    if (shopId) where.shopId = shopId;

    // Apply user scope
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId;
      if (user.locationId) where.locationId = user.locationId;
      if (user.shopId) where.shopId = user.shopId;
    }

    const stock = await prisma.stock.groupBy({
      by: ['productId', 'status'],
      where,
      _sum: { quantity: true }
    });

    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// New: Expiry Report – returns expiring stock within a date range
exports.getExpiryReport = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const user = req.user;
    const { startDate, endDate, companyId, locationId, shopId } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.expiryDate = {};
      if (startDate) where.expiryDate.gte = new Date(startDate);
      if (endDate) where.expiryDate.lte = new Date(endDate);
    }
    if (companyId) where.companyId = companyId;
    if (locationId) where.locationId = locationId;
    if (shopId) where.shopId = shopId;

    // Apply user scope
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId;
      if (user.locationId) where.locationId = user.locationId;
      if (user.shopId) where.shopId = user.shopId;
    }

    const expiring = await prisma.stock.findMany({
      where,
      include: { product: true, shop: true, location: true, company: true },
      orderBy: { expiryDate: 'asc' }
    });

    res.json(expiring);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// New: Return Report – lists all return requests with optional filters
exports.getReturnReport = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const user = req.user;
    const { status, startDate, endDate, shopId, companyId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (shopId) where.shopId = shopId;

    // Apply company scope via shop relation
    if (user.role !== 'SUPER_ADMIN') {
      where.shop = { location: { companyId: user.companyId } };
    }

    const returns = await prisma.returnRequest.findMany({
      where,
      include: { 
        shop: { include: { location: true } },
        items: { include: { stock: { include: { product: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(returns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// New: Sales Report – if you have sales/billing module (placeholder)
exports.getSalesReport = async (req, res) => {
  try {
    // Placeholder: If you have a sales module, implement here.
    // For now, return a message or empty array.
    res.json({ message: 'Sales report not implemented yet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};