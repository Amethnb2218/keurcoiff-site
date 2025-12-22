package sn.esp.flashrv.service;

import sn.esp.flashrv.domain.*;
import sn.esp.flashrv.dto.BookingDtos;
import sn.esp.flashrv.repo.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookingService {
  private final BookingRepository bookings;
  private final SalonRepository salons;
  private final ServiceRepository services;

  public BookingService(BookingRepository bookings, SalonRepository salons, ServiceRepository services){
    this.bookings = bookings; this.salons = salons; this.services = services;
  }

  public BookingDtos.BookingResponse create(String keycloakUserId, BookingDtos.CreateBookingRequest req){
    var salon = salons.findById(req.salonId()).orElseThrow();
    var service = services.findById(req.serviceId()).orElseThrow();
    var b = new Booking(keycloakUserId, salon, service, req.datetime(), BookingStatus.pending, service.getPrice());
    bookings.save(b);
    return toDto(b);
  }

  public List<BookingDtos.BookingResponse> myBookings(String keycloakUserId){
    return bookings.findByKeycloakUserIdOrderByDatetimeDesc(keycloakUserId).stream().map(this::toDto).toList();
  }

  private BookingDtos.BookingResponse toDto(Booking b){
    return new BookingDtos.BookingResponse(
      b.getId(),
      b.getSalon().getName(),
      b.getService().getName(),
      b.getDatetime(),
      b.getStatus().name(),
      b.getTotal()
    );
  }
}
