package guru.springframework.sfgpetclinic.repositories;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.PasswordResetToken;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface PasswordResetTokenRepository extends CrudRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    void deleteByUser(AppUser user);
}
