package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.model.AppUser;
import guru.springframework.sfgpetclinic.model.UserRole;
import guru.springframework.sfgpetclinic.repositories.AppointmentRepository;
import guru.springframework.sfgpetclinic.services.AppUserService;
import guru.springframework.sfgpetclinic.services.VetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminUserControllerTest {

    private AppUserService appUserService;
    private AppointmentRepository appointmentRepository;
    private AdminUserController controller;

    @BeforeEach
    void setUp() {
        appUserService = mock(AppUserService.class);
        appointmentRepository = mock(AppointmentRepository.class);
        controller = new AdminUserController(appUserService, mock(VetService.class), appointmentRepository);
    }

    @Test
    void deletesStaffAccountWithoutOwnedAppointments() {
        AppUser user = staffUser(7L);
        when(appUserService.findById(7L)).thenReturn(user);
        when(appointmentRepository.existsByUser(user)).thenReturn(false);

        ResponseEntity<Void> response = controller.delete(7L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(appUserService).delete(user);
    }

    @Test
    void refusesToDeleteSuperadministratorAccount() {
        AppUser user = staffUser(8L);
        user.setRoles(EnumSet.of(UserRole.SUPERADMIN, UserRole.CLINIC_OWNER, UserRole.STAFF));
        when(appUserService.findById(8L)).thenReturn(user);

        assertThatThrownBy(() -> controller.delete(8L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
        verify(appUserService, never()).delete(user);
    }

    @Test
    void deletesClinicOwnerAccountWithoutOwnedAppointments() {
        AppUser user = staffUser(10L);
        user.setRoles(EnumSet.of(UserRole.CLINIC_OWNER, UserRole.STAFF));
        when(appUserService.findById(10L)).thenReturn(user);
        when(appointmentRepository.existsByUser(user)).thenReturn(false);

        ResponseEntity<Void> response = controller.delete(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(appUserService).delete(user);
    }

    @Test
    void refusesToDeleteAccountThatOwnsAppointments() {
        AppUser user = staffUser(9L);
        when(appUserService.findById(9L)).thenReturn(user);
        when(appointmentRepository.existsByUser(user)).thenReturn(true);

        assertThatThrownBy(() -> controller.delete(9L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
        verify(appUserService, never()).delete(user);
    }

    private AppUser staffUser(Long id) {
        AppUser user = AppUser.builder()
                .username("staff" + id)
                .password("encoded-password")
                .roles(EnumSet.of(UserRole.STAFF))
                .build();
        user.setId(id);
        return user;
    }
}
