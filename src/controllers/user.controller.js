const bcrypt = require('bcryptjs');

// Default permissions by role
const defaultPermissions = (role) => ({
  canViewProducts:   true,
  canCreateProducts: ['SUPER_ADMIN','COMPANY_ADMIN'].includes(role),
  canEditProducts:   ['SUPER_ADMIN','COMPANY_ADMIN'].includes(role),
  canDeleteProducts: ['SUPER_ADMIN','COMPANY_ADMIN'].includes(role),

  canViewStock:     true,
  canAddStock:      ['SUPER_ADMIN','COMPANY_ADMIN','LOCATION_MANAGER','SHOP_OWNER'].includes(role),
  canTransferStock: ['SUPER_ADMIN','COMPANY_ADMIN','LOCATION_MANAGER'].includes(role),

  canViewReturns:    true,
  canCreateReturns:  ['SHOP_OWNER','SHOP_EMPLOYEE'].includes(role),
  canApproveReturns: ['SUPER_ADMIN','COMPANY_ADMIN'].includes(role),

  canViewReports: true,

  canViewUsers:   ['SUPER_ADMIN','COMPANY_ADMIN','LOCATION_MANAGER'].includes(role),
  canManageUsers: ['SUPER_ADMIN','COMPANY_ADMIN'].includes(role),
});

exports.getAllUsers = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') where.companyId = req.user.companyId;
    const users = await prisma.user.findMany({
      where,
      include: { company: true, location: true, shop: true, permissions: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { permissions, ...userData } = req.body;
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        // Create permissions — use custom if SUPER_ADMIN provided them, else defaults
        permissions: {
          create: permissions ?? defaultPermissions(userData.role),
        },
      },
      include: { company: true, location: true, shop: true, permissions: true },
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
    const { permissions, ...userData } = req.body;

    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    } else {
      delete userData.password;
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...userData,
        // Upsert permissions if provided
        ...(permissions && {
          permissions: {
            upsert: {
              create: permissions,
              update: permissions,
            },
          },
        }),
      },
      include: { company: true, location: true, shop: true, permissions: true },
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
    // UserPermission cascades via onDelete: Cascade in schema
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
