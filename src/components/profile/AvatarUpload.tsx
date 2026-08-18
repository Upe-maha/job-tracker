// src/components/profile/AvatarUpload.tsx
'use client'

import { useState, useRef } from 'react'
import { useUpload } from '@/hooks/useMutations'
import { MAX_UPLOAD_BYTES } from '@/shared/schemas/common'
import { Camera, Loader2 } from 'lucide-react'

interface AvatarUploadProps {
  currentPhoto?: string
  name: string
  onUpload: (url: string) => void
}

export default function AvatarUpload({
  currentPhoto,
  name,
  onUpload,
}: AvatarUploadProps) {
  const upload = useUpload()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Matches the server's cap, so an oversized image fails here instead of
    // after a full round trip.
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Image too large. Max 5MB.')
      return
    }

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)

    // Upload to Cloudinary
    setUploading(true)
    try {
      const { url } = await upload.mutateAsync({ file, folder: 'avatars' })
      onUpload(url)
    } catch {
      // useUpload reports the real reason as a toast.
      setError('Upload failed. Please try again.')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const displayPhoto = preview ?? currentPhoto
  const initial = name?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="flex flex-col items-center gap-3">

      {/* Avatar circle. The edit affordance is a badge on the corner rather
          than the hover overlay it replaced: the overlay was invisible until
          hovered and unreachable by touch, so on a phone there was no way to
          discover the avatar was editable at all. */}
      <div className="relative">
        <div className="
          w-24 h-24 rounded-full overflow-hidden
          ring-2 ring-border
        ">
          {displayPhoto ? (
            <img
              src={displayPhoto}
              alt="Profile photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="
              w-full h-full bg-primary
              flex items-center justify-center
              text-primary-foreground font-bold text-2xl
            ">
              {initial}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label={uploading ? 'Uploading photo' : 'Change photo'}
          title="Change photo"
          className="
            absolute bottom-0 right-0
            w-11 h-11 lg:w-8 lg:h-8 rounded-full
            bg-primary text-primary-foreground
            ring-2 ring-card
            flex items-center justify-center
            hover:bg-primary/90 disabled:opacity-60
            transition-colors
          "
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 animate-spin" />
          ) : (
            <Camera className="w-5 h-5 lg:w-4 lg:h-4" />
          )}
        </button>
      </div>

      {error && (
        <p className="text-destructive text-xs">{error}</p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}