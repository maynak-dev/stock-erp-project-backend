// No local PrismaClient import/instantiation – use from app.locals

exports.getStockReport = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma; // Get shared client
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