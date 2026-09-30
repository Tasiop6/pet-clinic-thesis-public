package guru.springframework.sfgpetclinic.services;

import guru.springframework.sfgpetclinic.i18n.UiTextService;
import guru.springframework.sfgpetclinic.model.PetType;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class PetTypeLocalizationService {

    private final UiTextService uiTextService;

    public PetTypeLocalizationService(UiTextService uiTextService) {
        this.uiTextService = uiTextService;
    }

    public List<LocalizedPetType> localize(Collection<PetType> types) {
        Locale locale = LocaleContextHolder.getLocale();
        Locale effectiveLocale = (locale != null) ? locale : Locale.getDefault();

        return types == null ? List.of() : types.stream()
            .filter(Objects::nonNull)
            .map(type -> mapType(type, effectiveLocale))
            .sorted(Comparator.comparing(LocalizedPetType::displayName))
            .collect(Collectors.toList());
    }


    private LocalizedPetType mapType(PetType type, Locale locale) {
        String code = normalize(type.getName());
        String name = resolve("pet.type.%s.name".formatted(code), locale, type.getName());
        String description = resolve("pet.type.%s.description".formatted(code), locale, null);
        String icon = resolve("pet.type.%s.icon".formatted(code), locale, "🐾");
        return new LocalizedPetType(type.getId(), code, name, description, icon);
    }

    private String resolve(String key, Locale locale, String fallback) {
        String value = uiTextService.text(key, locale);
        if (value == null || value.equals(key)) {
            return fallback != null ? fallback : "";
        }
        return value;
    }

    private String normalize(String value) {
        if (value == null) {
            return "pet";
        }
        return value.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-");
    }

    public record LocalizedPetType(Long id, String code, String displayName, String description, String icon) {
    }
}
