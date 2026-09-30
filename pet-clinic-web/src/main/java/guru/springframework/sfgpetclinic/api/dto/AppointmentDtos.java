package guru.springframework.sfgpetclinic.api.dto;

import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetHealthRecordDto;
import guru.springframework.sfgpetclinic.model.PetGender;
import guru.springframework.sfgpetclinic.model.PetHealthRecordType;
import guru.springframework.sfgpetclinic.web.GoogleCalendarEvent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class AppointmentDtos {

    private AppointmentDtos() {
    }

    public record AppointmentWeekResponse(
            LocalDate weekStart,
            LocalDate weekEnd,
            List<AppointmentSummary> appointments,
            Map<LocalDate, List<String>> bookedSlots,
            boolean calendarLinked,
            boolean calendarFetchFailed,
            List<GoogleCalendarEvent> googleEvents) {
    }

    public record AppointmentSummary(
            Long id,
            LocalDateTime appointmentTime,
            AppointmentPet pet,
            AppointmentOwner owner,
            AppointmentVet vet,
            String contactTelephone,
            String notes,
            boolean synced) {
    }

    public record AppointmentDetail(
            Long id,
            LocalDateTime appointmentTime,
            AppointmentOwner owner,
            AppointmentPet pet,
            AppointmentVet vet,
            String contactTelephone,
            String notes,
            String clinicalFindings,
            String treatments,
            String medications,
            boolean synced,
            List<PetHealthRecordDto> records) {
        public AppointmentDetail withSyncStatus(boolean synced) {
            return new AppointmentDetail(
                    id,
                    appointmentTime,
                    owner,
                    pet,
                    vet,
                    contactTelephone,
                    notes,
                    clinicalFindings,
                    treatments,
                    medications,
                    synced,
                    records
            );
        }
    }

    public record AppointmentOwner(
            Long id,
            String name,
            String email,
            String telephone) {
    }

    public record AppointmentPet(
            Long id,
            String name,
            String type,
            PetGender gender) {
    }

    public record AppointmentVet(
            Long id,
            String name,
            String email) {
    }

    public record AppointmentRequest(
            @Positive(message = "Owner id must be positive when provided") Long ownerId,
            @Positive(message = "Pet id must be positive when provided") Long petId,
            @NotNull(message = "Appointment time is required") LocalDateTime appointmentTime,
            Long vetId,
            @Size(max = 64) String contactTelephone,
            @Size(max = 1024) String notes,
            @Size(max = 2048) String clinicalFindings,
            @Size(max = 2048) String treatments,
            @Size(max = 2048) String medications) {
    }

    public record RescheduleRequest(
            @NotNull(message = "Appointment time is required") LocalDateTime appointmentTime) {
    }

    public record AppointmentCancelResponse(
            Long appointmentId,
            boolean calendarLinked,
            boolean googleEventDeleted) {
    }

    public record AppointmentRecordRequest(
            @NotNull(message = "Record type is required") PetHealthRecordType type,
            @Size(max = 255) String title,
            @Size(max = 2048) String notes,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate recordDate,
            @Positive(message = "Weight must be positive") BigDecimal weightKg,
            @Positive(message = "Temperature must be positive") BigDecimal temperatureC,
            @Min(value = 0, message = "Heart rate must be zero or positive") Integer heartRate,
            @Min(value = 0, message = "Respiration rate must be zero or positive") Integer respirationRate,
            @Size(max = 1024) String additionalMetrics) {
    }
}
