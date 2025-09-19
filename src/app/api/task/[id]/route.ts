import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { TaskStatus } from "@prisma/client";

/**
 * @swagger
 * /api/task/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task by ID
 *     description: Retrieve a specific task by its ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
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
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return errorResponses.badRequest("Invalid task ID");
    }

    const task = await prisma.task.findUnique({
      where: { id, deletedAt: null },
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
        project: {
          select: {
            id: true,
            name: true,
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
    });

    if (!task) {
      return errorResponses.notFound("Task not found");
    }

    // Format the response
    const formattedTask = {
      ...task,
      assignees: task.assignees.map((a) => ({
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
      })),
    };

    return createApiResponse({
      data: formattedTask,
      message: "Task retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return errorResponses.serverError("Failed to fetch task");
  }
}

/**
 * @swagger
 * /api/task/{id}:
 *   put:
 *     tags: [Tasks]
 *     summary: Update a task
 *     description: Update an existing task with the provided ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTaskRequest'
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return errorResponses.badRequest("Invalid task ID");
    }

    const updateData = await req.json();
    const { title, description, status, priority, dueDate, assigneeIds } =
      updateData;

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id, deletedAt: null },
      include: { assignees: true },
    });

    if (!existingTask) {
      return errorResponses.notFound("Task not found");
    }

    // Update task
    const updatedTask = await prisma.$transaction(async (prisma) => {
      // Update task fields
      const task = await prisma.task.update({
        where: { id },
        data: {
          ...(title && { name: title }),
          description,
          ...(status && { status }),
          ...(priority && { priority }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
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
        },
      });

      // Update assignees if provided
      if (assigneeIds) {
        // Remove existing assignees
        await prisma.taskAssignee.deleteMany({
          where: { taskId: id },
        });

        // Add new assignees
        if (assigneeIds.length > 0) {
          await prisma.taskAssignee.createMany({
            data: assigneeIds.map((userId: number) => ({
              taskId: id,
              userId,
            })),
          });
        }

        // Refetch with updated assignees
        return prisma.task.findUnique({
          where: { id },
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
          },
        });
      }

      return task;
    });

    if (!updatedTask) {
      return errorResponses.serverError("Failed to update task");
    }

    // Format the response
    const formattedTask = {
      ...updatedTask,
      assignees: updatedTask.assignees.map((a: any) => ({
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
      })),
    };

    return createApiResponse({
      data: formattedTask,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return errorResponses.serverError("Failed to update task");
  }
}

/**
 * @swagger
 * /api/task/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task
 *     description: Permanently delete a task
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID to delete
 *     responses:
 *       200:
 *         description: Task deleted successfully
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
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return errorResponses.badRequest("Invalid task ID");
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingTask) {
      return errorResponses.notFound("Task not found");
    }

    // Soft delete the task
    await prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return createApiResponse({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return errorResponses.serverError("Failed to delete task");
  }
}

/**
 * @swagger
 * /api/task/{id}/status:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task status
 *     description: Update the status of a task
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
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
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return errorResponses.badRequest("Invalid task ID");
    }

    const { status } = await req.json();

    // Validate status
    if (!status || !Object.values(TaskStatus).includes(status as TaskStatus)) {
      return errorResponses.badRequest("Invalid status value");
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingTask) {
      return errorResponses.notFound("Task not found");
    }

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status },
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
      },
    });

    // Format the response
    const formattedTask = {
      ...updatedTask,
      assignees: updatedTask.assignees.map((a: any) => ({
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
      })),
    };

    return createApiResponse({
      data: formattedTask,
      message: "Task status updated successfully",
    });
  } catch (error) {
    console.error("Error updating task status:", error);
    return errorResponses.serverError("Failed to update task status");
  }
}
