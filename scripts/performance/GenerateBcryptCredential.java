import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Base64;

import org.springframework.security.crypto.bcrypt.BCrypt;

public class GenerateBcryptCredential {
    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            throw new IllegalArgumentException("Expected password and hash output paths");
        }

        byte[] randomBytes = new byte[24];
        new SecureRandom().nextBytes(randomBytes);
        String password = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        String hash = BCrypt.hashpw(password, BCrypt.gensalt(12));

        Files.writeString(Path.of(args[0]), password, StandardCharsets.UTF_8);
        Files.writeString(Path.of(args[1]), hash, StandardCharsets.UTF_8);
    }
}
