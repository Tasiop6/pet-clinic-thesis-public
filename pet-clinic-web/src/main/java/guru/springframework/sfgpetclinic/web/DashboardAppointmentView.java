package guru.springframework.sfgpetclinic.web;

import java.time.LocalDateTime;

public record DashboardAppointmentView(
        Long id,
        LocalDateTime time,
        String petName,
        String petType,
        String ownerName,
        String ownerEmail,
        String ownerPhone,
        boolean missingEmail,
        boolean missingPhone) {
}
