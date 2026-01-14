package vn.fs.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import vn.fs.entity.ChatMessage;
import vn.fs.entity.ChatSession;
import vn.fs.entity.Product;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySessionOrderByCreatedAtAsc(ChatSession session);

    Page<ChatMessage> findBySessionOrderByCreatedAtDesc(ChatSession session, Pageable pageable);

    void deleteByProduct(Product product);

    void deleteBySession(ChatSession session);
}
