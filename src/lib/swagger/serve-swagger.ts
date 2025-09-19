import { NextRequest, NextResponse } from "next/server";
import swaggerUi from "swagger-ui-express";
import { createApiResponse } from "@/lib/api-response";
import swaggerSpec from "../swagger";

// Custom CSS to make the Swagger UI look better with Next.js
const customCss = `
  .swagger-ui .topbar { display: none }
  .swagger-ui .info .title small { background: #000 !important; }
  .swagger-ui .info .title { font-size: 24px; margin: 0; }
  .swagger-ui .info { margin: 20px 0; }
`;

const options = {
  customCss,
  customSiteTitle: "Employee Management System API",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    docExpansion: "list",
    filter: true,
    showRequestDuration: true,
  },
};

export async function serveSwaggerUI(req: NextRequest) {
  // Create a mock response object that works with swagger-ui-express
  const mockRes: any = {
    setHeader: () => {},
    send: (content: string) => {
      return NextResponse.html(content);
    },
  };

  // Create a mock next() function
  const mockNext = () => {
    return NextResponse.next();
  };

  // Get the HTML content from swagger-ui-express
  const handler = swaggerUi.setup(swaggerSpec, options as any);

  // @ts-ignore - The handler expects Express request/response objects
  const result = await handler(
    { method: "GET", url: "/api/docs", headers: req.headers },
    mockRes,
    mockNext,
  );

  return result;
}

// Helper function to serve the Swagger JSON
export async function getSwaggerJson() {
  return createApiResponse(swaggerSpec);
}
