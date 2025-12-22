package sn.esp.flashrv.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="user_profiles", indexes = @Index(name="idx_kc", columnList="keycloakId", unique=true))
public class UserProfile {
  @Id @GeneratedValue(strategy=GenerationType.UUID)
  private String id;

  @Column(nullable=false, unique=true)
  private String keycloakId;

  @Enumerated(EnumType.STRING)
  @Column(nullable=false)
  private Role role = Role.client;

  @Column(nullable=false)
  private Instant createdAt = Instant.now();

  public UserProfile() {}
  public UserProfile(String keycloakId, Role role) { this.keycloakId = keycloakId; this.role = role; }

  public String getId(){ return id; }
  public String getKeycloakId(){ return keycloakId; }
  public Role getRole(){ return role; }
  public Instant getCreatedAt(){ return createdAt; }
}
