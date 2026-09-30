package guru.springframework.sfgpetclinic.bootstrap;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.PetType;
import guru.springframework.sfgpetclinic.model.UserRole;
import guru.springframework.sfgpetclinic.services.AppUserService;
import guru.springframework.sfgpetclinic.services.PetTypeService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;

/**
 * Created by jt on 7/25/18.
 */
@Component
public class DataLoader implements CommandLineRunner {

    private final PetTypeService petTypeService;
    private final AppUserService appUserService;
    private final PasswordEncoder passwordEncoder;
    private final String adminUsername;
    private final String adminPassword;
    private final String adminEmail;

    private static final List<String> DEFAULT_PET_TYPES = List.of(
            "Dog",
            "Cat",
            "Bird",
            "Rabbit",
            "Reptile",
            "Hamster"
    );

    public DataLoader(PetTypeService petTypeService,
                      AppUserService appUserService,
                      PasswordEncoder passwordEncoder,
                      @Value("${APP_BOOTSTRAP_ADMIN_USERNAME:admin}") String adminUsername,
                      @Value("${APP_BOOTSTRAP_ADMIN_PASSWORD:}") String adminPassword,
                      @Value("${APP_BOOTSTRAP_ADMIN_EMAIL:tasiop.konst@gmail.com}") String adminEmail) {
        this.petTypeService = petTypeService;
        this.appUserService = appUserService;
        this.passwordEncoder = passwordEncoder;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
        this.adminEmail = adminEmail;
    }

    @Override
    public void run(String... args) throws Exception {
        ensurePetTypes();
        ensureAdminUser();
    }

    private void ensurePetTypes() {
        Set<String> existing = petTypeService.findAll().stream()
                .map(PetType::getName)
                .map(name -> name != null ? name.toLowerCase() : "")
                .collect(java.util.stream.Collectors.toSet());
        DEFAULT_PET_TYPES.stream()
                .filter(name -> !existing.contains(name.toLowerCase()))
                .forEach(name -> {
                    PetType type = new PetType();
                    type.setName(name);
                    petTypeService.save(type);
                });
    }

    private void ensureAdminUser() {
        if (!StringUtils.hasText(adminPassword)) {
            return;
        }

        AppUser admin = appUserService.findByUsername(adminUsername)
                .orElseGet(() -> AppUser.builder()
                        .username(adminUsername)
                        .displayName("Administrator")
                        .email(adminEmail)
                        .build());

        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setActive(true);
        admin.setEmailVerified(true);
        if (StringUtils.hasText(adminEmail)) {
            admin.setEmail(adminEmail.trim());
        }
        admin.setAdmin(true);
        admin.setBlacklisted(false);
        admin.getRoles().add(UserRole.SUPERADMIN);
        appUserService.save(admin);
    }
}
