package guru.springframework.sfgpetclinic.clinic;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ClinicInfoService {

    private final ClinicInfo clinicInfo;

    public ClinicInfoService(@Value("${clinic.info.path:classpath:clinic-info.txt}") Resource resource)
            throws IOException {
        this.clinicInfo = loadInfo(resource);
    }

    public ClinicInfo getInfo() {
        return clinicInfo;
    }

    private ClinicInfo loadInfo(Resource resource) throws IOException {
        Map<String, String> values = new LinkedHashMap<>();
        if (!resource.exists()) {
            return defaultInfo();
        }
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                int equals = trimmed.indexOf('=');
                if (equals > 0) {
                    String key = trimmed.substring(0, equals).trim().toLowerCase();
                    String value = trimmed.substring(equals + 1).trim();
                    values.put(key, value);
                }
            }
        }
        return new ClinicInfo(
                values.getOrDefault("name", "Pet Clinic"),
                values.getOrDefault("vat", ""),
                values.getOrDefault("address", ""),
                values.getOrDefault("city", ""),
                values.getOrDefault("phone", ""),
                values.getOrDefault("email", ""),
                values.getOrDefault("website", ""),
                values.getOrDefault("vetname", ""),
                values.getOrDefault("license", "")
        );
    }

    private ClinicInfo defaultInfo() {
        return new ClinicInfo(
                "Pet Clinic",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
        );
    }
}
