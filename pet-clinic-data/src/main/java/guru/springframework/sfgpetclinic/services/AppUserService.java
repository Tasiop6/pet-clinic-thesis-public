package guru.springframework.sfgpetclinic.services;

import guru.springframework.sfgpetclinic.model.AppUser;

import java.util.Collection;
import java.util.Optional;

public interface AppUserService extends CrudService<AppUser, Long> {

    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findByUsername(String username);

    Collection<AppUser> findPendingUsers();

    Collection<AppUser> findActiveUsers();

    Collection<AppUser> findBlacklistedUsers();
}
