-- CreateEnum
CREATE TYPE "RoleMode" AS ENUM ('AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "phaseEndsAt" TIMESTAMP(3),
ADD COLUMN     "roleCounts" JSONB,
ADD COLUMN     "roleMode" "RoleMode" NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "roundSeconds" INTEGER NOT NULL DEFAULT 60;
