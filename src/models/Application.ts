import mongoose from 'mongoose'

// ─── Note Schema ─────────────────────────────────────
const NoteSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['interview_question', 'personal_experience', 'experience_log', 'general'],
      default: 'general'
    },
    content: { type: String, required: true },
    interviewRound: {
      type: String,
      enum: ['round_1', 'round_2', 'hr', 'technical', 'final', 'other'],
      default: null
    },
    outcome: {
      type: String,
      enum: ['passed', 'failed', 'waiting'],
      default: null
    },
    whatWentWrong: { type: String, default: '' },
    whatToImprove: { type: String, default: '' },
  },
  { timestamps: true }
)

// ─── Prep File Schema ─────────────────────────────────
const PrepFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['pdf', 'link'],
      required: true
    },
    url: { type: String, required: true },
    scrapedContent: { type: String, default: '' },
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
      enum: ['wishlist', 'applied', 'interview', 'offer', 'rejected'],
      default: 'wishlist'
    },

    jobUrl: { type: String, default: '' },
    jobDescription: { type: String, default: '' },
    location: { type: String, default: '' },

    workMode: {
      type: String,
      enum: ['remote', 'hybrid', 'on-site', ''],
      default: ''
    },

    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', ''],
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