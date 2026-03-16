// backend/src/controllers/return.controller.js

// ✅ 1. getAllReturns
exports.getAllReturns = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const user = req.user;
    const where = {};

    if (user.role === 'SHOP_OWNER' || user.role === 'SHOP_EMPLOYEE') {
      where.shopId = user.shopId;
    } else if (user.role === 'LOCATION_MANAGER') {
      where.shop = { locationId: user.locationId };
    } else if (user.role === 'COMPANY_ADMIN') {
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

// ✅ 2. createReturnRequest
exports.createReturnRequest = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { items } = req.body;
    const user = req.user;
    if (!user.shopId) {
      return res.status(403).json({ message: 'Only shop users can create returns' });
    }
    const requestNumber = `RTR-${Date.now()}`;
    const returnRequest = await prisma.returnRequest.create({
      data: {
        requestNumber,
        shopId: user.shopId,
        items: { create: items.map(item => ({ stockId: item.stockId, quantity: item.quantity, reason: item.reason })) }
      },
      include: { items: true }
    });
    res.status(201).json(returnRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 3. approveReturn
exports.approveReturn = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    const user = req.user;
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: { items: true, shop: { include: { location: true } } }
    });
    if (!returnRequest) return res.status(404).json({ message: 'Not found' });
    if (user.role === 'COMPANY_ADMIN' && returnRequest.shop.location.companyId !== user.companyId) {
      return res.status(403).json({ message: 'Not your company' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({ where: { id }, data: { status: 'APPROVED' } });
      for (const item of returnRequest.items) {
        await tx.stock.update({ where: { id: item.stockId }, data: { quantity: { decrement: item.quantity } } });
        const originalStock = await tx.stock.findUnique({ where: { id: item.stockId } });
        await tx.stock.create({ data: { ...originalStock, id: undefined, quantity: item.quantity, status: 'RETURNED' } });
      }
    });
    res.json({ message: 'Return approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 4. rejectReturn
exports.rejectReturn = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    const user = req.user;
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: { shop: { include: { location: true } } }
    });
    if (!returnRequest) return res.status(404).json({ message: 'Not found' });
    if (user.role === 'COMPANY_ADMIN' && returnRequest.shop.location.companyId !== user.companyId) {
      return res.status(403).json({ message: 'Not your company' });
    }
    await prisma.returnRequest.update({ where: { id }, data: { status: 'REJECTED' } });
    res.json({ message: 'Return rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};