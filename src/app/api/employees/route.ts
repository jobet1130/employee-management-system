import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface WhereClause extends Prisma.EmployeeWhereInput {
  deletedAt: Date | null;
  isActive?: boolean;
}

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get all employees
 *     description: Returns a paginated list of all employees with their related data
 *     tags: [Employees]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page (max 100)
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive employees in the results
 *     responses:
 *       200:
 *         description: Successfully retrieved employees
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeListResponse'
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    const skip = (page - 1) * limit;

    const whereClause: WhereClause = {
      deletedAt: null, // Only non-deleted employees by default
    };

    if (!includeInactive) {
      whereClause.isActive = true; // Only active employees if includeInactive is false
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              email: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          position: {
            select: {
              id: true,
              title: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.employee.count({
        where: whereClause,
      }),
    ]);

    return createApiResponse({
      data: employees,
      message: "Employees retrieved successfully",
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return errorResponses.serverError("Failed to fetch employees");
  }
}

/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create a new employee
 *     description: Create a new employee with the provided data
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployeeRequest'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeResponse'
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Employee with this email already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const employeeData = await req.json();

    // Check if employee with this email already exists
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        user: {
          email: employeeData.email,
        },
        deletedAt: null,
      },
    });

    if (existingEmployee) {
      return errorResponses.conflict("Employee with this email already exists");
    }

    // Create user first
    const user = await prisma.user.create({
      data: {
        email: employeeData.email,
        password: employeeData.password || "defaultPassword", // In production, hash the password
        role: employeeData.role || "EMPLOYEE",
      },
    });

    const employeeId = `EMP-${Date.now().toString().slice(-6)}`;
    // Create employee with user relation
    const employee = await prisma.employee.create({
      data: {
        employeeId,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        dateOfBirth: new Date(employeeData.dateOfBirth),
        gender: employeeData.gender,
        phoneNumber: employeeData.phoneNumber,
        emergencyContact: employeeData.emergencyContact,
        address: employeeData.address,
        city: employeeData.city,
        country: employeeData.country,
        postalCode: employeeData.postalCode,
        dateOfHire: new Date(employeeData.hireDate),
        contractType: employeeData.contractType,
        shiftType: employeeData.shiftType,
        managerId: employeeData.managerId,
        departmentId: employeeData.departmentId,
        positionId: employeeData.positionId,
        isActive: true,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        position: {
          select: {
            id: true,
            title: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return createApiResponse({
      data: employee,
      message: "Employee created successfully",
      status: 201,
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    return errorResponses.serverError("Failed to create employee");
  }
}
