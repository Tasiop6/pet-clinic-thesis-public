package guru.springframework.sfgpetclinic.controllers;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.security.AppUserDetails;
import guru.springframework.sfgpetclinic.security.GoogleOAuthService;
import guru.springframework.sfgpetclinic.services.AppUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.io.IOException;
import java.time.Instant;

@Controller
public class ProfileGoogleController {

    private static final Logger log = LoggerFactory.getLogger(ProfileGoogleController.class);

    private final AppUserService appUserService;
    private final GoogleOAuthService googleOAuthService;

    public ProfileGoogleController(AppUserService appUserService,
                                   GoogleOAuthService googleOAuthService) {
        this.appUserService = appUserService;
        this.googleOAuthService = googleOAuthService;
    }

    @GetMapping("/auth/google/callback")
    public String handleGoogleCallback(@RequestParam(value = "code", required = false) String code,
                                       @RequestParam(value = "state", required = false) String state,
                                       @RequestParam(value = "error", required = false) String error,
                                       HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            log.warn("Google OAuth callback rejected because the linking session is missing");
            return "redirect:/oauth/google?status=error&reason=session";
        }
        Long userId = (Long) session.getAttribute(ProfileController.SESSION_LINK_USER);
        String expectedState = (String) session.getAttribute(ProfileController.SESSION_STATE);

        if (StringUtils.hasText(error)) {
            session.removeAttribute(ProfileController.SESSION_LINK_USER);
            session.removeAttribute(ProfileController.SESSION_STATE);
            log.info("Google OAuth authorization was not completed: {}", sanitize(error));
            return "redirect:/oauth/google?status=error&reason=" + sanitize(error);
        }
        if (!StringUtils.hasText(code) || !StringUtils.hasText(state) || userId == null || !state.equals(expectedState)) {
            log.warn("Google OAuth callback rejected by state validation (code={}, state={}, user={})",
                    StringUtils.hasText(code), StringUtils.hasText(state), userId != null);
            return "redirect:/oauth/google?status=error&reason=invalid";
        }
        session.removeAttribute(ProfileController.SESSION_LINK_USER);
        session.removeAttribute(ProfileController.SESSION_STATE);
        AppUser user = appUserService.findById(userId);
        if (user == null) {
            return "redirect:/oauth/google?status=error&reason=user";
        }
        if (!googleOAuthService.isConfigured()) {
            return "redirect:/oauth/google?status=error&reason=config";
        }
        try {
            GoogleTokenResponse tokenResponse = googleOAuthService.exchangeCode(code);
            if (StringUtils.hasText(tokenResponse.getRefreshToken())) {
                user.setGoogleRefreshToken(tokenResponse.getRefreshToken());
            } else if (!StringUtils.hasText(user.getGoogleRefreshToken())) {
                return "redirect:/oauth/google?status=error&reason=missing_refresh";
            }
            user.setGoogleAccessToken(tokenResponse.getAccessToken());
            if (tokenResponse.getExpiresInSeconds() != null) {
                user.setGoogleAccessTokenExpiry(Instant.now().plusSeconds(tokenResponse.getExpiresInSeconds()));
            } else {
                user.setGoogleAccessTokenExpiry(null);
            }

            GoogleIdToken.Payload payload = googleOAuthService.fetchUserInfo(tokenResponse);
            if (payload != null && StringUtils.hasText(payload.getEmail())) {
                user.setCalendarEmail(payload.getEmail());
            }
            appUserService.save(user);
            refreshAuthenticatedUser(user);
            return "redirect:/oauth/google?status=success";
        } catch (IOException ex) {
            log.warn("Google OAuth token exchange failed: {}", ex.getClass().getSimpleName());
            return "redirect:/oauth/google?status=error&reason=io";
        }
    }

    private void refreshAuthenticatedUser(AppUser updatedUser) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return;
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof AppUserDetails userDetails)) {
            return;
        }
        AppUser current = userDetails.getUser();
        if (!updatedUser.getId().equals(current.getId())) {
            return;
        }
        current.setGoogleAccessToken(updatedUser.getGoogleAccessToken());
        current.setGoogleAccessTokenExpiry(updatedUser.getGoogleAccessTokenExpiry());
        current.setGoogleRefreshToken(updatedUser.getGoogleRefreshToken());
        current.setCalendarEmail(updatedUser.getCalendarEmail());
    }

    private String sanitize(String value) {
        if (!StringUtils.hasText(value)) {
            return "error";
        }
        return value.replaceAll("[^a-zA-Z0-9_-]", "");
    }
}
