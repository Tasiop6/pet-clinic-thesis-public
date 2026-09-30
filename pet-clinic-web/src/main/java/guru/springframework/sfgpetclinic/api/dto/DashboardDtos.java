package guru.springframework.sfgpetclinic.api.dto;

import guru.springframework.sfgpetclinic.web.DashboardAppointmentView;

import java.util.List;
import java.util.Map;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record DashboardResponse(
            List<DashboardAppointmentView> upcomingAppointments,
            List<DashboardAppointmentView> contactReminders,
            DashboardStats stats) {
    }

    public record DashboardStats(long today, long week, long contactGaps) {
        public Map<String, Long> asMap() {
            return Map.of(
                    "today", today,
                    "week", week,
                    "gaps", contactGaps
            );
        }
    }
}
