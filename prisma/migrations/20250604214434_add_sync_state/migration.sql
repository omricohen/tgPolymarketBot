-- CreateTable
CREATE TABLE "PolymarketMarket" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "marketSlug" TEXT NOT NULL,
    "category" TEXT,
    "fpmm" TEXT NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "gameStartTime" TIMESTAMP(3),
    "secondsDelay" INTEGER NOT NULL DEFAULT 0,
    "minimumOrderSize" TEXT NOT NULL DEFAULT '15',
    "minimumTickSize" TEXT NOT NULL DEFAULT '0.01',
    "minIncentiveSize" TEXT,
    "maxIncentiveSpread" TEXT,
    "tokens" JSONB[],
    "rewards" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "description" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "acceptingOrders" BOOLEAN NOT NULL DEFAULT true,
    "acceptingOrderTimestamp" TIMESTAMP(3),
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "negRisk" BOOLEAN NOT NULL DEFAULT false,
    "negRiskMarketId" TEXT,
    "negRiskRequestId" TEXT,
    "is5050Outcome" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolymarketMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL,
    "cursor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PolymarketMarket_conditionId_key" ON "PolymarketMarket"("conditionId");

-- CreateIndex
CREATE UNIQUE INDEX "PolymarketMarket_questionId_key" ON "PolymarketMarket"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "PolymarketMarket_marketSlug_key" ON "PolymarketMarket"("marketSlug");
