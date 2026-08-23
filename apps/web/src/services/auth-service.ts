import { z } from "zod";
import { findUserByEmail, createUser, hashPassword, verifyPassword } from "@pair/db";
import { AuthError } from "@pair/core";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function omitPasswordHash<T extends { passwordHash: string }>(user: T) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function signUp(email: string, password: string) {
  const parsed = signUpSchema.safeParse({ email, password });
  if (!parsed.success) {
    throw new AuthError(parsed.error.issues[0]?.message ?? "Invalid credentials");
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AuthError("Email already registered");
  }
  const passwordHash = await hashPassword(password);
  const newUser = await createUser(email, passwordHash);
  return omitPasswordHash(newUser);
}

export async function logIn(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AuthError("Invalid credentials");
  }
  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AuthError("Invalid credentials");
  }
  return omitPasswordHash(user);
}
