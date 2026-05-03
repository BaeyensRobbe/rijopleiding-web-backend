-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('AUTOMATIC', 'MANUAL');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "transmissionChosen" "Transmission";

-- AlterTable
ALTER TABLE "TimeSlot" ADD COLUMN     "TransmissionOptions" "Transmission"[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "transmissionPreference" "Transmission";
