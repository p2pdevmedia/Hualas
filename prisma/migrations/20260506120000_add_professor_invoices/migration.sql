-- CreateTable
CREATE TABLE "ProfessorInvoice" (
    "id" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfessorInvoice_professorId_createdAt_idx" ON "ProfessorInvoice"("professorId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProfessorInvoice" ADD CONSTRAINT "ProfessorInvoice_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
