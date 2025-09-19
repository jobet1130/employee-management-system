import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification by ID
 *     description: Retrieve a single notification by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!notification) {
      return errorResponses.notFound("Notification not found");
    }

    // Ensure the user is the recipient
    if (notification.recipientId !== parseInt(session.user.id)) {
      return errorResponses.forbidden();
    }

    return createApiResponse({
      data: notification,
    });
  } catch (error) {
    console.error("Error fetching notification:", error);
    return errorResponses.serverError("Failed to fetch notification");
  }
}

/**
 * @swagger
 * /api/notifications/{id}:
 *   patch:
 *     tags: [Notifications]
 *     summary: Update a notification
 *     description: Update notification details (mark as read/unread)
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
    const { isRead } = body;

    // Check if notification exists and user is the recipient
    const existingNotification = await prisma.notification.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!existingNotification) {
      return errorResponses.notFound("Notification not found");
    }

    if (existingNotification.recipientId !== parseInt(session.user.id)) {
      return errorResponses.forbidden();
    }

    // Update notification
    const notification = await prisma.notification.update({
      where: { id: parseInt(params.id) },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return createApiResponse({
      data: notification,
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return errorResponses.serverError("Failed to update notification");
  }
}

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     description: Delete a notification (admin only)
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

    // Check if user has admin role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true },
    });

    if (!["ADMIN", "SUPERADMIN"].includes(user?.role || "")) {
      return errorResponses.forbidden();
    }

    // Check if notification exists
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!notification) {
      return errorResponses.notFound("Notification not found");
    }

    // Delete notification
    await prisma.notification.delete({
      where: { id: parseInt(params.id) },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return errorResponses.serverError("Failed to delete notification");
  }
}
