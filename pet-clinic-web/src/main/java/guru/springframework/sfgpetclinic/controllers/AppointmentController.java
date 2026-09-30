package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.api.appointments.AppointmentApplicationService;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentCancelResponse;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentDetail;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentRecordRequest;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentRequest;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.AppointmentWeekResponse;
import guru.springframework.sfgpetclinic.api.dto.AppointmentDtos.RescheduleRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentApplicationService appointmentApplicationService;

    public AppointmentController(AppointmentApplicationService appointmentApplicationService) {
        this.appointmentApplicationService = appointmentApplicationService;
    }

    @GetMapping
    public AppointmentWeekResponse getWeekView(@RequestParam(value = "week", required = false) LocalDate requestedWeek,
                                               Authentication authentication) {
        return appointmentApplicationService.getWeekView(requestedWeek, authentication);
    }

    @GetMapping("/{appointmentId}")
    public AppointmentDetail getAppointment(@PathVariable Long appointmentId, Authentication authentication) {
        return appointmentApplicationService.getAppointment(appointmentId, authentication);
    }

    @PostMapping
    public AppointmentDetail createAppointment(@Valid @RequestBody AppointmentRequest request,
                                               Authentication authentication) {
        return appointmentApplicationService.createAppointment(request, authentication);
    }

    @PutMapping("/{appointmentId}")
    public AppointmentDetail updateAppointment(@PathVariable Long appointmentId,
                                               @Valid @RequestBody AppointmentRequest request,
                                               Authentication authentication) {
        return appointmentApplicationService.updateAppointment(appointmentId, request, authentication);
    }

    @PostMapping("/{appointmentId}/reschedule")
    public AppointmentDetail rescheduleAppointment(@PathVariable Long appointmentId,
                                                   @Valid @RequestBody RescheduleRequest request,
                                                   Authentication authentication) {
        return appointmentApplicationService.rescheduleAppointment(appointmentId, request, authentication);
    }

    @DeleteMapping("/{appointmentId}")
    public AppointmentCancelResponse deleteAppointment(@PathVariable Long appointmentId,
                                                       Authentication authentication) {
        return appointmentApplicationService.deleteAppointment(appointmentId, authentication);
    }

    @PostMapping(value = "/{appointmentId}/records", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppointmentDetail uploadRecord(@PathVariable Long appointmentId,
                                          @Valid @ModelAttribute AppointmentRecordRequest request,
                                          @RequestPart(value = "files", required = false) MultipartFile[] files,
                                          @RequestPart(value = "file", required = false) MultipartFile singleFile,
                                          Authentication authentication) {
        MultipartFile[] payload = files != null
                ? files
                : (singleFile != null ? new MultipartFile[]{singleFile} : new MultipartFile[0]);
        return appointmentApplicationService.addRecord(appointmentId, request, payload, authentication);
    }

    @DeleteMapping("/{appointmentId}/records/{recordId}")
    public AppointmentDetail deleteRecord(@PathVariable Long appointmentId,
                                          @PathVariable Long recordId,
                                          Authentication authentication) {
        return appointmentApplicationService.removeRecord(appointmentId, recordId, authentication);
    }
}
