package sn.esp.flashrv.dto;

import java.time.Instant;

public class ProfileDtos {
  public record MeResponse(String id, String keycloakId, String role, Instant createdAt) {}
}
