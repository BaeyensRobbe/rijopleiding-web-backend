/*
  Warnings:

  - You are about to drop the column `address` on the `Location` table. All the data in the column will be lost.
  - Added the required column `houseNumber` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `street` to the `Location` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Location" DROP COLUMN "address",
ADD COLUMN     "houseNumber" TEXT NOT NULL,
ADD COLUMN     "street" TEXT NOT NULL;
