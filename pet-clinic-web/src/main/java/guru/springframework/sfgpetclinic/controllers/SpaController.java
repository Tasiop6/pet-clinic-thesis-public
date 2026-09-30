package guru.springframework.sfgpetclinic.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

    @GetMapping(value = {
            "/login",
            "/register",
            "/verify-email",
            "/services",
            "/faq",
            "/dashboard/**",
            "/owners/**",
            "/vets/**",
            "/admin/**",
            "/profile/**",
            "/appointments/**"
    })
    public String redirect() {
        return "forward:/index.html";
    }
}
