import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { AdjustmentType } from "@prisma/client";

/**
 * @swagger
 * /api/payroll/adjustments:
 *   post:
 *     tags: [Payroll]
 *     summary: Create a new payroll adjustment
 *     description: Add an adjustment to a payroll record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePayrollAdjustmentRequest'
 *     responses:
 *       201:
 *         description: Payroll adjustment created successfully
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
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      payrollId,
      type,
      amount,
      description,
      approved = false,
      approvedBy,
    } = data;

    // Validate required fields
    if (!payrollId || !type || amount === undefined) {
      return errorResponses.badRequest(
        "Payroll ID, type, and amount are required",
      );
    }

    // Validate adjustment type
    if (type && !Object.values(AdjustmentType).includes(type)) {
      return errorResponses.badRequest(
        `Invalid adjustment type. Must be one of: ${Object.values(
          AdjustmentType,
        ).join(", ")}`,
      );
    }

    // Check if payroll exists
    const payroll = await prisma.payroll.findUnique({
      where: { id: parseInt(payrollId) },
    });

    if (!payroll) {
      return errorResponses.notFound("Payroll record not found");
    }

    // Create payroll adjustment
    const adjustment = await prisma.payrollAdjustment.create({
      data: {
        payrollId: parseInt(payrollId),
        type: type as AdjustmentType,
        amount: parseFloat(amount),
        description,
        approved,
        ...(approvedBy && { approvedBy: parseInt(approvedBy) }),
      },
    });

    // Recalculate payroll net salary
    await recalculatePayrollNetSalary(parseInt(payrollId));

    return createApiResponse({
      data: adjustment,
      message: "Payroll adjustment created successfully",
      status: 201,
    });
  } catch (error) {
    console.error("Error creating payroll adjustment:", error);
    return errorResponses.serverError("Failed to create payroll adjustment");
  }
}

/**
 * Recalculates the net salary for a payroll record based on its adjustments
 */
async function recalculatePayrollNetSalary(payrollId: number) {
  // Get all adjustments for this payroll
  const adjustments = await prisma.payrollAdjustment.findMany({
    where: {
      payrollId,
      status: "APPROVED",
    },
  });

  // Calculate total adjustments by type
  const totals = adjustments.reduce(
    (acc, adj) => {
      if (["BONUS", "COMMISSION", "ALLOWANCE"].includes(adj.type)) {
        acc.additions += adj.amount;
      } else {
        acc.deductions += adj.amount;
      }
      return acc;
    },
    { additions: 0, deductions: 0 },
  );

  // Get the current payroll record
  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
  });

  if (!payroll) return;

  // Calculate new net salary
  const netSalary =
    payroll.baseSalary + totals.additions - payroll.tax - totals.deductions;

  // Update the payroll record
  await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      netSalary,
      allowances: totals.additions,
      deductions: totals.deductions,
    },
  });
}
