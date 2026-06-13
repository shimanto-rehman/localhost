-- CreateTable
CREATE TABLE "apartment_password_reset_tokens" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apartment_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apartment_password_reset_tokens_token_hash_key" ON "apartment_password_reset_tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "apartment_password_reset_tokens" ADD CONSTRAINT "apartment_password_reset_tokens_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
