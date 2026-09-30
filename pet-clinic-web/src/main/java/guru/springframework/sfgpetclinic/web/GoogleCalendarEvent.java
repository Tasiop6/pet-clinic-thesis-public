package guru.springframework.sfgpetclinic.web;

import java.time.LocalDateTime;

public class GoogleCalendarEvent {

    private final String id;
    private final String summary;
    private final String description;
    private final String location;
    private final LocalDateTime start;
    private final LocalDateTime end;

    public GoogleCalendarEvent(String id,
                               String summary,
                               String description,
                               String location,
                               LocalDateTime start,
                               LocalDateTime end) {
        this.id = id;
        this.summary = summary;
        this.description = description;
        this.location = location;
        this.start = start;
        this.end = end;
    }

    public String getId() {
        return id;
    }

    public String getSummary() {
        return summary;
    }

    public String getDescription() {
        return description;
    }

    public String getLocation() {
        return location;
    }

    public LocalDateTime getStart() {
        return start;
    }

    public LocalDateTime getEnd() {
        return end;
    }
}
