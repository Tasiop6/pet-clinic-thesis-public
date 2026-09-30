package guru.springframework.sfgpetclinic.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "app_users")
public class AppUser extends BaseEntity {

    @Column(name = "username", nullable = false, unique = true)
    private String username;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "active")
    @Builder.Default
    private boolean active = false;

    @Column(name = "blacklisted")
    @Builder.Default
    @Getter(AccessLevel.NONE)
    private Boolean blacklisted = Boolean.FALSE;

    @Column(name = "admin")
    @Builder.Default
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private Boolean admin = Boolean.FALSE;

    @Column(name = "email", unique = true)
    private String email;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    @Getter(AccessLevel.NONE)
    private Boolean emailVerified = Boolean.FALSE;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "calendar_email")
    private String calendarEmail;

    @Column(name = "google_refresh_token", length = 1024)
    private String googleRefreshToken;

    @Column(name = "google_access_token", length = 1024)
    private String googleAccessToken;

    @Column(name = "google_access_token_expiry")
    private java.time.Instant googleAccessTokenExpiry;

    @Builder.Default
    @OneToMany(mappedBy = "user")
    private Set<Appointment> appointments = new HashSet<>();

    @Builder.Default
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "app_user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role", nullable = false, length = 64)
    @Enumerated(EnumType.STRING)
    private Set<UserRole> roles = new HashSet<>();

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vet_id")
    private Vet vet;

    public boolean isAdmin() {
        Set<UserRole> currentRoles = getRoles();
        return currentRoles.contains(UserRole.CLINIC_OWNER) || currentRoles.contains(UserRole.SUPERADMIN);
    }

    public void setAdmin(Boolean admin) {
        boolean owner = Boolean.TRUE.equals(admin);
        this.admin = owner;
        Set<UserRole> currentRoles = getRoles();
        if (owner) {
            currentRoles.add(UserRole.CLINIC_OWNER);
        } else {
            currentRoles.remove(UserRole.CLINIC_OWNER);
            currentRoles.remove(UserRole.SUPERADMIN);
            if (currentRoles.isEmpty()) {
                currentRoles.add(UserRole.STAFF);
            }
        }
        this.roles = currentRoles;
    }

    public boolean isBlacklisted() {
        return Boolean.TRUE.equals(blacklisted);
    }

    public boolean isEmailVerified() {
        return Boolean.TRUE.equals(emailVerified);
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public void setBlacklisted(boolean blacklisted) {
        this.blacklisted = blacklisted;
    }

    public Set<UserRole> getRoles() {
        if (roles == null) {
            roles = new HashSet<>();
        }
        if (Boolean.TRUE.equals(admin)) {
            roles.add(UserRole.CLINIC_OWNER);
        }
        if (roles.isEmpty()) {
            roles.add(UserRole.STAFF);
        }
        return roles;
    }

    public void setRoles(Set<UserRole> roles) {
        this.roles = roles != null ? new HashSet<>(roles) : new HashSet<>();
        if (this.roles.isEmpty()) {
            this.roles.add(UserRole.STAFF);
        }
        boolean hasClinicOwner = this.roles.contains(UserRole.CLINIC_OWNER);
        boolean hasSuperAdmin = this.roles.contains(UserRole.SUPERADMIN);
        this.admin = hasClinicOwner || hasSuperAdmin;
        if (this.admin) {
            this.roles.add(UserRole.CLINIC_OWNER);
        }
    }

    public boolean hasRole(UserRole role) {
        return getRoles().contains(role);
    }
}
