package hospital.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import hospital.domain.Notification;
import hospital.domain.User;
import hospital.repository.NotificationRepository;
import hospital.repository.UserRepository;
import hospital.service.dto.NotificationDTO;
import hospital.service.mapper.NotificationMapper;
import java.util.Collections;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    NotificationRepository notificationRepository;

    @Mock
    NotificationMapper notificationMapper;

    @Mock
    UserRepository userRepository;

    @InjectMocks
    NotificationService notificationService;

    private Notification notification;
    private User owner;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setId(1L);
        owner.setLogin("owner");

        notification = new Notification();
        notification.setId(1L);
        notification.setUser(owner);
        notification.setTitle("Test");
        notification.setMessage("Test message");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void loginAs(String username, String... roles) {
        var authorities = java.util.Arrays.stream(roles)
            .map(SimpleGrantedAuthority::new)
            .toList();
        var auth = new UsernamePasswordAuthenticationToken(username, "password", authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    // ─── markAsRead: ownership check (IDOR prevention) ───────────────────────

    @Test
    void markAsRead_byNonOwnerNonAdmin_throwsIllegalState() {
        loginAs("attacker", "ROLE_PATIENT");
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notification));

        assertThatThrownBy(() -> notificationService.markAsRead(1L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Unauthorized");
    }

    @Test
    void markAsRead_byOwner_succeeds() {
        loginAs("owner", "ROLE_PATIENT");
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notification));
        when(notificationMapper.toDto(any())).thenReturn(new NotificationDTO());

        Optional<NotificationDTO> result = notificationService.markAsRead(1L);

        assertThat(result).isPresent();
        assertThat(notification.getIsRead()).isTrue();
    }

    @Test
    void markAsRead_byAdmin_succeeds() {
        loginAs("admin", "ROLE_ADMIN");
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notification));
        when(notificationMapper.toDto(any())).thenReturn(new NotificationDTO());

        Optional<NotificationDTO> result = notificationService.markAsRead(1L);

        assertThat(result).isPresent();
        assertThat(notification.getIsRead()).isTrue();
    }

    @Test
    void markAsRead_notificationNotFound_returnsEmpty() {
        loginAs("owner", "ROLE_PATIENT");
        when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

        Optional<NotificationDTO> result = notificationService.markAsRead(999L);

        assertThat(result).isEmpty();
    }

    // ─── createNotification: unknown userId returns null ─────────────────────

    @Test
    void createNotification_unknownUser_returnsNull() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        NotificationDTO result = notificationService.createNotification(
            999L, "Title", "Message", "TYPE", 1L
        );

        assertThat(result).isNull();
    }
}
