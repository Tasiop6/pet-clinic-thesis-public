package guru.springframework.sfgpetclinic.services.springdatajpa;

import guru.springframework.sfgpetclinic.model.Pet;
import guru.springframework.sfgpetclinic.model.PetHealthRecord;
import guru.springframework.sfgpetclinic.model.PetHealthRecordType;
import guru.springframework.sfgpetclinic.repositories.PetHealthRecordRepository;
import guru.springframework.sfgpetclinic.services.PetHealthRecordService;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Profile("springdatajpa")
public class PetHealthRecordSDJpaService implements PetHealthRecordService {

    private final PetHealthRecordRepository petHealthRecordRepository;

    public PetHealthRecordSDJpaService(PetHealthRecordRepository petHealthRecordRepository) {
        this.petHealthRecordRepository = petHealthRecordRepository;
    }

    @Override
    public Set<PetHealthRecord> findAll() {
        return new HashSet<>(petHealthRecordRepository.findAll());
    }

    @Override
    public PetHealthRecord findById(Long aLong) {
        return petHealthRecordRepository.findById(aLong).orElse(null);
    }

    @Override
    public PetHealthRecord save(PetHealthRecord object) {
        return petHealthRecordRepository.save(object);
    }

    @Override
    public void delete(PetHealthRecord object) {
        petHealthRecordRepository.delete(object);
    }

    @Override
    public void deleteById(Long aLong) {
        petHealthRecordRepository.deleteById(aLong);
    }

    @Override
    public List<PetHealthRecord> findAllByPet(Pet pet) {
        if (pet == null || pet.getId() == null) {
            return List.of();
        }
        return petHealthRecordRepository.findAllByPetIdOrderByRecordDateDescCreatedAtDesc(pet.getId());
    }

    @Override
    public List<PetHealthRecord> findAllByPetAndType(Pet pet, PetHealthRecordType type) {
        if (pet == null || pet.getId() == null) {
            return List.of();
        }
        return petHealthRecordRepository.findAllByPetIdAndTypeOrderByRecordDateDescCreatedAtDesc(pet.getId(), type);
    }

    @Override
    public List<PetHealthRecord> findAllByAppointmentId(Long appointmentId) {
        if (appointmentId == null) {
            return List.of();
        }
        return petHealthRecordRepository.findAllByAppointmentIdOrderByRecordDateDescCreatedAtDesc(appointmentId);
    }
}
