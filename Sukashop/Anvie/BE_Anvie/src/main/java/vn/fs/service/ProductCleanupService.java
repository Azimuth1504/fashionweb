package vn.fs.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.fs.entity.OrderDetail;
import vn.fs.entity.Category;
import vn.fs.entity.Product;
import vn.fs.repository.CartDetailRepository;
import vn.fs.repository.ChatMessageRepository;
import vn.fs.repository.FavoriteRepository;
import vn.fs.repository.OrderDetailRepository;
import vn.fs.repository.ProductRepository;
import vn.fs.repository.RateRepository;

@Service
public class ProductCleanupService {

    @Autowired
    ProductRepository productRepository;

    @Autowired
    RateRepository rateRepository;

    @Autowired
    FavoriteRepository favoriteRepository;

    @Autowired
    CartDetailRepository cartDetailRepository;

    @Autowired
    ChatMessageRepository chatMessageRepository;

    @Autowired
    OrderDetailRepository orderDetailRepository;

    @Autowired
    DatabaseMaintenanceService databaseMaintenanceService;

    @Transactional
    public void deleteProductHard(Product product) {
        List<OrderDetail> orderDetails = orderDetailRepository.findByProduct(product);
        for (OrderDetail orderDetail : orderDetails) {
            if (orderDetail.getProductName() == null) {
                orderDetail.setProductName(product.getName());
            }
            if (orderDetail.getProductImage() == null) {
                orderDetail.setProductImage(product.getImage());
            }
            orderDetail.setProduct(null);
        }
        if (!orderDetails.isEmpty()) {
            orderDetailRepository.saveAll(orderDetails);
        }
        rateRepository.deleteByProduct(product);
        favoriteRepository.deleteByProduct(product);
        cartDetailRepository.deleteByProduct(product);
        chatMessageRepository.deleteByProduct(product);
        productRepository.delete(product);
        databaseMaintenanceService.resetAutoIncrementIfEmpty("products", productRepository.count());
    }

    @Transactional
    public void deleteProductsByCategory(Category category) {
        List<Product> products = productRepository.findByCategory(category);
        for (Product product : products) {
            deleteProductHard(product);
        }
    }
}
