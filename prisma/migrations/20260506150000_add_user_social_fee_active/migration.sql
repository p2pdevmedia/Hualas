ALTER TABLE "User" ADD COLUMN "socialFeeActive" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" u
SET "socialFeeActive" = true
WHERE EXISTS (
  SELECT 1
  FROM "SocialFeePayment" sfp
  WHERE sfp."userId" = u."id"
);
