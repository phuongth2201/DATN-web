package hospital.repository;

import hospital.domain.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@SuppressWarnings("unused")
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    @Query("select notification from Notification notification where notification.user.login = :login order by notification.createdAt desc")
    Page<Notification> findByUserIsCurrentUser(@Param("login") String login, Pageable pageable);

    @Query("select count(notification) from Notification notification where notification.user.login = :login and notification.isRead = false")
    long countUnreadByUserIsCurrentUser(@Param("login") String login);

    @Modifying
    @Query("update Notification notification set notification.isRead = true where notification.user.login = :login and notification.isRead = false")
    void markAllAsReadForCurrentUser(@Param("login") String login);
}
