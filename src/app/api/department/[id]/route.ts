import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * @swagger
 * /api/department/{id}:
 *   get:
 *     summary: Get department by ID
 *     description: Retrieve a single department by its ID
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       404:
 *         description: Department not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return errorResponses.badRequest("Invalid department ID");
    }

    const department = await prisma.department.findUnique({
      where: { id, deletedAt: null },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!department) {
      return errorResponses.notFound("Department not found");
    }

    return createApiResponse({
      data: department,
      message: "Department retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching department:", error);
    return errorResponses.serverError("Failed to fetch department");
  }
}

/**
 * @swagger
 * /api/department/{id}:
 *   put:
 *     summary: Update a department
 *     description: Update all fields of a department
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDepartmentRequest'
 *     responses:
 *       200:
 *         description: Department updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Department not found
 *       500:
 *         description: Internal server error
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return errorResponses.badRequest("Invalid department ID");
    }

    const updateData = await req.json();

    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id, deletedAt: null },
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
          NOT: { id },
        },
      });

      if (duplicateDepartment) {
        return errorResponses.badRequest(
          "Another department with this name already exists",
        );
      }
    }

    // Remove id from update data if present
    const { id: _, ...updateFields } = updateData;

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: updateFields,
      include: {
        manager: {
          select: {
            id: true,
            email: true,
          },
        },
      },
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

/**
 * @swagger
 * /api/department/{id}:
 *   patch:
 *     summary: Partially update a department
 *     description: Update one or more fields of a department
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDepartmentRequest'
 *     responses:
 *       200:
 *         description: Department updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Department not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return errorResponses.badRequest("Invalid department ID");
    }

    const updateData = await req.json();

    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id, deletedAt: null },
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
          NOT: { id },
        },
      });

      if (duplicateDepartment) {
        return errorResponses.badRequest(
          "Another department with this name already exists",
        );
      }
    }

    // Remove id from update data if present
    const { id: _, ...updateFields } = updateData;

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: updateFields,
      include: {
        manager: {
          select: {
            id: true,
            email: true,
          },
        },
      },
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

/**
 * @swagger
 * /api/department/{id}:
 *   delete:
 *     summary: Delete a department (soft delete)
 *     description: Mark a department as deleted by setting the deletedAt timestamp
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department marked as deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Department not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return errorResponses.badRequest("Invalid department ID");
    }

    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingDepartment) {
      return errorResponses.notFound("Department not found");
    }

    // Soft delete by setting deletedAt timestamp
    const now = new Date();
    await prisma.department.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: now,
      },
    });

    return createApiResponse({
      message: "Department deleted successfully",
      data: {
        id: existingDepartment.id,
        deletedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error deleting department:", error);
    return errorResponses.serverError("Failed to delete department");
  }
}
