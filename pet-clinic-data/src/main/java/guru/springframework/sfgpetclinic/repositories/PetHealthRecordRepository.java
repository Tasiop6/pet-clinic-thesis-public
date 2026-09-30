package guru.springframework.sfgpetclinic.repositories;

import guru.springframework.sfgpetclinic.model.PetHealthRecord;
import guru.springframework.sfgpetclinic.model.PetHealthRecordType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PetHealthRecordRepository extends JpaRepository<PetHealthRecord, Long> {

    List<PetHealthRecord> findAllByPetIdOrderByRecordDateDescCreatedAtDesc(Long petId);

    List<PetHealthRecord> findAllByPetIdAndTypeOrderByRecordDateDescCreatedAtDesc(Long petId, PetHealthRecordType type);

    List<PetHealthRecord> findAllByAppointmentIdOrderByRecordDateDescCreatedAtDesc(Long appointmentId);
}
