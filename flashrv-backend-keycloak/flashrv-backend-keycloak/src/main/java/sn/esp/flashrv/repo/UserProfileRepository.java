package sn.esp.flashrv.repo;

import sn.esp.flashrv.domain.UserProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, String> {
  Optional<UserProfile> findByKeycloakId(String keycloakId);
}
