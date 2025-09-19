import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Test the database connection with a simple query
    const employeeCount = await prisma.employee.count();

    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      data: {
        employeeCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Database connection error:", error);

    // Check for common Prisma error types
    if (error instanceof Error) {
      return NextResponse.json(
        {
          status: "error",
          message: "Database connection failed",
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Unable to connect to the database",
          details:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        { status: 500 },
      );
    }

    // Fallback for unknown error types
    return NextResponse.json(
      {
        status: "error",
        message: "An unknown error occurred",
      },
      { status: 500 },
    );
  }
}

// Optionally, you can add other HTTP methods
export const dynamic = "force-dynamic"; // Ensure we get fresh data on each request
