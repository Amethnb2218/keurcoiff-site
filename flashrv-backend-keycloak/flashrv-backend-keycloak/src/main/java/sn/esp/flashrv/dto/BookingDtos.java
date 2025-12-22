package sn.esp.flashrv.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public class BookingDtos {
  public record CreateBookingRequest(@NotBlank String salonId, @NotBlank String serviceId, @NotNull Instant datetime) {}
  public record BookingResponse(String id, String salonName, String serviceName, Instant datetime, String status, Integer total) {}
}
