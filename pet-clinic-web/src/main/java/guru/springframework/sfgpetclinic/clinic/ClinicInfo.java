package guru.springframework.sfgpetclinic.clinic;

public record ClinicInfo(
        String name,
        String vat,
        String address,
        String city,
        String phone,
        String email,
        String website,
        String vetName,
        String license) {
}
