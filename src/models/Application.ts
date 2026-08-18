import mongoose from 'mongoose'
import {
  APPLICATION_STATUSES,
  INTERVIEW_ROUNDS,
  JOB_TYPES,
  NOTE_OUTCOMES,
  NOTE_TYPES,
  PREP_FILE_TYPES,
  WORK_MODES,
} from '@/shared/schemas/enums'

// Enum members come from @/shared/schemas/enums so the Zod schemas, these
// `enum:` arrays and the TS unions in @/types cannot drift. The spread is
// required: the source arrays are `as const`, and Mongoose's `enum` option
// does not accept a readonly tuple.

// Step F. One optional PDF per note. A nested schema rather than two flat
// fields so "no attachment" is a single null instead of a pair of empty strings
// that could disagree — and `_id: false` because it is a value on the note, not
// a subdocument anything addresses by id.
//
// Only { url, name } is stored: the URL is the file's identity, and it is what
// resolveOwnedFile matches ownership on. See md/step-f-notes-pdf.md — deleting
// the Cloudinary asset needs a publicId that R4 introduces, and Step F
// deliberately does no cleanup at all rather than some.
const NoteAttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
)

// ─── Note Schema ─────────────────────────────────────
const NoteSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [...NOTE_TYPES],
      default: 'general'
    },
    content: { type: String, required: true },
    // `null` is deliberately outside the enum: Mongoose skips enum validation
    // for null/undefined on a non-required path, and null is how "not
    // applicable" is stored. The Zod side models this as .nullish().
    interviewRound: {
      type: String,
      enum: [...INTERVIEW_ROUNDS],
      default: null
    },
    outcome: {
      type: String,
      enum: [...NOTE_OUTCOMES],
      default: null
    },
    whatWentWrong: { type: String, default: '' },
    whatToImprove: { type: String, default: '' },
    attachment: { type: NoteAttachmentSchema, default: null },
  },
  { timestamps: true }
)

// ─── Prep File Schema ─────────────────────────────────
const PrepFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [...PREP_FILE_TYPES],
      required: true
    },
    url: { type: String, required: true },
  },
  { timestamps: true }
)

// ─── Contact Schema ───────────────────────────────────
const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  linkedIn: { type: String, default: '' },
})

// ─── Application Schema ───────────────────────────────
const ApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    companyLogo: { type: String, default: '' },

    status: {
      type: String,
      enum: [...APPLICATION_STATUSES],
      default: 'wishlist'
    },

    jobUrl: { type: String, default: '' },
    jobDescription: { type: String, default: '' },
    location: { type: String, default: '' },

    workMode: {
      type: String,
      enum: [...WORK_MODES],
      default: ''
    },

    jobType: {
      type: String,
      enum: [...JOB_TYPES],
      default: ''
    },

    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    salaryCurrency: { type: String, default: 'USD' },

    appliedDate: { type: Date, default: null },
    deadline: { type: Date, default: null },
    followUpDate: { type: Date, default: null },

    notes: [NoteSchema],
    prepFiles: [PrepFileSchema],
    contacts: [ContactSchema],

    tags: [{ type: String }],
  },
  { timestamps: true }
)

//Performance Indexes for Fast Queries
ApplicationSchema.index({ user: 1, createdAt: -1 })
ApplicationSchema.index({ user: 1, status: 1 })

export default mongoose.models.Application ||
  mongoose.model('Application', ApplicationSchema)