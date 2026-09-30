package guru.springframework.sfgpetclinic.web;

import java.time.LocalDate;
import java.util.List;

public class CalendarDayView {

    private final LocalDate date;
    private final List<EventBlockView> events;

    public CalendarDayView(LocalDate date, List<EventBlockView> events) {
        this.date = date;
        this.events = events;
    }

    public LocalDate getDate() {
        return date;
    }

    public List<EventBlockView> getEvents() {
        return events;
    }
}
