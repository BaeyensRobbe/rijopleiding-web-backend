-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "temporaryLicenseExpiration" TIMESTAMP(3) NOT NULL,
    "street" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "pickupAllowed" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "locationId" INTEGER,
    "customPickupStreet" TEXT,
    "customPickupHouseNumber" TEXT,
    "customPickupPostalCode" TEXT,
    "customPickupCity" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" SERIAL NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Belgium',

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
