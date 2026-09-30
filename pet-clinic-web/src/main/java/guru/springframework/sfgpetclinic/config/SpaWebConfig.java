package guru.springframework.sfgpetclinic.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/{spring:(?!api|auth|uploads|resources|static|pets)[^.]*}")
                .setViewName("forward:/index.html");
        registry.addViewController("/**/{spring:(?!api|auth|uploads|resources|static|pets)[^.]*}")
                .setViewName("forward:/index.html");
    }
}
