import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * @swagger
 * /api/department:
 *   get:
 *     summary: Get all departments
 *     description: Retrieve a list of all departments with optional filtering and pagination
 *     tags: [Departments]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter departments by name
 *     responses:
 *       200:
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Department'
 *                 message:
 *                   type: string
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const search = url.searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const whereClause = {
      deletedAt: null,
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
    };

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.department.count({ where: whereClause }),
    ]);

    return createApiResponse({
      data: departments,
      message: "Departments retrieved successfully",
      meta: {
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return errorResponses.serverError("Failed to fetch departments");
  }
}

/**
 * @swagger
 * /api/department:
 *   post:
 *     summary: Create a new department
 *     description: Create a new department with the provided details
 *     tags: [Departments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDepartmentRequest'
 *     responses:
 *       201:
 *         description: Department created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Check if department with the same name already exists
    const existingDepartment = await prisma.department.findFirst({
      where: {
        name: data.name,
        deletedAt: null,
      },
    });

    if (existingDepartment) {
      return errorResponses.badRequest(
        "A department with this name already exists",
      );
    }

    const newDepartment = await prisma.department.create({
      data: {
        name: data.name,
        description: data.description || null,
        managerId: data.managerId || null,
        isActive: data.isActive ?? true,
      },
    });

    return createApiResponse({
      data: newDepartment,
      message: "Department created successfully",
      status: 201,
    });
  } catch (error) {
    console.error("Error creating department:", error);
    return errorResponses.serverError("Failed to create department");
  }
}

/**
 * @swagger
 * /api/department:
 *   put:
 *     summary: Update a department by ID
 *     description: Update an existing department with the provided ID
 *     tags: [Departments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id:
 *                 type: integer
 *                 description: ID of the department to update
 *               name:
 *                 type: string
 *                 description: Name of the department
 *               description:
 *                 type: string
 *                 description: Description of the department
 *               managerId:
 *                 type: integer
 *                 description: ID of the department manager
 *               isActive:
 *                 type: boolean
 *                 description: Whether the department is active
 *     responses:
 *       200:
 *         description: Department updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       400:
 *         description: Invalid input data or department with this name already exists
 *       404:
 *         description: Department not found
 *       500:
 *         description: Internal server error
 */
export async function PUT(req: NextRequest) {
  try {
    const updateData = await req.json();

    if (!updateData.id) {
      return errorResponses.badRequest("Department ID is required");
    }

    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id: updateData.id, deletedAt: null },
    });

    if (!existingDepartment) {
      return errorResponses.notFound("Department not found");
    }

    // Check if another department with the same name exists
    if (updateData.name && updateData.name !== existingDepartment.name) {
      const duplicateDepartment = await prisma.department.findFirst({
        where: {
          name: updateData.name,
          deletedAt: null,
          NOT: { id: updateData.id },
        },
      });

      if (duplicateDepartment) {
        return errorResponses.badRequest(
          "A department with this name already exists",
        );
      }
    }

    // Remove id from update data
    const { id, ...updateFields } = updateData;

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: updateFields,
    });

    return createApiResponse({
      data: updatedDepartment,
      message: "Department updated successfully",
    });
  } catch (error) {
    console.error("Error updating department:", error);
    return errorResponses.serverError("Failed to update department");
  }
}
