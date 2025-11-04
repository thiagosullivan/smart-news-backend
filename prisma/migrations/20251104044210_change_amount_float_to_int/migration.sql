/*
  Warnings:

  - You are about to drop the column `issueDate` on the `AccountPayable` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `AccountPayable` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `issueDate` on the `AccountReceivable` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `AccountReceivable` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "AccountPayable" DROP COLUMN "issueDate",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "AccountReceivable" DROP COLUMN "issueDate",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;
