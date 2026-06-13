package hospital.service;

import hospital.domain.Notification;
import hospital.domain.User;
import hospital.repository.NotificationRepository;
import hospital.repository.UserRepository;
import hospital.service.dto.NotificationDTO;
import hospital.service.mapper.NotificationMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class NotificationService {

    private final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, NotificationMapper notificationMapper, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.notificationMapper = notificationMapper;
        this.userRepository = userRepository;
    }

    public NotificationDTO createNotification(Long userId, String title, String message, String type, Long relatedId) {
        log.debug("Request to create Notification for userId: {}", userId);
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) {
            return null;
        }

        Notification notification = new Notification();
        notification.setUser(user.get());
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setRelatedId(relatedId);
        
        notification = notificationRepository.save(notification);
        return notificationMapper.toDto(notification);
    }

    @Transactional(readOnly = true)
    public Page<NotificationDTO> getCurrentUserNotifications(Pageable pageable) {
        log.debug("Request to get current user Notifications");
        return notificationRepository.findByUserIsCurrentUser(pageable)
            .map(notificationMapper::toDto);
    }

    @Transactional(readOnly = true)
    public long countUnread() {
        return notificationRepository.countUnreadByUserIsCurrentUser();
    }

    public Optional<NotificationDTO> markAsRead(Long id) {
        log.debug("Request to mark Notification as read : {}", id);
        return notificationRepository.findById(id).map(notification -> {
            notification.setIsRead(true);
            return notificationMapper.toDto(notification);
        });
    }

    public void markAllAsRead() {
        log.debug("Request to mark all current user Notifications as read");
        notificationRepository.markAllAsReadForCurrentUser();
    }
}
