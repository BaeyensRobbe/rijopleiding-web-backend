/*
  Warnings:

  - A unique constraint covering the columns `[timeSlotId]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[appointmentId]` on the table `TimeSlot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `timeSlotId` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "timeSlotId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TimeSlot" ADD COLUMN     "appointmentId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_timeSlotId_key" ON "Appointment"("timeSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_appointmentId_key" ON "TimeSlot"("appointmentId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
