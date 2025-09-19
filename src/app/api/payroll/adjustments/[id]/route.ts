import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";

// Define valid adjustment types as a constant
const ADJUSTMENT_TYPES = [
  "BONUS",
  "COMMISSION",
  "DEDUCTION",
  "ALLOWANCE",
  "OVERTIME",
  "OTHER",
] as const;

type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

/**
 * @swagger
 * /api/payroll/adjustments/{id}:
 *   get:
 *     tags: [Payroll]
 *     summary: Get a payroll adjustment by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the adjustment to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payroll adjustment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayrollAdjustment'
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

    const adjustment = await prisma.payrollAdjustment.findUnique({
      where: { id: parseInt(id) },
      include: {
        payroll: {
          select: {
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
        },
      },
    });

    if (!adjustment) {
      return errorResponses.notFound("Payroll adjustment not found");
    }

    return createApiResponse({
      data: adjustment,
      message: "Payroll adjustment retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching payroll adjustment:", error);
    return errorResponses.serverError("Failed to fetch payroll adjustment");
  }
}

/**
 * @swagger
 * /api/payroll/adjustments/{id}:
 *   patch:
 *     tags: [Payroll]
 *     summary: Update a payroll adjustment
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the adjustment to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePayrollAdjustmentRequest'
 *     responses:
 *       200:
 *         description: Payroll adjustment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayrollAdjustment'
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
    const { type, amount, description, approved, approvedBy } = data;

    // Check if adjustment exists
    const existingAdjustment = await prisma.payrollAdjustment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingAdjustment) {
      return errorResponses.notFound("Payroll adjustment not found");
    }

    // Validate type if provided
    if (type && !ADJUSTMENT_TYPES.includes(type)) {
      return errorResponses.badRequest(
        `Invalid adjustment type. Must be one of: ${ADJUSTMENT_TYPES.join(", ")}`,
      );
    }

    // Update adjustment
    const updatedAdjustment = await prisma.payrollAdjustment.update({
      where: { id: parseInt(id) },
      data: {
        ...(type && { type: type as AdjustmentType }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(approved !== undefined && { approved }),
        ...(approvedBy !== undefined && { approvedBy: parseInt(approvedBy) }),
      },
    });

    // Recalculate payroll net salary if amount or approval status changed
    if (amount !== undefined || approved !== undefined) {
      await recalculatePayrollNetSalary(existingAdjustment.payrollId);
    }

    return createApiResponse({
      data: updatedAdjustment,
      message: "Payroll adjustment updated successfully",
    });
  } catch (error) {
    console.error("Error updating payroll adjustment:", error);
    return errorResponses.serverError("Failed to update payroll adjustment");
  }
}

/**
 * @swagger
 * /api/payroll/adjustments/{id}:
 *   delete:
 *     tags: [Payroll]
 *     summary: Delete a payroll adjustment
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the adjustment to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payroll adjustment deleted successfully
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

    // Check if adjustment exists
    const existingAdjustment = await prisma.payrollAdjustment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingAdjustment) {
      return errorResponses.notFound("Payroll adjustment not found");
    }

    const payrollId = existingAdjustment.payrollId;

    // Delete the adjustment
    await prisma.payrollAdjustment.delete({
      where: { id: parseInt(id) },
    });

    // Recalculate payroll net salary
    await recalculatePayrollNetSalary(payrollId);

    return createApiResponse({
      data: null,
      message: "Payroll adjustment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payroll adjustment:", error);
    return errorResponses.serverError("Failed to delete payroll adjustment");
  }
}

/**
 * Recalculates the net salary for a payroll record based on its adjustments
 */
async function recalculatePayrollNetSalary(payrollId: number) {
  // Get all adjustments for this payroll
  const adjustments = await prisma.$queryRaw`
    SELECT type, amount 
    FROM "PayrollAdjustment" 
    WHERE "payrollId" = ${payrollId} 
      AND approved = true 
      AND "deletedAt" IS NULL
  `;

  // Calculate total adjustments by type
  const totals = (
    adjustments as Array<{ type: string; amount: number }>
  ).reduce<{
    additions: number;
    deductions: number;
  }>(
    (acc, adj) => {
      if (["BONUS", "COMMISSION", "ALLOWANCE"].includes(adj.type)) {
        acc.additions += Number(adj.amount);
      } else {
        acc.deductions += Number(adj.amount);
      }
      return acc;
    },
    { additions: 0, deductions: 0 },
  );

  // Get the current payroll record and update in a single transaction
  await prisma.$transaction([
    prisma.$queryRaw`
      SELECT * FROM "Payroll" 
      WHERE id = ${payrollId} 
      FOR UPDATE
    `,
    prisma.$executeRaw`
      UPDATE "Payroll" 
      SET 
        "netSalary" = "baseSalary" + ${totals.additions} - "tax" - ${totals.deductions},
        "allowances" = ${totals.additions},
        "deductions" = ${totals.deductions},
        "updatedAt" = NOW()
      WHERE id = ${payrollId}
    `,
  ]);
}
