package guru.springframework.sfgpetclinic.services.springdatajpa;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.repositories.AppUserRepository;
import guru.springframework.sfgpetclinic.services.AppUserService;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@Profile("springdatajpa")
public class AppUserSDJpaService implements AppUserService {

    private final AppUserRepository appUserRepository;

    public AppUserSDJpaService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    public Optional<AppUser> findByEmail(String email) {
        if (!StringUtils.hasText(email)) {
            return Optional.empty();
        }
        return appUserRepository.findByEmailIgnoreCase(email);
    }

    @Override
    public Optional<AppUser> findByUsername(String username) {
        if (!StringUtils.hasText(username)) {
            return Optional.empty();
        }
        return appUserRepository.findByUsernameIgnoreCase(username);
    }

    @Override
    public Set<AppUser> findAll() {
        Set<AppUser> users = new HashSet<>();
        appUserRepository.findAll().forEach(users::add);
        return users;
    }

    @Override
    public AppUser findById(Long aLong) {
        return appUserRepository.findById(aLong).orElse(null);
    }

    @Override
    public AppUser save(AppUser object) {
        return appUserRepository.save(object);
    }

    @Override
    public void delete(AppUser object) {
        appUserRepository.delete(object);
    }

    @Override
    public void deleteById(Long aLong) {
        appUserRepository.deleteById(aLong);
    }

    @Override
    public List<AppUser> findPendingUsers() {
        return appUserRepository.findByActiveFalseAndBlacklistedFalseOrderByUsernameAsc();
    }

    @Override
    public List<AppUser> findActiveUsers() {
        return appUserRepository.findByActiveTrueAndBlacklistedFalseOrderByUsernameAsc();
    }

    @Override
    public List<AppUser> findBlacklistedUsers() {
        return appUserRepository.findByBlacklistedTrueOrderByUsernameAsc();
    }
}
