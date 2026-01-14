package vn.fs.dto;

import lombok.Data;

@Data
public class ChatRequest {
    private Long sessionId;
    private String agent;
    private String message;
    private Long productId;
    private String page;
}
