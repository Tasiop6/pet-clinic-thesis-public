package guru.springframework.sfgpetclinic.i18n;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@ControllerAdvice
public class UiTextAdvice {

    private final UiTextService uiTextService;
    private final ObjectMapper objectMapper;

    public UiTextAdvice(UiTextService uiTextService, ObjectMapper objectMapper) {
        this.uiTextService = uiTextService;
        this.objectMapper = objectMapper;
    }

    @ModelAttribute("uiText")
    public Map<String, String> uiText(Locale locale) {
        Locale effective = locale != null ? locale : Locale.forLanguageTag(uiTextService.getDefaultLang());
        return uiTextService.getTexts(effective);
    }

    @ModelAttribute("uiLang")
    public String uiLang(Locale locale) {
        Locale effective = locale != null ? locale : Locale.forLanguageTag(uiTextService.getDefaultLang());
        return effective.getLanguage();
    }

    @ModelAttribute("uiTextJson")
    public String uiTextJson(Locale locale) throws JsonProcessingException {
        Map<String, String> map = uiText(locale);
        return objectMapper.writeValueAsString(map);
    }

    @ModelAttribute("languageOptions")
    public List<String> languageOptions() {
        return List.of("el", "en", "de", "fr");
    }

    @ModelAttribute("currentPath")
    public String currentPath(HttpServletRequest request) {
        if (request == null || request.getRequestURI() == null) {
            return "/";
        }
        String uri = request.getRequestURI();
        return uri.isBlank() ? "/" : uri;
    }
}
