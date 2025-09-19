import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { Prisma, TaskStatus } from "@prisma/client/edge";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const isValidTaskStatus = (status: string): status is TaskStatus => {
  return Object.values(TaskStatus).includes(status as TaskStatus);
};

const isValidPriority = (priority: string): priority is TaskPriority => {
  return ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority);
};

/**
 * @swagger
 * /api/task:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks
 *     description: Retrieve a paginated list of tasks with optional filtering
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - name: assigneeId
 *         in: query
 *         description: Filter tasks by assignee ID
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         description: Filter by task status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled]
 *       - name: priority
 *         in: query
 *         description: Filter by task priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *     responses:
 *       200:
 *         description: List of tasks
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
 *                     $ref: '#/components/schemas/Task'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const assigneeId = url.searchParams.get("assigneeId");
    const statusParam = url.searchParams.get("status");
    const priorityParam = url.searchParams.get("priority");

    // Validate status
    if (statusParam && !isValidTaskStatus(statusParam)) {
      return errorResponses.badRequest(
        `Invalid status. Must be one of: ${Object.values(TaskStatus).join(", ")}`,
      );
    }

    // Validate priority
    if (priorityParam && !isValidPriority(priorityParam)) {
      return errorResponses.badRequest(
        "Invalid priority. Must be one of: LOW, MEDIUM, HIGH, URGENT",
      );
    }

    const status = statusParam as TaskStatus | null;
    const priority = priorityParam as TaskPriority | null;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...(assigneeId && {
        assignees: {
          some: {
            userId: parseInt(assigneeId),
          },
        },
      }),
      ...(status && { status }),
      ...(priority && { priority }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.task.count({ where: whereClause }),
    ]);

    // Format tasks with assignees
    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      project: task.project,
      createdBy: task.createdBy,
      assignees: task.assignees.map((a) => ({
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        assignedAt: a.assignedAt,
      })),
    }));

    return createApiResponse({
      data: formattedTasks,
      message: "Tasks retrieved successfully",
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
    console.error("Error fetching tasks:", error);
    return errorResponses.serverError("Failed to fetch tasks");
  }
}

/**
 * @swagger
 * /api/task:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     description: Create a new task with the provided details
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
interface CreateTaskRequest {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: string;
  dueDate?: string;
  assigneeIds?: number[];
  projectId: number;
  createdById: number;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assigneeIds = [],
      projectId,
      createdById,
    } = data as CreateTaskRequest;

    // Validate required fields
    if (!title || !status || !priority || !projectId || !createdById) {
      return errorResponses.badRequest(
        "Title, status, priority, projectId, and createdById are required",
      );
    }

    // Validate status
    if (!isValidTaskStatus(status)) {
      return errorResponses.badRequest(
        `Invalid status. Must be one of: ${Object.values(TaskStatus).join(", ")}`,
      );
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      return errorResponses.notFound("Project not found");
    }

    // Check if all assignees exist
    if (assigneeIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true },
      });

      if (users.length !== assigneeIds.length) {
        return errorResponses.badRequest(
          "One or more assignee IDs are invalid",
        );
      }
    }

    // Create task with assignees in a transaction
    const [task] = await prisma.$transaction([
      prisma.task.create({
        data: {
          name: title,
          description,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId,
          createdById,
          assignees:
            assigneeIds.length > 0
              ? {
                  create: assigneeIds.map((userId) => ({
                    user: { connect: { id: userId } },
                    assignedAt: new Date(),
                  })),
                }
              : undefined,
        },
        include: {
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Format the response
    const formattedTask = {
      ...task,
      assignees: task.assignees.map((a) => ({
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        assignedAt: a.assignedAt,
      })),
    };

    return createApiResponse({
      data: formattedTask,
      message: "Task created successfully",
      status: 201,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return errorResponses.serverError("Failed to create task");
  }
}
