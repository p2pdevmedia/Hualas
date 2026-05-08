-- Normalize activity-related amounts that were historically persisted in pesos.
-- Amount columns are integer centavos across accounting models.
UPDATE "Activity"
SET "price" = "price" * 100
WHERE "price" > 0;

UPDATE "ActivityParticipantPayment"
SET "amount" = "amount" * 100
WHERE "amount" > 0;

UPDATE "OrderItem" oi
SET
  "unitPrice" = oi."unitPrice" * 100,
  "total" = oi."total" * 100
FROM "BillableConcept" bc
WHERE oi."billableConceptId" = bc."id"
  AND (
    (bc."code" = 'ACTIVITY_FEE' AND oi."activityId" IS NOT NULL)
    OR bc."code" = 'DISCOUNT'
  );
