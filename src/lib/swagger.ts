import swaggerJsdoc from "swagger-jsdoc";
import { z } from "zod";

// Import schemas from your existing schemas file
import {
  EmployeeSchema,
  DepartmentSchema,
  PositionSchema,
  AttendanceSchema,
  LeaveRequestSchema,
  PayrollSchema,
  KpiSchema,
} from "./schemas";

type ZodTypeAny = z.ZodType<unknown>;

// Helper type to access internal Zod properties
type ZodInternal = {
  _def: {
    typeName?: string;
    defaultValue?: unknown | (() => unknown);
    innerType?: ZodTypeAny;
    type?: ZodTypeAny;
    element?: ZodTypeAny;
    values?: unknown[];
    [key: string]: unknown;
  };
};

// Type guard to check if value is a Zod type
const isZodType = (
  value: unknown,
): value is { _def: Record<string, unknown> } => {
  return !!value && typeof value === "object" && "_def" in value;
};

// Helper function to convert Zod schema to OpenAPI schema
interface OpenAPISchema {
  type?: string;
  format?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  oneOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  nullable?: boolean;
  enum?: (string | number | boolean | null)[];
  default?: string | number | boolean | null | object | unknown[];
  description?: string;
  example?: unknown;
}

export function zodToOpenApi(zodSchema: ZodTypeAny): OpenAPISchema {
  if (!isZodType(zodSchema)) {
    return { type: "string" };
  }

  const internal = zodSchema as unknown as ZodInternal;
  const def = internal._def;
  const typeName = def.typeName;

  // Handle objects
  if (
    typeName === "ZodObject" &&
    "shape" in def &&
    typeof def.shape === "function"
  ) {
    const shape = def.shape() as Record<string, unknown>;
    if (shape && typeof shape === "object") {
      const schema: OpenAPISchema = {
        type: "object",
        required: [],
        properties: {},
      };

      for (const [key, value] of Object.entries(shape)) {
        if (isZodType(value)) {
          schema.properties![key] = zodToOpenApi(
            value as unknown as ZodTypeAny,
          );
          const valueDef = value._def as { typeName?: string };
          if (valueDef.typeName !== "ZodOptional") {
            schema.required!.push(key);
          }
        }
      }
      return schema;
    }
  }

  // Handle strings
  if (typeName === "ZodString") {
    return { type: "string" };
  }

  // Handle numbers
  if (typeName === "ZodNumber") {
    return { type: "number" };
  }

  // Handle booleans
  if (typeName === "ZodBoolean") {
    return { type: "boolean" };
  }

  // Handle dates
  if (typeName === "ZodDate") {
    return { type: "string", format: "date-time" };
  }

  // Handle enums
  if (typeName === "ZodEnum" && "values" in def) {
    const enumValues = (def.values || []) as unknown[];
    const validEnumValues = enumValues.filter(
      (value) =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null,
    ) as (string | number | boolean | null)[];
    return { type: "string", enum: validEnumValues };
  }

  // Handle default values
  if ("defaultValue" in def) {
    const innerType = def.innerType as ZodTypeAny | undefined;
    if (innerType) {
      const defaultValue =
        typeof def.defaultValue === "function"
          ? (def.defaultValue as () => unknown)()
          : def.defaultValue;
      const baseSchema = zodToOpenApi(innerType);
      return {
        ...baseSchema,
        ...(defaultValue !== undefined ? { default: defaultValue } : {}),
      };
    }
  }

  // Handle arrays
  if (typeName === "ZodArray" && "type" in def && def.type) {
    return {
      type: "array",
      items: zodToOpenApi(def.type as ZodTypeAny),
    };
  }

  // Handle optional values
  if (typeName === "ZodOptional" && "innerType" in def && def.innerType) {
    return zodToOpenApi(def.innerType as ZodTypeAny);
  }

  return { type: "string" };
}

// Generate schemas from Zod
const employeeSchema = zodToOpenApi(EmployeeSchema);
const departmentSchema = zodToOpenApi(DepartmentSchema);
const positionSchema = zodToOpenApi(PositionSchema);
const attendanceSchema = zodToOpenApi(AttendanceSchema);
const leaveRequestSchema = zodToOpenApi(LeaveRequestSchema);
const payrollSchema = zodToOpenApi(PayrollSchema);
const kpiSchema = zodToOpenApi(KpiSchema);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Employee Management System API",
      version: "1.0.0",
      description: "API documentation for the Employee Management System",
      contact: {
        name: "API Support",
        email: "support@example.com",
        url: "https://example.com/support",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Development server",
      },
      {
        url: "https://api.employee-management.com/v1",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
        },
      },
      schemas: {
        // Base schemas from Zod
        Employee: employeeSchema,
        Department: departmentSchema,
        Position: positionSchema,
        Attendance: attendanceSchema,
        LeaveRequest: leaveRequestSchema,
        Payroll: payrollSchema,
        KPI: kpiSchema,

        // Authentication schemas
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: { type: "string", enum: ["ADMIN", "MANAGER", "EMPLOYEE"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // Common schemas
        Email: {
          type: "string",
          format: "email",
          example: "john.doe@example.com",
          description: "Company email address",
        },
        DateOfBirth: {
          type: "string",
          format: "date",
          example: "1990-01-01",
          description: "Date of birth in YYYY-MM-DD format",
          nullable: true,
        },
        EmploymentStatus: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
          description: "Current employment status",
        },
        // ... other common schemas ...
      },
      responses: {
        UnauthorizedError: {
          description: "Access token is missing or invalid",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Unauthorized",
                error: "No authorization token was found or token is invalid",
              },
            },
          },
        },
        ForbiddenError: {
          description: "Insufficient permissions",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Forbidden",
                error: "You do not have permission to access this resource",
              },
            },
          },
        },
        // ... other common responses ...
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    paths: {
      // Department endpoints
      "/api/department": {
        get: {
          tags: ["Departments"],
          summary: "Get all departments",
          description:
            "Retrieve a list of all departments with optional filtering and pagination",
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
              description: "Page number for pagination",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 10 },
              description: "Number of items per page",
            },
            {
              name: "search",
              in: "query",
              schema: { type: "string" },
              description: "Search term to filter departments by name",
            },
          ],
          responses: {
            200: {
              description: "List of departments",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Department" },
                      },
                      total: { type: "integer" },
                      page: { type: "integer" },
                      limit: { type: "integer" },
                    },
                  },
                },
              },
            },
            500: { $ref: "#/components/responses/ServerError" },
          },
        },
        post: {
          tags: ["Departments"],
          summary: "Create a new department",
          description: "Create a new department with the provided details",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateDepartmentRequest",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Department created successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Department" },
                },
              },
            },
            400: { $ref: "#/components/responses/BadRequest" },
            500: { $ref: "#/components/responses/ServerError" },
          },
        },
        put: {
          tags: ["Departments"],
          summary: "Update a department by ID",
          description: "Update an existing department with the provided ID",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["id"],
                  properties: {
                    id: {
                      type: "integer",
                      description: "ID of the department to update",
                    },
                    name: {
                      type: "string",
                      description: "Name of the department",
                    },
                    description: {
                      type: "string",
                      description: "Description of the department",
                    },
                    managerId: {
                      type: "integer",
                      description: "ID of the department manager",
                    },
                    isActive: {
                      type: "boolean",
                      description: "Whether the department is active",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Department updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Department" },
                },
              },
            },
            400: { $ref: "#/components/responses/BadRequest" },
            404: { $ref: "#/components/responses/NotFound" },
            500: { $ref: "#/components/responses/ServerError" },
          },
        },
      },
      "/api/department/{id}": {
        get: {
          tags: ["Departments"],
          summary: "Get department by ID",
          description: "Retrieve a single department by its ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Department ID",
            },
          ],
          responses: {
            200: {
              description: "Department details",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Department" },
                },
              },
            },
            404: { $ref: "#/components/responses/NotFound" },
            500: { $ref: "#/components/responses/ServerError" },
          },
        },
        patch: {
          tags: ["Departments"],
          summary: "Partially update a department",
          description: "Update one or more fields of a department",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Department ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpdateDepartmentRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Department updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Department" },
                },
              },
            },
            400: { $ref: "#/components/responses/BadRequest" },
            404: { $ref: "#/components/responses/NotFound" },
            500: { $ref: "#/components/responses/ServerError" },
          },
        },
        delete: {
          tags: ["Departments"],
          summary: "Delete a department (soft delete)",
          description:
            "Mark a department as deleted by setting the deletedAt timestamp",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Department ID",
            },
          ],
          responses: {
            200: {
              description: "Department marked as deleted",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          deletedAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
            404: { $ref: "#/components/responses/NotFound" },
            500: { $ref: "#/components/responses/ServerError" },
          },
        },
      },

      // Authentication endpoints
      "/api/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "User login",
          description: "Authenticate user and return JWT token",
          security: [], // No auth required for login
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: {
                      type: "string",
                      format: "email",
                      example: "admin@example.com",
                    },
                    password: {
                      type: "string",
                      format: "password",
                      example: "yourpassword",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful authentication",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      token: {
                        type: "string",
                        description: "JWT access token",
                        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      },
                      user: {
                        $ref: "#/components/schemas/User",
                      },
                    },
                  },
                },
              },
            },
            "401": {
              $ref: "#/components/responses/UnauthorizedError",
            },
          },
        },
      },
      // ... other authentication endpoints ...
    },
  },
  apis: ["./src/app/api/**/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
