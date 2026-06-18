package hospital.service;

import hospital.domain.Notification;
import hospital.domain.User;
import hospital.repository.NotificationRepository;
import hospital.repository.UserRepository;
import hospital.service.dto.NotificationDTO;
import hospital.service.mapper.NotificationMapper;
import hospital.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Transactional
public class NotificationService {

    private final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final UserRepository userRepository;

    // SSE Emitters for real-time notifications
    private final Map<Long, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    public NotificationService(NotificationRepository notificationRepository, NotificationMapper notificationMapper, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.notificationMapper = notificationMapper;
        this.userRepository = userRepository;
    }

    public NotificationDTO createNotification(Long userId, String title, String message, String type, Long relatedId) {
        log.debug("Request to create Notification for userId: {}", userId);
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return null;
        }

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setRelatedId(relatedId);
        
        notification = notificationRepository.save(notification);
        NotificationDTO dto = notificationMapper.toDto(notification);

        // Notify via SSE
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters != null) {
            List<SseEmitter> deadEmitters = new ArrayList<>();
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name("NOTIFICATION").data(dto));
                } catch (Exception e) {
                    deadEmitters.add(emitter);
                }
            }
            emitters.removeAll(deadEmitters);
        }

        return dto;
    }

    public SseEmitter createSseEmitterForCurrentUser() {
        Long userId = SecurityUtils.getCurrentUserLogin()
            .flatMap(userRepository::findOneByLogin)
            .map(User::getId)
            .orElseThrow(() -> new IllegalStateException("User not found"));
            
        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L); // 1 hour timeout
        userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError((e) -> removeEmitter(userId, emitter));
        
        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected"));
        } catch (Exception e) {
            removeEmitter(userId, emitter);
        }

        return emitter;
    }

    private void removeEmitter(Long userId, SseEmitter emitter) {
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                userEmitters.remove(userId);
            }
        }
    }

    @Transactional(readOnly = true)
    public Page<NotificationDTO> getCurrentUserNotifications(Pageable pageable) {
        log.debug("Request to get current user Notifications");
        return SecurityUtils.getCurrentUserLogin()
            .map(login -> notificationRepository.findByUserIsCurrentUser(login, pageable)
                .map(notificationMapper::toDto))
            .orElse(Page.empty(pageable));
    }

    @Transactional(readOnly = true)
    public long countUnread() {
        return SecurityUtils.getCurrentUserLogin()
            .map(notificationRepository::countUnreadByUserIsCurrentUser)
            .orElse(0L);
    }

    public Optional<NotificationDTO> markAsRead(Long id) {
        log.debug("Request to mark Notification as read : {}", id);
        return notificationRepository.findById(id).map(notification -> {
            String currentLogin = SecurityUtils.getCurrentUserLogin().orElse(null);
            boolean isAdmin = SecurityUtils.hasCurrentUserAnyOfAuthorities("ROLE_ADMIN");
            boolean isOwner = notification.getUser() != null &&
                notification.getUser().getLogin().equalsIgnoreCase(currentLogin);
            if (!isOwner && !isAdmin) {
                throw new IllegalStateException("Unauthorized");
            }
            notification.setIsRead(true);
            return notificationMapper.toDto(notification);
        });
    }

    public void markAllAsRead() {
        log.debug("Request to mark all current user Notifications as read");
        SecurityUtils.getCurrentUserLogin()
            .ifPresent(notificationRepository::markAllAsReadForCurrentUser);
    }
}
