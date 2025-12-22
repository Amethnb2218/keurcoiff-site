package sn.esp.flashrv.controller;

import sn.esp.flashrv.api.ApiResponse;
import sn.esp.flashrv.dto.ProfileDtos;
import sn.esp.flashrv.service.ProfileService;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class MeController {
  private final ProfileService profileService;
  public MeController(ProfileService profileService){ this.profileService = profileService; }

  @GetMapping("/me")
  public ApiResponse<ProfileDtos.MeResponse> me(@AuthenticationPrincipal Jwt jwt){
    var p = profileService.getOrCreate(jwt.getSubject());
    return ApiResponse.ok(new ProfileDtos.MeResponse(p.getId(), p.getKeycloakId(), p.getRole().name(), p.getCreatedAt()));
  }
}
