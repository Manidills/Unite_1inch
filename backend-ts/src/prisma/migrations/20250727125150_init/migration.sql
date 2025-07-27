-- CreateTable
CREATE TABLE "Users" (
    "id" SERIAL NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "lastLogin" TEXT NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "id" SERIAL NOT NULL,
    "walletId" TEXT NOT NULL,
    "orderHash" TEXT NOT NULL,
    "tokenPair" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "feePercent" TEXT NOT NULL,
    "youReceive" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdOn" TEXT NOT NULL,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_walletAddress_key" ON "Users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Orders_orderHash_key" ON "Orders"("orderHash");

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Users"("walletAddress") ON DELETE NO ACTION ON UPDATE NO ACTION;
