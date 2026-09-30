package guru.springframework.sfgpetclinic.repositories;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.Appointment;
import guru.springframework.sfgpetclinic.model.Pet;
import org.springframework.data.repository.CrudRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends CrudRepository<Appointment, Long> {

    List<Appointment> findAllByUserOrderByAppointmentTimeAsc(AppUser user);

    boolean existsByUser(AppUser user);

    boolean existsByUserAndPetAndAppointmentTime(AppUser user, Pet pet, LocalDateTime appointmentTime);

    List<Appointment> findAllByOwner_IdOrderByAppointmentTimeAsc(Long ownerId);

    List<Appointment> findAllByPet(Pet pet);

    List<Appointment> findAllByVet_Id(Long vetId);
}
