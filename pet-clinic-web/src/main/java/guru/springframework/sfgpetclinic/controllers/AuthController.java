package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.i18n.UiTextService;
import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.UserRole;
import guru.springframework.sfgpetclinic.notifications.EmailVerificationService;
import guru.springframework.sfgpetclinic.notifications.PasswordResetService;
import guru.springframework.sfgpetclinic.security.AppUserDetails;
import guru.springframework.sfgpetclinic.security.JwtAuthenticationFilter;
import guru.springframework.sfgpetclinic.security.JwtTokenService;
import guru.springframework.sfgpetclinic.services.AppUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AppUserService appUserService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenService jwtTokenService;
    private final UiTextService uiTextService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;

    public AuthController(AppUserService appUserService,
                          PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager,
                          JwtTokenService jwtTokenService,
                          UiTextService uiTextService,
                          EmailVerificationService emailVerificationService,
                          PasswordResetService passwordResetService) {
        this.appUserService = appUserService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenService = jwtTokenService;
        this.uiTextService = uiTextService;
        this.emailVerificationService = emailVerificationService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest httpRequest,
                                              HttpServletResponse httpResponse) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password()));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String token = jwtTokenService.generateToken(authentication);
            ResponseCookie cookie = buildTokenCookie(token, httpRequest.isSecure());
            httpResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
            AppUserDetails userDetails = (AppUserDetails) authentication.getPrincipal();
            return ResponseEntity.ok(new AuthResponse(true, toAuthUser(userDetails), null));
        } catch (DisabledException ex) {
            return ResponseEntity.status(403)
                    .body(new AuthResponse(false, null, text("auth.login.inactive")));
        } catch (LockedException ex) {
            return ResponseEntity.status(423)
                    .body(new AuthResponse(false, null, text("auth.login.blacklisted")));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(401)
                    .body(new AuthResponse(false, null, text("auth.login.invalid")));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> current(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AppUserDetails userDetails)) {
            return ResponseEntity.status(401).body(new AuthResponse(false, null, null));
        }
        return ResponseEntity.ok(new AuthResponse(true, toAuthUser(userDetails), null));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request,
                                                      HttpServletResponse response) {
        invalidateCookie(response, request.isSecure());
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", text("auth.logout.success")));
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegistrationRequest request) {
        if (appUserService.findByUsername(request.username()).isPresent()) {
            return ResponseEntity.status(409)
                    .body(Map.of("message", text("auth.register.username.exists")));
        }
        if (appUserService.findByEmail(request.email()).isPresent()) {
            return ResponseEntity.status(409)
                    .body(Map.of("message", text("auth.register.email.exists")));
        }
        AppUser user = AppUser.builder()
                .username(request.username())
                .password(passwordEncoder.encode(request.password()))
                .displayName(request.displayName())
                .email(request.email())
                .emailVerified(false)
                .active(false)
                .build();
        user.setRoles(EnumSet.of(UserRole.STAFF));
        AppUser savedUser = appUserService.save(user);
        if (!emailVerificationService.createAndSend(savedUser)) {
            appUserService.delete(savedUser);
            return ResponseEntity.status(503).body(Map.of(
                    "message", "Registration email could not be sent. Please try again later."));
        }
        return ResponseEntity.ok(Map.of(
                "message", "Registration received. Check your email, then wait for clinic approval."));
    }

    @GetMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@RequestParam String token) {
        EmailVerificationService.VerificationResult result = emailVerificationService.verify(token);
        return switch (result) {
            case VERIFIED -> ResponseEntity.ok(Map.of(
                    "message", "Email verified. A clinic administrator must still approve your account."));
            case ALREADY_VERIFIED -> ResponseEntity.ok(Map.of("message", "This email address is already verified."));
            case EXPIRED -> ResponseEntity.status(410).body(Map.of(
                    "message", "This verification link has expired. Please register again."));
            case INVALID -> ResponseEntity.badRequest().body(Map.of(
                    "message", "This verification link is invalid."));
        };
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok(Map.of(
                "message", "If an account uses this email address, a password reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        PasswordResetService.ResetResult result =
                passwordResetService.resetPassword(request.token(), request.password());
        return switch (result) {
            case RESET -> ResponseEntity.ok(Map.of(
                    "message", "Your password has been changed. You can now sign in."));
            case EXPIRED -> ResponseEntity.status(410).body(Map.of(
                    "message", "This password reset link has expired. Request a new one."));
            case INVALID -> ResponseEntity.badRequest().body(Map.of(
                    "message", "This password reset link is invalid or has already been used."));
        };
    }

    private ResponseCookie buildTokenCookie(String token, boolean secure) {
        return ResponseCookie.from(JwtAuthenticationFilter.TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path("/")
                .maxAge(jwtTokenService.getExpirationMs() / 1000)
                .build();
    }

    private void invalidateCookie(HttpServletResponse response, boolean secure) {
        ResponseCookie tokenCookie = ResponseCookie.from(JwtAuthenticationFilter.TOKEN_COOKIE, "")
                .path("/")
                .httpOnly(true)
                .secure(secure)
                .maxAge(0)
                .sameSite("Lax")
                .build();
        ResponseCookie sessionCookie = ResponseCookie.from("JSESSIONID", "")
                .path("/")
                .httpOnly(true)
                .secure(secure)
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, tokenCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.toString());
    }

    private AuthUser toAuthUser(AppUserDetails userDetails) {
        AppUser user = userDetails.getUser();
        Long vetId = user.getVet() != null ? user.getVet().getId() : null;
        return new AuthUser(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmail(),
                user.isActive(),
                user.isAdmin(),
                Set.copyOf(user.getRoles()),
                vetId
        );
    }

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password) {
    }

    public record RegistrationRequest(
            @NotBlank @Size(min = 3, max = 50) String username,
            @NotBlank @Size(min = 8, max = 100) String password,
            @Size(max = 100) String displayName,
            @NotBlank @Email @Size(max = 190) String email) {
    }

    public record ForgotPasswordRequest(
            @NotBlank @Email @Size(max = 190) String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 100) String password) {
    }

    public record AuthUser(
            Long id,
            String username,
            String displayName,
            String email,
            boolean active,
            boolean admin,
            Set<UserRole> roles,
            Long vetId) {
    }

    public record AuthResponse(
            boolean authenticated,
            AuthUser user,
            String message) {
    }

    private String text(String key) {
        return uiTextService.text(key, LocaleContextHolder.getLocale());
    }
}
