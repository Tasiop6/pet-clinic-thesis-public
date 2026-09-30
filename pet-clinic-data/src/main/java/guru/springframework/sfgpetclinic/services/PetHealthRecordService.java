package guru.springframework.sfgpetclinic.services;

import guru.springframework.sfgpetclinic.model.Pet;
import guru.springframework.sfgpetclinic.model.PetHealthRecord;
import guru.springframework.sfgpetclinic.model.PetHealthRecordType;

import java.util.List;

public interface PetHealthRecordService extends CrudService<PetHealthRecord, Long> {

    List<PetHealthRecord> findAllByPet(Pet pet);

    List<PetHealthRecord> findAllByPetAndType(Pet pet, PetHealthRecordType type);

    List<PetHealthRecord> findAllByAppointmentId(Long appointmentId);
}
