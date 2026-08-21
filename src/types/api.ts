import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, API_ERROR_MESSAGES, type ApiErrorCode } from "@/types/errors";

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: ApiErrorCode; message: string; fieldErrors?: Record<string, string[]> };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function apiOk<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, typeof init === "number" ? { status: init } : init);
}

export function apiError(err: unknown): NextResponse<ApiFailure> {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { ok: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } },
      { status: err.status }
    );
  }
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_root";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return NextResponse.json(
      {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: API_ERROR_MESSAGES.VALIDATION_ERROR, fieldErrors },
      },
      { status: 400 }
    );
  }
  console.error("[api] unhandled error:", err);
  return NextResponse.json(
    { ok: false, error: { code: "INTERNAL_ERROR", message: API_ERROR_MESSAGES.INTERNAL_ERROR } },
    { status: 500 }
  );
}

/** Wrap a route handler body so every route gets consistent error shaping for free. */
export function withApiHandler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (err) {
      return apiError(err);
    }
  };
}
