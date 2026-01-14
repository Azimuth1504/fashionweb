package vn.fs.api;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import vn.fs.dto.ChatMessageDto;
import vn.fs.dto.ChatRequest;
import vn.fs.dto.ChatResponse;
import vn.fs.dto.ChatSessionDto;
import vn.fs.entity.User;
import vn.fs.repository.UserRepository;
import vn.fs.service.ChatService;
import vn.fs.service.implement.UserDetailsImpl;

@CrossOrigin("*")
@RestController
@RequestMapping("api/chat")
public class ChatApi {

    @Autowired
    private ChatService chatService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("messages")
    public ResponseEntity<ChatResponse> sendMessage(@RequestBody ChatRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = resolveUser(userDetails);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(chatService.sendMessage(user, request));
    }

    @GetMapping("sessions/latest")
    public ResponseEntity<ChatSessionDto> getLatestSession(@RequestParam("agent") String agent,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = resolveUser(userDetails);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        ChatSessionDto session = chatService.getLatestSession(user, agent);
        if (session == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(session);
    }

    @GetMapping("sessions/{id}/messages")
    public ResponseEntity<List<ChatMessageDto>> getMessages(@PathVariable("id") Long sessionId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = resolveUser(userDetails);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            return ResponseEntity.ok(chatService.getMessages(user, sessionId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    private User resolveUser(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return null;
        }
        return userRepository.findById(userDetails.getId()).orElse(null);
    }
}
