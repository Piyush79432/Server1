/*
  Warnings:

  - You are about to drop the column `scrapedAt` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `scrapedAt` on the `Navigation` table. All the data in the column will be lost.
  - You are about to drop the column `scrapedAt` on the `Product` table. All the data in the column will be lost.
  - Made the column `image` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropIndex
DROP INDEX "Navigation_title_key";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "scrapedAt",
ADD COLUMN     "lastPage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentId" INTEGER;

-- AlterTable
ALTER TABLE "Navigation" DROP COLUMN "scrapedAt";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "scrapedAt",
ADD COLUMN     "author" TEXT,
ADD COLUMN     "collectionId" INTEGER,
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "isbn" TEXT,
ADD COLUMN     "promo" TEXT,
ADD COLUMN     "publicationYear" TEXT,
ADD COLUMN     "recommendations" JSONB,
ADD COLUMN     "reviews" JSONB,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "image" SET NOT NULL,
ALTER COLUMN "categoryId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Collection" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_title_key" ON "Collection"("title");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
