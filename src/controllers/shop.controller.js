exports.getAllShops = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
      where.location = { companyId: req.user.companyId };
      if (req.user.locationId) where.locationId = req.user.locationId;
    }
    const shops = await prisma.shop.findMany({ where, include: { location: true } });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createShop = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const shop = await prisma.shop.create({ data: req.body });
    res.status(201).json(shop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateShop = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    const shop = await prisma.shop.update({
      where: { id },
      data: req.body
    });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteShop = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    await prisma.shop.delete({ where: { id } });
    res.json({ message: 'Shop deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};