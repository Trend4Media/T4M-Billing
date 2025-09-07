-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEAM_LEADER', 'SALES_REP', 'FINANCE');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_PROGRESS', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('BASE_COMMISSION', 'ACTIVITY_COMMISSION', 'M0_5_BONUS', 'M1_BONUS', 'M1_RETENTION_BONUS', 'M2_BONUS', 'DOWNLINE_A', 'DOWNLINE_B', 'DOWNLINE_C', 'TEAM_BONUS', 'TEAM_RECRUITMENT', 'TEAM_GRADUATION', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creators" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "managerId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periods" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "usdEurRate" DECIMAL(10,6),
    "status" "PeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_sets" (
    "id" TEXT NOT NULL,
    "jsonRules" JSONB NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER,
    "errorSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_items" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "diamonds" INTEGER NOT NULL DEFAULT 0,
    "estBaseUsd" DECIMAL(12,2) NOT NULL,
    "estActivityUsd" DECIMAL(12,2) NOT NULL,
    "m0_5" BOOLEAN NOT NULL DEFAULT false,
    "m1" BOOLEAN NOT NULL DEFAULT false,
    "m1Retention" BOOLEAN NOT NULL DEFAULT false,
    "m2" BOOLEAN NOT NULL DEFAULT false,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_ledger" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "component" "ComponentType" NOT NULL,
    "amountUsd" DECIMAL(12,2),
    "amountEur" DECIMAL(12,2) NOT NULL,
    "calc" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "amountEur" DECIMAL(12,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_lines" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "component" "ComponentType" NOT NULL,
    "amountEur" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "payout_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_edges" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_relations" (
    "id" TEXT NOT NULL,
    "ancestorId" TEXT NOT NULL,
    "descendantId" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "org_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "creators_handle_key" ON "creators"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "periods_year_month_key" ON "periods"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_items_periodId_creatorId_key" ON "revenue_items"("periodId", "creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_periodId_managerId_key" ON "payouts"("periodId", "managerId");

-- CreateIndex
CREATE UNIQUE INDEX "org_edges_parentId_childId_validFrom_key" ON "org_edges"("parentId", "childId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "org_relations_ancestorId_descendantId_key" ON "org_relations"("ancestorId", "descendantId");

-- AddForeignKey
ALTER TABLE "creators" ADD CONSTRAINT "creators_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_items" ADD CONSTRAINT "revenue_items_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_items" ADD CONSTRAINT "revenue_items_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_items" ADD CONSTRAINT "revenue_items_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_items" ADD CONSTRAINT "revenue_items_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_lines" ADD CONSTRAINT "payout_lines_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_edges" ADD CONSTRAINT "org_edges_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_edges" ADD CONSTRAINT "org_edges_childId_fkey" FOREIGN KEY ("childId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_relations" ADD CONSTRAINT "org_relations_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_relations" ADD CONSTRAINT "org_relations_descendantId_fkey" FOREIGN KEY ("descendantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;