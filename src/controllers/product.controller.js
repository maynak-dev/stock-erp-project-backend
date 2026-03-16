exports.getAllProducts = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const products = await prisma.product.findMany({
      where: req.user.role === 'SUPER_ADMIN' ? {} : { companyId: req.user.companyId },
      include: { company: true },
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
      include: { company: true },
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
      include: { company: true },
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

    // FIX: Stock → ReturnItem and StockMovement reference Stock rows.
    // Stock rows reference Product. None have onDelete: Cascade in schema,
    // so we must delete child records manually in the correct FK order:
    //   ReturnItem → StockMovement → Stock → Product

    // 1. Find all stock rows for this product
    const stockRows = await prisma.stock.findMany({
      where: { productId: id },
      select: { id: true },
    });
    const stockIds = stockRows.map(s => s.id);

    if (stockIds.length > 0) {
      // 2. Delete ReturnItems that reference those stock rows
      await prisma.returnItem.deleteMany({
        where: { stockId: { in: stockIds } },
      });

      // 3. Delete StockMovements that reference those stock rows
      await prisma.stockMovement.deleteMany({
        where: { stockId: { in: stockIds } },
      });

      // 4. Delete the stock rows themselves
      await prisma.stock.deleteMany({
        where: { productId: id },
      });
    }

    // 5. Now safely delete the product
    await prisma.product.delete({ where: { id } });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};