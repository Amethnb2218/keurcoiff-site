package sn.esp.flashrv.repo;

import sn.esp.flashrv.domain.ServiceItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceRepository extends JpaRepository<ServiceItem,String> {
  List<ServiceItem> findBySalonId(String salonId);
}
