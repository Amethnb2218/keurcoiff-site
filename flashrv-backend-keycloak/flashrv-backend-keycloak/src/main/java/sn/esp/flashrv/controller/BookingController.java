package sn.esp.flashrv.controller;

import sn.esp.flashrv.api.ApiResponse;
import sn.esp.flashrv.dto.BookingDtos;
import sn.esp.flashrv.service.BookingService;
import sn.esp.flashrv.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
  private final BookingService bookingService;
  private final ProfileService profileService;

  public BookingController(BookingService bookingService, ProfileService profileService){
    this.bookingService = bookingService; this.profileService = profileService;
  }

  @GetMapping("/me")
  public ApiResponse<?> my(@AuthenticationPrincipal Jwt jwt){
    profileService.getOrCreate(jwt.getSubject());
    return ApiResponse.ok(bookingService.myBookings(jwt.getSubject()));
  }

  @PostMapping
  public ApiResponse<?> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody BookingDtos.CreateBookingRequest req){
    profileService.getOrCreate(jwt.getSubject());
    return ApiResponse.ok(bookingService.create(jwt.getSubject(), req));
  }
}
