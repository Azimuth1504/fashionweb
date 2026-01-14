
package vn.fs.api;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin("*")
@RestController
@RequestMapping("api/admin")
public class ResetDemoApi {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Reset demo data - CHỈ DÙNG CHO DEVELOPMENT/DEMO
     * Endpoint này sẽ xóa toàn bộ dữ liệu và reset AUTO_INCREMENT về 1
     */
    @PostMapping("/reset-demo")
    @Transactional
    public ResponseEntity<String> resetDemoData() {
        try {
            // Tắt kiểm tra foreign key
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 0").executeUpdate();

            // Xóa dữ liệu từ các bảng liên quan
            entityManager.createNativeQuery("TRUNCATE TABLE product_images").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE product_colors").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE product_sizes").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE rates").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE order_details").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE orders").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE cart_details").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE favorites").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE notification").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE products").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE categories").executeUpdate();

            // Bật lại kiểm tra foreign key
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();

            return ResponseEntity.ok("Demo data reset successfully! All AUTO_INCREMENT reset to 1.");
        } catch (Exception e) {
            // Đảm bảo bật lại foreign key check nếu có lỗi
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    /**
     * Reset AUTO_INCREMENT cho bảng products mà KHÔNG xóa dữ liệu
     * Chỉ reset giá trị next ID về giá trị lớn nhất hiện tại + 1
     */
    @PostMapping("/reset-product-increment")
    @Transactional
    public ResponseEntity<String> resetProductIncrement() {
        try {
            // Lấy max product_id hiện tại
            Object result = entityManager.createNativeQuery("SELECT COALESCE(MAX(product_id), 0) FROM products")
                    .getSingleResult();
            Long maxId = ((Number) result).longValue();

            // Reset AUTO_INCREMENT về max + 1
            entityManager.createNativeQuery("ALTER TABLE products AUTO_INCREMENT = " + (maxId + 1)).executeUpdate();

            return ResponseEntity.ok("Product AUTO_INCREMENT reset to " + (maxId + 1));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
}
