import { NextResponse } from "next/server";

type ApiResponseOptions<T = unknown> = {
  data?: T;
  message?: string;
  status?: number;
  meta?: Record<string, unknown>;
};

export function createApiResponse<T = unknown>({
  data,
  message = "Success",
  status = 200,
  meta,
}: ApiResponseOptions<T>) {
  return NextResponse.json(
    {
      success: status >= 200 && status < 300,
      message,
      data,
      meta,
    },
    { status },
  );
}

type ErrorData =
  | Record<string, string | string[]>
  | string[]
  | Record<string, unknown>;

export function createErrorResponse(
  message: string,
  status: number = 500,
  errors?: ErrorData,
) {
  return createApiResponse<{ errors?: ErrorData }>({
    message,
    status,
    data: errors ? { errors } : undefined,
  });
}

// Common error responses
export const errorResponses = {
  badRequest: (
    message: string | ErrorData = "Bad Request",
    data?: ErrorData,
  ) => {
    if (typeof message === "object") {
      return createErrorResponse("Bad Request", 400, message);
    }
    return createErrorResponse(message, 400, data);
  },
  unauthorized: (message: string = "Unauthorized") =>
    createErrorResponse(message, 401),
  forbidden: (message: string = "Forbidden") =>
    createErrorResponse(message, 403),
  notFound: (message: string = "Not Found") =>
    createErrorResponse(message, 404),
  conflict: (message: string = "Conflict") => createErrorResponse(message, 409),
  serverError: (message: string = "Internal Server Error") =>
    createErrorResponse(message, 500),
  notImplemented: (message: string = "Not Implemented") =>
    createErrorResponse(message, 501),
  serviceUnavailable: (message: string = "Service Unavailable") =>
    createErrorResponse(message, 503),
};
