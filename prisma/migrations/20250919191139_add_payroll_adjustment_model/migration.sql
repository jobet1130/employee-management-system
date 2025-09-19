-- DropForeignKey
ALTER TABLE `document` DROP FOREIGN KEY `Document_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `document` DROP FOREIGN KEY `Document_uploadedById_fkey`;

-- CreateTable
CREATE TABLE `PayrollAdjustment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payrollId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `isDeduction` BOOLEAN NOT NULL DEFAULT false,
    `adjustmentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PayrollAdjustment_payrollId_idx`(`payrollId`),
    INDEX `PayrollAdjustment_type_idx`(`type`),
    INDEX `PayrollAdjustment_status_idx`(`status`),
    INDEX `PayrollAdjustment_adjustmentDate_idx`(`adjustmentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_ownerId_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollAdjustment` ADD CONSTRAINT `PayrollAdjustment_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `Payroll`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollAdjustment` ADD CONSTRAINT `PayrollAdjustment_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
