import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { PayrollStatus } from "@prisma/client";

/**
 * @swagger
 * /api/payroll/{id}:
 *   get:
 *     tags: [Payroll]
 *     summary: Get a payroll record by ID
 *     description: Retrieve a specific payroll record with its details
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the payroll record to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payroll record retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payroll'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    const payroll = await prisma.payroll.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payroll) {
      return errorResponses.notFound("Payroll record not found");
    }

    return createApiResponse({
      data: payroll,
      message: "Payroll record retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching payroll record:", error);
    return errorResponses.serverError("Failed to fetch payroll record");
  }
}

/**
 * @swagger
 * /api/payroll/{id}:
 *   patch:
 *     tags: [Payroll]
 *     summary: Update a payroll record
 *     description: Update specific fields of a payroll record
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the payroll record to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePayrollRequest'
 *     responses:
 *       200:
 *         description: Payroll record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payroll'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const data = await req.json();

    const { baseSalary, allowances, bonuses, deductions, tax, status, notes } =
      data;

    // Check if payroll exists
    const existingPayroll = await prisma.payroll.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingPayroll) {
      return errorResponses.notFound("Payroll record not found");
    }

    // Validate status if provided
    if (status && !Object.values(PayrollStatus).includes(status)) {
      return errorResponses.badRequest(
        `Invalid status. Must be one of: ${Object.values(PayrollStatus).join(", ")}`,
      );
    }

    // Calculate net salary if any financial fields are updated
    let netSalary = existingPayroll.netSalary;
    if (
      baseSalary !== undefined ||
      allowances !== undefined ||
      bonuses !== undefined ||
      deductions !== undefined ||
      tax !== undefined
    ) {
      const currentBaseSalary = baseSalary ?? existingPayroll.baseSalary;
      const currentAllowances = allowances ?? existingPayroll.allowances;
      const currentBonuses = bonuses ?? existingPayroll.bonuses;
      const currentDeductions = deductions ?? existingPayroll.deductions;
      const currentTax = tax ?? existingPayroll.tax;

      netSalary =
        currentBaseSalary +
        currentAllowances +
        currentBonuses -
        currentDeductions -
        currentTax;
    }

    // Update payroll record
    const updatedPayroll = await prisma.payroll.update({
      where: { id: parseInt(id) },
      data: {
        ...(baseSalary !== undefined && { baseSalary }),
        ...(allowances !== undefined && { allowances }),
        ...(bonuses !== undefined && { bonuses }),
        ...(deductions !== undefined && { deductions }),
        ...(tax !== undefined && { tax }),
        ...(status && { status: status as PayrollStatus }),
        ...(notes !== undefined && { notes }),
        netSalary,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return createApiResponse({
      data: updatedPayroll,
      message: "Payroll record updated successfully",
    });
  } catch (error) {
    console.error("Error updating payroll record:", error);
    return errorResponses.serverError("Failed to update payroll record");
  }
}

/**
 * @swagger
 * /api/payroll/{id}:
 *   delete:
 *     tags: [Payroll]
 *     summary: Delete a payroll record (soft delete)
 *     description: Mark a payroll record as deleted without actually removing it from the database
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the payroll record to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payroll record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    // Check if payroll exists
    const existingPayroll = await prisma.payroll.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingPayroll) {
      return errorResponses.notFound("Payroll record not found");
    }

    // Delete the payroll record
    await prisma.payroll.delete({
      where: { id: parseInt(id) },
    });

    return createApiResponse({
      data: null,
      message: "Payroll record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payroll record:", error);
    return errorResponses.serverError("Failed to delete payroll record");
  }
}
