package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.model.Appointment;
import guru.springframework.sfgpetclinic.model.Speciality;
import guru.springframework.sfgpetclinic.model.Vet;
import guru.springframework.sfgpetclinic.services.AppointmentService;
import guru.springframework.sfgpetclinic.services.SpecialtyService;
import guru.springframework.sfgpetclinic.services.VetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/vets")
public class VetController {

    private final VetService vetService;
    private final SpecialtyService specialtyService;
    private final AppointmentService appointmentService;

    public VetController(VetService vetService,
                         SpecialtyService specialtyService,
                         AppointmentService appointmentService) {
        this.vetService = vetService;
        this.specialtyService = specialtyService;
        this.appointmentService = appointmentService;
    }

    @GetMapping
    public List<VetDto> listVets() {
        return vetService.findAll().stream()
                .sorted(Comparator.comparing(Vet::getLastName, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(Vet::getFirstName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/specialties")
    public List<SpecialtyDto> listSpecialties() {
        return specialtyService.findAll().stream()
                .sorted(Comparator.comparing(Speciality::getDescription, String.CASE_INSENSITIVE_ORDER))
                .map(speciality -> new SpecialtyDto(speciality.getId(), speciality.getDescription()))
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public VetDto createVet(@Valid @RequestBody VetRequest request) {
        Vet vet = new Vet();
        applyRequest(vet, request);
        Vet saved = vetService.save(vet);
        return toDto(saved);
    }

    @PutMapping("/{vetId}")
    @PreAuthorize("hasRole('ADMIN')")
    public VetDto updateVet(@PathVariable Long vetId, @Valid @RequestBody VetRequest request) {
        Vet vet = vetService.findById(vetId);
        if (vet == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vet not found");
        }
        applyRequest(vet, request);
        Vet saved = vetService.save(vet);
        return toDto(saved);
    }

    @DeleteMapping("/{vetId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteVet(@PathVariable Long vetId) {
        Vet vet = vetService.findById(vetId);
        if (vet == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vet not found");
        }
        List<Appointment> scheduled = appointmentService.findAllByVetId(vetId);
        for (Appointment appointment : scheduled) {
            appointment.setVet(null);
            appointmentService.save(appointment);
        }
        vetService.delete(vet);
    }

    private VetDto toDto(Vet vet) {
        List<String> specialties = vet.getSpecialities().stream()
                .map(Speciality::getDescription)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        List<Long> specialtyIds = vet.getSpecialities().stream()
                .map(Speciality::getId)
                .filter(id -> id != null)
                .toList();
        String name = Stream.of(vet.getFirstName(), vet.getLastName())
                .filter(org.springframework.util.StringUtils::hasText)
                .collect(Collectors.joining(" ")).trim();
        return new VetDto(
                vet.getId(),
                vet.getFirstName(),
                vet.getLastName(),
                vet.getEmail(),
                specialties,
                specialtyIds,
                StringUtils.hasText(name) ? name : vet.getEmail()
        );
    }

    private void applyRequest(Vet vet, VetRequest request) {
        vet.setFirstName(StringUtils.trimWhitespace(request.firstName()));
        vet.setLastName(StringUtils.trimWhitespace(request.lastName()));
        vet.setEmail(StringUtils.trimWhitespace(request.email()));
        Set<Speciality> specialities = request.specialtyIds() == null
                ? new HashSet<>()
                : request.specialtyIds().stream()
                .map(id -> {
                    Speciality speciality = specialtyService.findById(id);
                    if (speciality == null) {
                        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Speciality not found: " + id);
                    }
                    return speciality;
                })
                .collect(Collectors.toCollection(HashSet::new));
        vet.setSpecialities(specialities);
    }

    public record VetDto(
            Long id,
            String firstName,
            String lastName,
            String email,
            List<String> specialties,
            List<Long> specialtyIds,
            String displayName) {
    }

    public record VetRequest(
            @NotBlank String firstName,
            @NotBlank String lastName,
            @NotBlank @Email @Size(max = 190) String email,
            List<Long> specialtyIds) {
    }

    public record SpecialtyDto(Long id, String name) {
    }
}
