/*
  Warnings:

  - The `minimumOrderSize` column on the `PolymarketMarket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `minimumTickSize` column on the `PolymarketMarket` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "PolymarketMarket" DROP COLUMN "minimumOrderSize",
ADD COLUMN     "minimumOrderSize" INTEGER NOT NULL DEFAULT 15,
DROP COLUMN "minimumTickSize",
ADD COLUMN     "minimumTickSize" DOUBLE PRECISION NOT NULL DEFAULT 0.01;
