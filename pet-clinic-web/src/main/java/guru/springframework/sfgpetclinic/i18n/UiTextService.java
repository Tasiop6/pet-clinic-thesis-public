package guru.springframework.sfgpetclinic.i18n;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class UiTextService {

    private final Map<String, Map<String, String>> translations;
    private final String defaultLang;

    public UiTextService(ResourceLoader resourceLoader, ObjectMapper objectMapper) {
        try {
            Resource resource = resourceLoader.getResource("classpath:ui-texts.json");
            try (InputStream inputStream = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(inputStream);
                this.defaultLang = root.path("defaultLang").asText("el");
                JsonNode translationsNode = root.path("translations");
                Map<String, Map<String, String>> map = new HashMap<>();
                translationsNode.fields().forEachRemaining(entry -> {
                    Map<String, String> valueMap = objectMapper.convertValue(
                            entry.getValue(), new TypeReference<Map<String, String>>() {
                            });
                    map.put(entry.getKey(), Collections.unmodifiableMap(valueMap));
                });
                this.translations = Collections.unmodifiableMap(map);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to load UI texts", ex);
        }
    }

    public String getDefaultLang() {
        return defaultLang;
    }

    public Map<String, String> getTexts(Locale locale) {
        String lang = locale != null ? locale.getLanguage() : defaultLang;
        Map<String, String> langMap = translations.get(lang);
        if (langMap == null) {
            langMap = translations.get(defaultLang);
        }
        return langMap != null ? langMap : Collections.emptyMap();
    }

    public String text(String key, Locale locale) {
        Map<String, String> texts = getTexts(locale);
        return texts.getOrDefault(key, key);
    }
}
