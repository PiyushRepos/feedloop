-- CreateEnum
CREATE TYPE "StatsVisibility" AS ENUM ('VOTES_ONLY', 'BASIC', 'FULL');

-- AlterTable
ALTER TABLE "polls" ADD COLUMN     "statsVisibility" "StatsVisibility" NOT NULL DEFAULT 'VOTES_ONLY';
