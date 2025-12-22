package sn.esp.flashrv.repo;

import sn.esp.flashrv.domain.Booking;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking,String> {
  List<Booking> findByKeycloakUserIdOrderByDatetimeDesc(String keycloakUserId);
}
