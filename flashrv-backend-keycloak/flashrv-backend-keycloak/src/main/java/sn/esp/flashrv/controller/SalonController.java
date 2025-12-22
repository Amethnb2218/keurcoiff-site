package sn.esp.flashrv.controller;

import sn.esp.flashrv.api.ApiResponse;
import sn.esp.flashrv.domain.Salon;
import sn.esp.flashrv.repo.ServiceRepository;
import sn.esp.flashrv.repo.SalonRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salons")
public class SalonController {
  private final SalonRepository salons;
  private final ServiceRepository services;

  public SalonController(SalonRepository salons, ServiceRepository services){
    this.salons = salons; this.services = services;
  }

  @GetMapping
  public ApiResponse<List<Salon>> list(){ return ApiResponse.ok(salons.findAll()); }

  @GetMapping("/{id}")
  public ApiResponse<Salon> get(@PathVariable String id){ return ApiResponse.ok(salons.findById(id).orElseThrow()); }

  @GetMapping("/{id}/services")
  public ApiResponse<?> services(@PathVariable String id){ return ApiResponse.ok(services.findBySalonId(id)); }
}
