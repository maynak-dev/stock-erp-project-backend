exports.getAllProducts = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const products = await prisma.product.findMany({
      where: req.user.role === 'SUPER_ADMIN' ? {} : { companyId: req.user.companyId },
      include: { company: true, category: true },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const product = await prisma.product.create({
      data: req.body,
      include: { company: true, category: true },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    const product = await prisma.product.update({
      where: { id },
      data: req.body,
      include: { company: true, category: true },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    const stockRows = await prisma.stock.findMany({ where: { productId: id }, select: { id: true } });
    const stockIds = stockRows.map(s => s.id);
    if (stockIds.length > 0) {
      await prisma.returnItem.deleteMany({ where: { stockId: { in: stockIds } } });
      await prisma.stockMovement.deleteMany({ where: { stockId: { in: stockIds } } });
      await prisma.stock.deleteMany({ where: { productId: id } });
    }
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
