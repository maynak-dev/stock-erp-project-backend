// backend/src/controllers/return.controller.js

// Get all return requests (with user scope)
exports.getAllReturns = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const user = req.user;

    const where = {};

    // Apply role-based scope
    if (user.role === 'SHOP_OWNER' || user.role === 'SHOP_EMPLOYEE') {
      where.shopId = user.shopId;
    } else if (user.role === 'LOCATION_MANAGER') {
      where.shop = { locationId: user.locationId };
    } else if (user.role === 'COMPANY_ADMIN') {
      where.shop = { location: { companyId: user.companyId } };
    }
    // SUPER_ADMIN sees all (no filter)

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

// Create a new return request (shop users only)
exports.createReturnRequest = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { items } = req.body; // [{ stockId, quantity, reason }]
    const user = req.user;

    // Only shop-level users can create returns
    if (!user.shopId) {
      return res.status(403).json({ message: 'Only shop users can create returns' });
    }

    // Generate unique request number
    const requestNumber = `RTR-${Date.now()}`;

    const returnRequest = await prisma.returnRequest.create({
      data: {
        requestNumber,
        shopId: user.shopId,
        items: {
          create: items.map(item => ({
            stockId: item.stockId,
            quantity: item.quantity,
            reason: item.reason
          }))
        }
      },
      include: { items: true }
    });

    res.status(201).json(returnRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approve a return request (company admin or super admin)
exports.approveReturn = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    const user = req.user;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        items: true,
        shop: { include: { location: true } }
      }
    });

    if (!returnRequest) return res.status(404).json({ message: 'Not found' });

    // Only company admin or above can approve
    if (user.role === 'COMPANY_ADMIN' && returnRequest.shop.location.companyId !== user.companyId) {
      return res.status(403).json({ message: 'Not your company' });
    }

    // Update status and process stock
    await prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id },
        data: { status: 'APPROVED' }
      });

      for (const item of returnRequest.items) {
        // Reduce stock at shop
        await tx.stock.update({
          where: { id: item.stockId },
          data: { quantity: { decrement: item.quantity } }
        });

        // Create returned stock at company (expired bucket)
        const originalStock = await tx.stock.findUnique({ where: { id: item.stockId } });
        await tx.stock.create({
          data: {
            batchNumber: originalStock.batchNumber,
            manufacturingDate: originalStock.manufacturingDate,
            expiryDate: originalStock.expiryDate,
            quantity: item.quantity,
            price: originalStock.price,
            productId: originalStock.productId,
            companyId: originalStock.companyId,
            status: 'RETURNED'
          }
        });
      }
    });

    res.json({ message: 'Return approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reject a return request
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

    // Only company admin or above can reject
    if (user.role === 'COMPANY_ADMIN' && returnRequest.shop.location.companyId !== user.companyId) {
      return res.status(403).json({ message: 'Not your company' });
    }

    await prisma.returnRequest.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    res.json({ message: 'Return rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};