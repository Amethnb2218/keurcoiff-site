package sn.esp.flashrv.domain;

import jakarta.persistence.*;

@Entity
@Table(name="salons")
public class Salon {
  @Id @GeneratedValue(strategy=GenerationType.UUID)
  private String id;

  @Column(nullable=false)
  private String name;

  private String address;
  private Double rating;

  public Salon() {}
  public Salon(String name, String address, Double rating) { this.name=name; this.address=address; this.rating=rating; }

  public String getId(){ return id; }
  public String getName(){ return name; }
  public String getAddress(){ return address; }
  public Double getRating(){ return rating; }
}
