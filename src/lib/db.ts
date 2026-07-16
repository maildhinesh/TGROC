import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

function createMissingDelegate(modelName: string) {
  const notReadyError = () =>
    new Error(
      `Prisma model delegate \"${modelName}\" is unavailable in the generated client. Regenerate Prisma client and redeploy.`
    );

  return {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    count: async () => 0,
    create: async () => {
      throw notReadyError();
    },
    createMany: async () => {
      throw notReadyError();
    },
    update: async () => {
      throw notReadyError();
    },
    updateMany: async () => {
      throw notReadyError();
    },
    upsert: async () => {
      throw notReadyError();
    },
    delete: async () => {
      throw notReadyError();
    },
    deleteMany: async () => {
      throw notReadyError();
    },
  };
}

export const prisma = new Proxy(prismaClient, {
  get(target, prop, receiver) {
    if (typeof prop !== "string") {
      return Reflect.get(target, prop, receiver);
    }

    if (prop in target) {
      return Reflect.get(target, prop, receiver);
    }

    if (prop.startsWith("$")) {
      return Reflect.get(target, prop, receiver);
    }

    return createMissingDelegate(prop);
  },
}) as PrismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClient;
