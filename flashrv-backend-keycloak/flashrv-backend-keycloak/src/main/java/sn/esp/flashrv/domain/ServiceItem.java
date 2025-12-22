package sn.esp.flashrv.domain;

import jakarta.persistence.*;

@Entity
@Table(name="services")
public class ServiceItem {
  @Id @GeneratedValue(strategy=GenerationType.UUID)
  private String id;

  @ManyToOne(optional=false, fetch=FetchType.LAZY)
  private Salon salon;

  @Column(nullable=false)
  private String name;

  @Column(nullable=false)
  private Integer price;

  private Integer durationMinutes;

  public ServiceItem() {}
  public ServiceItem(Salon salon, String name, Integer price, Integer durationMinutes){
    this.salon=salon; this.name=name; this.price=price; this.durationMinutes=durationMinutes;
  }

  public String getId(){ return id; }
  public Salon getSalon(){ return salon; }
  public String getName(){ return name; }
  public Integer getPrice(){ return price; }
  public Integer getDurationMinutes(){ return durationMinutes; }
}
