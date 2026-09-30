package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.api.dashboard.DashboardApplicationService;
import guru.springframework.sfgpetclinic.api.dto.DashboardDtos.DashboardResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardApplicationService dashboardApplicationService;

    public DashboardController(DashboardApplicationService dashboardApplicationService) {
        this.dashboardApplicationService = dashboardApplicationService;
    }

    @GetMapping
    public DashboardResponse getDashboard(Authentication authentication) {
        return dashboardApplicationService.getDashboard(authentication);
    }
}
