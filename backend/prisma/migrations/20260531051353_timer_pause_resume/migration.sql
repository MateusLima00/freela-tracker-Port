-- AlterTable
ALTER TABLE "TimerSession" ADD COLUMN     "accumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastResumeAt" TIMESTAMP(3);
