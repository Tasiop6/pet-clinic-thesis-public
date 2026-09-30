package guru.springframework.sfgpetclinic.notifications;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.Appointment;
import guru.springframework.sfgpetclinic.model.UserRole;
import guru.springframework.sfgpetclinic.services.AppUserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class CalendarNotificationPolicy {

    private static final Logger log = LoggerFactory.getLogger(CalendarNotificationPolicy.class);

    private final AppUserService appUserService;
    private final Set<UserRole> notificationRoles;

    public CalendarNotificationPolicy(AppUserService appUserService,
                                      @Value("${clinic.calendar.notify-roles:CLINIC_OWNER,VET}") String notifyRolesProperty) {
        this.appUserService = appUserService;
        this.notificationRoles = parseRoles(notifyRolesProperty);
    }

    public record Recipient(String email, String displayName) {
    }

    public Set<Recipient> resolve(Appointment appointment) {
        if (appointment == null) {
            return Set.of();
        }
        LinkedHashSet<Recipient> recipients = new LinkedHashSet<>();
        LinkedHashSet<String> seenEmails = new LinkedHashSet<>();
        Long creatorId = appointment.getUser() != null ? appointment.getUser().getId() : null;

        Collection<AppUser> activeUsers = appUserService.findActiveUsers();
        for (AppUser user : activeUsers) {
            addIfEligible(recipients, seenEmails, user, appointment, creatorId);
        }
        AppUser creator = appointment.getUser();
        if (creator != null) {
            addIfEligible(recipients, seenEmails, creator, appointment, creatorId);
        }
        return recipients;
    }

    public Set<String> resolveEmails(Appointment appointment) {
        return resolve(appointment).stream()
                .map(Recipient::email)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private void addIfEligible(Set<Recipient> recipients,
                               Set<String> seenEmails,
                               AppUser user,
                               Appointment appointment,
                               Long creatorId) {
        if (!shouldReceive(user, appointment, creatorId)) {
            return;
        }
        String email = resolveEmail(user);
        if (!StringUtils.hasText(email)) {
            return;
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (!seenEmails.add(normalized)) {
            return;
        }
        recipients.add(new Recipient(email, resolveDisplayName(user, email)));
    }

    private boolean shouldReceive(AppUser user, Appointment appointment, Long creatorId) {
        if (user == null) {
            return false;
        }
        if (!user.isActive() || user.isBlacklisted()) {
            return false;
        }
        boolean isCreator = creatorId != null
                && user.getId() != null
                && creatorId.equals(user.getId());
        Set<UserRole> roles = user.getRoles();
        boolean isSuperAdmin = roles.contains(UserRole.SUPERADMIN);
        if (isSuperAdmin) {
            return isCreator;
        }
        if (isCreator) {
            return true;
        }
        for (UserRole role : roles) {
            if (notificationRoles.contains(role)) {
                return true;
            }
        }
        return false;
    }

    private String resolveEmail(AppUser user) {
        if (StringUtils.hasText(user.getCalendarEmail())) {
            return user.getCalendarEmail();
        }
        return user.getEmail();
    }

    private String resolveDisplayName(AppUser user, String fallbackEmail) {
        if (StringUtils.hasText(user.getDisplayName())) {
            return user.getDisplayName().trim();
        }
        if (StringUtils.hasText(user.getUsername())) {
            return user.getUsername().trim();
        }
        return fallbackEmail;
    }

    private Set<UserRole> parseRoles(String value) {
        EnumSet<UserRole> parsed = EnumSet.noneOf(UserRole.class);
        if (StringUtils.hasText(value)) {
            String[] tokens = value.split(",");
            for (String token : tokens) {
                String candidate = token.trim();
                if (candidate.isEmpty()) {
                    continue;
                }
                try {
                    parsed.add(UserRole.valueOf(candidate.toUpperCase(Locale.ROOT)));
                } catch (IllegalArgumentException ex) {
                    log.warn("Ignoring unknown user role '{}' in clinic.calendar.notify-roles property", candidate);
                }
            }
        }
        if (parsed.isEmpty()) {
            parsed.add(UserRole.CLINIC_OWNER);
            parsed.add(UserRole.VET);
        }
        return parsed;
    }
}
