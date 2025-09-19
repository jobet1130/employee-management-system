import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UpdateTrainingSchema } from "@/lib/schemas";

/**
 * @swagger
 * /api/trainings/{id}:
 *   get:
 *     tags: [Trainings]
 *     summary: Get training by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Training ID
 *     responses:
 *       200:
 *         description: Training details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingResponse'
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    const body = await req.json();
    const validation = UpdateTrainingSchema.safeParse(body);

    if (!validation.success) {
      const errorMessage = validation.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return errorResponses.badRequest(errorMessage);
    }

    const training = await prisma.training.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!training) {
      return errorResponses.notFound("Training not found");
    }

    // Check if user is authorized to update this training
    if (
      training.createdById !== parseInt(session.user.id) &&
      session.user.role !== "ADMIN"
    ) {
      return errorResponses.forbidden("Not authorized to update this training");
    }

    const updatedTraining = await prisma.training.update({
      where: { id: parseInt(params.id) },
      data: {
        ...validation.data,
        startDate: validation.data.startDate
          ? new Date(validation.data.startDate)
          : undefined,
        endDate: validation.data.endDate
          ? new Date(validation.data.endDate)
          : undefined,
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
      data: updatedTraining,
      status: 200,
    });
  } catch (error) {
    console.error("Error updating training:", error);
    return errorResponses.serverError("Failed to update training");
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    const training = await prisma.training.findUnique({
      where: { id: parseInt(params.id) },
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

    if (!training) {
      return errorResponses.notFound("Training not found");
    }

    return createApiResponse({
      data: training,
    });
  } catch (error) {
    console.error("Error fetching training:", error);
    return errorResponses.serverError("Failed to fetch training");
  }
}

/**
 * @swagger
 * /api/trainings/{id}:
 *   patch:
 *     tags: [Trainings]
 *     summary: Update a training
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Training ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrainingUpdate'
 *     responses:
 *       200:
 *         description: Training updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingResponse'
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    const body = await req.json();
    const {
      name,
      description,
      startDate,
      endDate,
      location,
      capacity,
      status,
    } = body;

    // Check if training exists
    const existingTraining = await prisma.training.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!existingTraining) {
      return errorResponses.notFound("Training not found");
    }

    // Only allow updates to future or ongoing trainings
    const now = new Date();
    if (
      existingTraining.endDate < now &&
      existingTraining.status !== "COMPLETED"
    ) {
      return errorResponses.badRequest(
        "Cannot update completed or past trainings",
      );
    }

    // Validate date range if both dates are being updated
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return errorResponses.badRequest("End date must be after start date");
    }

    const updatedTraining = await prisma.training.update({
      where: { id: parseInt(params.id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(location !== undefined && { location }),
        ...(capacity !== undefined && {
          capacity: capacity ? parseInt(capacity) : null,
        }),
        ...(status && { status }),
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
      data: updatedTraining,
    });
  } catch (error) {
    console.error("Error updating training:", error);
    return errorResponses.serverError("Failed to update training");
  }
}

/**
 * @swagger
 * /api/trainings/{id}:
 *   delete:
 *     tags: [Trainings]
 *     summary: Delete a training
 *     description: Only trainings that haven't started can be deleted
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Training ID
 *     responses:
 *       204:
 *         description: Training deleted successfully
 *       400:
 *         description: Cannot delete started or completed trainings
 *       404:
 *         description: Training not found
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    // Check if training exists
    const training = await prisma.training.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!training) {
      return errorResponses.notFound("Training not found");
    }

    // Only allow deletion of future trainings
    const now = new Date();
    if (training.startDate <= now) {
      return errorResponses.badRequest(
        "Cannot delete started or completed trainings",
      );
    }

    // Delete the training
    await prisma.training.delete({
      where: { id: parseInt(params.id) },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting training:", error);
    return errorResponses.serverError("Failed to delete training");
  }
}
