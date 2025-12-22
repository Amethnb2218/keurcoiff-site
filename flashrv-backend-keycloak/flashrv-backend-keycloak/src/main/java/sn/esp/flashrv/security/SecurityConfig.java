package sn.esp.flashrv.security;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http, CorsConfigurationSource cors) throws Exception {
    http.csrf(csrf -> csrf.disable());
    http.cors(c -> c.configurationSource(cors));

    http.authorizeHttpRequests(auth -> auth
      .requestMatchers("/api/health").permitAll()
      .requestMatchers(HttpMethod.GET, "/api/salons/**").permitAll()
      .requestMatchers(HttpMethod.GET, "/api/services/**").permitAll()
      .anyRequest().authenticated()
    );

    http.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter())));
    return http.build();
  }

  private JwtAuthenticationConverter jwtAuthConverter() {
    var conv = new JwtAuthenticationConverter();
    conv.setJwtGrantedAuthoritiesConverter(this::extractAuthorities);
    return conv;
  }

  private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
    Map<String, Object> realmAccess = jwt.getClaim("realm_access");
    if (realmAccess == null) return List.of();
    Object rolesObj = realmAccess.get("roles");
    if (!(rolesObj instanceof Collection<?> roles)) return List.of();

    List<GrantedAuthority> out = new ArrayList<>();
    for (Object r : roles) {
      String role = String.valueOf(r).toUpperCase(Locale.ROOT);
      out.add(new SimpleGrantedAuthority("ROLE_" + role));
    }
    return out;
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource(@Value("${flashrv.cors.allowedOrigins}") String origins) {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
    cfg.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
    cfg.setAllowedHeaders(List.of("*"));
    cfg.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cfg);
    return source;
  }
}
