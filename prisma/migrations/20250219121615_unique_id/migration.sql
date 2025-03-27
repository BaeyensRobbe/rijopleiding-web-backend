/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Course_registration` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Course_registration_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "Course_registration_id_key" ON "Course_registration"("id");
