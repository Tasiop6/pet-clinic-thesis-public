package guru.springframework.sfgpetclinic.api.appointments;

import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentCancelResponse;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentDetail;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentOwner;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentPet;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentVet;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentRecordRequest;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentRequest;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentSummary;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentWeekResponse;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.RescheduleRequest;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetHealthRecordDto;
import guru.springframework.sfgpetclinic.model.Appointment;
import guru.springframework.sfgpetclinic.model.Owner;
import guru.springframework.sfgpetclinic.model.Pet;
import guru.springframework.sfgpetclinic.model.PetHealthRecord;
import guru.springframework.sfgpetclinic.model.UserRole;
import guru.springframework.sfgpetclinic.model.Vet;
import guru.springframework.sfgpetclinic.security.AppUserDetails;
import guru.springframework.sfgpetclinic.services.AppointmentService;
import guru.springframework.sfgpetclinic.services.OwnerService;
import guru.springframework.sfgpetclinic.services.PetHealthRecordService;
import guru.springframework.sfgpetclinic.services.PetService;
import guru.springframework.sfgpetclinic.services.VetService;
import guru.springframework.sfgpetclinic.storage.DocumentStorageService;
import guru.springframework.sfgpetclinic.storage.DocumentStorageService.StoredDocument;
import guru.springframework.sfgpetclinic.web.GoogleCalendarEvent;
import guru.springframework.sfgpetclinic.web.GoogleCalendarException;
import guru.springframework.sfgpetclinic.web.GoogleCalendarService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class AppointmentApplicationService {

    private final AppointmentService appointmentService;
    private final OwnerService ownerService;
    private final PetService petService;
    private final GoogleCalendarService googleCalendarService;
    private final PetHealthRecordService petHealthRecordService;
    private final DocumentStorageService documentStorageService;
    private final VetService vetService;

    public AppointmentApplicationService(AppointmentService appointmentService,
                                         OwnerService ownerService,
                                         PetService petService,
                                         GoogleCalendarService googleCalendarService,
                                         PetHealthRecordService petHealthRecordService,
                                         DocumentStorageService documentStorageService,
                                         VetService vetService) {
        this.appointmentService = appointmentService;
        this.ownerService = ownerService;
        this.petService = petService;
        this.googleCalendarService = googleCalendarService;
        this.petHealthRecordService = petHealthRecordService;
        this.documentStorageService = documentStorageService;
        this.vetService = vetService;
    }

    public AppointmentWeekResponse getWeekView(LocalDate requestedWeek, Authentication authentication) {
        AppUserDetails userDetails = requireActiveUser(authentication);

        LocalDate weekStart = requestedWeek != null
                ? requestedWeek.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                : LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);

        List<Appointment> appointments = findCalendarAppointments(userDetails).stream()
                .filter(appt -> appt.getAppointmentTime() != null)
                .sorted(Comparator.comparing(Appointment::getAppointmentTime))
                .toList();

        List<Appointment> weekAppointments = appointments.stream()
                .filter(appt -> {
                    LocalDate date = appt.getAppointmentTime().toLocalDate();
                    return !date.isBefore(weekStart) && !date.isAfter(weekEnd);
                })
                .collect(Collectors.toList());

        boolean linked = isCalendarLinked(userDetails);
        boolean calendarFetchFailed = false;
        List<GoogleCalendarEvent> googleEvents = List.of();

        if (linked) {
            try {
                googleEvents = googleCalendarService.fetchEvents(userDetails.getUser(), weekStart, weekEnd);
            } catch (GoogleCalendarException ex) {
                calendarFetchFailed = true;
            }
        }

        Map<LocalDate, List<String>> bookedSlots = computeBookedSlots(appointments);

        List<AppointmentSummary> summaries = weekAppointments.stream()
                .map(this::toSummary)
                .toList();

        List<GoogleCalendarEvent> mergedEvents = googleEvents;

        if (linked) {
            Set<String> existingIds = weekAppointments.stream()
                    .map(Appointment::getGoogleEventId)
                    .filter(StringUtils::hasText)
                    .collect(Collectors.toSet());

            for (Appointment appointment : weekAppointments) {
                boolean alreadySynced = StringUtils.hasText(appointment.getGoogleEventId());
                if (!alreadySynced) {
                    try {
                        boolean synced = googleCalendarService.syncAppointment(userDetails.getUser(), appointment);
                        if (synced) {
                            Appointment refreshed = appointmentService.findById(appointment.getId());
                            if (refreshed != null && StringUtils.hasText(refreshed.getGoogleEventId())) {
                                existingIds.add(refreshed.getGoogleEventId());
                                appointment.setGoogleEventId(refreshed.getGoogleEventId());
                            }
                        }
                    } catch (GoogleCalendarException ignored) {
                        calendarFetchFailed = true;
                    }
                }
            }

            if (!googleEvents.isEmpty()) {
                mergedEvents = googleEvents.stream()
                        .filter(event -> event.getId() == null || !existingIds.contains(event.getId()))
                        .collect(Collectors.toList());
            }
        }

        return new AppointmentWeekResponse(
                weekStart,
                weekEnd,
                summaries,
                bookedSlots,
                linked,
                calendarFetchFailed,
                mergedEvents
        );
    }

    public AppointmentDetail getAppointment(Long appointmentId, Authentication authentication) {
        AppUserDetails userDetails = requireActiveUser(authentication);
        Appointment appointment = requireAppointmentForUser(appointmentId, userDetails);
        return toDetail(appointment);
    }

    public AppointmentDetail createAppointment(AppointmentRequest request, Authentication authentication) {
        AppUserDetails userDetails = requireActiveUser(authentication);
        Owner owner = request.ownerId() != null ? requireOwner(request.ownerId()) : null;
        Pet pet = request.petId() != null ? requirePet(request.petId(), owner) : null;
        if (owner == null && pet != null && pet.getOwner() != null) {
            owner = pet.getOwner();
        }
        LocalDateTime appointmentTime = request.appointmentTime();
        validateAppointmentTime(appointmentTime);
        ensureSlotAvailable(userDetails, pet, null, appointmentTime);

        String contactTelephone = resolveContactTelephone(request.contactTelephone(), owner);
        if (owner == null && !StringUtils.hasText(contactTelephone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner or contact telephone is required");
        }

        Appointment appointment = new Appointment();
        appointment.setAppointmentTime(request.appointmentTime());
        appointment.setNotes(request.notes());
        appointment.setClinicalFindings(request.clinicalFindings());
        appointment.setTreatments(request.treatments());
        appointment.setMedications(request.medications());
        appointment.setOwner(owner);
        appointment.setPet(pet);
        appointment.setUser(userDetails.getUser());
        appointment.setVet(resolveVet(request.vetId()));
        appointment.setContactTelephone(contactTelephone);

        Appointment saved = appointmentService.save(appointment);
        boolean synced = googleCalendarService.syncAppointment(userDetails.getUser(), saved);
        AppointmentDetail response = toDetail(saved);
        return response.withSyncStatus(synced || StringUtils.hasText(saved.getGoogleEventId()));
    }

    public AppointmentDetail updateAppointment(Long appointmentId,
                                               AppointmentRequest request,
                                               Authentication authentication) {
        AppUserDetails userDetails = requireActiveUser(authentication);
        Appointment appointment = requireAppointmentForUser(appointmentId, userDetails);
        Owner owner = request.ownerId() != null ? requireOwner(request.ownerId()) : null;
        Pet pet = request.petId() != null ? requirePet(request.petId(), owner) : null;
        if (owner == null && pet != null && pet.getOwner() != null) {
            owner = pet.getOwner();
        }
        LocalDateTime newTime = request.appointmentTime();
        validateAppointmentTime(newTime);

        ensureSlotAvailable(userDetails, pet, appointment.getId(), newTime);

        String contactTelephone = resolveContactTelephone(request.contactTelephone(), owner);
        if (owner == null && !StringUtils.hasText(contactTelephone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner or contact telephone is required");
        }

        appointment.setAppointmentTime(newTime);
        appointment.setNotes(request.notes());
        appointment.setClinicalFindings(request.clinicalFindings());
        appointment.setTreatments(request.treatments());
        appointment.setMedications(request.medications());
        appointment.setOwner(owner);
        appointment.setPet(pet);
        appointment.setVet(resolveVet(request.vetId()));
        appointment.setContactTelephone(contactTelephone);

        Appointment saved = appointmentService.save(appointment);
        boolean synced = googleCalendarService.updateAppointment(userDetails.getUser(), saved);
        return toDetail(saved).withSyncStatus(synced || StringUtils.hasText(saved.getGoogleEventId()));
    }

    public AppointmentDetail rescheduleAppointment(Long appointmentId,
                                                   RescheduleRequest request,
                                                   Authentication authentication) {
        AppUserDetails userDetails = requireActiveUser(authentication);
        Appointment appointment = requireAppointmentForUser(appointmentId, userDetails);
        LocalDateTime newTime = request.appointmentTime();
        validateAppointmentTime(newTime);
        ensureSlotAvailable(userDetails, appointment.getPet(), appointment.getId(), newTime);

        appointment.setAppointmentTime(newTime);
        Appointment saved = appointmentService.save(appointment);
        boolean synced = googleCalendarService.updateAppointment(userDetails.getUser(), saved);
        return toDetail(saved).withSyncStatus(synced || StringUtils.hasText(saved.getGoogleEventId()));
    }

    public AppointmentCancelResponse deleteAppointment(Long appointmentId, Authentication authentication) {
        AppUserDetails userDetails = requireActiveUser(authentication);
        Appointment appointment = requireAppointmentForUser(appointmentId, userDetails);
        boolean linked = isCalendarLinked(userDetails);
        boolean remoteDeleted = false;
        if (StringUtils.hasText(appointment.getGoogleEventId())) {
            remoteDeleted = googleCalendarService.deleteAppointment(userDetails.getUser(), appointment);
        }
        appointmentService.deleteById(appointmentId);
        return new AppointmentCancelResponse(appointmentId, linked, remoteDeleted);
    }

    public AppointmentDetail addRecord(Long appointmentId,
                                       AppointmentRecordRequest request,
                                       MultipartFile[] files,
                                       Authentication authentication) {
        AppUserDetails userDetails = requireActiveUser(authentication);
        Appointment appointment = requireAppointmentForUser(appointmentId, userDetails);
        Pet pet = appointment.getPet();
        if (pet == null || pet.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment must reference a pet before attaching records");
        }
        List<MultipartFile> attachments = files != null
                ? Arrays.stream(files).filter(Objects::nonNull).filter(f -> !f.isEmpty()).toList()
                : List.of();
        boolean hasDetails = StringUtils.hasText(request.title())
                || StringUtils.hasText(request.notes())
                || request.weightKg() != null
                || request.temperatureC() != null
                || request.heartRate() != null
                || request.respirationRate() != null
                || StringUtils.hasText(request.additionalMetrics());
        if (attachments.isEmpty() && !hasDetails) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide a file or record details");
        }
        try {
            if (attachments.isEmpty()) {
                PetHealthRecord record = buildRecordWithoutAttachment(pet, appointment, request);
                petHealthRecordService.save(record);
            } else {
                for (MultipartFile file : attachments) {
                    StoredDocument stored = documentStorageService.storePetDocument(pet.getId(), file);
                    PetHealthRecord record = buildRecordWithoutAttachment(pet, appointment, request);
                    record.setDocumentName(stored.originalName());
                    record.setDocumentPath(stored.relativePath());
                    record.setDocumentContentType(stored.contentType());
                    record.setDocumentSize(stored.size());
                    petHealthRecordService.save(record);
                }
            }
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store appointment attachment", ex);
        }
        Appointment refreshed = appointmentService.findById(appointmentId);
        return toDetail(refreshed).withSyncStatus(StringUtils.hasText(refreshed.getGoogleEventId()));
    }

    public AppointmentDetail removeRecord(Long appointmentId,
                                          Long recordId,
                                          Authentication authentication) {
        AppUserDetails userDetails = requireActiveUser(authentication);
        Appointment appointment = requireAppointmentForUser(appointmentId, userDetails);
        PetHealthRecord record = petHealthRecordService.findById(recordId);
        if (record == null || record.getAppointment() == null || !Objects.equals(record.getAppointment().getId(), appointmentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found for this appointment");
        }
        if (record.getPet() != null) {
            documentStorageService.deletePetDocument(record.getPet().getId(), record.getDocumentPath());
        }
        petHealthRecordService.deleteById(recordId);
        Appointment refreshed = appointmentService.findById(appointmentId);
        return toDetail(refreshed).withSyncStatus(StringUtils.hasText(refreshed.getGoogleEventId()));
    }

    private List<Appointment> findCalendarAppointments(AppUserDetails userDetails) {
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

    private Map<LocalDate, List<String>> computeBookedSlots(List<Appointment> appointments) {
        Map<LocalDate, List<String>> booked = new LinkedHashMap<>();
        for (Appointment appointment : appointments) {
            if (appointment == null || appointment.getAppointmentTime() == null) {
                continue;
            }
            LocalDate date = appointment.getAppointmentTime().toLocalDate();
            String time = appointment.getAppointmentTime().toLocalTime()
                    .withSecond(0).withNano(0).toString();
            booked.computeIfAbsent(date, ignored -> new ArrayList<>()).add(time);
        }
        booked.replaceAll((date, slots) -> slots.stream().sorted().toList());
        return booked;
    }

    private void validateAppointmentTime(LocalDateTime time) {
        if (time == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment time is required");
        }
        LocalTime localTime = time.toLocalTime();
        if (localTime.getMinute() % 30 != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointments must start on the half hour");
        }
    }

    private String resolveContactTelephone(String rawTelephone, Owner owner) {
        if (StringUtils.hasText(rawTelephone)) {
            return rawTelephone.trim();
        }
        if (owner != null && StringUtils.hasText(owner.getTelephone())) {
            return owner.getTelephone();
        }
        return null;
    }

    private void ensureSlotAvailable(AppUserDetails userDetails,
                                     Pet pet,
                                     Long appointmentId,
                                     LocalDateTime appointmentTime) {
        if (pet == null) {
            return;
        }
        Appointment existing = appointmentService.findAllByPet(pet).stream()
                .filter(appt -> appt.getAppointmentTime() != null)
                .filter(appt -> Objects.equals(appt.getPet().getId(), pet.getId()))
                .filter(appt -> appt.getAppointmentTime().equals(appointmentTime))
                .findFirst()
                .orElse(null);
        if (existing != null && (appointmentId == null || !existing.getId().equals(appointmentId))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Appointment slot already booked for this pet");
        }
    }

    private Owner requireOwner(Long ownerId) {
        Owner owner = ownerService.findById(ownerId);
        if (owner == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Owner not found");
        }
        return owner;
    }

    private Pet requirePet(Long petId, Owner owner) {
        Pet pet = petService.findById(petId);
        if (pet == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found");
        }
        if (owner != null && pet.getOwner() != null && !Objects.equals(pet.getOwner().getId(), owner.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pet does not belong to selected owner");
        }
        return pet;
    }

    private Vet resolveVet(Long vetId) {
        if (vetId == null) {
            return null;
        }
        Vet vet = vetService.findById(vetId);
        if (vet == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vet not found");
        }
        return vet;
    }

    private Appointment requireAppointmentForUser(Long appointmentId, AppUserDetails userDetails) {
        Appointment appointment = appointmentService.findById(appointmentId);
        if (appointment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found");
        }
        if (userDetails.hasRole(UserRole.CLINIC_OWNER)) {
            return appointment;
        }
        if (userDetails.hasRole(UserRole.VET)) {
            Vet assignedVet = userDetails.getUser().getVet();
            if (assignedVet != null && appointment.getVet() != null
                    && Objects.equals(appointment.getVet().getId(), assignedVet.getId())) {
                return appointment;
            }
        }
        if (appointment.getUser() != null && Objects.equals(appointment.getUser().getId(), userDetails.getUser().getId())) {
            return appointment;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Appointment belongs to another user");
    }

    private AppUserDetails requireActiveUser(Authentication authentication) {
        Authentication auth = authentication != null ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (userDetails.getUser() == null || !userDetails.getUser().isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account must be activated before managing appointments");
        }
        return userDetails;
    }

    private boolean isCalendarLinked(AppUserDetails userDetails) {
        return userDetails != null
                && userDetails.getUser() != null
                && (StringUtils.hasText(userDetails.getUser().getGoogleRefreshToken())
                || StringUtils.hasText(userDetails.getUser().getGoogleAccessToken()));
    }

    private AppointmentSummary toSummary(Appointment appointment) {
        AppointmentDetail detail = toDetail(appointment);
        return new AppointmentSummary(
                appointment.getId(),
                appointment.getAppointmentTime(),
                detail.pet(),
                detail.owner(),
                detail.vet(),
                detail.contactTelephone(),
                appointment.getNotes(),
                detail.synced()
        );
    }

    private AppointmentDetail toDetail(Appointment appointment) {
        Owner owner = appointment.getOwner();
        Pet pet = appointment.getPet();
        AppointmentOwner ownerDto = owner != null
                ? new AppointmentOwner(
                owner.getId(),
                joinNames(owner.getFirstName(), owner.getLastName()),
                owner.getEmail(),
                owner.getTelephone())
                : null;
        AppointmentPet petDto = pet != null
                ? new AppointmentPet(
                pet.getId(),
                pet.getName(),
                pet.getPetType() != null ? pet.getPetType().getName() : null,
                pet.getGender())
                : null;
        AppointmentVet vetDto = toVetDto(appointment.getVet());
        String contactTelephone = StringUtils.hasText(appointment.getContactTelephone())
                ? appointment.getContactTelephone()
                : (owner != null ? owner.getTelephone() : null);
        List<PetHealthRecordDto> records = petHealthRecordService.findAllByAppointmentId(appointment.getId()).stream()
                .map(record -> toRecordDto(pet, record))
                .toList();
        return new AppointmentDetail(
                appointment.getId(),
                appointment.getAppointmentTime(),
                ownerDto,
                petDto,
                vetDto,
                contactTelephone,
                appointment.getNotes(),
                appointment.getClinicalFindings(),
                appointment.getTreatments(),
                appointment.getMedications(),
                StringUtils.hasText(appointment.getGoogleEventId()),
                records
        );
    }

    private AppointmentVet toVetDto(Vet vet) {
        if (vet == null) {
            return null;
        }
        String name = Stream.of(vet.getFirstName(), vet.getLastName())
                .filter(StringUtils::hasText)
                .collect(Collectors.joining(" ")).trim();
        if (!StringUtils.hasText(name)) {
            name = vet.getEmail();
        }
        return new AppointmentVet(vet.getId(), name, vet.getEmail());
    }

    private PetHealthRecordDto toRecordDto(Pet pet, PetHealthRecord record) {
        String downloadUrl = null;
        if (pet != null && pet.getId() != null && record != null
                && record.getId() != null && record.getDocumentPath() != null) {
            downloadUrl = "/pets/" + pet.getId() + "/records/" + record.getId() + "/download?inline=true";
        }
        return new PetHealthRecordDto(
                record.getId(),
                record.getTitle(),
                record.getNotes(),
                record.getRecordDate(),
                record.getWeightKg() != null ? record.getWeightKg().doubleValue() : null,
                record.getTemperatureC() != null ? record.getTemperatureC().doubleValue() : null,
                record.getHeartRate(),
                record.getRespirationRate(),
                record.getAdditionalMetrics(),
                record.getDocumentName(),
                record.getDocumentContentType(),
                record.getDocumentSize(),
                downloadUrl
        );
    }

    private PetHealthRecord buildRecordWithoutAttachment(Pet pet,
                                                         Appointment appointment,
                                                         AppointmentRecordRequest request) {
        PetHealthRecord record = new PetHealthRecord();
        record.setPet(pet);
        record.setAppointment(appointment);
        record.setType(request.type());
        record.setTitle(StringUtils.hasText(request.title()) ? request.title() : null);
        record.setNotes(StringUtils.hasText(request.notes()) ? request.notes() : null);
        record.setRecordDate(request.recordDate() != null ? request.recordDate() : LocalDate.now());
        if (request.weightKg() != null) {
            record.setWeightKg(request.weightKg().setScale(2, RoundingMode.HALF_UP));
        }
        if (request.temperatureC() != null) {
            record.setTemperatureC(request.temperatureC().setScale(1, RoundingMode.HALF_UP));
        }
        record.setHeartRate(request.heartRate());
        record.setRespirationRate(request.respirationRate());
        record.setAdditionalMetrics(StringUtils.hasText(request.additionalMetrics()) ? request.additionalMetrics() : null);
        return record;
    }

    private String joinNames(String first, String last) {
        return java.util.stream.Stream.of(first, last)
                .filter(StringUtils::hasText)
                .collect(Collectors.joining(" "));
    }
}
