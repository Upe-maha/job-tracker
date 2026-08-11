
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      photo?: string;
    } & DefaultSession["user"];
  }
  interface User {
    photo?: string;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    photo?: string;
  }
}
