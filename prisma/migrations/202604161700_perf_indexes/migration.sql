CREATE INDEX IF NOT EXISTS "Category_isActive_name_idx" ON "Category"("isActive", "name");
CREATE INDEX IF NOT EXISTS "Product_isActive_name_idx" ON "Product"("isActive", "name");
CREATE INDEX IF NOT EXISTS "Product_isActive_barcode_idx" ON "Product"("isActive", "barcode");
CREATE INDEX IF NOT EXISTS "Product_isActive_stockQuantity_idx" ON "Product"("isActive", "stockQuantity");
CREATE INDEX IF NOT EXISTS "Sale_paymentMethod_createdAt_idx" ON "Sale"("paymentMethod", "createdAt");
CREATE INDEX IF NOT EXISTS "SaleItem_saleId_createdAt_idx" ON "SaleItem"("saleId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
CREATE INDEX IF NOT EXISTS "Return_createdAt_idx" ON "Return"("createdAt");
CREATE INDEX IF NOT EXISTS "Expense_createdAt_idx" ON "Expense"("createdAt");
