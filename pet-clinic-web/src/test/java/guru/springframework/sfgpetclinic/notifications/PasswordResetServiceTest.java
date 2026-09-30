package guru.springframework.sfgpetclinic.notifications;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.PasswordResetToken;
import guru.springframework.sfgpetclinic.repositories.PasswordResetTokenRepository;
import guru.springframework.sfgpetclinic.services.AppUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PasswordResetServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-04T00:00:00Z");

    private PasswordResetTokenRepository tokenRepository;
    private AppUserService appUserService;
    private PasswordEncoder passwordEncoder;
    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        tokenRepository = mock(PasswordResetTokenRepository.class);
        appUserService = mock(AppUserService.class);
        passwordEncoder = mock(PasswordEncoder.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> mailSenderProvider = mock(ObjectProvider.class);
        service = new PasswordResetService(
                tokenRepository,
                appUserService,
                passwordEncoder,
                mailSenderProvider,
                Clock.fixed(NOW, ZoneOffset.UTC),
                60,
                "https://thesis-tasiopoulos.com",
                "no-reply@thesis-tasiopoulos.com");
    }

    @Test
    void resetsPasswordAndConsumesValidToken() {
        AppUser user = AppUser.builder().username("owner").password("old-hash").build();
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .tokenHash("stored-hash")
                .expiresAt(NOW.plusSeconds(60))
                .build();
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("new-password")).thenReturn("new-hash");

        PasswordResetService.ResetResult result = service.resetPassword("raw-token", "new-password");

        assertThat(result).isEqualTo(PasswordResetService.ResetResult.RESET);
        assertThat(user.getPassword()).isEqualTo("new-hash");
        verify(appUserService).save(user);
        verify(tokenRepository).deleteByUser(user);
    }

    @Test
    void rejectsAndDeletesExpiredToken() {
        AppUser user = AppUser.builder().username("owner").password("old-hash").build();
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .tokenHash("stored-hash")
                .expiresAt(NOW.minusSeconds(1))
                .build();
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        PasswordResetService.ResetResult result = service.resetPassword("raw-token", "new-password");

        assertThat(result).isEqualTo(PasswordResetService.ResetResult.EXPIRED);
        verify(tokenRepository).delete(token);
        verify(passwordEncoder, never()).encode(anyString());
        verify(appUserService, never()).save(user);
    }

    @Test
    void rejectsBlankTokenWithoutQueryingDatabase() {
        PasswordResetService.ResetResult result = service.resetPassword(" ", "new-password");

        assertThat(result).isEqualTo(PasswordResetService.ResetResult.INVALID);
        verify(tokenRepository, never()).findByTokenHash(anyString());
    }
}
