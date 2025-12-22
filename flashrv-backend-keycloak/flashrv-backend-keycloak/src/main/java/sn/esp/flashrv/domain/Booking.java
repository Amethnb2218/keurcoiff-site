package sn.esp.flashrv.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="bookings")
public class Booking {
  @Id @GeneratedValue(strategy=GenerationType.UUID)
  private String id;

  @Column(nullable=false)
  private String keycloakUserId;

  @ManyToOne(optional=false, fetch=FetchType.LAZY)
  private Salon salon;

  @ManyToOne(optional=false, fetch=FetchType.LAZY)
  private ServiceItem service;

  @Column(nullable=false)
  private Instant datetime;

  @Enumerated(EnumType.STRING)
  @Column(nullable=false)
  private BookingStatus status = BookingStatus.pending;

  @Column(nullable=false)
  private Integer total;

  public Booking() {}
  public Booking(String keycloakUserId, Salon salon, ServiceItem service, Instant datetime, BookingStatus status, Integer total){
    this.keycloakUserId=keycloakUserId; this.salon=salon; this.service=service; this.datetime=datetime; this.status=status; this.total=total;
  }

  public String getId(){ return id; }
  public String getKeycloakUserId(){ return keycloakUserId; }
  public Salon getSalon(){ return salon; }
  public ServiceItem getService(){ return service; }
  public Instant getDatetime(){ return datetime; }
  public BookingStatus getStatus(){ return status; }
  public Integer getTotal(){ return total; }
}
