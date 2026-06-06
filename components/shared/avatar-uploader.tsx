"use client"

import { useState, useRef, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera, Loader2, X, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { glass } from "@/lib/utils/glass-variants"
import { toast } from "sonner"
import { FILE_SIZE_LIMITS, ALLOWED_IMAGE_TYPES } from "@/lib/utils/file-validation"
import { formatInitials } from "@/lib/utils/format-initials"

function getCSRFToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/csrf_token=([^;]+)/)
  return match ? match[1] : null
}

interface AvatarUploaderProps {
  /** Current avatar URL (if one exists) */
  currentUrl?: string | null
  /** Called with the new public URL after successful upload */
  onUploadComplete: (url: string) => void
  /** Called when user removes their avatar */
  onRemove?: () => void
  /** Display name for initials fallback */
  displayName?: string
  /** Size class: sm (64px), md (96px), lg (128px) */
  size?: "sm" | "md" | "lg"
  /** Whether the uploader is disabled */
  disabled?: boolean
  className?: string
}

const SIZE_MAP = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
}

const FALLBACK_SIZE_MAP = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
}

export function AvatarUploader({
  currentUrl,
  onUploadComplete,
  onRemove,
  displayName = "User",
  size = "md",
  disabled = false,
  className,
}: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
      toast.error("Please select a valid image file (JPEG, PNG, GIF, or WebP).")
      return
    }

    if (file.size > FILE_SIZE_LIMITS.AVATAR) {
      toast.error(`Image is too large. Maximum size is ${FILE_SIZE_LIMITS.AVATAR / 1024 / 1024}MB.`)
      return
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    // Upload to server
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "avatar")

      const csrfToken = getCSRFToken()
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "X-CSRF-Token": csrfToken || "",
        },
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(err.error || "Upload failed")
      }

      const result = await response.json()
      const publicUrl = result.data?.url || result.url

      if (!publicUrl) throw new Error("No URL returned from upload")

      onUploadComplete(publicUrl)
      toast.success("Profile photo updated")
    } catch (error) {
      console.error("Avatar upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload image. Please try again.")
      setPreviewUrl(null) // Revert preview
    } finally {
      setIsUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [onUploadComplete])

  const handleRemove = useCallback(() => {
    setPreviewUrl(null)
    onRemove?.()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [onRemove])

  const displayUrl = previewUrl || currentUrl

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative group">
        <Avatar className={cn(SIZE_MAP[size], "ring-2 ring-border ring-offset-2 ring-offset-background")}>
          {displayUrl ? (
            <AvatarImage src={displayUrl} alt="Profile photo" className="object-cover" />
          ) : null}
          <AvatarFallback className={cn(
            "bg-muted text-muted-foreground font-bold",
            FALLBACK_SIZE_MAP[size]
          )}>
            {formatInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        {/* Hover overlay for upload */}
        {!disabled && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-full",
              "bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          className={cn("h-8 text-xs gap-1.5", glass("buttonGhost"))}
        >
          {isUploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          {isUploading ? "Uploading..." : currentUrl ? "Change" : "Upload"}
        </Button>

        {currentUrl && onRemove && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={handleRemove}
            className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
          >
            <X className="h-3 w-3" />
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        JPEG, PNG, or WebP. Max {FILE_SIZE_LIMITS.AVATAR / 1024 / 1024}MB.
      </p>
    </div>
  )
}
