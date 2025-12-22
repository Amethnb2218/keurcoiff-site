package sn.esp.flashrv.controller;

import sn.esp.flashrv.api.ApiResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class HealthController {
  @GetMapping("/health")
  public ApiResponse<?> health(){ return ApiResponse.ok(java.util.Map.of("status","UP")); }
}
