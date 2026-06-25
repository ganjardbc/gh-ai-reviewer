/*
  Warnings:

  - You are about to drop the column `outlet_id` on the `notifications` table. All the data in the column will be lost.
  - The primary key for the `user_roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `outlet_id` on the `user_roles` table. All the data in the column will be lost.
  - You are about to drop the `customer_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `daily_reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_movements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `outlet_product_inventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `outlets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift_audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift_participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shifts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stock_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `store_tables` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transaction_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `customer_sessions` DROP FOREIGN KEY `customer_sessions_merchant_id_fkey`;

-- DropForeignKey
ALTER TABLE `customer_sessions` DROP FOREIGN KEY `customer_sessions_outlet_id_fkey`;

-- DropForeignKey
ALTER TABLE `customer_sessions` DROP FOREIGN KEY `customer_sessions_selected_table_id_fkey`;

-- DropForeignKey
ALTER TABLE `daily_reports` DROP FOREIGN KEY `daily_reports_ibfk_1`;

-- DropForeignKey
ALTER TABLE `daily_reports` DROP FOREIGN KEY `daily_reports_ibfk_2`;

-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_merchant_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_outlet_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_ibfk_2`;

-- DropForeignKey
ALTER TABLE `outlet_product_inventory` DROP FOREIGN KEY `outlet_product_inventory_merchant_id_fkey`;

-- DropForeignKey
ALTER TABLE `outlet_product_inventory` DROP FOREIGN KEY `outlet_product_inventory_outlet_id_fkey`;

-- DropForeignKey
ALTER TABLE `outlet_product_inventory` DROP FOREIGN KEY `outlet_product_inventory_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `outlets` DROP FOREIGN KEY `outlets_ibfk_1`;

-- DropForeignKey
ALTER TABLE `outlets` DROP FOREIGN KEY `outlets_ibfk_logo_upload`;

-- DropForeignKey
ALTER TABLE `product_categories` DROP FOREIGN KEY `product_categories_ibfk_1`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_ibfk_1`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_ibfk_category`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_ibfk_image_upload`;

-- DropForeignKey
ALTER TABLE `shift_audit_logs` DROP FOREIGN KEY `shift_audit_logs_ibfk_1`;

-- DropForeignKey
ALTER TABLE `shift_audit_logs` DROP FOREIGN KEY `shift_audit_logs_ibfk_2`;

-- DropForeignKey
ALTER TABLE `shift_participants` DROP FOREIGN KEY `shift_participants_ibfk_1`;

-- DropForeignKey
ALTER TABLE `shift_participants` DROP FOREIGN KEY `shift_participants_ibfk_2`;

-- DropForeignKey
ALTER TABLE `shifts` DROP FOREIGN KEY `shifts_ibfk_1`;

-- DropForeignKey
ALTER TABLE `shifts` DROP FOREIGN KEY `shifts_ibfk_shift_owner`;

-- DropForeignKey
ALTER TABLE `stock_logs` DROP FOREIGN KEY `stock_logs_ibfk_1`;

-- DropForeignKey
ALTER TABLE `store_tables` DROP FOREIGN KEY `store_tables_merchant_id_fkey`;

-- DropForeignKey
ALTER TABLE `store_tables` DROP FOREIGN KEY `store_tables_outlet_id_fkey`;

-- DropForeignKey
ALTER TABLE `transaction_items` DROP FOREIGN KEY `transaction_items_ibfk_1`;

-- DropForeignKey
ALTER TABLE `transaction_items` DROP FOREIGN KEY `transaction_items_ibfk_2`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_ibfk_1`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_ibfk_2`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_ibfk_3`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_ibfk_cashier`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_ibfk_customer_session`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_ibfk_table`;

-- DropForeignKey
ALTER TABLE `user_roles` DROP FOREIGN KEY `user_roles_ibfk_3`;

-- DropIndex
DROP INDEX `idx_notifications_outlet` ON `notifications`;

-- DropIndex
DROP INDEX `idx_user_roles_outlet` ON `user_roles`;

-- AlterTable
ALTER TABLE `notifications` DROP COLUMN `outlet_id`;

-- AlterTable
ALTER TABLE `user_roles` DROP PRIMARY KEY,
    DROP COLUMN `outlet_id`,
    ADD PRIMARY KEY (`user_id`, `role_id`);

-- DropTable
DROP TABLE `customer_sessions`;

-- DropTable
DROP TABLE `daily_reports`;

-- DropTable
DROP TABLE `inventory_movements`;

-- DropTable
DROP TABLE `outlet_product_inventory`;

-- DropTable
DROP TABLE `outlets`;

-- DropTable
DROP TABLE `product_categories`;

-- DropTable
DROP TABLE `products`;

-- DropTable
DROP TABLE `shift_audit_logs`;

-- DropTable
DROP TABLE `shift_participants`;

-- DropTable
DROP TABLE `shifts`;

-- DropTable
DROP TABLE `stock_logs`;

-- DropTable
DROP TABLE `store_tables`;

-- DropTable
DROP TABLE `transaction_items`;

-- DropTable
DROP TABLE `transactions`;
