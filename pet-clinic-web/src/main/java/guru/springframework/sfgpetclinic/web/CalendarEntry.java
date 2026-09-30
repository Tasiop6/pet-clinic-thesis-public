package guru.springframework.sfgpetclinic.web;

import guru.springframework.sfgpetclinic.model.Appointment;

import java.time.LocalDateTime;

import org.springframework.util.StringUtils;

public class CalendarEntry {

    private final LocalDateTime start;
    private final LocalDateTime end;
    private final String title;
    private final String subtitle;
    private final String notes;
    private final boolean synced;
    private final boolean external;
    private final Long appointmentId;

    private CalendarEntry(LocalDateTime start,
                          LocalDateTime end,
                          String title,
                          String subtitle,
                          String notes,
                          boolean synced,
                          boolean external,
                          Long appointmentId) {
        this.start = start;
        this.end = end;
        this.title = title;
        this.subtitle = subtitle;
        this.notes = notes;
        this.synced = synced;
        this.external = external;
        this.appointmentId = appointmentId;
    }

    public static CalendarEntry fromAppointment(Appointment appointment) {
        LocalDateTime start = appointment.getAppointmentTime();
        LocalDateTime end = start.plusMinutes(30);
        String title = appointment.getPet() != null && StringUtils.hasText(appointment.getPet().getName())
                ? appointment.getPet().getName()
                : "Vet appointment";
        String subtitle;
        if (appointment.getOwner() != null) {
            String first = appointment.getOwner().getFirstName() != null ? appointment.getOwner().getFirstName() : "";
            String last = appointment.getOwner().getLastName() != null ? appointment.getOwner().getLastName() : "";
            subtitle = (first + " " + last).trim();
        } else if (StringUtils.hasText(appointment.getContactTelephone())) {
            subtitle = appointment.getContactTelephone();
        } else {
            subtitle = "";
        }
        String notes = appointment.getNotes();
        boolean synced = appointment.getGoogleEventId() != null && !appointment.getGoogleEventId().isBlank();
        return new CalendarEntry(start, end, title, subtitle, notes, synced, false, appointment.getId());
    }

    public static CalendarEntry fromGoogleEvent(GoogleCalendarEvent event) {
        return new CalendarEntry(
                event.getStart(),
                event.getEnd(),
                event.getSummary() != null ? event.getSummary() : "Busy",
                event.getLocation(),
                event.getDescription(),
                true,
                true,
                null);
    }

    public LocalDateTime getStart() {
        return start;
    }

    public LocalDateTime getEnd() {
        return end;
    }

    public String getTitle() {
        return title;
    }

    public String getSubtitle() {
        return subtitle;
    }

    public String getNotes() {
        return notes;
    }

    public boolean isSynced() {
        return synced;
    }

    public boolean isExternal() {
        return external;
    }

    public Long getAppointmentId() {
        return appointmentId;
    }
}
