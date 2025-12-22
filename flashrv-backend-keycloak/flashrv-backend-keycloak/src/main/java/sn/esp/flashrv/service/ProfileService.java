package sn.esp.flashrv.service;

import sn.esp.flashrv.domain.Role;
import sn.esp.flashrv.domain.UserProfile;
import sn.esp.flashrv.repo.UserProfileRepository;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {
  private final UserProfileRepository profiles;
  public ProfileService(UserProfileRepository profiles){ this.profiles = profiles; }

  public UserProfile getOrCreate(String keycloakId){
    return profiles.findByKeycloakId(keycloakId).orElseGet(() -> profiles.save(new UserProfile(keycloakId, Role.client)));
  }
}
