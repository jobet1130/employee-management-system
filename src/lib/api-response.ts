import { NextResponse } from "next/server";

type ApiResponseOptions<T> = {
  data?: T;
  message?: string;
  status?: number;
  meta?: Record<string, any>;
};

export function createApiResponse<T = any>({
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

export function createErrorResponse(
  message: string,
  status: number = 500,
  errors?: any[],
) {
  return createApiResponse({
    message,
    status,
    data: errors ? { errors } : undefined,
  });
}

// Common error responses
export const errorResponses = {
  badRequest: (message: string = "Bad Request") =>
    createErrorResponse(message, 400),
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
