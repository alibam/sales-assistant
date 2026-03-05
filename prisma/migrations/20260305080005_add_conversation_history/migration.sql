-- CreateTable
CREATE TABLE "conversation_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "customer_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "mode" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_conversation_customer_tenant" ON "conversation_history"("customer_id", "tenant_id");

-- CreateIndex
CREATE INDEX "idx_conversation_tenant_id" ON "conversation_history"("tenant_id");

-- AddForeignKey
ALTER TABLE "conversation_history" ADD CONSTRAINT "conversation_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
