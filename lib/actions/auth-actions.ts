"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { createSession, destroySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export async function loginAction(input: LoginInput) {
  const values = loginSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { username: values.username },
  });

  if (!user || !user.isActive) {
    return {
      success: false,
      error: "Invalid username or password",
    };
  }

  const isPasswordValid = await bcrypt.compare(values.password, user.passwordHash);

  if (!isPasswordValid) {
    return {
      success: false,
      error: "Invalid username or password",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

