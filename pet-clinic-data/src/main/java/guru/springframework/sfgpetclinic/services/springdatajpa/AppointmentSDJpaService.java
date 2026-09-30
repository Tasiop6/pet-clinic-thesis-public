package guru.springframework.sfgpetclinic.services.springdatajpa;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.Appointment;
import guru.springframework.sfgpetclinic.model.Pet;
import guru.springframework.sfgpetclinic.repositories.AppointmentRepository;
import guru.springframework.sfgpetclinic.services.AppointmentService;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Profile("springdatajpa")
public class AppointmentSDJpaService implements AppointmentService {

    private final AppointmentRepository appointmentRepository;

    public AppointmentSDJpaService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    @Override
    public List<Appointment> findAllByUser(AppUser user) {
        return appointmentRepository.findAllByUserOrderByAppointmentTimeAsc(user);
    }

    @Override
    public Set<Appointment> findAll() {
        Set<Appointment> appointments = new HashSet<>();
        appointmentRepository.findAll().forEach(appointments::add);
        return appointments;
    }

    @Override
    public Appointment findById(Long aLong) {
        return appointmentRepository.findById(aLong).orElse(null);
    }

    @Override
    public Appointment save(Appointment object) {
        return appointmentRepository.save(object);
    }

    @Override
    public void delete(Appointment object) {
        appointmentRepository.delete(object);
    }

    @Override
    public void deleteById(Long aLong) {
        appointmentRepository.deleteById(aLong);
    }

    @Override
    public boolean existsForUserPetAtTime(AppUser user, Pet pet, LocalDateTime dateTime) {
        if (user == null || pet == null || dateTime == null) {
            return false;
        }
        return appointmentRepository.existsByUserAndPetAndAppointmentTime(user, pet, dateTime);
    }

    @Override
    public List<Appointment> findAllByOwnerId(Long ownerId) {
        if (ownerId == null) {
            return List.of();
        }
        return appointmentRepository.findAllByOwner_IdOrderByAppointmentTimeAsc(ownerId);
    }

    @Override
    public List<Appointment> findAllByPet(Pet pet) {
        if (pet == null) {
            return List.of();
        }
        return appointmentRepository.findAllByPet(pet);
    }

    @Override
    public List<Appointment> findAllByVetId(Long vetId) {
        if (vetId == null) {
            return List.of();
        }
        return appointmentRepository.findAllByVet_Id(vetId);
    }
}
