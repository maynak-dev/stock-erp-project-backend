exports.getAllLocations = async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
      where.companyId = req.user.companyId;
    }
    const locations = await prisma.location.findMany({ where });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};