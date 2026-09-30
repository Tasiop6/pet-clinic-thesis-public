package guru.springframework.sfgpetclinic.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DocumentStorageServiceTest {

    @TempDir
    Path tempDir;

    private DocumentStorageService service;
    private Path storageRoot;

    @BeforeEach
    void setUp() throws IOException {
        storageRoot = tempDir.resolve("uploads").resolve("pet-documents");
        service = new DocumentStorageService(storageRoot);
        Files.createDirectories(storageRoot.resolve("5"));
        Files.writeString(storageRoot.resolve("5/test.txt"), "hello world");
    }

    @Test
    void loadRelativePathWithinPetFolder() throws IOException {
        Resource resource = service.loadAsResource(5L, "test.txt");
        assertNotNull(resource);
        assertTrue(resource.exists());
        assertEquals("hello world", Files.readString(resource.getFile().toPath()));
    }

    @Test
    void loadWindowsStylePath() throws IOException {
        Resource resource = service.loadAsResource(5L, "5\\test.txt");
        assertNotNull(resource);
        assertTrue(resource.exists());
        assertEquals("hello world", Files.readString(resource.getFile().toPath()));
    }

    @Test
    void loadPathWithStoragePrefix() throws IOException {
        String stored = storageRoot.getParent().getFileName() + "/" + storageRoot.getFileName() + "/5/test.txt";
        Resource resource = service.loadAsResource(5L, stored);
        assertNotNull(resource);
        assertTrue(resource.exists());
        assertEquals("hello world", Files.readString(resource.getFile().toPath()));
    }

    @Test
    void returnsNullForMissingFiles() {
        Resource resource = service.loadAsResource(5L, "missing.txt");
        assertNull(resource);
    }

    @Test
    void rejectsFilesLargerThanTenMegabytes() {
        byte[] large = new byte[(10 * 1024 * 1024) + 1];
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "too-big.bin",
                "application/octet-stream",
                large
        );
        assertThrows(IllegalArgumentException.class, () -> service.storePetDocument(5L, file));
    }
}
