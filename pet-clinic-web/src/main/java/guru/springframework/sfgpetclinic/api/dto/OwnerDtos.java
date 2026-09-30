package guru.springframework.sfgpetclinic.api.dto;

import guru.springframework.sfgpetclinic.model.PetGender;
import guru.springframework.sfgpetclinic.model.PetHealthRecordType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class OwnerDtos {

    private OwnerDtos() {
    }

    public record OwnerSummary(
            Long id,
            String firstName,
            String lastName,
            String city,
            String telephone,
            String email,
            List<PetSummary> pets) {
    }

    public record OwnerDetail(
            Long id,
            String firstName,
            String lastName,
            String address,
            String city,
            String telephone,
            String email,
            List<PetDetail> pets) {
    }

    public record PetSummary(
            Long id,
            String name,
            String type,
            PetGender gender) {
    }

    public record PetDetail(
            Long id,
            String name,
            PetGender gender,
            LocalDate birthDate,
            PetTypeDto type,
            List<VisitDto> visits,
            Map<PetHealthRecordType, List<PetHealthRecordDto>> healthRecords) {
    }

    public record PetTypeDto(
            Long id,
            String name) {
    }

    public record VisitDto(
            Long id,
            LocalDate date,
            String description) {
    }

    public record PetHealthRecordDto(
            Long id,
            String title,
            String notes,
            LocalDate recordedAt,
            Double weightKg,
            Double temperatureC,
            Integer heartRate,
            Integer respirationRate,
            String additionalMetrics,
            String documentName,
            String documentContentType,
            Long documentSize,
            String downloadUrl) {
    }

    public record PetHealthRecordRequest(
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

    public record OwnerRequest(
            @NotBlank(message = "First name is required") String firstName,
            @NotBlank(message = "Last name is required") String lastName,
            @Size(max = 255) String address,
            @Size(max = 255) String city,
            @Size(max = 20) String telephone,
            @Email(message = "Provide a valid email") @Size(max = 190) String email) {
    }

    public record PetRequest(
            @NotBlank(message = "Pet name is required") String name,
            @NotNull(message = "Pet type is required") Long petTypeId,
            @NotNull(message = "Pet gender is required") PetGender gender,
            LocalDate birthDate) {
    }

    public record VisitRequest(
            @NotNull(message = "Visit date is required") LocalDate date,
            @Size(max = 255) String description) {
    }
}
