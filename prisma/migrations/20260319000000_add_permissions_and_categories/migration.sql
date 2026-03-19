-- CreateTable: Category
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserPermission
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canViewProducts" BOOLEAN NOT NULL DEFAULT true,
    "canCreateProducts" BOOLEAN NOT NULL DEFAULT false,
    "canEditProducts" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteProducts" BOOLEAN NOT NULL DEFAULT false,
    "canViewStock" BOOLEAN NOT NULL DEFAULT true,
    "canAddStock" BOOLEAN NOT NULL DEFAULT false,
    "canTransferStock" BOOLEAN NOT NULL DEFAULT false,
    "canViewReturns" BOOLEAN NOT NULL DEFAULT true,
    "canCreateReturns" BOOLEAN NOT NULL DEFAULT false,
    "canApproveReturns" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT true,
    "canViewUsers" BOOLEAN NOT NULL DEFAULT false,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- Add categoryId to Product (nullable so existing products are unaffected)
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- CreateIndex: UserPermission.userId unique
CREATE UNIQUE INDEX "UserPermission_userId_key" ON "UserPermission"("userId");

-- AddForeignKey: Category -> Company
ALTER TABLE "Category" ADD CONSTRAINT "Category_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserPermission -> User
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Product -> Category (nullable)
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
