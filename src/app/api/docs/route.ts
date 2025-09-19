import { NextResponse } from "next/server";
import swaggerSpec from "@/lib/swagger";

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

export async function GET() {
  try {
    // Create a simple HTML page with Swagger UI
    const swaggerUiHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${options.customSiteTitle}</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
        <style>${options.customCss}</style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
        <script>
          window.onload = function() {
            window.ui = SwaggerUIBundle({
              spec: ${JSON.stringify(swaggerSpec)},
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.SwaggerUIStandalonePreset
              ],
              layout: "BaseLayout",
              docExpansion: "${options.swaggerOptions.docExpansion}",
              filter: ${options.swaggerOptions.filter},
              showRequestDuration: ${options.swaggerOptions.showRequestDuration}
            });
          };
        </script>
      </body>
      </html>
    `;

    return new NextResponse(swaggerUiHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error serving Swagger UI:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Failed to load Swagger UI",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

export const dynamic = "force-dynamic";
