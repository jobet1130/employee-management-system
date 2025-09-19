import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get user's notifications
 *     description: Retrieve a paginated list of notifications for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const isRead = searchParams.get("isRead")
      ? searchParams.get("isRead") === "true"
      : undefined;
    const type = searchParams.get("type") as NotificationType | null;
    const markAllAsRead = searchParams.get("markAllAsRead") === "true";

    // Mark all as read if requested
    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: {
          recipientId: parseInt(session.user.id),
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    // Build where clause
    const where = {
      recipientId: parseInt(session.user.id),
      ...(isRead !== undefined && { isRead }),
      ...(type && { type }),
    };

    // Get paginated notifications
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return createApiResponse({
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return errorResponses.serverError("Failed to fetch notifications");
  }
}

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Create a new notification
 *     description: Create a new notification (admin only)
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { type, title, message, recipientId, relatedEntity } = body;

    // Validate required fields
    if (!type || !title || !message || !recipientId) {
      return errorResponses.badRequest(
        "Type, title, message, and recipientId are required",
      );
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return errorResponses.notFound("Recipient not found");
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        senderId: parseInt(session.user.id),
        recipientId,
        relatedEntity,
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
      message: "Notification created successfully",
      status: 201,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return errorResponses.serverError("Failed to create notification");
  }
}
