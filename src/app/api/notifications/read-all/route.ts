import { NextRequest } from "next/server";
import { createApiResponse, errorResponses } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * @swagger
 * /api/notifications/read-all:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     description: Mark all unread notifications as read for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponses.unauthorized();
    }

    // Mark all unread notifications as read
    const result = await prisma.notification.updateMany({
      where: {
        recipientId: parseInt(session.user.id),
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return createApiResponse({
      message: "All notifications marked as read",
      data: { count: result.count },
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return errorResponses.serverError("Failed to mark notifications as read");
  }
}
