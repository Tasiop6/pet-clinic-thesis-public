package guru.springframework.sfgpetclinic.api.owners;

import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.OwnerDetail;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.OwnerRequest;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.OwnerSummary;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetDetail;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetHealthRecordDto;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetHealthRecordRequest;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetRequest;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetSummary;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetTypeDto;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.VisitDto;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.VisitRequest;
import guru.springframework.sfgpetclinic.model.Appointment;
import guru.springframework.sfgpetclinic.model.Owner;
import guru.springframework.sfgpetclinic.model.Pet;
import guru.springframework.sfgpetclinic.model.PetHealthRecord;
import guru.springframework.sfgpetclinic.model.PetHealthRecordType;
import guru.springframework.sfgpetclinic.model.PetType;
import guru.springframework.sfgpetclinic.model.Visit;
import guru.springframework.sfgpetclinic.services.AppointmentService;
import guru.springframework.sfgpetclinic.services.OwnerService;
import guru.springframework.sfgpetclinic.services.PetHealthRecordService;
import guru.springframework.sfgpetclinic.services.PetService;
import guru.springframework.sfgpetclinic.services.PetTypeService;
import guru.springframework.sfgpetclinic.services.VisitService;
import guru.springframework.sfgpetclinic.storage.DocumentStorageService;
import guru.springframework.sfgpetclinic.storage.DocumentStorageService.StoredDocument;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class OwnerApplicationService {

    private final OwnerService ownerService;
    private final PetService petService;
    private final PetTypeService petTypeService;
    private final VisitService visitService;
    private final PetHealthRecordService petHealthRecordService;
    private final DocumentStorageService documentStorageService;
    private final AppointmentService appointmentService;

    public OwnerApplicationService(OwnerService ownerService,
                                   PetService petService,
                                   PetTypeService petTypeService,
                                   VisitService visitService,
                                   PetHealthRecordService petHealthRecordService,
                                   DocumentStorageService documentStorageService,
                                   AppointmentService appointmentService) {
        this.ownerService = ownerService;
        this.petService = petService;
        this.petTypeService = petTypeService;
        this.visitService = visitService;
        this.petHealthRecordService = petHealthRecordService;
        this.documentStorageService = documentStorageService;
        this.appointmentService = appointmentService;
    }

    public List<OwnerSummary> listOwners(String lastNameFilter) {
        List<Owner> owners;
        if (StringUtils.hasText(lastNameFilter)) {
            String term = lastNameFilter.trim().toLowerCase();
            owners = ownerService.findAll().stream()
                    .filter(owner -> ownerMatchesTerm(owner, term))
                    .toList();
        } else {
            owners = ownerService.findAll().stream().toList();
        }
        return owners.stream()
                .sorted(Comparator.comparing(Owner::getLastName, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(Owner::getFirstName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toSummary)
                .toList();
    }

    private boolean ownerMatchesTerm(Owner owner, String term) {
        if (!StringUtils.hasText(term)) {
            return true;
        }
        return matches(owner.getFirstName(), term)
                || matches(owner.getLastName(), term)
                || matches(owner.getEmail(), term)
                || matches(owner.getTelephone(), term)
                || matches(owner.getCity(), term)
                || matches(owner.getAddress(), term);
    }

    private boolean matches(String value, String term) {
        return StringUtils.hasText(value) && value.toLowerCase().contains(term);
    }

    public OwnerDetail getOwner(Long ownerId) {
        Owner owner = requireOwner(ownerId);
        return toDetail(owner);
    }

    public OwnerDetail createOwner(OwnerRequest request) {
        Owner owner = new Owner();
        applyOwnerRequest(owner, request);
        Owner saved = ownerService.save(owner);
        return toDetail(saved);
    }

    public OwnerDetail updateOwner(Long ownerId, OwnerRequest request) {
        Owner owner = requireOwner(ownerId);
        applyOwnerRequest(owner, request);
        Owner saved = ownerService.save(owner);
        return toDetail(saved);
    }

    public List<PetDetail> listPets(Long ownerId) {
        Owner owner = requireOwner(ownerId);
        return owner.getPets().stream()
                .sorted(Comparator.comparing(Pet::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toPetDetail)
                .toList();
    }

    public PetDetail createPet(Long ownerId, PetRequest request) {
        Owner owner = requireOwner(ownerId);
        ensureUniquePetName(owner, request.name(), null);
        Pet pet = new Pet();
        pet.setOwner(owner);
        applyPetRequest(pet, request);
        Pet savedPet = petService.save(pet);
        owner.getPets().add(savedPet);
        ownerService.save(owner);
        return toPetDetail(savedPet);
    }

    public PetDetail updatePet(Long ownerId, Long petId, PetRequest request) {
        Owner owner = requireOwner(ownerId);
        Pet pet = owner.getPets().stream()
                .filter(existing -> Objects.equals(existing.getId(), petId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));
        ensureUniquePetName(owner, request.name(), petId);
        applyPetRequest(pet, request);
        Pet saved = petService.save(pet);
        return toPetDetail(saved);
    }

    public List<VisitDto> createVisit(Long ownerId, Long petId, VisitRequest request) {
        Owner owner = requireOwner(ownerId);
        Pet pet = owner.getPets().stream()
                .filter(existing -> Objects.equals(existing.getId(), petId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));
        Visit visit = new Visit();
        visit.setPet(pet);
        visit.setDate(request.date());
        visit.setDescription(request.description());
        visitService.save(visit);
        pet.getVisits().add(visit);
        return pet.getVisits().stream()
                .sorted(Comparator.comparing(Visit::getDate))
                .map(this::toVisitDto)
                .toList();
    }

    public PetDetail addHealthRecord(Long ownerId,
                                     Long petId,
                                     PetHealthRecordRequest request,
                                     MultipartFile[] files) {
        Owner owner = requireOwner(ownerId);
        Pet pet = findPetForOwner(owner, petId);
        List<MultipartFile> attachments = files != null
                ? Arrays.stream(files).filter(Objects::nonNull).filter(file -> !file.isEmpty()).toList()
                : List.of();
        boolean hasDetails = StringUtils.hasText(request.title())
                || StringUtils.hasText(request.notes())
                || request.weightKg() != null
                || request.temperatureC() != null
                || request.heartRate() != null
                || request.respirationRate() != null
                || StringUtils.hasText(request.additionalMetrics());
        if (attachments.isEmpty() && !hasDetails) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide at least metrics, notes, or an attachment");
        }
        try {
            if (attachments.isEmpty()) {
                PetHealthRecord record = buildRecordWithoutAttachment(pet, request);
                petHealthRecordService.save(record);
            } else {
                for (MultipartFile file : attachments) {
                    StoredDocument stored = documentStorageService.storePetDocument(pet.getId(), file);
                    PetHealthRecord record = buildRecordWithoutAttachment(pet, request);
                    record.setDocumentName(stored.originalName());
                    record.setDocumentPath(stored.relativePath());
                    record.setDocumentContentType(stored.contentType());
                    record.setDocumentSize(stored.size());
                    petHealthRecordService.save(record);
                }
            }
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store health record", ex);
        }
        Pet refreshed = petService.findById(petId);
        return toPetDetail(refreshed);
    }

    public PetDetail updateHealthRecord(Long ownerId,
                                        Long petId,
                                        Long recordId,
                                        PetHealthRecordRequest request) {
        Owner owner = requireOwner(ownerId);
        Pet pet = findPetForOwner(owner, petId);
        PetHealthRecord record = petHealthRecordService.findById(recordId);
        if (record == null || record.getPet() == null || !Objects.equals(record.getPet().getId(), petId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found for this pet");
        }

        record.setType(request.type());
        record.setTitle(StringUtils.hasText(request.title()) ? request.title() : null);
        record.setNotes(StringUtils.hasText(request.notes()) ? request.notes() : null);
        record.setRecordDate(request.recordDate() != null ? request.recordDate() : record.getRecordDate());
        record.setHeartRate(request.heartRate());
        record.setRespirationRate(request.respirationRate());
        record.setAdditionalMetrics(StringUtils.hasText(request.additionalMetrics()) ? request.additionalMetrics() : null);
        if (request.weightKg() != null) {
            record.setWeightKg(request.weightKg().setScale(2, RoundingMode.HALF_UP));
        } else {
            record.setWeightKg(null);
        }
        if (request.temperatureC() != null) {
            record.setTemperatureC(request.temperatureC().setScale(1, RoundingMode.HALF_UP));
        } else {
            record.setTemperatureC(null);
        }
        petHealthRecordService.save(record);

        Pet refreshed = petService.findById(petId);
        return toPetDetail(refreshed);
    }

    public PetDetail deleteHealthRecord(Long ownerId, Long petId, Long recordId) {
        Owner owner = requireOwner(ownerId);
        Pet pet = findPetForOwner(owner, petId);
        PetHealthRecord record = petHealthRecordService.findById(recordId);
        if (record == null || record.getPet() == null || !Objects.equals(record.getPet().getId(), petId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Health record not found for this pet");
        }
        if (record.getDocumentPath() != null) {
            documentStorageService.deletePetDocument(petId, record.getDocumentPath());
        }
        petHealthRecordService.deleteById(recordId);
        Pet refreshed = petService.findById(petId);
        return toPetDetail(refreshed);
    }

    public void deletePet(Long ownerId, Long petId) {
        Owner owner = requireOwner(ownerId);
        Pet pet = findPetForOwner(owner, petId);
        cleanupPetResources(pet);
        appointmentService.findAllByPet(pet).forEach(this::cleanupAppointmentResources);
        owner.getPets().removeIf(existing -> Objects.equals(existing.getId(), petId));
        petService.delete(pet);
        ownerService.save(owner);
    }

    public void deleteOwner(Long ownerId) {
        Owner owner = requireOwner(ownerId);
        owner.getPets().forEach(this::cleanupPetResources);
        appointmentService.findAllByOwnerId(ownerId).forEach(this::cleanupAppointmentResources);
        ownerService.delete(owner);
    }

    private void cleanupPetResources(Pet pet) {
        if (pet == null || pet.getId() == null) {
            return;
        }
        List<PetHealthRecord> records = petHealthRecordService.findAllByPet(pet);
        for (PetHealthRecord record : records) {
            if (record.getDocumentPath() != null) {
                documentStorageService.deletePetDocument(pet.getId(), record.getDocumentPath());
            }
            petHealthRecordService.delete(record);
        }
        documentStorageService.deleteAllForPet(pet.getId());
    }

    private void cleanupAppointmentResources(Appointment appointment) {
        if (appointment == null || appointment.getId() == null) {
            return;
        }
        List<PetHealthRecord> appointmentRecords = petHealthRecordService.findAllByAppointmentId(appointment.getId());
        for (PetHealthRecord record : appointmentRecords) {
            Pet relatedPet = record.getPet();
            if (relatedPet != null && relatedPet.getId() != null && record.getDocumentPath() != null) {
                documentStorageService.deletePetDocument(relatedPet.getId(), record.getDocumentPath());
            }
            petHealthRecordService.delete(record);
        }
        appointmentService.delete(appointment);
    }

    private Owner requireOwner(Long ownerId) {
        Owner owner = ownerService.findById(ownerId);
        if (owner == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Owner not found");
        }
        return owner;
    }

    private Pet findPetForOwner(Owner owner, Long petId) {
        return owner.getPets().stream()
                .filter(existing -> Objects.equals(existing.getId(), petId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));
    }

    private void applyOwnerRequest(Owner owner, OwnerRequest request) {
        owner.setFirstName(request.firstName());
        owner.setLastName(request.lastName());
        owner.setAddress(request.address());
        owner.setCity(request.city());
        owner.setTelephone(request.telephone());
        owner.setEmail(request.email());
    }

    private void applyPetRequest(Pet pet, PetRequest request) {
        pet.setName(request.name());
        pet.setBirthDate(request.birthDate());
        pet.setGender(request.gender());
        PetType type = petTypeService.findById(request.petTypeId());
        if (type == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pet type not found: " + request.petTypeId());
        }
        pet.setPetType(type);
    }

    private void ensureUniquePetName(Owner owner, String name, Long currentPetId) {
        String normalized = name == null ? "" : name.trim().toLowerCase();
        for (Pet existing : owner.getPets()) {
            if (existing.getName() == null) {
                continue;
            }
            if (!normalized.equals(existing.getName().trim().toLowerCase())) {
                continue;
            }
            if (currentPetId != null && Objects.equals(existing.getId(), currentPetId)) {
                continue;
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Pet name already in use for this owner");
        }
    }

    private OwnerSummary toSummary(Owner owner) {
        return new OwnerSummary(
                owner.getId(),
                owner.getFirstName(),
                owner.getLastName(),
                owner.getCity(),
                owner.getTelephone(),
                owner.getEmail(),
                owner.getPets().stream()
                        .sorted(Comparator.comparing(Pet::getName, String.CASE_INSENSITIVE_ORDER))
                        .map(pet -> new PetSummary(pet.getId(), pet.getName(),
                                pet.getPetType() != null ? pet.getPetType().getName() : null,
                                pet.getGender()))
                        .toList()
        );
    }

    private OwnerDetail toDetail(Owner owner) {
        List<PetDetail> pets = owner.getPets().stream()
                .sorted(Comparator.comparing(Pet::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toPetDetail)
                .toList();
        return new OwnerDetail(
                owner.getId(),
                owner.getFirstName(),
                owner.getLastName(),
                owner.getAddress(),
                owner.getCity(),
                owner.getTelephone(),
                owner.getEmail(),
                pets
        );
    }

    private PetDetail toPetDetail(Pet pet) {
        PetType type = pet.getPetType();
        PetTypeDto petTypeDto = type != null ? new PetTypeDto(type.getId(), type.getName()) : null;
        List<VisitDto> visits = pet.getVisits().stream()
                .sorted(Comparator.comparing(Visit::getDate))
                .map(this::toVisitDto)
                .toList();
        Map<PetHealthRecordType, List<PetHealthRecordDto>> records = groupHealthRecords(pet);
        return new PetDetail(
                pet.getId(),
                pet.getName(),
                pet.getGender(),
                pet.getBirthDate(),
                petTypeDto,
                visits,
                records
        );
    }

    private Map<PetHealthRecordType, List<PetHealthRecordDto>> groupHealthRecords(Pet pet) {
        EnumMap<PetHealthRecordType, List<PetHealthRecordDto>> grouped = new EnumMap<>(PetHealthRecordType.class);
        for (PetHealthRecordType type : PetHealthRecordType.values()) {
            grouped.put(type, new ArrayList<>());
        }
        for (PetHealthRecord record : petHealthRecordService.findAllByPet(pet)) {
            if (record == null) {
                continue;
            }
            PetHealthRecordType key = record.getType() != null ? record.getType() : PetHealthRecordType.OTHER;
            grouped.computeIfAbsent(key, ignored -> new ArrayList<>()).add(toPetHealthRecordDto(pet, record));
        }
        grouped.entrySet().removeIf(entry -> entry.getValue().isEmpty());
        return grouped;
    }

    private VisitDto toVisitDto(Visit visit) {
        return new VisitDto(
                visit.getId(),
                visit.getDate(),
                visit.getDescription()
        );
    }

    private PetHealthRecord buildRecordWithoutAttachment(Pet pet, PetHealthRecordRequest request) {
        PetHealthRecord record = new PetHealthRecord();
        record.setPet(pet);
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

    private PetHealthRecordDto toPetHealthRecordDto(Pet pet, PetHealthRecord record) {
        String downloadUrl = null;
        if (pet != null && pet.getId() != null && record.getId() != null && record.getDocumentPath() != null) {
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
}
