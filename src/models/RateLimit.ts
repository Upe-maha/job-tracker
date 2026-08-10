import mongoose from 'mongoose'

const RateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. "login:ip:1.2.3.4"
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
})

// TTL index is pure garbage collection — correctness never depends on the
// reaper firing, since every read compares expiresAt to now itself.
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.RateLimit ||
  mongoose.model('RateLimit', RateLimitSchema)
