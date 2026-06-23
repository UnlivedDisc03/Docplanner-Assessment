-- AlterTable
ALTER TABLE `Listing` ADD COLUMN `condition` VARCHAR(191) NULL,
    ADD COLUMN `extras` JSON NULL,
    ADD COLUMN `hasBalcony` BOOLEAN NULL,
    ADD COLUMN `hasElevator` BOOLEAN NULL,
    ADD COLUMN `hasGarden` BOOLEAN NULL,
    ADD COLUMN `hasParking` BOOLEAN NULL,
    ADD COLUMN `heatingType` VARCHAR(191) NULL,
    ADD COLUMN `marketType` VARCHAR(191) NULL,
    ADD COLUMN `monthlyFee` INTEGER NULL,
    ADD COLUMN `propertyType` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Listing_propertyType_idx` ON `Listing`(`propertyType`);

-- CreateIndex
CREATE INDEX `Listing_marketType_idx` ON `Listing`(`marketType`);
