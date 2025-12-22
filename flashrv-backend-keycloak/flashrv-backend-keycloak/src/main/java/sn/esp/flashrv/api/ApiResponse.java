package sn.esp.flashrv.api;

public record ApiResponse<T>(boolean success, String message, T data) {
  public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(true, null, data); }
  public static <T> ApiResponse<T> fail(String message) { return new ApiResponse<>(false, message, null); }
}
