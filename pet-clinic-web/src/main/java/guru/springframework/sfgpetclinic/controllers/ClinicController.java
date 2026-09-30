package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.clinic.ClinicInfo;
import guru.springframework.sfgpetclinic.clinic.ClinicInfoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clinic")
public class ClinicController {

    private final ClinicInfoService clinicInfoService;

    public ClinicController(ClinicInfoService clinicInfoService) {
        this.clinicInfoService = clinicInfoService;
    }

    @GetMapping("/info")
    public ClinicInfo getClinicInfo() {
        return clinicInfoService.getInfo();
    }
}
