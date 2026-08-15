
import mongoose from 'mongoose'
import { JOB_SEARCH_STATUSES, OAUTH_PROVIDERS } from '@/lib/schemas/enums'

// One entry per linked OAuth provider. Embedded rather than a separate
// collection, matching how notes/contacts/prepFiles hang off Application —
// and it keeps the user document the single source of truth, which is the
// whole reason Step B skips a NextAuth adapter.
const LinkedAccountSchema = new mongoose.Schema(
  {
    // Was a free-form String with the members in a trailing comment, so the
    // one enumerated field the DB never enforced was the one identifying an
    // auth provider.
    provider: { type: String, enum: [...OAUTH_PROVIDERS], required: true },
    providerAccountId: { type: String, required: true }, // provider's subject id
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const UserSchema = new mongoose.Schema(
  {
    // Auth
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Not required: OAuth-only users have no password. Credentials login stays
    // safe because authorize() compares against DUMMY_HASH when it's absent,
    // so such an account gets the generic 'credentials' error, never a crash.
    password: { type: String, select: false },
    accounts: { type: [LinkedAccountSchema], default: [] },
    emailVerified: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },

    // Profile
    photo: { type: String, default: '' },        // Cloudinary URL
    bio: { type: String, default: '' },
    location: { type: String, default: '' },
    phone: { type: String, default: '' },
    linkedIn: { type: String, default: '' },
    portfolio: { type: String, default: '' },

    // Resume
    resume: { type: String, default: '' },       // Cloudinary URL

    // Preferences
    currency: { type: String, default: 'USD' },
    jobSearchStatus: {
      type: String,
      enum: [...JOB_SEARCH_STATUSES],
      default: 'actively_looking'
    },
  },
  { timestamps: true }
)

// The lookup the signIn callback does first on every OAuth sign-in, and the
// backstop that stops one provider account being linked to two users — the
// invariant resolveOAuthUser's $elemMatch relies on.
//
// partialFilterExpression is mandatory, not an optimization. This is a
// multikey index over two paths inside an array, so a user with `accounts: []`
// — i.e. every credentials-only user — keys as (null, null). Under a plain
// `unique: true` the second such user collides with the first and the index
// build fails for the whole collection.
UserSchema.index(
  { 'accounts.provider': 1, 'accounts.providerAccountId': 1 },
  { unique: true, partialFilterExpression: { 'accounts.provider': { $exists: true } } }
)

export default mongoose.models.User ||
  mongoose.model('User', UserSchema)