import { Prisma, PrismaClient } from "@prisma/client/edge";

// Define a type for the global variable to ensure type safety
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create a function to initialize and configure the PrismaClient
const createPrismaClient = (): PrismaClient => {
  // Common Prisma Client options with proper typing
  const prismaOptions: Prisma.PrismaClientOptions = {
    log: [
      { level: "error", emit: "stdout" } as const,
      { level: "warn", emit: "stdout" } as const,
      ...(process.env.NODE_ENV === "development"
        ? [{ level: "query", emit: "event" } as const]
        : []),
    ],
  };

  // Create the Prisma client
  const prisma = new PrismaClient(prismaOptions);

  // Log queries in development
  if (process.env.NODE_ENV === "development") {
    prisma.$on(
      "query" as never,
      (e: { query: string; params: string; duration: number }) => {
        console.log("Query:", e.query);
        console.log("Params:", e.params);
        console.log("Duration:", e.duration, "ms");
      },
    );
  }

  // Handle process termination to properly close the connection
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });

  return prisma;
};

// Check if we're in production or development
const prisma = global.prisma || createPrismaClient();

// In development, store the Prisma instance in the global object
// to prevent multiple instances during hot-reloading
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
