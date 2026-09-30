package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.OwnerDetail;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.OwnerRequest;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.OwnerSummary;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetDetail;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetHealthRecordRequest;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.PetRequest;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.VisitDto;
import guru.springframework.sfgpetclinic.api.dto.OwnerDtos.VisitRequest;
import guru.springframework.sfgpetclinic.api.owners.OwnerApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/owners")
public class OwnerController {

    private final OwnerApplicationService ownerApplicationService;

    public OwnerController(OwnerApplicationService ownerApplicationService) {
        this.ownerApplicationService = ownerApplicationService;
    }

    @GetMapping
    public List<OwnerSummary> listOwners(@RequestParam(value = "lastName", required = false) String lastName) {
        return ownerApplicationService.listOwners(lastName);
    }

    @GetMapping("/{ownerId}")
    public OwnerDetail getOwner(@PathVariable Long ownerId) {
        return ownerApplicationService.getOwner(ownerId);
    }

    @PostMapping
    public OwnerDetail createOwner(@Valid @RequestBody OwnerRequest request) {
        return ownerApplicationService.createOwner(request);
    }

    @PutMapping("/{ownerId}")
    public OwnerDetail updateOwner(@PathVariable Long ownerId, @Valid @RequestBody OwnerRequest request) {
        return ownerApplicationService.updateOwner(ownerId, request);
    }

    @GetMapping("/{ownerId}/pets")
    public List<PetDetail> listPets(@PathVariable Long ownerId) {
        return ownerApplicationService.listPets(ownerId);
    }

    @PostMapping("/{ownerId}/pets")
    public PetDetail createPet(@PathVariable Long ownerId, @Valid @RequestBody PetRequest request) {
        return ownerApplicationService.createPet(ownerId, request);
    }

    @PutMapping("/{ownerId}/pets/{petId}")
    public PetDetail updatePet(@PathVariable Long ownerId,
                               @PathVariable Long petId,
                               @Valid @RequestBody PetRequest request) {
        return ownerApplicationService.updatePet(ownerId, petId, request);
    }

    @PostMapping("/{ownerId}/pets/{petId}/visits")
    public List<VisitDto> createVisit(@PathVariable Long ownerId,
                                      @PathVariable Long petId,
                                      @Valid @RequestBody VisitRequest request) {
        return ownerApplicationService.createVisit(ownerId, petId, request);
    }

    @PostMapping(value = "/{ownerId}/pets/{petId}/records", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PetDetail addHealthRecord(@PathVariable Long ownerId,
                                     @PathVariable Long petId,
                                     @Valid @ModelAttribute PetHealthRecordRequest request,
                                     @RequestPart(value = "files", required = false) MultipartFile[] files,
                                     @RequestPart(value = "file", required = false) MultipartFile singleFile) {
        MultipartFile[] payload = files != null
                ? files
                : (singleFile != null ? new MultipartFile[]{singleFile} : new MultipartFile[0]);
        return ownerApplicationService.addHealthRecord(ownerId, petId, request, payload);
    }

    @DeleteMapping("/{ownerId}/pets/{petId}/records/{recordId}")
    public PetDetail deleteHealthRecord(@PathVariable Long ownerId,
                                        @PathVariable Long petId,
                                        @PathVariable Long recordId) {
        return ownerApplicationService.deleteHealthRecord(ownerId, petId, recordId);
    }

    @PutMapping("/{ownerId}/pets/{petId}/records/{recordId}")
    public PetDetail updateHealthRecord(@PathVariable Long ownerId,
                                        @PathVariable Long petId,
                                        @PathVariable Long recordId,
                                        @Valid @RequestBody PetHealthRecordRequest request) {
        return ownerApplicationService.updateHealthRecord(ownerId, petId, recordId, request);
    }

    @DeleteMapping("/{ownerId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOwner(@PathVariable Long ownerId) {
        ownerApplicationService.deleteOwner(ownerId);
    }

    @DeleteMapping("/{ownerId}/pets/{petId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePet(@PathVariable Long ownerId, @PathVariable Long petId) {
        ownerApplicationService.deletePet(ownerId, petId);
    }
}
