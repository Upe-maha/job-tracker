
import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    // Auth
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

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
      enum: ['actively_looking', 'open', 'not_looking'],
      default: 'actively_looking'
    },
  },
  { timestamps: true }
)

export default mongoose.models.User ||
  mongoose.model('User', UserSchema)