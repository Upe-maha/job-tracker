import mongoose from 'mongoose'
import { TOKEN_TYPES } from '@/lib/schemas/enums'

// Step C. A separate collection rather than an array on User: these expire, and
// wanting a TTL index is the same reason RateLimit has its own collection.
const TokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: [...TOKEN_TYPES], required: true },

    // SHA-256 of the raw token, never the token itself. A read-only leak of
    // this collection would otherwise hand over live, click-to-use reset links
    // for every pending request.
    //
    // SHA-256 and not bcrypt on purpose: bcrypt's work factor exists to slow
    // brute force against low-entropy human passwords, and these are 256 bits
    // of CSPRNG output. Bcrypt here would add ~250ms to every link click and
    // buy nothing.
    tokenHash: { type: String, required: true, unique: true },

    // password_change only — the bcrypt hash of the new password, held here
    // until the emailed link confirms it. select: false for the same reason
    // User.password is, so it can never ride along on an incidental read.
    pendingPassword: { type: String, select: false, default: null },

    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

// At most one live token per user per type. This is what makes issueToken's
// single upsert atomic: two concurrent resends cannot both insert, so the array
// of live tokens can never grow past one and "resend" reliably invalidates the
// previous link.
TokenSchema.index({ userId: 1, type: 1 }, { unique: true })

// Garbage collection only — correctness never depends on the reaper firing.
// Mongo's TTL monitor runs about once a minute, so an expired token stays
// readable for a while; consumeToken compares expiresAt to now in the query
// itself, which is what actually enforces expiry.
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.Token || mongoose.model('Token', TokenSchema)
