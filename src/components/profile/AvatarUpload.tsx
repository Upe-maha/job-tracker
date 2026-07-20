// src/components/profile/AvatarUpload.tsx
'use client'

import { useState, useRef } from 'react'
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

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)

    // Upload to Cloudinary
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'avatars')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        setPreview(null)
        return
      }

      onUpload(data.url)

    } catch (err) {
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

      {/* Avatar circle */}
      <div className="relative group">
        <div className="
          w-20 h-20 rounded-full overflow-hidden
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

          {/* Upload overlay */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="
              absolute inset-0
              bg-black/50 opacity-0 group-hover:opacity-100
              flex items-center justify-center
              transition-opacity duration-150
              rounded-full
            "
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Click to upload text */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs text-primary hover:underline disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Change photo'}
      </button>

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