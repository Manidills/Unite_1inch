-- CreateTable
CREATE TABLE "public"."Triggers" (
    "id" SERIAL NOT NULL,
    "walletId" TEXT NOT NULL,
    "makerAsset" TEXT NOT NULL,
    "takerAsset" TEXT NOT NULL,
    "makingAmount" TEXT NOT NULL,
    "takingAmount" TEXT NOT NULL,
    "maker" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "targetValue" TEXT NOT NULL,

    CONSTRAINT "Triggers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Triggers" ADD CONSTRAINT "Triggers_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."Users"("walletAddress") ON DELETE NO ACTION ON UPDATE NO ACTION;
