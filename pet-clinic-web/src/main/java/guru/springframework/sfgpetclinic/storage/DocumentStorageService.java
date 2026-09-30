package guru.springframework.sfgpetclinic.storage;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Service
public class DocumentStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    private final Path rootLocation;
    private final DateTimeFormatter timestampFormatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    public DocumentStorageService() {
        this(Paths.get("uploads", "pet-documents"));
    }

    public DocumentStorageService(Path rootLocation) {
        this.rootLocation = rootLocation.toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to initialise document storage", ex);
        }
    }

    public StoredDocument storePetDocument(Long petId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Attachments are limited to 10MB each");
        }
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "document");
        String extension = "";
        int dot = originalFilename.lastIndexOf('.');
        if (dot > -1 && dot < originalFilename.length() - 1) {
            extension = originalFilename.substring(dot);
        }
        String timestamp = timestampFormatter.format(LocalDateTime.now());
        String uniqueName = timestamp + "-" + UUID.randomUUID() + extension;
        Path petFolder = rootLocation.resolve(String.valueOf(petId != null ? petId : 0L));
        Files.createDirectories(petFolder);
        Path destination = petFolder.resolve(uniqueName).normalize();
        try (var inputStream = file.getInputStream()) {
            Files.copy(inputStream, destination);
        }
        return new StoredDocument(
                originalFilename,
                petFolder.relativize(destination).toString(),
                destination.toString(),
                file.getContentType(),
                file.getSize()
        );
    }

    public Resource loadAsResource(Long petId, String storedPath) {
        if (!StringUtils.hasText(storedPath)) {
            return null;
        }

        String normalizedInput = normalizeSeparators(storedPath.trim());
        Set<Path> candidates = new LinkedHashSet<>();

        Path parsed = parsePath(normalizedInput);
        if (parsed != null && parsed.isAbsolute()) {
            Path absoluteCandidate = parsed.normalize();
            if (isWithinRoot(absoluteCandidate)) {
                candidates.add(absoluteCandidate);
            }
        }

        String relative = stripRootString(normalizedInput);
        relative = stripStoragePrefix(relative);
        relative = trimLeadingSlashes(relative);
        if (!StringUtils.hasText(relative)) {
            return resolveExistingResource(candidates);
        }

        Set<String> relativeCandidates = new LinkedHashSet<>();
        relativeCandidates.add(relative);

        if (petId != null) {
            String petPrefix = petId + "/";
            if (relative.startsWith(petPrefix)) {
                String withoutPrefix = relative.substring(petPrefix.length());
                if (StringUtils.hasText(withoutPrefix)) {
                    relativeCandidates.add(withoutPrefix);
                }
            } else {
                relativeCandidates.add(petPrefix + relative);
            }
        }

        for (String candidateStr : relativeCandidates) {
            Path candidatePath = toSafeCandidate(candidateStr);
            if (candidatePath != null) {
                candidates.add(candidatePath);
            }
        }

        return resolveExistingResource(candidates);
    }

    public void deletePetDocument(Long petId, String relativePath) {
        if (petId == null || relativePath == null) {
            return;
        }
        Path filePath = rootLocation.resolve(Paths.get(String.valueOf(petId)).resolve(relativePath)).normalize();
        if (!filePath.startsWith(rootLocation)) {
            return;
        }
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
            // best effort
        }
    }

    public void deleteAllForPet(Long petId) {
        if (petId == null) {
            return;
        }
        Path petFolder = rootLocation.resolve(String.valueOf(petId)).normalize();
        if (!petFolder.startsWith(rootLocation) || !Files.exists(petFolder)) {
            return;
        }
        try (var paths = Files.walk(petFolder)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // best effort for each file
                }
            });
        } catch (IOException ignored) {
            // ignore
        }
    }

    public record StoredDocument(String originalName,
                                 String relativePath,
                                 String absolutePath,
                                 String contentType,
                                 long size) {}

    private Path parsePath(String input) {
        if (!StringUtils.hasText(input)) {
            return null;
        }
        try {
            return Paths.get(input);
        } catch (InvalidPathException ex) {
            return null;
        }
    }

    private String normalizeSeparators(String value) {
        return value.replace('\\', '/');
    }

    private String stripRootString(String path) {
        String rootString = normalizeSeparators(rootLocation.toString());
        if (path.startsWith(rootString)) {
            String remainder = path.substring(rootString.length());
            return trimLeadingSlashes(remainder);
        }
        return path;
    }

    private String stripStoragePrefix(String path) {
        String result = path;
        Path normalizedRoot = rootLocation.normalize();
        int nameCount = normalizedRoot.getNameCount();
        if (nameCount == 0) {
            return result;
        }
        int tailStart = Math.max(0, nameCount - 2);
        Path tail = normalizedRoot.subpath(tailStart, nameCount);
        String tailString = normalizeSeparators(tail.toString());
        if (result.startsWith(tailString + "/")) {
            result = result.substring((tailString + "/").length());
        } else if (result.equals(tailString)) {
            result = "";
        } else {
            String leaf = normalizedRoot.getName(nameCount - 1).toString();
            if (result.startsWith(leaf + "/")) {
                result = result.substring((leaf + "/").length());
            } else if (result.equals(leaf)) {
                result = "";
            }
        }
        return result;
    }

    private String trimLeadingSlashes(String path) {
        String result = path;
        while (result.startsWith("/")) {
            result = result.substring(1);
        }
        if (result.startsWith("./")) {
            result = result.substring(2);
        }
        return result;
    }

    private Path toSafeCandidate(String relative) {
        if (!StringUtils.hasText(relative)) {
            return null;
        }
        try {
            Path candidate = rootLocation.resolve(Paths.get(relative)).normalize();
            return isWithinRoot(candidate) ? candidate : null;
        } catch (InvalidPathException ex) {
            return null;
        }
    }

    private Resource resolveExistingResource(Set<Path> candidates) {
        for (Path candidate : candidates) {
            Path safe = candidate.normalize();
            if (!isWithinRoot(safe)) {
                continue;
            }
            if (Files.exists(safe)) {
                return new FileSystemResource(safe);
            }
        }
        return null;
    }

    private boolean isWithinRoot(Path path) {
        return path.normalize().startsWith(rootLocation);
    }
}
