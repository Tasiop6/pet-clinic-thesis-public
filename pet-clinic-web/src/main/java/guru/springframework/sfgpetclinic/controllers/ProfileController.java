package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.security.AppUserDetails;
import guru.springframework.sfgpetclinic.security.GoogleOAuthService;
import guru.springframework.sfgpetclinic.services.AppUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    static final String SESSION_LINK_USER = "google_link_user_id";
    static final String SESSION_STATE = "google_oauth_state";

    private final AppUserService appUserService;
    private final GoogleOAuthService googleOAuthService;

    public ProfileController(AppUserService appUserService,
                             GoogleOAuthService googleOAuthService) {
        this.appUserService = appUserService;
        this.googleOAuthService = googleOAuthService;
    }

    @GetMapping
    public ProfileResponse getProfile(Authentication authentication) {
        AppUserDetails userDetails = requireAuthenticated(authentication);
        AppUser user = userDetails.getUser();
        String calendarEmail = StringUtils.hasText(user.getCalendarEmail()) ? user.getCalendarEmail() : user.getEmail();
        boolean linked = StringUtils.hasText(user.getGoogleRefreshToken()) || StringUtils.hasText(user.getGoogleAccessToken());
        return new ProfileResponse(
                user.getDisplayName(),
                user.getEmail(),
                user.isActive(),
                linked,
                calendarEmail,
                googleOAuthService.isConfigured()
        );
    }

    @PutMapping
    public ProfileResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest request,
                                         Authentication authentication) {
        AppUserDetails userDetails = requireAuthenticated(authentication);
        AppUser user = userDetails.getUser();
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Activate your account before updating the profile.");
        }
        if (request.email() != null && StringUtils.hasText(request.email())) {
            appUserService.findByEmail(request.email()).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
                }
            });
        }
        if (request.displayName() != null) {
            user.setDisplayName(request.displayName());
        }
        if (request.email() != null) {
            user.setEmail(request.email());
            if (!StringUtils.hasText(user.getCalendarEmail())) {
                user.setCalendarEmail(request.email());
            }
        }
        appUserService.save(user);
        refreshAuthenticatedUser(userDetails, user);
        return getProfile(authentication);
    }

    @PostMapping("/google/connect")
    public Map<String, String> connectGoogle(Authentication authentication,
                                             HttpServletRequest request) {
        AppUserDetails userDetails = requireAuthenticated(authentication);
        AppUser user = userDetails.getUser();
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Activate your account before linking Google Calendar.");
        }
        if (StringUtils.hasText(user.getGoogleRefreshToken()) || StringUtils.hasText(user.getGoogleAccessToken())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Google Calendar is already connected.");
        }
        if (!googleOAuthService.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Google OAuth credentials are not configured.");
        }
        HttpSession session = request.getSession(true);
        String state = UUID.randomUUID().toString();
        session.setAttribute(SESSION_STATE, state);
        session.setAttribute(SESSION_LINK_USER, user.getId());
        String authorizationUrl = googleOAuthService.buildAuthorizationUrl(state);
        return Map.of("authorizationUrl", authorizationUrl, "state", state);
    }

    @PostMapping("/google/disconnect")
    public ProfileResponse disconnectGoogle(Authentication authentication) {
        AppUserDetails userDetails = requireAuthenticated(authentication);
        AppUser user = userDetails.getUser();
        user.setGoogleAccessToken(null);
        user.setGoogleAccessTokenExpiry(null);
        user.setGoogleRefreshToken(null);
        user.setCalendarEmail(null);
        appUserService.save(user);
        refreshAuthenticatedUser(userDetails, user);
        return getProfile(authentication);
    }

    private AppUserDetails requireAuthenticated(Authentication authentication) {
        Authentication auth = authentication != null ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return userDetails;
    }

    private void refreshAuthenticatedUser(AppUserDetails currentDetails, AppUser updated) {
        if (!currentDetails.getUser().getId().equals(updated.getId())) {
            return;
        }
        AppUser current = currentDetails.getUser();
        current.setDisplayName(updated.getDisplayName());
        current.setEmail(updated.getEmail());
        current.setCalendarEmail(updated.getCalendarEmail());
        current.setGoogleAccessToken(updated.getGoogleAccessToken());
        current.setGoogleAccessTokenExpiry(updated.getGoogleAccessTokenExpiry());
        current.setGoogleRefreshToken(updated.getGoogleRefreshToken());
    }

    public record ProfileResponse(
            String displayName,
            String email,
            boolean active,
            boolean calendarLinked,
            String calendarEmail,
            boolean oauthConfigured) {
    }

    public record ProfileUpdateRequest(
            @Size(max = 100) String displayName,
            @Email @Size(max = 190) String email) {
    }
}
