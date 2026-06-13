package hospital.web.rest;

import hospital.service.NotificationService;
import hospital.service.dto.NotificationDTO;
import hospital.service.dto.PageResponseDTO;
import hospital.service.dto.PaginationDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class NotificationResource {

    private final Logger log = LoggerFactory.getLogger(NotificationResource.class);

    private final NotificationService notificationService;

    public NotificationResource(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping(value = "/notifications/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNotifications() {
        log.debug("REST request to stream Notifications");
        return notificationService.createSseEmitterForCurrentUser();
    }

    @GetMapping("/notifications")
    public ResponseEntity<PageResponseDTO<NotificationDTO>> getAllNotifications(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        log.debug("REST request to get a page of Notifications");
        Page<NotificationDTO> pageResult = notificationService.getCurrentUserNotifications(PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(
            new PageResponseDTO<>(pageResult.getContent(), new PaginationDTO(page, limit, pageResult.getTotalElements(), pageResult.getTotalPages()))
        );
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        log.debug("REST request to get unread count");
        long count = notificationService.countUnread();
        return ResponseEntity.ok().body(Map.of("count", count));
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<NotificationDTO> markAsRead(@PathVariable Long id) {
        log.debug("REST request to mark Notification as read : {}", id);
        return notificationService.markAsRead(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        log.debug("REST request to mark all Notifications as read");
        notificationService.markAllAsRead();
        return ResponseEntity.noContent().build();
    }
}
