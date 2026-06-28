
import mongoose from 'mongoose'

// ─── Note Schema ─────────────────────────────────────
const NoteSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'interview_question',   // question asked during interview
        'personal_experience',  // personal feeling or observation
        'experience_log',       // post-failure reflection
        'general'               // any other note
      ],
      default: 'general'
    },

    content: { type: String, required: true },

    // Interview specific fields
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

    // Experience log specific fields
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
    url: { type: String, required: true },    // Cloudinary URL or raw link
    scrapedContent: { type: String, default: '' }, // extracted text for RAG
  },
  { timestamps: true }
)

// ─── Contact Schema ───────────────────────────────────
const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: '' },      // "HR Manager", "Tech Lead"
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

    // ── Core fields ──────────────────────────────────
    company: { type: String, required: true },
    role: { type: String, required: true },
    companyLogo: { type: String, default: '' },  // Cloudinary URL

    status: {
      type: String,
      enum: ['wishlist', 'applied', 'interview', 'offer', 'rejected'],
      default: 'wishlist'
    },

    // ── Job details ──────────────────────────────────
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

    // ── Salary ───────────────────────────────────────
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    salaryCurrency: { type: String, default: 'USD' },

    // ── Dates ────────────────────────────────────────
    appliedDate: { type: Date, default: null },
    deadline: { type: Date, default: null },
    followUpDate: { type: Date, default: null },

    // ── Notes, Files, Contacts ───────────────────────
    notes: [NoteSchema],
    prepFiles: [PrepFileSchema],
    contacts: [ContactSchema],

    // ── Tags ─────────────────────────────────────────
    tags: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.models.Application ||
  mongoose.model('Application', ApplicationSchema)