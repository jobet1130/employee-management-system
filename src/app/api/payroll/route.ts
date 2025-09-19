import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { PayrollStatus, Prisma, PaymentMethod } from "@prisma/client";

/**
 * @swagger
 * /api/payroll:
 *   get:
 *     tags: [Payroll]
 *     summary: Get all payroll records
 *     description: Retrieve a paginated list of payroll records with optional filtering
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - name: employeeId
 *         in: query
 *         description: Filter by employee ID
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         description: Filter by payroll status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING, PROCESSING, PAID, CANCELLED, FAILED]
 *       - name: startDate
 *         in: query
 *         description: Filter by pay period start date (ISO format)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: Filter by pay period end date (ISO format)
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of payroll records
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
 *                     $ref: '#/components/schemas/Payroll'
 *                 meta:
 *                   $ref: '#/components/schemas/Pagination'
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const employeeId = url.searchParams.get("employeeId");
    const status = url.searchParams.get("status") as PayrollStatus | null;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const skip = (page - 1) * limit;

    const whereClause: Prisma.PayrollWhereInput = {
      // Note: Removed deletedAt as it's not in the Prisma schema for filtering
      ...(employeeId && { employeeId: parseInt(employeeId) }),
      ...(status && { status: status as PayrollStatus }),
      ...(startDate && { payPeriodStart: { gte: new Date(startDate) } }),
      ...(endDate && { payPeriodEnd: { lte: new Date(endDate) } }),
    };

    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where: whereClause,
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
        orderBy: { payPeriodStart: "desc" },
        skip,
        take: limit,
      }),
      prisma.payroll.count({ where: whereClause as Prisma.PayrollWhereInput }),
    ]);

    return createApiResponse({
      data: payrolls,
      message: "Payroll records retrieved successfully",
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching payroll records:", error);
    return errorResponses.serverError("Failed to fetch payroll records");
  }
}

/**
 * @swagger
 * /api/payroll:
 *   post:
 *     tags: [Payroll]
 *     summary: Create a new payroll record
 *     description: Create a new payroll record with the provided details
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePayrollRequest'
 *     responses:
 *       201:
 *         description: Payroll record created successfully
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
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      baseSalary,
      allowances = 0,
      bonuses = 0,
      deductions = 0,
      tax = 0,
      status = "DRAFT",
      paymentMethod,
      notes,
    } = data;

    // Validate required fields
    if (
      !employeeId ||
      !payPeriodStart ||
      !payPeriodEnd ||
      baseSalary === undefined
    ) {
      return errorResponses.badRequest(
        "Employee ID, pay period start, pay period end, and base salary are required",
      );
    }

    // Validate status
    if (status && !Object.values(PayrollStatus).includes(status)) {
      return errorResponses.badRequest(
        `Invalid status. Must be one of: ${Object.values(PayrollStatus).join(", ")}`,
      );
    }

    // Validate payment method if provided
    if (
      paymentMethod &&
      !Object.values(PaymentMethod).includes(paymentMethod)
    ) {
      return errorResponses.badRequest(
        `Invalid payment method. Must be one of: ${Object.values(
          PaymentMethod,
        ).join(", ")}`,
      );
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId, deletedAt: null },
    });

    if (!employee) {
      return errorResponses.notFound("Employee not found");
    }

    // Calculate net salary
    const netSalary = baseSalary + allowances + bonuses - deductions - tax;

    // Create payroll record
    const payroll = await prisma.payroll.create({
      data: {
        employeeId,
        payPeriodStart: new Date(payPeriodStart),
        payPeriodEnd: new Date(payPeriodEnd),
        baseSalary,
        allowances: allowances,
        bonuses: bonuses,
        deductions,
        tax,
        netSalary,
        status: status as PayrollStatus,
        notes,
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
      data: payroll,
      message: "Payroll record created successfully",
      status: 201,
    });
  } catch (error) {
    console.error("Error creating payroll record:", error);
    return errorResponses.serverError("Failed to create payroll record");
  }
}
