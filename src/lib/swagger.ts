import swaggerJsdoc from "swagger-jsdoc";
import { z } from "zod";

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
  example?:
    | string
    | number
    | boolean
    | null
    | object
    | unknown[]
    | { [key: string]: unknown };
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
      const schema: Required<
        Pick<OpenAPISchema, "type" | "required" | "properties">
      > &
        OpenAPISchema = {
        type: "object",
        required: [],
        properties: {},
      };

      for (const [key, value] of Object.entries(shape)) {
        if (isZodType(value)) {
          schema.properties[key] = zodToOpenApi(value as unknown as ZodTypeAny);
          const valueDef = value._def as { typeName?: string };
          if (valueDef.typeName === "ZodOptional") {
            schema.required.push(key);
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
    // Ensure all enum values are valid (string, number, boolean, or null)
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
      } as OpenAPISchema;
    }
  }

  // Handle arrays
  if (typeName === "ZodArray" && "type" in def && def.type) {
    return {
      type: "array",
      items: zodToOpenApi(def.type as ZodTypeAny),
    } as OpenAPISchema;
  }

  // Handle optional values
  if (typeName === "ZodOptional" && "innerType" in def && def.innerType) {
    return zodToOpenApi(def.innerType as ZodTypeAny);
  }

  // If we get here, return a default schema
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
        PhoneNumber: {
          type: "string",
          example: "+1234567890",
          description: "Contact number",
          nullable: true,
        },
        Address: {
          type: "string",
          example: "123 Main St, City, Country",
          description: "Full address",
          nullable: true,
        },
        Gender: {
          type: "string",
          enum: ["MALE", "FEMALE", "OTHER"],
          example: "MALE",
          description: "Gender of the employee",
        },
        ContractType: {
          type: "string",
          enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"],
          example: "FULL_TIME",
          description: "Type of employment contract",
        },

        // Response schemas
        EmployeeResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { $ref: "#/components/schemas/Employee" },
            message: { type: "string" },
          },
        },
        EmployeeListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Employee" },
            },
            meta: {
              type: "object",
              properties: {
                total: { type: "integer" },
                page: { type: "integer" },
                limit: { type: "integer" },
                totalPages: { type: "integer" },
              },
            },
            message: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message" },
            error: { type: "string", example: "Detailed error message" },
          },
        },

        // Filter parameter schemas
        PaginationParams: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            sortBy: { type: "string", example: "createdAt" },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              default: "desc",
            },
          },
        },
        EmployeeFilterParams: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
            },
            departmentId: { type: "string" },
            positionId: { type: "string" },
            contractType: { type: "string" },
            search: { type: "string", description: "Search by name or email" },
          },
        },
        AttendanceFilterParams: {
          type: "object",
          properties: {
            employeeId: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            status: {
              type: "string",
              enum: ["PRESENT", "ABSENT", "LATE", "HALF_DAY"],
            },
          },
        },
        LeaveRequestFilterParams: {
          type: "object",
          properties: {
            employeeId: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            status: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED"],
            },
            type: { type: "string" },
          },
        },
        PayrollFilterParams: {
          type: "object",
          properties: {
            employeeId: { type: "string" },
            month: { type: "integer", minimum: 1, maximum: 12 },
            year: { type: "integer", minimum: 2000, maximum: 2100 },
            status: { type: "string", enum: ["PENDING", "PAID", "CANCELLED"] },
          },
        },
        KPIFilterParams: {
          type: "object",
          properties: {
            employeeId: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            metric: { type: "string" },
          },
        },
      },
      parameters: {
        employeeId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Employee ID",
        },
        departmentId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Department ID",
        },
        positionId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Position ID",
        },
        attendanceId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Attendance record ID",
        },
        leaveRequestId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Leave request ID",
        },
        payrollId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Payroll record ID",
        },
        kpiId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "KPI record ID",
        },
      },
      requestBodies: {
        EmployeeRequest: {
          description: "Employee object that needs to be added or updated",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Employee",
              },
            },
          },
        },
        DepartmentRequest: {
          description: "Department object that needs to be added or updated",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Department",
              },
            },
          },
        },
        PositionRequest: {
          description: "Position object that needs to be added or updated",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Position",
              },
            },
          },
        },
        AttendanceRequest: {
          description: "Attendance record that needs to be added or updated",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Attendance",
              },
            },
          },
        },
        LeaveRequest: {
          description: "Leave request that needs to be submitted or updated",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LeaveRequest",
              },
            },
          },
        },
        PayrollRequest: {
          description: "Payroll record that needs to be added or updated",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Payroll",
              },
            },
          },
        },
        KPIRequest: {
          description: "KPI record that needs to be added or updated",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/KPI",
              },
            },
          },
        },
        LeaveStatusUpdate: {
          description: "Leave request status update",
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["APPROVED", "REJECTED", "CANCELLED"],
                  },
                  comment: {
                    type: "string",
                    description: "Optional comment for the status update",
                  },
                },
              },
            },
          },
        },
        BulkAttendance: {
          description: "Bulk attendance records",
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/Attendance",
                },
              },
            },
          },
        },
        GeneratePayroll: {
          description: "Parameters for generating payroll",
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["month", "year"],
                properties: {
                  month: {
                    type: "integer",
                    minimum: 1,
                    maximum: 12,
                    description: "Month (1-12)",
                  },
                  year: {
                    type: "integer",
                    minimum: 2000,
                    maximum: 2100,
                    description: "Year (e.g., 2023)",
                  },
                  employeeIds: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    description:
                      "List of employee IDs to generate payroll for. If not provided, generates for all active employees.",
                  },
                  includeBonus: {
                    type: "boolean",
                    default: false,
                    description:
                      "Whether to include bonus in payroll calculation",
                  },
                  includeDeductions: {
                    type: "boolean",
                    default: true,
                    description:
                      "Whether to include deductions in payroll calculation",
                  },
                },
              },
            },
          },
        },
        KPIUpdate: {
          description: "KPI performance update",
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["achieved"],
                properties: {
                  achieved: {
                    type: "number",
                    description: "Achieved value for the KPI",
                  },
                  comments: {
                    type: "string",
                    description: "Optional comments about the KPI performance",
                  },
                },
              },
            },
          },
        },
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
                error: "No authorization token was found",
              },
            },
          },
        },
        BadRequest: {
          description: "Bad request. Invalid input data",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Validation error",
                error: "Invalid input data",
              },
            },
          },
        },
        NotFound: {
          description: "The requested resource was not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Not found",
                error: "Resource not found",
              },
            },
          },
        },
        InternalServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Internal server error",
                error: "Something went wrong on our end",
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/app/api/**/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
