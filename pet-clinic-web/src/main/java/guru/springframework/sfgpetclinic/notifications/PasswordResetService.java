package guru.springframework.sfgpetclinic.notifications;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.PasswordResetToken;
import guru.springframework.sfgpetclinic.repositories.PasswordResetTokenRepository;
import guru.springframework.sfgpetclinic.services.AppUserService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class PasswordResetService {

    public enum ResetResult { RESET, INVALID, EXPIRED }

    private final PasswordResetTokenRepository tokenRepository;
    private final AppUserService appUserService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Duration tokenLifetime;
    private final String publicBaseUrl;
    private final String fromAddress;

    public PasswordResetService(PasswordResetTokenRepository tokenRepository,
                                AppUserService appUserService,
                                PasswordEncoder passwordEncoder,
                                ObjectProvider<JavaMailSender> mailSenderProvider,
                                Clock clock,
                                @Value("${clinic.password-reset.token-minutes:60}") long tokenMinutes,
                                @Value("${clinic.public-base-url:http://localhost:8080}") String publicBaseUrl,
                                @Value("${clinic.notifications.from:no-reply@petclinic.local}") String fromAddress) {
        this.tokenRepository = tokenRepository;
        this.appUserService = appUserService;
        this.passwordEncoder = passwordEncoder;
        this.mailSenderProvider = mailSenderProvider;
        this.clock = clock;
        this.tokenLifetime = Duration.ofMinutes(tokenMinutes);
        this.publicBaseUrl = publicBaseUrl;
        this.fromAddress = fromAddress;
    }

    @Transactional
    public void requestReset(String email) {
        appUserService.findByEmail(email).filter(AppUser::isEmailVerified).ifPresent(this::createAndSend);
    }

    private void createAndSend(AppUser user) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            return;
        }

        tokenRepository.deleteByUser(user);
        String rawToken = generateToken();
        tokenRepository.save(PasswordResetToken.builder()
                .user(user)
                .tokenHash(hash(rawToken))
                .expiresAt(clock.instant().plus(tokenLifetime))
                .build());

        String resetUrl = UriComponentsBuilder.fromUriString(publicBaseUrl)
                .path("/reset-password")
                .queryParam("token", rawToken)
                .build()
                .toUriString();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject("Reset your Happy Tails password");
            helper.setText("<p>Hello " + escapeHtml(user.getDisplayName()) + ",</p>"
                    + "<p>We received a request to change your Happy Tails password.</p>"
                    + "<p><a href=\"" + resetUrl + "\">Choose a new password</a></p>"
                    + "<p>This link expires in " + tokenLifetime.toMinutes() + " minutes. "
                    + "If you did not request this change, you can ignore this email.</p>", true);
            mailSender.send(message);
        } catch (RuntimeException | MessagingException ex) {
            tokenRepository.deleteByUser(user);
        }
    }

    @Transactional
    public ResetResult resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            return ResetResult.INVALID;
        }
        return tokenRepository.findByTokenHash(hash(rawToken))
                .map(token -> completeReset(token, newPassword, clock.instant()))
                .orElse(ResetResult.INVALID);
    }

    private ResetResult completeReset(PasswordResetToken token, String newPassword, Instant now) {
        if (token.getExpiresAt().isBefore(now)) {
            tokenRepository.delete(token);
            return ResetResult.EXPIRED;
        }
        AppUser user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        appUserService.save(user);
        tokenRepository.deleteByUser(user);
        return ResetResult.RESET;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private String escapeHtml(String value) {
        if (value == null || value.isBlank()) {
            return "there";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
