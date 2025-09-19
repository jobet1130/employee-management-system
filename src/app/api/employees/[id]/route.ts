import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     description: Retrieve a single employee by their ID with related data
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeResponse'
 *       404:
 *         description: Employee not found
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
      return errorResponses.badRequest("Invalid employee ID");
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
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

    if (!employee) {
      return errorResponses.notFound("Employee not found");
    }

    return createApiResponse({
      data: employee,
      message: "Employee retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return errorResponses.serverError("Failed to fetch employee");
  }
}

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: Update an employee
 *     description: Update all fields of an employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEmployeeRequest'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeResponse'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Employee not found
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
      return errorResponses.badRequest("Invalid employee ID");
    }

    const updateData = await req.json();

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return errorResponses.notFound("Employee not found");
    }

    // Remove id from update data if present
    const { id: _, ...updateFields } = updateData;

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: updateFields,
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
      data: updatedEmployee,
      message: "Employee updated successfully",
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return errorResponses.serverError("Failed to update employee");
  }
}

/**
 * @swagger
 * /api/employees/{id}:
 *   patch:
 *     summary: Partially update an employee
 *     description: Update one or more fields of an employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEmployeeRequest'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeResponse'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Employee not found
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
      return errorResponses.badRequest("Invalid employee ID");
    }

    const updateData = await req.json();

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return errorResponses.notFound("Employee not found");
    }

    // Remove id from update data if present
    const { id: _, ...updateFields } = updateData;

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: updateFields,
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
      data: updatedEmployee,
      message: "Employee updated successfully",
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return errorResponses.serverError("Failed to update employee");
  }
}

/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     summary: Delete an employee (soft delete)
 *     description: Mark an employee as deleted by setting the deletedAt timestamp
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee marked as deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteEmployeeResponse'
 *       404:
 *         description: Employee not found
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
      return errorResponses.badRequest("Invalid employee ID");
    }

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return errorResponses.notFound("Employee not found");
    }

    // Soft delete by setting deletedAt timestamp
    const now = new Date();
    await prisma.employee.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: now,
      },
    });

    return createApiResponse({
      message: "Employee deleted successfully",
      data: {
        id: existingEmployee.employeeId,
        deletedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return errorResponses.serverError("Failed to delete employee");
  }
}
