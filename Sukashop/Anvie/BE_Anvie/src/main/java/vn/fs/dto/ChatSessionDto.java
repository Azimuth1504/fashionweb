package vn.fs.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatSessionDto {
    private Long sessionId;
    private String agent;
    private String status;
    private String createdAt;
    private String updatedAt;
    private List<ChatMessageDto> messages;
}
