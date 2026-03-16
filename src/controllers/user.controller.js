exports.getAllUsers = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
      where.companyId = req.user.companyId;
    }
    const users = await prisma.user.findMany({
      where,
      include: { company: true, location: true, shop: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const hashedPassword = await require('bcryptjs').hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: { ...req.body, password: hashedPassword }
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    const data = { ...req.body };
    if (data.password) {
      data.password = await require('bcryptjs').hash(data.password, 10);
    }
    const user = await prisma.user.update({
      where: { id },
      data
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};