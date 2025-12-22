package sn.esp.flashrv.config;

import sn.esp.flashrv.domain.Salon;
import sn.esp.flashrv.domain.ServiceItem;
import sn.esp.flashrv.repo.SalonRepository;
import sn.esp.flashrv.repo.ServiceRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {
  private final SalonRepository salons;
  private final ServiceRepository services;

  public DataSeeder(SalonRepository salons, ServiceRepository services){
    this.salons = salons; this.services = services;
  }

  @Override
  public void run(String... args){
    if (salons.count() > 0) return;

    var s1 = salons.save(new Salon("Salon Awa Beauty", "Plateau, Dakar", 4.8));
    var s2 = salons.save(new Salon("Chez Ibra - Coiffeur Homme", "Ouakam, Dakar", 4.9));
    var s3 = salons.save(new Salon("Keur Coiff Premium", "Almadies, Dakar", 4.7));

    services.save(new ServiceItem(s1, "Tresses", 8000, 90));
    services.save(new ServiceItem(s1, "Nattes", 6000, 60));
    services.save(new ServiceItem(s2, "Coupe", 2500, 25));
    services.save(new ServiceItem(s3, "Brushing", 5000, 45));
  }
}
