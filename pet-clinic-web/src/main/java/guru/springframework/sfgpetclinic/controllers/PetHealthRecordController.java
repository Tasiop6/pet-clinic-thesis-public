package guru.springframework.sfgpetclinic.controllers;

import guru.springframework.sfgpetclinic.model.PetHealthRecord;
import guru.springframework.sfgpetclinic.services.PetHealthRecordService;
import guru.springframework.sfgpetclinic.storage.DocumentStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.nio.charset.StandardCharsets;

@Controller
@RequestMapping("/pets/{petId}/records")
public class PetHealthRecordController {

    private final PetHealthRecordService petHealthRecordService;
    private final DocumentStorageService documentStorageService;

    public PetHealthRecordController(PetHealthRecordService petHealthRecordService,
                                     DocumentStorageService documentStorageService) {
        this.petHealthRecordService = petHealthRecordService;
        this.documentStorageService = documentStorageService;
    }

    @GetMapping("/{recordId}/download")
    public ResponseEntity<Resource> downloadRecord(@PathVariable Long petId,
                                                   @PathVariable Long recordId,
                                                   @RequestParam(value = "inline", defaultValue = "false") boolean inline) {
        PetHealthRecord record = petHealthRecordService.findById(recordId);
        if (record == null || record.getPet() == null || record.getPet().getId() == null
                || !record.getPet().getId().equals(petId) || record.getDocumentPath() == null) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = documentStorageService.loadAsResource(petId, record.getDocumentPath());
        if (resource == null || !resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        String filename = record.getDocumentName() != null ? record.getDocumentName() : resource.getFilename();
        String dispositionType = inline ? "inline" : "attachment";
        String contentDisposition = dispositionType + "; filename=\"" + encodeFilename(filename) + "\"";
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (record.getDocumentContentType() != null) {
            try {
                mediaType = MediaType.parseMediaType(record.getDocumentContentType());
            } catch (IllegalArgumentException ignored) {
            }
        }
        long contentLength = record.getDocumentSize() != null ? record.getDocumentSize() : safeContentLength(resource);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition);
        if (contentLength >= 0) {
            builder = builder.contentLength(contentLength);
        }
        return builder.body(resource);
    }

    private String encodeFilename(String filename) {
        if (filename == null) {
            return "document";
        }
        return new String(filename.getBytes(StandardCharsets.UTF_8), StandardCharsets.ISO_8859_1)
                .replaceAll("\\s", "%20");
    }

    private long safeContentLength(Resource resource) {
        try {
            return resource.contentLength();
        } catch (Exception ignored) {
            return -1L;
        }
    }
}
