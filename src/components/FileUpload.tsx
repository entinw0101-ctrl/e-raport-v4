"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, File, CheckCircle, XCircle, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export interface FileUploadProps {
  title: string
  description: string
  acceptedTypes: string[]
  maxSize: number // in MB
  uploadUrl: string
  onUploadSuccess?: (data: any) => void
  onUploadError?: (error: string) => void
  additionalData?: Record<string, any>
  className?: string
}

export function FileUpload({
  title,
  description,
  acceptedTypes,
  maxSize,
  uploadUrl,
  onUploadSuccess,
  onUploadError,
  additionalData = {},
  className = "",
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; data?: any } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!acceptedTypes.includes(selectedFile.type)) {
      const error = `Format file tidak didukung. Gunakan: ${acceptedTypes.join(", ")}`
      setUploadResult({ success: false, message: error })
      onUploadError?.(error)
      return
    }

    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024
    if (selectedFile.size > maxSizeBytes) {
      const error = `Ukuran file maksimal ${maxSize}MB`
      setUploadResult({ success: false, message: error })
      onUploadError?.(error)
      return
    }

    setFile(selectedFile)
    setUploadResult(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Add additional data
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value.toString())
      })

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (result.success) {
        setUploadResult({ success: true, message: result.message, data: result.data })
        onUploadSuccess?.(result.data)
        toast({
          title: "Berhasil",
          description: result.message,
        })
      } else {
        setUploadResult({ success: false, message: result.error })
        onUploadError?.(result.error)
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = "Terjadi kesalahan saat mengupload file"
      setUploadResult({ success: false, message: errorMessage })
      onUploadError?.(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleReset = () => {
    setFile(null)
    setUploadResult(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(",")}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            <File className="h-4 w-4 mr-2" />
            Pilih File
          </Button>
          <p className="text-sm text-muted-foreground">
            Format yang didukung: {acceptedTypes.join(", ")} | Maksimal {maxSize}MB
          </p>
        </div>

        {/* Selected File Info */}
        {file && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset} disabled={uploading}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Mengupload...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <Alert variant={uploadResult.success ? "default" : "destructive"}>
            {uploadResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertDescription>{uploadResult.message}</AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        {file && !uploadResult?.success && (
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Mengupload..." : "Upload File"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Template Download Component
export interface TemplateDownloadProps {
  title: string
  description: string
  templates: Array<{
    name: string
    description: string
    downloadUrl: string
  }>
  className?: string
}

export function TemplateDownload({ title, description, templates, className = "" }: TemplateDownloadProps) {
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      toast({
        title: "Berhasil",
        description: `Template ${filename} berhasil didownload`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mendownload template",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.map((template, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{template.name}</p>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleDownload(template.downloadUrl, template.name)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
