import type { ApiResponse } from "@/types/api";
import { API_ERROR_MESSAGES } from "@/types/errors";

export class ClientApiError extends Error {
  code: string;
  fieldErrors?: Record<string, string[]>;
  constructor(code: string, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Thin fetch wrapper matching the { ok, data | error } envelope from src/types/api.ts. */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!body) {
    throw new ClientApiError("INTERNAL_ERROR", API_ERROR_MESSAGES.INTERNAL_ERROR);
  }
  if (!body.ok) {
    throw new ClientApiError(body.error.code, body.error.message, body.error.fieldErrors);
  }
  return body.data;
}
