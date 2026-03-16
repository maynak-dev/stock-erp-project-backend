// backend/src/controllers/location.controller.js

// Get all locations (with user scope)
exports.getAllLocations = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
      where.companyId = req.user.companyId;
    }
    const locations = await prisma.location.findMany({
      where,
      include: { company: true },   // FIX: include nested company so frontend can show company name
      orderBy: { name: 'asc' },
    });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new location
exports.createLocation = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const data = req.body;
    if (req.user.role !== 'SUPER_ADMIN') {
      data.companyId = req.user.companyId;
    }
    const location = await prisma.location.create({
      data,
      include: { company: true },
    });
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a location
exports.updateLocation = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    const data = req.body;
    if (req.user.role !== 'SUPER_ADMIN') {
      delete data.companyId;
    }
    const location = await prisma.location.update({
      where: { id },
      data,
      include: { company: true },
    });
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a location
exports.deleteLocation = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    await prisma.location.delete({ where: { id } });
    res.json({ message: 'Location deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};