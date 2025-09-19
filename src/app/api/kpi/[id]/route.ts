import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { KpiSchema } from "@/lib/schemas";

// Helper to safely parse string IDs to numbers
const safeParseInt = (
  value: string | number | undefined,
): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return isNaN(value) ? undefined : value;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
};

// Type for the employee select fields
const employeeSelect = {
  id: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

/**
 * @swagger
 * /api/kpi/{id}:
 *   get:
 *     tags: [KPIs]
 *     summary: Get a KPI by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: KPI ID
 *     responses:
 *       200:
 *         description: KPI details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KPI'
 *       404:
 *         description: KPI not found
 */
async function handleGet(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    // Convert ID to number and validate
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponses.badRequest("Invalid KPI ID format");
    }

    const kpi = await prisma.kpi.findUnique({
      where: { id },
      include: {
        employeeKpis: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            approvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            evaluationDate: "desc",
          },
          take: 1, // Get only the most recent evaluation
        },
      },
    });

    if (!kpi) {
      return errorResponses.notFound("KPI not found");
    }

    return createApiResponse({
      data: kpi,
    });
  } catch (error) {
    console.error("Error fetching KPI:", error);
    return errorResponses.serverError("Failed to fetch KPI");
  }
}

/**
 * @swagger
 * /api/kpi/{id}:
 *   put:
 *     tags: [KPIs]
 *     summary: Update a KPI
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: KPI ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KPIUpdate'
 *     responses:
 *       200:
 *         description: KPI updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KPI'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: KPI not found
 */
async function handlePut(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Convert ID to number and validate
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return errorResponses.badRequest("Invalid KPI ID");
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    const body = await req.json();

    // Check if KPI exists
    const existingKpi = await prisma.kpi.findUnique({
      where: { id },
    });

    if (!existingKpi) {
      return errorResponses.notFound("KPI not found");
    }

    // Only admin can update the KPI
    if (session.user.role !== "ADMIN") {
      return errorResponses.forbidden("Not authorized to update this KPI");
    }

    // Validate request body against the schema
    const validation = KpiSchema.partial().safeParse(body);

    if (!validation.success) {
      const formattedErrors = validation.error.issues.reduce(
        (acc, issue) => {
          const key = issue.path.join(".");
          acc[key] = issue.message;
          return acc;
        },
        {} as Record<string, string>,
      );

      return errorResponses.badRequest("Validation error", formattedErrors);
    }

    // Convert string IDs to numbers if needed
    const kpiId = safeParseInt(id);
    if (kpiId === undefined || isNaN(kpiId)) {
      return errorResponses.badRequest("Invalid KPI ID");
    }

    // Parse employee IDs safely, ensuring they're valid numbers
    const employeeId = validation.data.employeeId
      ? safeParseInt(validation.data.employeeId)
      : undefined;
    const evaluatedById = validation.data.evaluatedById
      ? safeParseInt(validation.data.evaluatedById)
      : undefined;

    // Get current user ID if available
    const currentUserId = session?.user?.id
      ? safeParseInt(session.user.id)
      : undefined;

    try {
      // Update the KPI
      await prisma.kpi.update({
        where: { id: kpiId },
        data: {
          name: validation.data.metric || "Unnamed KPI",
          description: validation.data.comments || null,
          targetValue: validation.data.target || 0,
          unit: "units",
          frequency: "MONTHLY",
          kpiType: "INDIVIDUAL",
        },
      });

      // Handle employee KPI association if employeeId is provided
      if (employeeId) {
        const employeeKpiData = {
          actualValue: validation.data.achieved || 0,
          status: "COMPLETED",
          comments: validation.data.comments || null,
          approvedById: evaluatedById || currentUserId,
          approvedAt: new Date(),
          evaluationDate: validation.data.evaluationDate
            ? new Date(validation.data.evaluationDate)
            : new Date(),
        };

        try {
          // Check if the employee KPI association exists
          const existingEmployeeKpi = await prisma.employeeKpi.findFirst({
            where: {
              kpiId: kpiId,
              employeeId: employeeId!,
            },
          });

          if (existingEmployeeKpi) {
            // Update existing
            await prisma.employeeKpi.update({
              where: { id: existingEmployeeKpi.id },
              data: employeeKpiData,
            });
          } else {
            // Create new
            await prisma.employeeKpi.create({
              data: {
                ...employeeKpiData,
                kpiId: kpiId,
                employeeId: employeeId!,
              },
            });
          }
        } catch (error) {
          console.error("Error updating employee KPI:", error);
          // Continue even if employee KPI update fails
        }
      }

      // Fetch the updated KPI with all its relations
      const kpiWithRelations = await prisma.kpi.findUnique({
        where: { id: kpiId },
        include: {
          employeeKpis: {
            include: {
              employee: {
                select: employeeSelect,
              },
              approvedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!kpiWithRelations) {
        return errorResponses.notFound("KPI not found");
      }

      // Transform the response to match the expected format
      const responseData = {
        ...kpiWithRelations,
        employeeKpis: kpiWithRelations.employeeKpis.map((ek) => {
          const employee = ek.employee as {
            id: number;
            user: { name?: string; email?: string } | null;
          };
          return {
            ...ek,
            employee: {
              id: employee.id,
              name: employee.user?.name || "Unknown",
              email: employee.user?.email || "",
            },
          };
        }),
      };

      return createApiResponse({
        data: responseData,
      });
    } catch (error) {
      console.error("Error updating KPI:", error);
      return errorResponses.serverError("Failed to update KPI");
    }
  } catch (error) {
    console.error("Error updating KPI:", error);
    return errorResponses.serverError("Failed to update KPI");
  }
}

/**
 * @swagger
 * /api/kpi/{id}:
 *   delete:
 *     tags: [KPIs]
 *     summary: Delete a KPI
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: KPI ID
 *     responses:
 *       204:
 *         description: KPI deleted successfully
 *       404:
 *         description: KPI not found
 */
async function handleDelete(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Convert ID to number and validate
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return errorResponses.badRequest("Invalid KPI ID");
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    // Check if KPI exists
    const existingKpi = await prisma.kpi.findUnique({
      where: { id },
    });

    if (!existingKpi) {
      return errorResponses.notFound("KPI not found");
    }

    // Only admin can delete the KPI
    if (session.user.role !== "ADMIN") {
      return errorResponses.forbidden("Not authorized to delete this KPI");
    }

    await prisma.kpi.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting KPI:", error);
    return errorResponses.serverError("Failed to delete KPI");
  }
}

export const GET = handleGet;
export const PUT = handlePut;
export const DELETE = handleDelete;
