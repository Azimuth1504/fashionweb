-- =====================================================
-- SCRIPT RESET DEMO DATA
-- Chỉ sử dụng cho môi trường DEVELOPMENT / DEMO
-- KHÔNG CHẠY TRÊN PRODUCTION!
-- =====================================================

-- Tắt kiểm tra foreign key
SET FOREIGN_KEY_CHECKS = 0;

-- Xóa dữ liệu từ các bảng con trước (theo thứ tự dependency)
TRUNCATE TABLE product_images;
TRUNCATE TABLE product_colors;
TRUNCATE TABLE product_sizes;
TRUNCATE TABLE rates;
TRUNCATE TABLE order_details;
TRUNCATE TABLE orders;
TRUNCATE TABLE cart_details;
TRUNCATE TABLE favorites;
TRUNCATE TABLE notification;

-- Xóa sản phẩm
TRUNCATE TABLE products;

-- Reset AUTO_INCREMENT cho các bảng
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE product_sizes AUTO_INCREMENT = 1;
ALTER TABLE product_colors AUTO_INCREMENT = 1;
ALTER TABLE product_images AUTO_INCREMENT = 1;
ALTER TABLE rates AUTO_INCREMENT = 1;
ALTER TABLE order_details AUTO_INCREMENT = 1;
ALTER TABLE orders AUTO_INCREMENT = 1;
ALTER TABLE cart_details AUTO_INCREMENT = 1;
ALTER TABLE favorites AUTO_INCREMENT = 1;
ALTER TABLE notification AUTO_INCREMENT = 1;
ALTER TABLE categories AUTO_INCREMENT = 1;

-- Bật lại kiểm tra foreign key
SET FOREIGN_KEY_CHECKS = 1;

-- Thông báo hoàn tất
SELECT 'RESET DEMO DATA COMPLETED - All AUTO_INCREMENT reset to 1' AS Status;
