-- Add provider abstraction: Rename LlamaCloud-specific fields to provider-agnostic names
-- This enables support for multiple document index providers (LlamaCloud, Bedrock, etc.)

-- Step 1: Add new provider-agnostic columns
ALTER TABLE "organizations" ADD COLUMN "indexProvider" TEXT;
ALTER TABLE "organizations" ADD COLUMN "indexProjectId" TEXT;
ALTER TABLE "organizations" ADD COLUMN "indexProjectName" TEXT;
ALTER TABLE "organizations" ADD COLUMN "indexOrganizationName" TEXT;
ALTER TABLE "organizations" ADD COLUMN "indexConnectedAt" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN "indexRegion" TEXT;

-- Step 2: Migrate existing data from old columns to new columns
-- Set provider to 'llamacloud' for all existing connections
UPDATE "organizations"
SET
  "indexProvider" = 'llamacloud',
  "indexProjectId" = "llamaCloudProjectId",
  "indexProjectName" = "llamaCloudProjectName",
  "indexOrganizationName" = "llamaCloudOrgName",
  "indexConnectedAt" = "llamaCloudConnectedAt"
WHERE "llamaCloudProjectId" IS NOT NULL;

-- Step 3: Drop old LlamaCloud-specific columns
ALTER TABLE "organizations" DROP COLUMN "llamaCloudProjectId";
ALTER TABLE "organizations" DROP COLUMN "llamaCloudProjectName";
ALTER TABLE "organizations" DROP COLUMN "llamaCloudOrgName";
ALTER TABLE "organizations" DROP COLUMN "llamaCloudConnectedAt";
