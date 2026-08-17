
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
    /** Step I: set by authorize() from the login form's checkbox. */
    rememberMe?: boolean;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    photo?: string;
    // Step I session claims. All optional: a token issued before that step
    // carries none of them, and @auth/core keeps decoding it happily because
    // AUTH_SECRET did not change. sessionPolicy.normaliseClaims owns what a
    // missing one means — see md/step-i-sessions.md.
    //
    // signedInAt is stamped once and never refreshed, which is the whole point:
    // `iat` is re-issued on every session read, so it can never be compared
    // against passwordChangedAt.
    signedInAt?: number;
    lastSeen?: number;
    checkedAt?: number;
    idleMs?: number;
  }
}
