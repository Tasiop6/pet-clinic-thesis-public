package guru.springframework.sfgpetclinic.services;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.Appointment;
import guru.springframework.sfgpetclinic.model.Pet;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentService extends CrudService<Appointment, Long> {

    List<Appointment> findAllByUser(AppUser user);

    boolean existsForUserPetAtTime(AppUser user, Pet pet, LocalDateTime dateTime);

    List<Appointment> findAllByOwnerId(Long ownerId);

    List<Appointment> findAllByPet(Pet pet);

    List<Appointment> findAllByVetId(Long vetId);
}
