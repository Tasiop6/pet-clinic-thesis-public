package guru.springframework.sfgpetclinic.web;

/**
 * Signals failures while initialising or communicating with the Google Calendar API.
 */
public class GoogleCalendarException extends RuntimeException {

    public GoogleCalendarException(String message, Throwable cause) {
        super(message, cause);
    }
}
