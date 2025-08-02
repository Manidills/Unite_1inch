-- CreateTable
CREATE TABLE "public"."TriggerOrders" (
    "id" SERIAL NOT NULL,
    "walletId" TEXT NOT NULL,
    "assetFrom" TEXT NOT NULL,
    "assetTo" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "priceTarget" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "TriggerOrders_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."TriggerOrders" ADD CONSTRAINT "TriggerOrders_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."Users"("walletAddress") ON DELETE NO ACTION ON UPDATE NO ACTION;
