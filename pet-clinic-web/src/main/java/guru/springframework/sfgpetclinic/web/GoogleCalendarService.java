package guru.springframework.sfgpetclinic.web;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.EventAttendee;
import com.google.api.services.calendar.model.Events;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.auth.oauth2.UserCredentials;
import guru.springframework.sfgpetclinic.notifications.CalendarNotificationPolicy;
import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.Appointment;
import guru.springframework.sfgpetclinic.services.AppUserService;
import guru.springframework.sfgpetclinic.services.AppointmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class GoogleCalendarService {

    private static final Logger log = LoggerFactory.getLogger(GoogleCalendarService.class);

    private final AppointmentService appointmentService;
    private final AppUserService appUserService;
    private final ResourceLoader resourceLoader;
    private final String applicationName;
    private final boolean enabled;
    private final String serviceAccountKeyPath;
    private final String calendarId;
    private final boolean useDelegation;
    private final String oauthClientId;
    private final String oauthClientSecret;
    private final CalendarNotificationPolicy notificationPolicy;
    private final ZoneId clinicZone;

    public GoogleCalendarService(AppointmentService appointmentService,
                                 AppUserService appUserService,
                                 ResourceLoader resourceLoader,
                                 CalendarNotificationPolicy notificationPolicy,
                                 @Value("${spring.application.name:Pet Clinic}") String applicationName,
                                 @Value("${calendar.service-account.enabled:false}") boolean enabled,
                                 @Value("${calendar.service-account.key-path:}") String serviceAccountKeyPath,
                                 @Value("${calendar.service-account.calendar-id:primary}") String calendarId,
                                 @Value("${calendar.service-account.use-delegation:false}") boolean useDelegation,
                                 @Value("${google.oauth.client-id:${spring.security.oauth2.client.registration.google-calendar.client-id:}}") String oauthClientId,
                                 @Value("${google.oauth.client-secret:${spring.security.oauth2.client.registration.google-calendar.client-secret:}}") String oauthClientSecret,
                                 @Value("${clinic.time-zone:Europe/Athens}") String clinicTimeZone) {
        this.appointmentService = appointmentService;
        this.appUserService = appUserService;
        this.resourceLoader = resourceLoader;
        this.notificationPolicy = notificationPolicy;
        this.applicationName = applicationName;
        this.enabled = enabled;
        this.serviceAccountKeyPath = serviceAccountKeyPath;
        this.calendarId = StringUtils.hasText(calendarId) ? calendarId : "primary";
        this.useDelegation = useDelegation;
        this.oauthClientId = oauthClientId;
        this.oauthClientSecret = oauthClientSecret;
        this.clinicZone = ZoneId.of(clinicTimeZone);
    }

    public boolean syncAppointment(AppUser user, Appointment appointment) {
        Optional<Calendar> calendarOpt;
        try {
            calendarOpt = buildCalendarClient(user);
            if (calendarOpt.isEmpty()) {
                log.info("Skipping Google Calendar sync for appointment {} because no calendar client is available", appointment.getId());
                return false;
            }
        } catch (GoogleCalendarException ex) {
            log.error("Unable to sync appointment {} to Google Calendar", appointment.getId(), ex);
            return false;
        }
        try {
            Event event = buildEvent(appointment);
            String destinationCalendar = resolveCalendarId(user);
            Event inserted = calendarOpt.get().events()
                    .insert(destinationCalendar, event)
                    .setSendUpdates("all")
                    .execute();
            appointment.setGoogleEventId(inserted.getId());
            appointmentService.save(appointment);
            log.debug("Appointment {} synced to calendar '{}' with event id {}",
                    appointment.getId(), destinationCalendar, inserted.getId());
            return true;
        } catch (GoogleJsonResponseException gjre) {
            log.warn("Failed to sync appointment {} to Google Calendar (status {}): {}",
                    appointment.getId(), gjre.getStatusCode(), gjre.getDetails() != null ? gjre.getDetails().getMessage() : gjre.getMessage());
            log.debug("Calendar API error body", gjre);
            return false;
        } catch (IOException ex) {
            log.warn("Failed to sync appointment {} to Google Calendar: {}", appointment.getId(), ex.getMessage());
            return false;
        }
    }

    public boolean updateAppointment(AppUser user, Appointment appointment) {
        if (!StringUtils.hasText(appointment.getGoogleEventId())) {
            return syncAppointment(user, appointment);
        }
        Optional<Calendar> calendarOpt;
        try {
            calendarOpt = buildCalendarClient(user);
            if (calendarOpt.isEmpty()) {
                log.info("Skipping Google Calendar update for appointment {} because no calendar client is available", appointment.getId());
                return false;
            }
        } catch (GoogleCalendarException ex) {
            log.error("Unable to initialise calendar client to update appointment {}", appointment.getId(), ex);
            return false;
        }
        String calendarId = resolveCalendarId(user);
        try {
            Event event = buildEvent(appointment);
            calendarOpt.get().events()
                    .patch(calendarId, appointment.getGoogleEventId(), event)
                    .setSendUpdates("all")
                    .execute();
            appointmentService.save(appointment);
            log.debug("Appointment {} updated on Google Calendar (event id {})", appointment.getId(), appointment.getGoogleEventId());
            return true;
        } catch (GoogleJsonResponseException gjre) {
            log.warn("Failed to update appointment {} on Google Calendar (status {}): {}", appointment.getId(),
                    gjre.getStatusCode(), gjre.getDetails() != null ? gjre.getDetails().getMessage() : gjre.getMessage());
            if (gjre.getStatusCode() == 404 || gjre.getStatusCode() == 410) {
                log.info("Google event {} missing; attempting to recreate for appointment {}", appointment.getGoogleEventId(), appointment.getId());
                appointment.setGoogleEventId(null);
                appointmentService.save(appointment);
                return syncAppointment(user, appointment);
            }
            return false;
        } catch (IOException ex) {
            log.warn("Failed to update appointment {} on Google Calendar: {}", appointment.getId(), ex.getMessage());
            return false;
        }
    }

    public boolean deleteAppointment(AppUser user, Appointment appointment) {
        if (appointment == null || !StringUtils.hasText(appointment.getGoogleEventId())) {
            return false;
        }
        Optional<Calendar> calendarOpt;
        try {
            calendarOpt = buildCalendarClient(user);
            if (calendarOpt.isEmpty()) {
                log.info("Skipping Google Calendar delete for appointment {} because no calendar client is available", appointment.getId());
                return false;
            }
        } catch (GoogleCalendarException ex) {
            log.error("Unable to initialise calendar client to delete appointment {}", appointment != null ? appointment.getId() : null, ex);
            return false;
        }
        String calendarId = resolveCalendarId(user);
        try {
            calendarOpt.get().events()
                    .delete(calendarId, appointment.getGoogleEventId())
                    .setSendUpdates("all")
                    .execute();
            appointment.setGoogleEventId(null);
            appointmentService.save(appointment);
            log.debug("Deleted Google Calendar event for appointment {}", appointment.getId());
            return true;
        } catch (GoogleJsonResponseException gjre) {
            if (gjre.getStatusCode() == 404 || gjre.getStatusCode() == 410) {
                log.info("Google event {} already missing when deleting appointment {}; clearing local reference",
                        appointment.getGoogleEventId(), appointment.getId());
                appointment.setGoogleEventId(null);
                appointmentService.save(appointment);
                return true;
            }
            log.warn("Failed to delete appointment {} from Google Calendar (status {}): {}",
                    appointment.getId(), gjre.getStatusCode(),
                    gjre.getDetails() != null ? gjre.getDetails().getMessage() : gjre.getMessage());
            return false;
        } catch (IOException ex) {
            log.warn("Failed to delete appointment {} from Google Calendar: {}", appointment.getId(), ex.getMessage());
            return false;
        }
    }

    private Optional<Calendar> buildCalendarClient(AppUser user) {
        try {
            Optional<Calendar> userClient = buildClientWithUserTokens(user);
            if (userClient.isPresent()) {
                return userClient;
            }
        } catch (GoogleCalendarException ex) {
            log.error("Failed to initialise Google Calendar client with user tokens", ex);
            Optional<Calendar> fallback = buildClientWithServiceAccount(user);
            if (fallback.isPresent()) {
                return fallback;
            }
            throw ex;
        }
        return buildClientWithServiceAccount(user);
    }

    private Optional<Calendar> buildClientWithUserTokens(AppUser user) {
        if (user == null || !StringUtils.hasText(user.getGoogleRefreshToken())) {
            return Optional.empty();
        }
        if (!StringUtils.hasText(oauthClientId) || !StringUtils.hasText(oauthClientSecret)) {
            return Optional.empty();
        }
        try {
            UserCredentials.Builder builder = UserCredentials.newBuilder()
                    .setClientId(oauthClientId)
                    .setClientSecret(oauthClientSecret)
                    .setRefreshToken(user.getGoogleRefreshToken());

            if (StringUtils.hasText(user.getGoogleAccessToken())) {
                builder.setAccessToken(new AccessToken(
                        user.getGoogleAccessToken(),
                        user.getGoogleAccessTokenExpiry() != null ? java.util.Date.from(user.getGoogleAccessTokenExpiry()) : null));
            }

            GoogleCredentials credentials = builder.build()
                    .createScoped(Collections.singleton(CalendarScopes.CALENDAR));

            credentials.refreshIfExpired();
            AccessToken refreshed = credentials.getAccessToken();
            if (refreshed != null) {
                boolean changed = !refreshed.getTokenValue().equals(user.getGoogleAccessToken())
                        || (refreshed.getExpirationTime() != null && !refreshed.getExpirationTime().toInstant().equals(user.getGoogleAccessTokenExpiry()));
                user.setGoogleAccessToken(refreshed.getTokenValue());
                user.setGoogleAccessTokenExpiry(refreshed.getExpirationTime() != null ? refreshed.getExpirationTime().toInstant() : null);
                if (changed) {
                    appUserService.save(user);
                }
            }

            return Optional.of(new Calendar.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    com.google.api.client.json.jackson2.JacksonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(credentials))
                    .setApplicationName(applicationName)
                    .build());
        } catch (Exception | Error ex) {
            throw new GoogleCalendarException("Failed to create Google Calendar client using user OAuth tokens", ex);
        }
    }

    private Optional<Calendar> buildClientWithServiceAccount(AppUser user) {
        if (!enabled) {
            return Optional.empty();
        }
        if (!StringUtils.hasText(serviceAccountKeyPath)) {
            return Optional.empty();
        }

        Resource resource = resourceLoader.getResource(serviceAccountKeyPath);
        if (!resource.exists()) {
            log.warn("Service account key resource {} not found; skipping calendar sync", serviceAccountKeyPath);
            return Optional.empty();
        }
        try (InputStream in = resource.getInputStream()) {
            GoogleCredentials credentials = GoogleCredentials.fromStream(in)
                    .createScoped(Collections.singleton(CalendarScopes.CALENDAR));

            if (useDelegation) {
                if (user == null || !StringUtils.hasText(user.getEmail())) {
                    log.warn("Cannot delegate calendar access because user email is missing");
                    return Optional.empty();
                }
                if (credentials instanceof ServiceAccountCredentials sac) {
                    credentials = sac.createDelegated(user.getEmail());
                } else {
                    log.warn("Configured credentials do not support delegation. Disable calendar.service-account.use-delegation or provide a service account key.");
                    return Optional.empty();
                }
            }

            return Optional.of(new Calendar.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    com.google.api.client.json.jackson2.JacksonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(credentials))
                    .setApplicationName(applicationName)
                    .build());
        } catch (IOException | GeneralSecurityException | Error ex) {
            throw new GoogleCalendarException("Unable to initialise Google Calendar client using service account", ex);
        }
    }

    public List<GoogleCalendarEvent> fetchEvents(AppUser user, LocalDate weekStart, LocalDate weekEnd) {
        try {
            Optional<Calendar> calendarOpt = buildCalendarClient(user);
            if (calendarOpt.isEmpty()) {
                return List.of();
            }

            Instant timeMin = weekStart.atStartOfDay(clinicZone).toInstant();
            Instant timeMax = weekEnd.plusDays(1).atStartOfDay(clinicZone).toInstant();

            Events events = calendarOpt.get().events()
                    .list(resolveCalendarId(user))
                    .setTimeMin(new DateTime(Date.from(timeMin)))
                    .setTimeMax(new DateTime(Date.from(timeMax)))
                    .setSingleEvents(true)
                    .setOrderBy("startTime")
                    .execute();
            if (events.getItems() == null) {
                return List.of();
            }
            ZoneId zoneId = clinicZone;
            return events.getItems().stream()
                    .filter(event -> event.getStart() != null)
                    .map(event -> new GoogleCalendarEvent(
                            event.getId(),
                            event.getSummary(),
                            event.getDescription(),
                            event.getLocation(),
                            parseDateTime(event.getStart(), zoneId),
                            parseDateTime(event.getEnd(), zoneId)))
                    .collect(Collectors.toList());
        } catch (GoogleCalendarException ex) {
            log.error("Failed to fetch Google Calendar events", ex);
            throw ex;
        } catch (GoogleJsonResponseException gjre) {
            log.warn("Failed to fetch Google Calendar events (status {}): {}", gjre.getStatusCode(), gjre.getMessage());
            return List.of();
        } catch (IOException ex) {
            log.warn("Failed to fetch Google Calendar events: {}", ex.getMessage());
            return List.of();
        }
    }

    private LocalDateTime parseDateTime(EventDateTime value, ZoneId zoneId) {
        if (value == null) {
            return null;
        }
        if (value.getDateTime() != null) {
            return LocalDateTime.ofInstant(
                Instant.ofEpochMilli(value.getDateTime().getValue()), zoneId
            );
        }
        if (value.getDate() != null) {
            // value.getDate().getValue() gives the start of the day (no time component)
            return LocalDateTime.ofInstant(
                Instant.ofEpochMilli(value.getDate().getValue()), zoneId
            );
        }
        return null;
    }

    private String resolveCalendarId(AppUser user) {
        if ((user != null && StringUtils.hasText(user.getGoogleRefreshToken()))
                || (useDelegation && user != null && StringUtils.hasText(user.getEmail()))) {
            return "primary";
        }
        return calendarId;
    }

    private Event buildEvent(Appointment appointment) {
        String petName = appointment.getPet() != null && StringUtils.hasText(appointment.getPet().getName())
                ? appointment.getPet().getName()
                : "Pet visit";
        String ownerName = appointment.getOwner() != null
                ? (StringUtils.trimWhitespace((appointment.getOwner().getFirstName() != null ? appointment.getOwner().getFirstName() : "") + " "
                + (appointment.getOwner().getLastName() != null ? appointment.getOwner().getLastName() : "")))
                : "";
        String summary = StringUtils.hasText(ownerName)
                ? String.format("%s · %s", petName, ownerName)
                : String.format("Vet appointment for %s", petName);
        String description = appointment.getNotes();

        ZoneId zoneId = clinicZone;
        ZonedDateTime start = appointment.getAppointmentTime().atZone(zoneId);
        ZonedDateTime end = start.plusMinutes(30);

        EventDateTime startDateTime = new EventDateTime()
                .setDateTime(new DateTime(start.toInstant().toEpochMilli()))
                .setTimeZone(zoneId.toString());

        EventDateTime endDateTime = new EventDateTime()
                .setDateTime(new DateTime(end.toInstant().toEpochMilli()))
                .setTimeZone(zoneId.toString());

        Event event = new Event()
                .setSummary(summary)
                .setDescription(description)
                .setStart(startDateTime)
                .setEnd(endDateTime);

        List<EventAttendee> attendees = new ArrayList<>();
        Set<String> seenEmails = new LinkedHashSet<>();
        String organizerEmail = appointment.getUser() != null ? appointment.getUser().getEmail() : null;
        if (appointment.getOwner() != null && StringUtils.hasText(appointment.getOwner().getEmail())) {
            String email = appointment.getOwner().getEmail();
            addEventAttendee(attendees, seenEmails, email, ownerName.isEmpty() ? email : ownerName, organizerEmail, false);
        }
        if (appointment.getVet() != null && StringUtils.hasText(appointment.getVet().getEmail())) {
            String vetEmail = appointment.getVet().getEmail();
            String vetName = Stream.of(appointment.getVet().getFirstName(), appointment.getVet().getLastName())
                    .filter(StringUtils::hasText)
                    .collect(Collectors.joining(" ")).trim();
            addEventAttendee(attendees, seenEmails, vetEmail, StringUtils.hasText(vetName) ? vetName : vetEmail, organizerEmail, true);
        }
        for (CalendarNotificationPolicy.Recipient recipient : notificationPolicy.resolve(appointment)) {
            addEventAttendee(attendees, seenEmails, recipient.email(), recipient.displayName(), organizerEmail, true);
        }
        if (!attendees.isEmpty()) {
            event.setAttendees(attendees);
        }
        return event;
    }

    private void addEventAttendee(List<EventAttendee> attendees,
                                  Set<String> seenEmails,
                                  String email,
                                  String displayName,
                                  String organizerEmail,
                                  boolean skipIfOrganizer) {
        if (!StringUtils.hasText(email)) {
            return;
        }
        if (skipIfOrganizer && StringUtils.hasText(organizerEmail) && organizerEmail.equalsIgnoreCase(email)) {
            return;
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (!seenEmails.add(normalized)) {
            return;
        }
        String resolvedName = StringUtils.hasText(displayName) ? displayName : email;
        attendees.add(new EventAttendee()
                .setEmail(email)
                .setDisplayName(resolvedName));
    }
}
