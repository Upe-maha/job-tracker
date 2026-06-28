import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import User from "@/models/User";
import bcrypt from "bcryptjs";


export async function POST(req: Request) {
    try {
        const { email, password, name } = await req.json();

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        await connectDB();

        const existing = await User.findOne({ email: email.toLowerCase()});
        if (existing) {
            return NextResponse.json(
                { error: "Account with this Email already in use" },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
        })

        return NextResponse.json(
            { message: 'Account created successfully', userId: user._id, userName: user.name },
            { status: 201 }
        )

    }catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}