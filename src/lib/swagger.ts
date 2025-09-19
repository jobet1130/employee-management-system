import swaggerJsdoc from "swagger-jsdoc";

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
        Employee: {
          type: "object",
          required: [
            "firstName",
            "lastName",
            "gender",
            "dateOfHire",
            "contractType",
            "shiftType",
          ],
          properties: {
            id: {
              type: "string",
              example: "EMP-001",
              description: "Company assigned employee ID",
            },
            name: {
              type: "string",
              example: "John Doe",
              description: "Full name of the employee",
            },
            email: {
              type: "string",
              format: "email",
              example: "john.doe@example.com",
              description: "Company email address",
            },
            position: {
              type: "string",
              example: "Software Engineer",
              description: "Job position title",
              nullable: true,
            },
            department: {
              type: "string",
              example: "Engineering",
              description: "Department name",
              nullable: true,
            },
            hireDate: {
              type: "string",
              format: "date",
              example: "2023-01-15",
              description: "Date when the employee was hired",
            },
            salary: {
              type: "number",
              format: "float",
              example: 85000,
              description:
                "Annual salary (placeholder, should be fetched from payroll)",
              default: 0,
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE"],
              example: "ACTIVE",
              description: "Current employment status",
            },
            phoneNumber: {
              type: "string",
              example: "+1234567890",
              description: "Contact number",
              nullable: true,
            },
            address: {
              type: "string",
              example: "123 Main St, City, Country",
              description: "Full formatted address",
              nullable: true,
            },
            dateOfBirth: {
              type: "string",
              format: "date",
              example: "1990-01-01",
              description: "Date of birth in YYYY-MM-DD format",
              nullable: true,
            },
            gender: {
              type: "string",
              enum: ["MALE", "FEMALE", "OTHER"],
              example: "MALE",
              description: "Gender of the employee",
            },
            contractType: {
              type: "string",
              enum: [
                "FULL_TIME",
                "PART_TIME",
                "CONTRACT",
                "INTERNSHIP",
                "TEMPORARY",
              ],
              example: "FULL_TIME",
              description: "Type of employment contract",
            },
            shiftType: {
              type: "string",
              enum: ["MORNING", "AFTERNOON", "NIGHT", "ROTATING", "FLEXIBLE"],
              example: "MORNING",
              description: "Work shift type",
            },
            manager: {
              type: "string",
              example: "Jane Smith",
              description: "Name of the direct manager",
              nullable: true,
            },
            emergencyContact: {
              type: "string",
              example: "John Doe Sr., +1987654321",
              description: "Emergency contact information",
              nullable: true,
            },
            isActive: {
              type: "boolean",
              example: true,
              description: "Whether the employee is currently active",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the record was created",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the record was last updated",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            statusCode: { type: "integer" },
            message: { type: "string" },
            error: { type: "string" },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Access token is missing or invalid",
        },
        BadRequest: {
          description: "Bad request. Invalid input data",
        },
        NotFound: {
          description: "The requested resource was not found",
        },
        InternalServerError: {
          description: "Internal server error",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs
  apis: ["./src/app/api/**/*.ts", "./src/app/api/**/*.tsx"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
