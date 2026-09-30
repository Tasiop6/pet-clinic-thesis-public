package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.UserRole;
import guru.springframework.sfgpetclinic.model.Vet;
import guru.springframework.sfgpetclinic.repositories.AppointmentRepository;
import guru.springframework.sfgpetclinic.security.AppUserDetails;
import guru.springframework.sfgpetclinic.services.AppUserService;
import guru.springframework.sfgpetclinic.services.VetService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.StreamSupport;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AppUserService appUserService;
    private final VetService vetService;
    private final AppointmentRepository appointmentRepository;

    public AdminUserController(AppUserService appUserService,
                               VetService vetService,
                               AppointmentRepository appointmentRepository) {
        this.appUserService = appUserService;
        this.vetService = vetService;
        this.appointmentRepository = appointmentRepository;
    }

    @GetMapping("/pending")
    public List<UserSummary> pendingUsers() {
        return StreamSupport.stream(appUserService.findPendingUsers().spliterator(), false)
                .map(this::toSummary)
                .toList();
    }

    @GetMapping("/active")
    public List<UserSummary> activeUsers() {
        return StreamSupport.stream(appUserService.findActiveUsers().spliterator(), false)
                .map(this::toSummary)
                .toList();
    }

    @GetMapping("/blacklisted")
    public List<UserSummary> blacklistedUsers() {
        return StreamSupport.stream(appUserService.findBlacklistedUsers().spliterator(), false)
                .map(this::toSummary)
                .toList();
    }

    @PostMapping("/{userId}/approve")
    public ResponseEntity<UserSummary> approve(@PathVariable Long userId) {
        AppUser user = appUserService.findById(userId);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        if (user.isAdmin() && !currentUserIsSuperAdmin()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot modify administrator activation");
        }
        user.setActive(true);
        AppUser saved = appUserService.save(user);
        return ResponseEntity.ok(toSummary(saved));
    }

    @PostMapping("/{userId}/deactivate")
    public ResponseEntity<UserSummary> deactivate(@PathVariable Long userId) {
        AppUser user = appUserService.findById(userId);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        if (user.isAdmin() && !currentUserIsSuperAdmin()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot deactivate administrator account");
        }
        user.setActive(false);
        user.setBlacklisted(false);
        AppUser saved = appUserService.save(user);
        return ResponseEntity.ok(toSummary(saved));
    }

    @PostMapping("/{userId}/blacklist")
    public ResponseEntity<UserSummary> blacklist(@PathVariable Long userId) {
        AppUser user = appUserService.findById(userId);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        if (user.isAdmin() && !currentUserIsSuperAdmin()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot blacklist administrator account");
        }
        user.setBlacklisted(true);
        user.setActive(false);
        AppUser saved = appUserService.save(user);
        return ResponseEntity.ok(toSummary(saved));
    }

    @PostMapping("/{userId}/reinstate")
    public ResponseEntity<UserSummary> reinstate(@PathVariable Long userId) {
        AppUser user = appUserService.findById(userId);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        if (user.isAdmin() && !currentUserIsSuperAdmin()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot modify administrator activation");
        }
        user.setBlacklisted(false);
        user.setActive(false);
        AppUser saved = appUserService.save(user);
        return ResponseEntity.ok(toSummary(saved));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> delete(@PathVariable Long userId) {
        AppUser user = appUserService.findById(userId);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        if (user.getRoles().contains(UserRole.SUPERADMIN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Superadministrator accounts cannot be deleted");
        }
        if (appointmentRepository.existsByUser(user)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This account owns appointment records and cannot be deleted; deactivate it instead");
        }

        appUserService.delete(user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/roles")
    public ResponseEntity<UserSummary> updateRoles(@PathVariable Long userId,
                                                   @RequestBody RoleUpdateRequest request) {
        AppUser user = appUserService.findById(userId);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        if (user.isAdmin() && !currentUserIsSuperAdmin()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot modify administrator activation");
        }

        Set<UserRole> roles = request.roles() != null && !request.roles().isEmpty()
                ? EnumSet.copyOf(request.roles())
                : EnumSet.noneOf(UserRole.class);

        if (roles.isEmpty()) {
            roles.add(UserRole.STAFF);
        }

        user.setRoles(roles);

        if (roles.contains(UserRole.VET)) {
            if (request.vetId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vet assignment is required for vet role");
            }
            Vet vet = vetService.findById(request.vetId());
            if (vet == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vet not found");
            }
            user.setVet(vet);
        } else {
            user.setVet(null);
        }

        AppUser saved = appUserService.save(user);
        return ResponseEntity.ok(toSummary(saved));
    }

    private UserSummary toSummary(AppUser user) {
        Vet vet = user.getVet();
        return new UserSummary(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmail(),
                user.isActive(),
                user.isAdmin(),
                user.isBlacklisted(),
                Set.copyOf(user.getRoles()),
                vet != null ? vet.getId() : null,
                vet != null ? buildVetName(vet) : null
        );
    }

    private String buildVetName(Vet vet) {
        String firstName = vet.getFirstName() != null ? vet.getFirstName().trim() : "";
        String lastName = vet.getLastName() != null ? vet.getLastName().trim() : "";
        String combined = (firstName + " " + lastName).trim();
        if (!combined.isEmpty()) {
            return combined;
        }
        return vet.getEmail();
    }

    public record UserSummary(
            Long id,
            String username,
            String displayName,
            String email,
            boolean active,
            boolean admin,
            boolean blacklisted,
            Set<UserRole> roles,
            Long vetId,
            String vetName) {
    }

    public record RoleUpdateRequest(Set<UserRole> roles, Long vetId) {
    }

    private boolean currentUserIsSuperAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof AppUserDetails userDetails) {
            return userDetails.hasRole(UserRole.SUPERADMIN);
        }
        return false;
    }
}
