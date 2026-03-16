// No local PrismaClient import/instantiation – use from app.locals

exports.createReturnRequest = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma; // Get shared client
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

exports.approveReturn = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma; // Get shared client
    const { id } = req.params;
    const user = req.user;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: { 
        items: true,
        shop: { include: { location: true } } // Added to check companyId
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