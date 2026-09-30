package guru.springframework.sfgpetclinic.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public class ProfileForm {

    @Size(max = 100, message = "Display name must be at most 100 characters")
    private String displayName;

    @Email(message = "Please provide a valid email address")
    @Size(max = 190, message = "Email must be at most 190 characters")
    private String email;

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
