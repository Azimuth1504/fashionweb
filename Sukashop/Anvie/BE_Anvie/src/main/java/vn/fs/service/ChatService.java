package vn.fs.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpStatusCodeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.fs.dto.ChatMessageDto;
import vn.fs.dto.ChatRequest;
import vn.fs.dto.ChatResponse;
import vn.fs.dto.ChatSessionDto;
import vn.fs.entity.ChatMessage;
import vn.fs.entity.ChatSession;
import vn.fs.entity.Category;
import vn.fs.entity.Product;
import vn.fs.entity.ProductColor;
import vn.fs.entity.ProductSize;
import vn.fs.entity.SizeColorVariant;
import vn.fs.entity.User;
import vn.fs.repository.ChatMessageRepository;
import vn.fs.repository.ChatSessionRepository;
import vn.fs.repository.CategoryRepository;
import vn.fs.repository.ProductRepository;

@Service
public class ChatService {

    private static final int MAX_HISTORY = 8;
    private static final int MAX_SUGGESTIONS = 3;
    private static final String ROLE_USER = "USER";
    private static final String ROLE_ASSISTANT = "ASSISTANT";
    private static final String STATUS_OPEN = "OPEN";
    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);
    private static final Pattern SIZE_PATTERN = Pattern.compile("\\b(3[4-9]|4[0-8]|5[0])\\b");
    private static final Set<String> STOP_WORDS = new HashSet<>();

    static {
        STOP_WORDS.add("toi");
        STOP_WORDS.add("tôi");
        STOP_WORDS.add("muon");
        STOP_WORDS.add("muốn");
        STOP_WORDS.add("can");
        STOP_WORDS.add("cần");
        STOP_WORDS.add("tu");
        STOP_WORDS.add("tư");
        STOP_WORDS.add("van");
        STOP_WORDS.add("vấn");
        STOP_WORDS.add("mau");
        STOP_WORDS.add("màu");
        STOP_WORDS.add("size");
        STOP_WORDS.add("kich");
        STOP_WORDS.add("kích");
        STOP_WORDS.add("co");
        STOP_WORDS.add("có");
        STOP_WORDS.add("cho");
        STOP_WORDS.add("la");
        STOP_WORDS.add("là");
        STOP_WORDS.add("va");
        STOP_WORDS.add("và");
        STOP_WORDS.add("voi");
        STOP_WORDS.add("với");
        STOP_WORDS.add("mot");
        STOP_WORDS.add("một");
        STOP_WORDS.add("nhung");
        STOP_WORDS.add("những");
        STOP_WORDS.add("dang");
        STOP_WORDS.add("đang");
        STOP_WORDS.add("ban");
        STOP_WORDS.add("bán");
        STOP_WORDS.add("hang");
        STOP_WORDS.add("hàng");
        STOP_WORDS.add("shop");
        STOP_WORDS.add("cua");
        STOP_WORDS.add("cửa");
        STOP_WORDS.add("giay");
        STOP_WORDS.add("giày");
        STOP_WORDS.add("dep");
        STOP_WORDS.add("đẹp");
    }

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String model;

    @Autowired
    private ChatSessionRepository chatSessionRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public ChatResponse sendMessage(User user, ChatRequest request) {
        String message = request.getMessage() != null ? request.getMessage().trim() : "";
        if (message.isEmpty()) {
            return new ChatResponse(null, "Nội dung tin nhắn trống.", LocalDateTime.now().toString());
        }

        ChatSession session = resolveSession(user, request);
        Product product = getProductIfPresent(request.getProductId());

        LocalDateTime now = LocalDateTime.now();

        ChatMessage userMessage = new ChatMessage();
        userMessage.setSession(session);
        userMessage.setRole(ROLE_USER);
        userMessage.setContent(message);
        userMessage.setProduct(product);
        userMessage.setCreatedAt(now);
        chatMessageRepository.save(userMessage);

        List<ChatMessage> history = new ArrayList<>(chatMessageRepository
                .findBySessionOrderByCreatedAtDesc(session, PageRequest.of(0, MAX_HISTORY)).getContent());
        Collections.reverse(history);

        List<String> requestedSizes = extractSizes(message);
        List<String> requestedColors = extractColors(message);
        List<Product> catalogProducts = resolveCatalogProducts(request, product, message, requestedSizes,
                requestedColors);

        String systemPrompt = buildSystemPrompt(session.getAgent(), request.getPage(), product, catalogProducts,
                requestedSizes, requestedColors);
        String replyText = callGemini(systemPrompt, history);

        ChatMessage assistantMessage = new ChatMessage();
        assistantMessage.setSession(session);
        assistantMessage.setRole(ROLE_ASSISTANT);
        assistantMessage.setContent(replyText);
        assistantMessage.setProduct(product);
        assistantMessage.setCreatedAt(LocalDateTime.now());
        chatMessageRepository.save(assistantMessage);

        session.setUpdatedAt(LocalDateTime.now());
        chatSessionRepository.save(session);

        return new ChatResponse(session.getSessionId(), replyText, assistantMessage.getCreatedAt().toString());
    }

    @Transactional(readOnly = true)
    public ChatSessionDto getLatestSession(User user, String agent) {
        Optional<ChatSession> optional = chatSessionRepository.findTop1ByUserAndAgentOrderByUpdatedAtDesc(user, agent);
        if (!optional.isPresent()) {
            return null;
        }
        ChatSession session = optional.get();
        List<ChatMessageDto> messages = mapMessages(chatMessageRepository.findBySessionOrderByCreatedAtAsc(session));
        return new ChatSessionDto(session.getSessionId(), session.getAgent(), session.getStatus(),
                session.getCreatedAt() != null ? session.getCreatedAt().toString() : null,
                session.getUpdatedAt() != null ? session.getUpdatedAt().toString() : null,
                messages);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessages(User user, Long sessionId) {
        ChatSession session = ensureSessionOwner(user, sessionId);
        return mapMessages(chatMessageRepository.findBySessionOrderByCreatedAtAsc(session));
    }

    private ChatSession resolveSession(User user, ChatRequest request) {
        String agent = request.getAgent() != null ? request.getAgent() : "chat";
        if (request.getSessionId() != null) {
            Optional<ChatSession> optional = chatSessionRepository.findById(request.getSessionId());
            if (optional.isPresent()) {
                ChatSession existing = optional.get();
                if (existing.getUser().getUserId().equals(user.getUserId())
                        && (agent.equals(existing.getAgent()) || agent.isEmpty())) {
                    return existing;
                }
            }
        }

        ChatSession session = new ChatSession();
        session.setUser(user);
        session.setAgent(agent);
        session.setStatus(STATUS_OPEN);
        session.setCreatedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        return chatSessionRepository.save(session);
    }

    private ChatSession ensureSessionOwner(User user, Long sessionId) {
        Optional<ChatSession> optional = chatSessionRepository.findById(sessionId);
        if (!optional.isPresent()) {
            throw new IllegalArgumentException("Session not found");
        }
        ChatSession session = optional.get();
        if (!session.getUser().getUserId().equals(user.getUserId())) {
            throw new IllegalArgumentException("Session not owned by user");
        }
        return session;
    }

    private List<ChatMessageDto> mapMessages(List<ChatMessage> messages) {
        List<ChatMessageDto> result = new ArrayList<>();
        for (ChatMessage message : messages) {
            Long productId = message.getProduct() != null ? message.getProduct().getProductId() : null;
            result.add(new ChatMessageDto(message.getMessageId(), message.getRole(), message.getContent(),
                    message.getCreatedAt() != null ? message.getCreatedAt().toString() : null, productId));
        }
        return result;
    }

    private Product getProductIfPresent(Long productId) {
        if (productId == null) {
            return null;
        }
        Optional<Product> optional = productRepository.findById(productId);
        return optional.orElse(null);
    }

    private String callGemini(String systemPrompt, List<ChatMessage> history) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            logger.warn("Gemini API key is missing or empty.");
            return "Hệ thống chưa cấu hình API key, vui lòng liên hệ quản trị viên.";
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model
                    + ":generateContent?key=" + apiKey;

            List<Map<String, Object>> contents = new ArrayList<>();
            for (ChatMessage message : history) {
                String role = mapRole(message.getRole());
                Map<String, Object> part = new HashMap<>();
                part.put("text", message.getContent());

                Map<String, Object> content = new HashMap<>();
                content.put("role", role);
                content.put("parts", Collections.singletonList(part));
                contents.add(content);
            }

            Map<String, Object> systemInstruction = new HashMap<>();
            systemInstruction.put("parts", Collections.singletonList(Collections.singletonMap("text", systemPrompt)));

            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("temperature", 0.6);
            generationConfig.put("maxOutputTokens", 512);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("systemInstruction", systemInstruction);
            requestBody.put("contents", contents);
            requestBody.put("generationConfig", generationConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                logger.warn("Gemini API non-200 response: status={}, body={}",
                        response.getStatusCode(), response.getBody());
                return "Xin lỗi, mình đang gặp lỗi kết nối. Bạn thử lại giúp mình nhé.";
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && parts.size() > 0) {
                    String text = parts.get(0).path("text").asText();
                    if (text != null && !text.trim().isEmpty()) {
                        return text.trim();
                    }
                }
            }
        } catch (HttpStatusCodeException ex) {
            logger.error("Gemini API error: status={}, body={}", ex.getStatusCode(), ex.getResponseBodyAsString(), ex);
            return "Xin lỗi, hệ thống đang bận. Bạn thử lại sau nhé.";
        } catch (Exception ex) {
            logger.error("Gemini API call failed.", ex);
            return "Xin lỗi, hệ thống đang bận. Bạn thử lại sau nhé.";
        }

        return "Mình chưa có câu trả lời phù hợp, bạn mô tả kỹ hơn giúp mình nhé.";
    }

    private String mapRole(String role) {
        if (ROLE_ASSISTANT.equalsIgnoreCase(role)) {
            return "model";
        }
        return "user";
    }

    private String buildSystemPrompt(String agent, String page, Product product, List<Product> catalogProducts,
            List<String> requestedSizes, List<String> requestedColors) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Bạn là trợ lý tư vấn của cửa hàng giày Anvie. ");
        prompt.append("Trả lời tiếng Việt, rõ ràng, ngắn gọn, thân thiện. ");
        prompt.append("Nếu thiếu thông tin thì hỏi thêm. ");
        prompt.append("Không bịa giá, chính sách, hoặc tồn kho nếu không có dữ liệu. ");

        if ("shoes".equalsIgnoreCase(agent)) {
            prompt.append("Bạn tập trung tư vấn kiểu giày, dịp sử dụng, phối đồ, chất liệu. ");
        } else if ("color".equalsIgnoreCase(agent)) {
            prompt.append("Bạn tập trung tư vấn màu sắc, phối màu, tông da và trang phục. ");
        } else if ("size".equalsIgnoreCase(agent)) {
            prompt.append("Bạn tập trung tư vấn chọn size, form giày, hỏi chiều dài bàn chân và độ rộng. ");
        } else if ("guide".equalsIgnoreCase(agent)) {
            prompt.append("Bạn tập trung hướng dẫn sử dụng website: tìm kiếm, xem chi tiết, chọn size/màu, ");
            prompt.append("thêm vào giỏ, thanh toán, theo dõi đơn hàng, và danh sách yêu thích. ");
        } else {
            prompt.append("Bạn trò chuyện tự nhiên nhưng vẫn ưu tiên hỗ trợ mua hàng. ");
        }

        String pageInfo = routeToPageInfo(page);
        if (!pageInfo.isEmpty()) {
            prompt.append("Ngữ cảnh trang hiện tại: ").append(pageInfo).append(". ");
        }

        String productInfo = buildProductContext(product);
        if (!productInfo.isEmpty()) {
            prompt.append("Sản phẩm đang xem: ").append(productInfo).append(". ");
        }

        String catalogContext = buildCatalogContext(catalogProducts);
        if (!catalogContext.isEmpty()) {
            prompt.append("Danh sách sản phẩm hợp lệ để tư vấn (tối đa 3): ").append(catalogContext).append(". ");
            prompt.append("Chỉ trả lời dựa trên danh sách này, không bịa sản phẩm ngoài danh sách. ");
            prompt.append("Nếu sản phẩm hết hàng thì nói rõ và không khuyến nghị mua. ");
        } else {
            prompt.append("Hiện chưa có danh sách sản phẩm phù hợp từ dữ liệu, hãy hỏi thêm về nhu cầu, ");
            prompt.append("danh mục, màu sắc, hoặc kích cỡ. ");
        }

        if ((requestedSizes != null && !requestedSizes.isEmpty())
                || (requestedColors != null && !requestedColors.isEmpty())) {
            prompt.append("Nhu cầu khách: ");
            if (requestedSizes != null && !requestedSizes.isEmpty()) {
                prompt.append("size ").append(String.join(", ", requestedSizes)).append(". ");
            }
            if (requestedColors != null && !requestedColors.isEmpty()) {
                prompt.append("màu ").append(String.join(", ", requestedColors)).append(". ");
            }
            prompt.append("Chỉ xác nhận khi size/màu có trong dữ liệu. ");
        }

        return prompt.toString();
    }

    private String routeToPageInfo(String route) {
        if (route == null || route.trim().isEmpty()) {
            return "";
        }
        String path = route.trim();
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        if (path.startsWith("home")) {
            return "Trang chủ";
        }
        if (path.startsWith("all-product")) {
            return "Danh sách sản phẩm";
        }
        if (path.startsWith("by-category")) {
            return "Danh mục sản phẩm";
        }
        if (path.startsWith("cart")) {
            return "Giỏ hàng";
        }
        if (path.startsWith("checkout")) {
            return "Thanh toán";
        }
        if (path.startsWith("profile")) {
            return "Tài khoản";
        }
        if (path.startsWith("favorites")) {
            return "Yêu thích";
        }
        if (path.startsWith("search")) {
            return "Tìm kiếm";
        }
        if (path.startsWith("product-detail")) {
            return "Chi tiết sản phẩm";
        }
        if (path.startsWith("contact")) {
            return "Liên hệ";
        }
        if (path.startsWith("about")) {
            return "Giới thiệu";
        }
        return "Trang " + route;
    }

    private Long extractCategoryIdFromPage(String route) {
        if (route == null || route.trim().isEmpty()) {
            return null;
        }
        Matcher matcher = Pattern.compile("by-category/(\\d+)").matcher(route);
        if (matcher.find()) {
            try {
                return Long.parseLong(matcher.group(1));
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    private List<Product> resolveCatalogProducts(ChatRequest request, Product currentProduct, String message,
            List<String> requestedSizes, List<String> requestedColors) {
        LinkedHashMap<Long, Product> result = new LinkedHashMap<>();
        if (currentProduct != null && currentProduct.getProductId() != null) {
            result.put(currentProduct.getProductId(), currentProduct);
        }

        List<Product> candidates = new ArrayList<>();
        Long categoryId = extractCategoryIdFromPage(request.getPage());
        if (categoryId != null) {
            Optional<Category> category = categoryRepository.findById(categoryId);
            if (category.isPresent()) {
                candidates.addAll(productRepository.findByCategoryAndStatusTrue(category.get()));
            }
        }

        List<String> keywords = extractKeywords(message);
        for (String keyword : keywords) {
            candidates.addAll(productRepository.searchByKeyword(keyword));
            if (candidates.size() >= 30) {
                break;
            }
        }

        if (candidates.isEmpty()) {
            candidates.addAll(productRepository.findByStatusTrueOrderBySoldDesc());
        }

        for (Product candidate : candidates) {
            if (result.size() >= MAX_SUGGESTIONS) {
                break;
            }
            if (candidate == null || candidate.getProductId() == null) {
                continue;
            }
            if (result.containsKey(candidate.getProductId())) {
                continue;
            }
            if (!isInStock(candidate)) {
                continue;
            }
            if (!matchesSizeColor(candidate, requestedSizes, requestedColors)) {
                continue;
            }
            result.put(candidate.getProductId(), candidate);
        }

        return new ArrayList<>(result.values());
    }

    private List<String> extractKeywords(String message) {
        String normalized = normalizeText(message);
        if (normalized.isEmpty()) {
            return new ArrayList<>();
        }

        LinkedHashSet<String> keywords = new LinkedHashSet<>();
        List<Category> categories = categoryRepository.findAll();
        for (Category category : categories) {
            if (category.getCategoryName() == null) {
                continue;
            }
            String name = normalizeText(category.getCategoryName());
            if (!name.isEmpty() && normalized.contains(name)) {
                keywords.add(category.getCategoryName());
            }
        }

        String[] parts = normalized.split(" ");
        for (String part : parts) {
            if (part.length() < 3) {
                continue;
            }
            if (STOP_WORDS.contains(part)) {
                continue;
            }
            keywords.add(part);
            if (keywords.size() >= 4) {
                break;
            }
        }

        return new ArrayList<>(keywords);
    }

    private List<String> extractSizes(String message) {
        String normalized = normalizeText(message);
        LinkedHashSet<String> sizes = new LinkedHashSet<>();
        Matcher matcher = SIZE_PATTERN.matcher(normalized);
        while (matcher.find()) {
            sizes.add(matcher.group(1));
        }
        return new ArrayList<>(sizes);
    }

    private List<String> extractColors(String message) {
        String normalized = normalizeText(message);
        if (normalized.isEmpty()) {
            return new ArrayList<>();
        }

        String[] colorTokens = new String[] { "đen", "nâu", "trắng", "xám", "xanh", "đỏ", "kem", "be", "vàng",
                "hồng", "nude", "bạc", "cam", "tím", "xanh navy", "xanh dương", "xanh lá" };
        LinkedHashSet<String> colors = new LinkedHashSet<>();
        for (String color : colorTokens) {
            if (normalized.contains(color)) {
                colors.add(color);
            }
        }
        return new ArrayList<>(colors);
    }

    private boolean matchesSizeColor(Product product, List<String> requestedSizes, List<String> requestedColors) {
        if ((requestedSizes == null || requestedSizes.isEmpty())
                && (requestedColors == null || requestedColors.isEmpty())) {
            return true;
        }

        Set<String> availableSizes = new HashSet<>();
        for (String size : getAvailableSizes(product)) {
            availableSizes.add(normalizeText(size));
        }

        Set<String> availableColors = new HashSet<>();
        for (String color : getAvailableColors(product)) {
            availableColors.add(normalizeText(color));
        }

        boolean sizeOk = requestedSizes == null || requestedSizes.isEmpty();
        if (!sizeOk) {
            for (String size : requestedSizes) {
                if (availableSizes.contains(normalizeText(size))) {
                    sizeOk = true;
                    break;
                }
            }
        }

        boolean colorOk = requestedColors == null || requestedColors.isEmpty();
        if (!colorOk) {
            for (String color : requestedColors) {
                if (availableColors.contains(normalizeText(color))) {
                    colorOk = true;
                    break;
                }
            }
        }

        return sizeOk && colorOk;
    }

    private boolean isInStock(Product product) {
        return computeAvailableQty(product) > 0;
    }

    private int computeAvailableQty(Product product) {
        int total = 0;
        boolean hasVariants = false;
        if (product.getSizes() != null) {
            for (ProductSize size : product.getSizes()) {
                if (size.getColorVariants() == null) {
                    continue;
                }
                for (SizeColorVariant variant : size.getColorVariants()) {
                    hasVariants = true;
                    Integer qty = variant.getQuantity() != null ? variant.getQuantity() : 0;
                    total += Math.max(qty, 0);
                }
            }
        }
        if (hasVariants) {
            return total;
        }
        return product.getQuantity();
    }

    private List<String> getAvailableSizes(Product product) {
        LinkedHashSet<String> sizes = new LinkedHashSet<>();
        boolean hasVariants = false;
        if (product.getSizes() != null) {
            for (ProductSize size : product.getSizes()) {
                if (size.getSizeValue() == null) {
                    continue;
                }
                if (size.getColorVariants() != null && !size.getColorVariants().isEmpty()) {
                    hasVariants = true;
                    boolean hasStock = false;
                    for (SizeColorVariant variant : size.getColorVariants()) {
                        Integer qty = variant.getQuantity() != null ? variant.getQuantity() : 0;
                        if (qty > 0) {
                            hasStock = true;
                            break;
                        }
                    }
                    if (hasStock) {
                        sizes.add(size.getSizeValue());
                    }
                } else {
                    sizes.add(size.getSizeValue());
                }
            }
        }
        if (!hasVariants && sizes.isEmpty() && product.getSizes() != null) {
            for (ProductSize size : product.getSizes()) {
                if (size.getSizeValue() != null) {
                    sizes.add(size.getSizeValue());
                }
            }
        }
        return new ArrayList<>(sizes);
    }

    private List<String> getAvailableColors(Product product) {
        LinkedHashSet<String> colors = new LinkedHashSet<>();
        boolean hasVariants = false;
        if (product.getSizes() != null) {
            for (ProductSize size : product.getSizes()) {
                if (size.getColorVariants() == null) {
                    continue;
                }
                for (SizeColorVariant variant : size.getColorVariants()) {
                    hasVariants = true;
                    Integer qty = variant.getQuantity() != null ? variant.getQuantity() : 0;
                    if (qty <= 0 || variant.getProductColor() == null) {
                        continue;
                    }
                    String colorName = variant.getProductColor().getColorName();
                    if (colorName != null) {
                        colors.add(colorName);
                    }
                }
            }
        }
        if (!hasVariants && product.getColors() != null) {
            for (ProductColor color : product.getColors()) {
                if (color.getColorName() != null) {
                    colors.add(color.getColorName());
                }
            }
        }
        return new ArrayList<>(colors);
    }

    private String buildCatalogContext(List<Product> products) {
        if (products == null || products.isEmpty()) {
            return "";
        }

        StringBuilder info = new StringBuilder();
        for (Product product : products) {
            if (product == null) {
                continue;
            }
            int totalQty = computeAvailableQty(product);
            List<String> sizes = getAvailableSizes(product);
            List<String> colors = getAvailableColors(product);

            info.append("[#").append(product.getProductId()).append("] ").append(product.getName());
            if (product.getCategory() != null && product.getCategory().getCategoryName() != null) {
                info.append(" - ").append(product.getCategory().getCategoryName());
            }
            info.append(", giá gốc: ").append(formatBasePrice(product));
            info.append(", giảm: ").append(formatDiscount(product));
            info.append(", giá sau giảm: ").append(formatFinalPrice(product));
            if (totalQty <= 0) {
                info.append(", tình trạng: hết hàng");
            } else {
                info.append(", tồn: ").append(totalQty);
            }
            if (!sizes.isEmpty()) {
                info.append(", size: ").append(String.join("/", sizes));
            }
            if (!colors.isEmpty()) {
                info.append(", màu: ").append(String.join("/", colors));
            }
            String description = buildShortDescription(product);
            if (!description.isEmpty()) {
                info.append(", mô tả: ").append(description);
            }
            info.append(". ");
        }

        return info.toString().trim();
    }

    private String formatFinalPrice(Product product) {
        if (product.getPrice() == null) {
            return "liên hệ";
        }
        double price = product.getPrice();
        if (product.getDiscount() > 0) {
            double finalPrice = price * (1 - product.getDiscount() / 100.0);
            return Math.round(finalPrice) + " VND";
        }
        return Math.round(price) + " VND";
    }

    private String formatBasePrice(Product product) {
        if (product.getPrice() == null) {
            return "liên hệ";
        }
        return Math.round(product.getPrice()) + " VND";
    }

    private String formatDiscount(Product product) {
        if (product.getDiscount() <= 0) {
            return "0%";
        }
        return product.getDiscount() + "%";
    }

    private String buildShortDescription(Product product) {
        if (product.getDescription() == null) {
            return "";
        }
        String normalized = product.getDescription().trim();
        if (normalized.isEmpty()) {
            return "";
        }
        if (normalized.length() > 120) {
            return normalized.substring(0, 120).trim() + "...";
        }
        return normalized;
    }

    private String normalizeText(String text) {
        if (text == null) {
            return "";
        }
        return text.toLowerCase().replaceAll("[^\\p{L}\\p{N}\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private String buildProductContext(Product product) {
        if (product == null) {
            return "";
        }

        StringBuilder info = new StringBuilder();
        info.append("Tên: ").append(product.getName()).append(", ");
        info.append("giá gốc: ").append(formatBasePrice(product)).append(", ");
        info.append("giảm: ").append(formatDiscount(product)).append(", ");
        info.append("giá sau giảm: ").append(formatFinalPrice(product)).append(", ");
        if (product.getCategory() != null) {
            info.append("danh mục: ").append(product.getCategory().getCategoryName()).append(", ");
        }

        int totalQty = computeAvailableQty(product);
        if (totalQty <= 0) {
            info.append("tình trạng: hết hàng, ");
        } else {
            info.append("tồn: ").append(totalQty).append(", ");
        }

        List<String> sizes = getAvailableSizes(product);
        if (!sizes.isEmpty()) {
            info.append("size: ").append(String.join(", ", sizes)).append(", ");
        }

        List<String> colors = getAvailableColors(product);
        if (!colors.isEmpty()) {
            info.append("màu: ").append(String.join(", ", colors)).append(", ");
        }

        List<String> variantInfos = new ArrayList<>();
        if (product.getSizes() != null) {
            for (ProductSize size : product.getSizes()) {
                if (size.getColorVariants() == null) {
                    continue;
                }
                for (SizeColorVariant variant : size.getColorVariants()) {
                    if (variant.getProductColor() == null || variant.getProductColor().getColorName() == null) {
                        continue;
                    }
                    Integer qty = variant.getQuantity() != null ? variant.getQuantity() : 0;
                    if (qty <= 0) {
                        continue;
                    }
                    String item = "size " + size.getSizeValue() + " - màu " + variant.getProductColor().getColorName()
                            + ": " + qty;
                    variantInfos.add(item);
                    if (variantInfos.size() >= 8) {
                        break;
                    }
                }
                if (variantInfos.size() >= 8) {
                    break;
                }
            }
        }

        if (!variantInfos.isEmpty()) {
            info.append("tồn kho theo size/màu: ").append(String.join("; ", variantInfos)).append(", ");
        }

        String result = info.toString().trim();
        if (result.endsWith(",")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }
}
