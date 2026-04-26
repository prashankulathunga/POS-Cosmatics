ALTER TABLE "Settings"
    ALTER COLUMN "currencyCode" SET DEFAULT 'LKR',
    ALTER COLUMN "currencySymbol" SET DEFAULT 'Rs.';

UPDATE "Settings"
SET
    "currencyCode" = 'LKR',
    "currencySymbol" = 'Rs.'
WHERE "currencyCode" <> 'LKR'
   OR "currencySymbol" <> 'Rs.';
