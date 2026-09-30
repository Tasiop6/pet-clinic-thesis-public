package guru.springframework.sfgpetclinic.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.calendar.CalendarScopes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
public class GoogleOAuthService {

    private static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Arrays.asList(
            CalendarScopes.CALENDAR,
            "openid",
            "email",
            "profile"
    );

    private final GoogleAuthorizationCodeFlow flow;
    private final String redirectUri;
    private final HttpTransport httpTransport;
    private final HttpRequestFactory httpRequestFactory;

    public GoogleOAuthService(@Value("${google.oauth.client-id:}") String clientId,
                              @Value("${google.oauth.client-secret:}") String clientSecret,
                              @Value("${google.oauth.redirect-uri:http://localhost:8080/auth/google/callback}") String redirectUri) {
        if (!StringUtils.hasText(clientId) || !StringUtils.hasText(clientSecret)) {
            this.flow = null;
            this.redirectUri = redirectUri;
            this.httpTransport = null;
            this.httpRequestFactory = null;
            return;
        }

        try {
            this.httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            this.httpRequestFactory = httpTransport.createRequestFactory();
            var details = new GoogleClientSecrets.Details();
            details.setClientId(clientId);
            details.setClientSecret(clientSecret);
            GoogleClientSecrets clientSecrets = new GoogleClientSecrets().setWeb(details);

            this.flow = new GoogleAuthorizationCodeFlow.Builder(
                    httpTransport,
                    JSON_FACTORY,
                    clientSecrets,
                    SCOPES)
                    .setAccessType("offline")
                    .setApprovalPrompt("force")
                    .build();
        } catch (GeneralSecurityException | IOException ex) {
            throw new IllegalStateException("Failed to initialise Google OAuth flow", ex);
        }
        this.redirectUri = redirectUri;
    }

    public boolean isConfigured() {
        return flow != null;
    }

    public String buildAuthorizationUrl(String state) {
        if (flow == null) {
            throw new IllegalStateException("Google OAuth flow not configured: set google.oauth.client-id and google.oauth.client-secret");
        }
        return flow.newAuthorizationUrl()
                .setState(state)
                .setRedirectUri(redirectUri)
                .build();
    }

    public GoogleTokenResponse exchangeCode(String code) throws IOException {
        if (flow == null) {
            throw new IllegalStateException("Google OAuth flow not configured: set google.oauth.client-id and google.oauth.client-secret");
        }
        return flow.newTokenRequest(code)
                .setRedirectUri(redirectUri)
                .execute();
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public GoogleIdToken.Payload fetchUserInfo(GoogleTokenResponse tokenResponse) throws IOException {
        if (tokenResponse == null) {
            return null;
        }
        String idTokenString = tokenResponse.getIdToken();
        if (StringUtils.hasText(idTokenString)) {
            return GoogleIdToken.parse(JSON_FACTORY, idTokenString).getPayload();
        }
        if (!StringUtils.hasText(tokenResponse.getAccessToken()) || httpRequestFactory == null) {
            return null;
        }

        HttpRequest request = httpRequestFactory.buildGetRequest(new GenericUrl("https://www.googleapis.com/oauth2/v3/userinfo"));
        request.getHeaders().setAuthorization("Bearer " + tokenResponse.getAccessToken());
        String json = request.execute().parseAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> map = JSON_FACTORY.fromString(json, Map.class);
        if (map == null) {
            return null;
        }
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        Object email = map.get("email");
        if (email instanceof String) {
            payload.setEmail((String) email);
        }
        Object verified = map.get("email_verified");
        if (verified instanceof Boolean) {
            payload.setEmailVerified((Boolean) verified);
        }
        Object name = map.get("name");
        if (name instanceof String) {
            payload.set("name", name);
        }
        return payload;
    }
}
