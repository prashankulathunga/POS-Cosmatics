import "server-only";

import bcrypt from "bcryptjs";

import { PAGE_SIZE } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";
import { type UserInput, userSchema } from "@/lib/validations/user";

export async function listUsers(page = 1, query?: string) {
  const where = query
    ? {
        OR: [
          { username: { contains: query, mode: "insensitive" as const } },
          { fullName: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [items, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    page,
    totalCount,
    totalPages: Math.max(Math.ceil(totalCount / PAGE_SIZE), 1),
  };
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username } });
}

export async function saveUser(input: UserInput) {
  const values = userSchema.parse(input);

  const existingUser = await prisma.user.findFirst({
    where: {
      username: values.username,
      NOT: values.id ? { id: values.id } : undefined,
    },
  });

  if (existingUser) {
    throw new Error("Username already exists");
  }

  const existingEmail = values.email
    ? await prisma.user.findFirst({
        where: {
          email: values.email,
          NOT: values.id ? { id: values.id } : undefined,
        },
      })
    : null;

  if (existingEmail) {
    throw new Error("Email already exists");
  }

  const passwordHash = values.password ? await bcrypt.hash(values.password, 12) : undefined;

  if (values.id) {
    return prisma.user.update({
      where: { id: values.id },
      data: {
        username: values.username,
        email: values.email || null,
        fullName: values.fullName,
        role: values.role,
        isActive: values.isActive,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
  }

  if (!passwordHash) {
    throw new Error("Password is required");
  }

  return prisma.user.create({
    data: {
      username: values.username,
      email: values.email || null,
      fullName: values.fullName,
      passwordHash,
      role: values.role,
      isActive: values.isActive,
    },
  });
}

export async function deactivateUser(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
}

