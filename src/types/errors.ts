export const API_ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "RATE_LIMITED",
  "PAYMENT_FAILED",
  "INTERNAL_ERROR",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  fieldErrors?: Record<string, string[]>;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  static unauthorized(message = "You need to sign in to do that.") {
    return new ApiError("UNAUTHORIZED", message, 401);
  }
  static forbidden(message = "You don't have permission to do that.") {
    return new ApiError("FORBIDDEN", message, 403);
  }
  static notFound(message = "We couldn't find that.") {
    return new ApiError("NOT_FOUND", message, 404);
  }
  static validation(message: string, fieldErrors?: Record<string, string[]>) {
    return new ApiError("VALIDATION_ERROR", message, 400, fieldErrors);
  }
  static conflict(message: string) {
    return new ApiError("CONFLICT", message, 409);
  }
  static rateLimited(message = "Too many requests — please slow down.") {
    return new ApiError("RATE_LIMITED", message, 429);
  }
  static paymentFailed(message = "Payment could not be completed.") {
    return new ApiError("PAYMENT_FAILED", message, 402);
  }
  static internal(message = "Something went wrong on our end.") {
    return new ApiError("INTERNAL_ERROR", message, 500);
  }
}

/** User-facing copy for each code — never show raw backend error text (spec §38). */
export const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have access to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
  CONFLICT: "That action can't be completed right now — please refresh and retry.",
  RATE_LIMITED: "You're going a bit fast — please wait a moment and try again.",
  PAYMENT_FAILED: "Your payment couldn't be processed. No charge was made.",
  INTERNAL_ERROR: "Something went wrong on our end. Please try again shortly.",
};
