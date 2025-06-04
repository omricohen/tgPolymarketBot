/*
  Warnings:

  - Added the required column `telegramHandle` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramHandle" TEXT NOT NULL;
