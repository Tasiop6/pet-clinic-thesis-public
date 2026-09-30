package guru.springframework.sfgpetclinic.repositories;

import guru.springframework.sfgpetclinic.model.AppUser;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends CrudRepository<AppUser, Long> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    Optional<AppUser> findByUsernameIgnoreCase(String username);

    List<AppUser> findByActiveFalseAndBlacklistedFalseOrderByUsernameAsc();

    List<AppUser> findByActiveTrueAndBlacklistedFalseOrderByUsernameAsc();

    List<AppUser> findByBlacklistedTrueOrderByUsernameAsc();
}
