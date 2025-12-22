package sn.esp.flashrv.api;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ApiResponse<?> validation(MethodArgumentNotValidException ex) {
    String msg = ex.getBindingResult().getFieldErrors().stream()
      .findFirst().map(e -> e.getField() + ": " + e.getDefaultMessage()).orElse("Validation error");
    return ApiResponse.fail(msg);
  }

  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public ApiResponse<?> generic(Exception ex) {
    return ApiResponse.fail("Erreur serveur: " + ex.getMessage());
  }
}
