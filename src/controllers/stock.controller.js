const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Add stock (entry from company)
exports.addStock = async (req, res) => {
  try {
    const { productId, batchNumber, manufacturingDate, expiryDate, quantity, price } = req.body;
    const user = req.user;

    let companyId = user.companyId;
    let locationId = null;
    let shopId = null;
    let status = 'IN_COMPANY';

    if (user.role === 'LOCATION_MANAGER') {
      locationId = user.locationId;
      status = 'IN_LOCATION';
    } else if (user.role === 'SHOP_OWNER' || user.role === 'SHOP_EMPLOYEE') {
      shopId = user.shopId;
      status = 'IN_SHOP';
    }

    const stock = await prisma.stock.create({
      data: {
        batchNumber,
        manufacturingDate: new Date(manufacturingDate),
        expiryDate: new Date(expiryDate),
        quantity: parseInt(quantity),
        price: parseFloat(price),
        product: { connect: { id: productId } },
        company: companyId ? { connect: { id: companyId } } : undefined,
        location: locationId ? { connect: { id: locationId } } : undefined,
        shop: shopId ? { connect: { id: shopId } } : undefined,
        status
      }
    });
    res.status(201).json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Transfer stock between levels
exports.transferStock = async (req, res) => {
  try {
    const { stockId, quantity, toType, toId } = req.body; // toType: 'LOCATION', 'SHOP'
    const user = req.user;

    const stock = await prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) return res.status(404).json({ message: 'Stock not found' });

    // Check permissions based on current location and target
    // Simplified: only allow if stock is at user's level or below
    if (stock.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient quantity' });
    }

    // Create movement record
    await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          stockId,
          fromType: stock.status,
          fromId: stock.shopId || stock.locationId || stock.companyId,
          toType,
          toId,
          quantity
        }
      }),
      prisma.stock.update({
        where: { id: stockId },
        data: { quantity: { decrement: quantity } }
      }),
      // Optionally create new stock record at destination or increase existing
      // For simplicity, we'll create new stock entry at destination
      prisma.stock.create({
        data: {
          batchNumber: stock.batchNumber,
          manufacturingDate: stock.manufacturingDate,
          expiryDate: stock.expiryDate,
          quantity,
          price: stock.price,
          productId: stock.productId,
          companyId: toType === 'COMPANY' ? toId : null,
          locationId: toType === 'LOCATION' ? toId : null,
          shopId: toType === 'SHOP' ? toId : null,
          status: toType
        }
      })
    ]);

    res.json({ message: 'Transfer successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get stock based on user scope
exports.getStock = async (req, res) => {
  try {
    const user = req.user;
    const where = {};

    if (user.role === 'SHOP_EMPLOYEE' || user.role === 'SHOP_OWNER') {
      where.shopId = user.shopId;
    } else if (user.role === 'LOCATION_MANAGER') {
      where.locationId = user.locationId;
    } else if (user.role === 'COMPANY_ADMIN') {
      where.companyId = user.companyId;
    }
    // Super admin sees all (no filter)

    const stock = await prisma.stock.findMany({
      where,
      include: { product: true, shop: true, location: true, company: true }
    });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};