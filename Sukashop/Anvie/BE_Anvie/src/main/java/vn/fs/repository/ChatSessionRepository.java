package vn.fs.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.fs.entity.ChatSession;
import vn.fs.entity.User;

public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    List<ChatSession> findByUserOrderByUpdatedAtDesc(User user);

    Optional<ChatSession> findTop1ByUserAndAgentOrderByUpdatedAtDesc(User user, String agent);
}
