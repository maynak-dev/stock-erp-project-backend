// No local PrismaClient import/instantiation – use from app.locals

exports.getExpiringStock = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma; // Get shared client
    const user = req.user;
    const days = parseInt(req.query.days) || 7; // default 7 days

    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    const where = {
      expiryDate: { lte: future, gte: now },
      quantity: { gt: 0 }
    };

    // Apply scope based on user role
    if (user.role === 'SHOP_EMPLOYEE' || user.role === 'SHOP_OWNER') {
      where.shopId = user.shopId;
    } else if (user.role === 'LOCATION_MANAGER') {
      where.locationId = user.locationId;
    } else if (user.role === 'COMPANY_ADMIN') {
      where.companyId = user.companyId;
    }
    // SUPER_ADMIN sees all (no extra filter)

    const expiring = await prisma.stock.findMany({
      where,
      include: { product: true, shop: true }
    });

    res.json(expiring);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};