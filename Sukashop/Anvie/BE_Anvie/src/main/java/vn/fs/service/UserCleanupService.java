package vn.fs.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.fs.entity.Cart;
import vn.fs.entity.ChatSession;
import vn.fs.entity.Order;
import vn.fs.entity.User;
import vn.fs.repository.CartDetailRepository;
import vn.fs.repository.CartRepository;
import vn.fs.repository.ChatMessageRepository;
import vn.fs.repository.ChatSessionRepository;
import vn.fs.repository.FavoriteRepository;
import vn.fs.repository.OrderDetailRepository;
import vn.fs.repository.OrderRepository;
import vn.fs.repository.RateRepository;
import vn.fs.repository.UserRepository;

@Service
public class UserCleanupService {

    @Autowired
    UserRepository userRepository;

    @Autowired
    CartRepository cartRepository;

    @Autowired
    CartDetailRepository cartDetailRepository;

    @Autowired
    FavoriteRepository favoriteRepository;

    @Autowired
    RateRepository rateRepository;

    @Autowired
    OrderRepository orderRepository;

    @Autowired
    OrderDetailRepository orderDetailRepository;

    @Autowired
    ChatSessionRepository chatSessionRepository;

    @Autowired
    ChatMessageRepository chatMessageRepository;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    DatabaseMaintenanceService databaseMaintenanceService;

    @Transactional
    public void deleteUserHard(User user) {
        List<ChatSession> sessions = chatSessionRepository.findByUserOrderByUpdatedAtDesc(user);
        for (ChatSession session : sessions) {
            chatMessageRepository.deleteBySession(session);
        }
        if (!sessions.isEmpty()) {
            chatSessionRepository.deleteAll(sessions);
        }

        favoriteRepository.deleteByUser(user);
        rateRepository.deleteByUser(user);

        Cart cart = cartRepository.findByUser(user);
        if (cart != null) {
            cartDetailRepository.deleteByCart(cart);
            cartRepository.delete(cart);
        }

        List<Order> orders = orderRepository.findByUser(user);
        for (Order order : orders) {
            orderDetailRepository.deleteByOrder(order);
        }
        if (!orders.isEmpty()) {
            orderRepository.deleteAll(orders);
        }

        jdbcTemplate.update("DELETE FROM user_roles WHERE user_id = ?", user.getUserId());

        userRepository.delete(user);
        databaseMaintenanceService.resetAutoIncrementIfEmpty("users", userRepository.count());
    }
}
