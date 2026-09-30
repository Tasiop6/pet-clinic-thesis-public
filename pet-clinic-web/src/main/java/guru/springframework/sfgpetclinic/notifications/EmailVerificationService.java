package guru.springframework.sfgpetclinic.notifications;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.EmailVerificationToken;
import guru.springframework.sfgpetclinic.repositories.EmailVerificationTokenRepository;
import guru.springframework.sfgpetclinic.services.AppUserService;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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
public class EmailVerificationService {

    public enum VerificationResult { VERIFIED, INVALID, EXPIRED, ALREADY_VERIFIED }

    private final EmailVerificationTokenRepository tokenRepository;
    private final AppUserService appUserService;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Duration tokenLifetime;
    private final String publicBaseUrl;
    private final String fromAddress;

    public EmailVerificationService(EmailVerificationTokenRepository tokenRepository,
                                    AppUserService appUserService,
                                    ObjectProvider<JavaMailSender> mailSenderProvider,
                                    Clock clock,
                                    @Value("${clinic.email-verification.token-hours:24}") long tokenHours,
                                    @Value("${clinic.public-base-url:http://localhost:8080}") String publicBaseUrl,
                                    @Value("${clinic.notifications.from:no-reply@petclinic.local}") String fromAddress) {
        this.tokenRepository = tokenRepository;
        this.appUserService = appUserService;
        this.mailSenderProvider = mailSenderProvider;
        this.clock = clock;
        this.tokenLifetime = Duration.ofHours(tokenHours);
        this.publicBaseUrl = publicBaseUrl;
        this.fromAddress = fromAddress;
    }

    @Transactional
    public boolean createAndSend(AppUser user) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            return false;
        }

        tokenRepository.deleteByUser(user);
        String rawToken = generateToken();
        tokenRepository.save(EmailVerificationToken.builder()
                .user(user)
                .tokenHash(hash(rawToken))
                .expiresAt(clock.instant().plus(tokenLifetime))
                .build());

        String verificationUrl = UriComponentsBuilder.fromUriString(publicBaseUrl)
                .path("/verify-email")
                .queryParam("token", rawToken)
                .build()
                .toUriString();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject("Verify your Happy Tails email address");
            helper.setText("<p>Hello " + escapeHtml(user.getDisplayName()) + ",</p>"
                    + "<p>Confirm your email address to complete your Happy Tails registration.</p>"
                    + "<p><a href=\"" + verificationUrl + "\">Verify email address</a></p>"
                    + "<p>This link expires in " + tokenLifetime.toHours() + " hours. "
                    + "A clinic administrator must still approve access.</p>", true);
            mailSender.send(message);
            return true;
        } catch (RuntimeException | jakarta.mail.MessagingException ex) {
            tokenRepository.deleteByUser(user);
            return false;
        }
    }

    @Transactional
    public VerificationResult verify(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return VerificationResult.INVALID;
        }
        return tokenRepository.findByTokenHash(hash(rawToken))
                .map(token -> completeVerification(token, clock.instant()))
                .orElse(VerificationResult.INVALID);
    }

    private VerificationResult completeVerification(EmailVerificationToken token, Instant now) {
        AppUser user = token.getUser();
        if (user.isEmailVerified()) {
            tokenRepository.delete(token);
            return VerificationResult.ALREADY_VERIFIED;
        }
        if (token.getExpiresAt().isBefore(now)) {
            tokenRepository.delete(token);
            return VerificationResult.EXPIRED;
        }
        user.setEmailVerified(true);
        appUserService.save(user);
        tokenRepository.delete(token);
        return VerificationResult.VERIFIED;
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
