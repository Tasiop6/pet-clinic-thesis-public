package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.services.PetTypeLocalizationService;
import guru.springframework.sfgpetclinic.services.PetTypeLocalizationService.LocalizedPetType;
import guru.springframework.sfgpetclinic.services.PetTypeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pet-types")
public class PetTypeController {

    private final PetTypeService petTypeService;
    private final PetTypeLocalizationService petTypeLocalizationService;

    public PetTypeController(PetTypeService petTypeService,
                             PetTypeLocalizationService petTypeLocalizationService) {
        this.petTypeService = petTypeService;
        this.petTypeLocalizationService = petTypeLocalizationService;
    }

    @GetMapping
    public List<LocalizedPetType> listPetTypes() {
        return petTypeLocalizationService.localize(petTypeService.findAll());
    }
}
