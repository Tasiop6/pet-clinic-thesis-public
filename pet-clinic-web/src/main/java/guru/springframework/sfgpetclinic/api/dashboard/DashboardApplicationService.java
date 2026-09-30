package guru.springframework.sfgpetclinic.api.dashboard;

import guru.springframework.sfgpetclinic.api.dto.DashboardDtos.DashboardResponse;
import guru.springframework.sfgpetclinic.api.dto.DashboardDtos.DashboardStats;
import guru.springframework.sfgpetclinic.model.Appointment;
import guru.springframework.sfgpetclinic.model.UserRole;
import guru.springframework.sfgpetclinic.model.Vet;
import guru.springframework.sfgpetclinic.security.AppUserDetails;
import guru.springframework.sfgpetclinic.services.AppointmentService;
import guru.springframework.sfgpetclinic.web.DashboardAppointmentView;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class DashboardApplicationService {

    private final AppointmentService appointmentService;

    public DashboardApplicationService(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    public DashboardResponse getDashboard(Authentication authentication) {
        AppUserDetails userDetails = requireActiveUser(authentication);
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);

        List<Appointment> appointments = findAccessibleAppointments(userDetails).stream()
                .filter(appt -> appt != null && appt.getAppointmentTime() != null)
                .sorted(Comparator.comparing(Appointment::getAppointmentTime))
                .toList();

        List<DashboardAppointmentView> upcoming = appointments.stream()
                .filter(appt -> !appt.getAppointmentTime().isBefore(now))
                .limit(5)
                .map(this::toDashboardView)
                .toList();

        long todayCount = appointments.stream()
                .filter(appt -> appt.getAppointmentTime().toLocalDate().equals(today))
                .count();

        long weekCount = appointments.stream()
                .filter(appt -> {
                    LocalDate date = appt.getAppointmentTime().toLocalDate();
                    return !date.isBefore(weekStart) && !date.isAfter(weekEnd);
                })
                .count();

        List<DashboardAppointmentView> contactReminders = upcoming.stream()
                .filter(view -> view.missingEmail() || view.missingPhone())
                .toList();

        DashboardStats stats = new DashboardStats(todayCount, weekCount, contactReminders.size());

        return new DashboardResponse(upcoming, contactReminders, stats);
    }

    private List<Appointment> findAccessibleAppointments(AppUserDetails userDetails) {
        if (userDetails.hasRole(UserRole.CLINIC_OWNER)) {
            return new ArrayList<>(appointmentService.findAll());
        }
        if (userDetails.hasRole(UserRole.VET)) {
            Vet vet = userDetails.getUser().getVet();
            if (vet == null) {
                return List.of();
            }
            return appointmentService.findAllByVetId(vet.getId());
        }
        return appointmentService.findAllByUser(userDetails.getUser());
    }

    private DashboardAppointmentView toDashboardView(Appointment appointment) {
        String ownerName = "";
        String ownerEmail = "";
        String ownerPhone = "";
        if (appointment.getOwner() != null) {
            String first = StringUtils.hasText(appointment.getOwner().getFirstName())
                    ? appointment.getOwner().getFirstName()
                    : "";
            String last = StringUtils.hasText(appointment.getOwner().getLastName())
                    ? appointment.getOwner().getLastName()
                    : "";
            ownerName = (first + " " + last).trim();
            ownerEmail = appointment.getOwner().getEmail();
            ownerPhone = appointment.getOwner().getTelephone();
        }
        if (!StringUtils.hasText(ownerPhone)) {
            ownerPhone = appointment.getContactTelephone();
        }
        String petName = appointment.getPet() != null ? appointment.getPet().getName() : "";
        String petType = appointment.getPet() != null && appointment.getPet().getPetType() != null
                ? appointment.getPet().getPetType().getName()
                : "";
        boolean missingEmail = !StringUtils.hasText(ownerEmail);
        boolean missingPhone = !StringUtils.hasText(ownerPhone);
        return new DashboardAppointmentView(
                appointment.getId(),
                appointment.getAppointmentTime(),
                petName,
                petType,
                ownerName,
                ownerEmail,
                ownerPhone,
                missingEmail,
                missingPhone
        );
    }

    private AppUserDetails requireActiveUser(Authentication authentication) {
        Authentication auth = authentication != null ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (userDetails.getUser() == null || !userDetails.getUser().isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account must be activated before accessing the dashboard");
        }
        return userDetails;
    }
}
