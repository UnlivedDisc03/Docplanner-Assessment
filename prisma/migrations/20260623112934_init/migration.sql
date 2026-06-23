-- CreateTable
CREATE TABLE `RawListing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `rawHtml` LONGTEXT NULL,
    `rawJson` JSON NOT NULL,
    `scrapedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RawListing_url_key`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Listing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rawId` INTEGER NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `price` INTEGER NULL,
    `pricePerSqm` INTEGER NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'PLN',
    `area` DOUBLE NULL,
    `rooms` INTEGER NULL,
    `floor` INTEGER NULL,
    `totalFloors` INTEGER NULL,
    `yearBuilt` INTEGER NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `images` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Listing_rawId_key`(`rawId`),
    UNIQUE INDEX `Listing_url_key`(`url`),
    INDEX `Listing_city_idx`(`city`),
    INDEX `Listing_price_idx`(`price`),
    INDEX `Listing_area_idx`(`area`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_rawId_fkey` FOREIGN KEY (`rawId`) REFERENCES `RawListing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
