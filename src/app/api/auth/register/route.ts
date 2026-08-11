import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { guard } from "@/lib/api/guard";
import { readJsonBody } from "@/lib/api/validate";
import { fail, serverError } from "@/lib/api/respond";
import { isValidEmail, validatePassword } from "@/lib/security/sanitize";

export async function POST(req: Request) {
  // IP-keyed on purpose: keying this on email instead would let an attacker
  // exhaust a victim's registration budget rather than their own.
  const g = await guard(req, { auth: false, rateLimit: "register" });
  if (!g.ok) return g.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const { email, password, name } = body.data;

  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
    return fail(400, "Missing required fields");
  }

  const trimmedEmail = email.toLowerCase().trim();
  const trimmedName = name.trim();

  if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
    return fail(400, "Please enter a valid email address");
  }
  if (!trimmedName || trimmedName.length > 100) {
    return fail(400, "Name must be between 1 and 100 characters");
  }
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return fail(400, passwordCheck.message ?? "Invalid password");
  }

  try {
    await connectDB();

    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return fail(409, "Account with this Email already in use");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
    });

    return NextResponse.json(
      { message: "Account created successfully", userName: user.name },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Closes the check-then-create race: two concurrent registrations for
    // the same email both pass the findOne check, but only one insert wins.
    if ((error as { code?: number }).code === 11000) {
      return fail(409, "Account with this Email already in use");
    }
    return serverError("auth.register", error);
  }
}
