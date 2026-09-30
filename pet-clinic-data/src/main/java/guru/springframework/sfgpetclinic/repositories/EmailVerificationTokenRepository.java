package guru.springframework.sfgpetclinic.repositories;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.EmailVerificationToken;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface EmailVerificationTokenRepository extends CrudRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    void deleteByUser(AppUser user);
}
