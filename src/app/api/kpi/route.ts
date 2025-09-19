import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { KpiSchema } from "@/lib/schemas";

/**
 * @swagger
 * /api/kpi:
 *   get:
 *     tags: [KPIs]
 *     summary: Get all KPIs
 *     description: Retrieve a list of KPIs with optional filtering and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter KPIs by employee ID
 *     responses:
 *       200:
 *         description: List of KPIs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/KPI'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
async function handleGet(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const employeeId = searchParams.get("employeeId");
    const skip = (page - 1) * limit;

    const where = employeeId
      ? {
          employeeKpis: {
            some: {
              employeeId: parseInt(employeeId),
            },
          },
        }
      : {};

    const [kpis, total] = await Promise.all([
      prisma.kpi.findMany({
        where,
        skip,
        take: limit,
        include: {
          employeeKpis: {
            where: employeeId
              ? { employeeId: parseInt(employeeId) }
              : undefined,
            orderBy: {
              evaluationDate: "desc",
            },
            take: 1,
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
      }),
      prisma.kpi.count({ where }),
    ]);

    return createApiResponse({
      data: {
        kpis,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching KPIs:", error);
    return errorResponses.serverError("Failed to fetch KPIs");
  }
}

/**
 * @swagger
 * /api/kpi:
 *   post:
 *     tags: [KPIs]
 *     summary: Create a new KPI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KPICreate'
 *     responses:
 *       201:
 *         description: KPI created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KPI'
 *       400:
 *         description: Invalid input data
 */
async function handlePost(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    const body = await req.json();

    // Validate request body against the schema
    const validation = KpiSchema.safeParse({
      ...body,
      evaluatedById: session.user.id, // Set the evaluator as the current user
    });

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

    // First, find or create the KPI definition
    // Note: We need to handle the case where the KPI doesn't exist
    let kpiDefinition = await prisma.kpi.findFirst({
      where: {
        name: validation.data.metric,
      },
    });

    // If KPI definition doesn't exist, create it with default values
    if (!kpiDefinition) {
      kpiDefinition = await prisma.kpi.create({
        data: {
          name: validation.data.metric,
          description: validation.data.comments || "",
          targetValue: validation.data.target,
          kpiType: "INDIVIDUAL",
          frequency: "MONTHLY",
          unit: "units", // Default unit since it's required but not in the form
        },
      });
    }

    // Then create the employee's KPI evaluation
    const kpiEvaluation = await prisma.employeeKpi.create({
      data: {
        employeeId: parseInt(validation.data.employeeId),
        kpiId: kpiDefinition.id,
        actualValue: validation.data.achieved,
        evaluationDate: new Date(validation.data.evaluationDate),
        status: "PENDING_REVIEW",
        comments: validation.data.comments,
        approvedById: validation.data.evaluatedById
          ? parseInt(validation.data.evaluatedById)
          : null,
      },
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
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        kpi: {
          select: {
            id: true,
            name: true,
            description: true,
            targetValue: true,
            unit: true,
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
    });

    return createApiResponse({
      status: 201,
      message: "KPI evaluation created successfully",
      data: kpiEvaluation,
    });
  } catch (error) {
    console.error("Error creating KPI evaluation:", error);
    return errorResponses.serverError("Failed to create KPI evaluation");
  }
}

export const GET = handleGet;
export const POST = handlePost;
