-- CreateTable
CREATE TABLE "MailTemplateVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "mjmlContent" TEXT NOT NULL,
    "description" TEXT,
    "mergeTags" JSONB,
    "comment" TEXT,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "MailTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailTemplateVersion_templateId_idx" ON "MailTemplateVersion"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "MailTemplateVersion_templateId_version_key" ON "MailTemplateVersion"("templateId", "version");

-- AddForeignKey
ALTER TABLE "MailTemplateVersion" ADD CONSTRAINT "MailTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
