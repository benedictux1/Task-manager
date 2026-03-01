-- AlterTable (IF NOT EXISTS so safe when column was already added via db push)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "context" TEXT NOT NULL DEFAULT 'office';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "context" TEXT NOT NULL DEFAULT 'office';
