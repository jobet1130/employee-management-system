import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TrainingSchema } from "@/lib/schemas";
type TrainingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

/**
 * @swagger
 * /api/trainings:
 *   get:
 *     tags: [Trainings]
 *     summary: Get all trainings
 *     description: Retrieve a list of trainings with pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED]
 *         description: Filter by training status
 *     responses:
 *       200:
 *         description: List of trainings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingListResponse'
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
    const status = searchParams.get("status") as TrainingStatus | null;
    if (
      status &&
      !["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)
    ) {
      return errorResponses.badRequest("Invalid status value");
    }
    const skip = (page - 1) * limit;

    const where: { status?: TrainingStatus } = {};
    if (status) {
      where.status = status;
    }

    const [trainings, total] = await Promise.all([
      prisma.training.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: "asc" },
      }),
      prisma.training.count({ where }),
    ]);

    return createApiResponse({
      data: trainings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching trainings:", error);
    return errorResponses.serverError("Failed to fetch trainings");
  }
}

/**
 * @swagger
 * /api/trainings:
 *   post:
 *     tags: [Trainings]
 *     summary: Create a new training
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrainingCreate'
 *     responses:
 *       201:
 *         description: Training created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingResponse'
 */

async function handlePost(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    const body = await req.json();

    // Validate required fields for POST
    if (!body.name || !body.startDate || !body.endDate) {
      return errorResponses.badRequest(
        "Name, start date, and end date are required",
      );
    }

    // Validate request body against the schema
    const validation = TrainingSchema.safeParse(body);
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

    // Validate dates
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return errorResponses.badRequest("Invalid date format");
    }

    if (startDate >= endDate) {
      return errorResponses.badRequest("End date must be after start date");
    }

    const { name, description, location, capacity, status } = body;

    const training = await prisma.training.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        capacity,
        status: status || "NOT_STARTED",
        createdById: parseInt(session.user.id),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return createApiResponse({
      data: training,
      status: 201,
    });
  } catch (error) {
    console.error("Error creating training:", error);
    return errorResponses.serverError("Failed to create training");
  }
}

export const GET = handleGet;
export const POST = handlePost;
