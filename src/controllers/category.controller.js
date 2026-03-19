exports.getAllCategories = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const where  = req.user.role === 'SUPER_ADMIN' ? {} : { companyId: req.user.companyId };
    const categories = await prisma.category.findMany({
      where,
      include: { company: true, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const data   = { ...req.body };
    if (req.user.role !== 'SUPER_ADMIN') data.companyId = req.user.companyId;
    const category = await prisma.category.create({
      data,
      include: { company: true, _count: { select: { products: true } } },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    const category = await prisma.category.update({
      where: { id },
      data:  req.body,
      include: { company: true, _count: { select: { products: true } } },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    // Unlink products first so they don't get cascade-deleted
    await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
