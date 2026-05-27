"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"

export interface ImportJobBatch {
  id: string
  nomor_batch: number
  status: string
  total_siswa: number
  percobaan: number
  pesan_error?: string | null
}

export interface ImportJob {
  id: string
  status: string
  total_siswa: number
  processed_siswa: number
  total_batches: number
  selesai_batches: number
  gagal_batches: number
  pesan_error?: string | null
  batches?: ImportJobBatch[]
}

export function useImportTemplateJob(storageKey: string, onComplete?: () => void) {
  const { toast } = useToast()
  const completionRef = useRef(onComplete)
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null)
  const [isProcessingBatches, setIsProcessingBatches] = useState(false)

  useEffect(() => {
    completionRef.current = onComplete
  }, [onComplete])

  const processImportJob = useCallback(async (jobId: string) => {
    setIsProcessingBatches(true)
    try {
      let currentJob: ImportJob | null = null
      while (!currentJob || currentJob.status === "PENDING" || currentJob.status === "PROCESSING") {
        const response = await fetch(`/api/upload/excel/combined-template/jobs/${jobId}/process`, { method: "POST" })
        const result = await response.json()
        if (!result.data) {
          throw new Error(result.error || "Gagal memproses batch import")
        }

        const nextJob = result.data as ImportJob
        currentJob = nextJob
        setActiveJob(nextJob)

        if (nextJob.status === "COMPLETED") {
          window.localStorage.removeItem(storageKey)
          toast({ title: "Berhasil", description: "Seluruh batch import berhasil diproses." })
          completionRef.current?.()
          break
        }

        if (nextJob.status === "PARTIAL_FAILED" || nextJob.status === "FAILED") {
          toast({
            title: "Import Belum Selesai",
            description: nextJob.pesan_error || "Ada batch yang gagal. Jalankan ulang batch gagal.",
            variant: "destructive",
          })
          break
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memproses batch import"
      toast({ title: "Proses Tertunda", description: `${message}. Proses dapat dilanjutkan tanpa upload ulang.`, variant: "destructive" })
    } finally {
      setIsProcessingBatches(false)
    }
  }, [storageKey, toast])

  useEffect(() => {
    const savedJobId = window.localStorage.getItem(storageKey)
    if (!savedJobId) return

    void fetch(`/api/upload/excel/combined-template/jobs/${savedJobId}`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.data) {
          window.localStorage.removeItem(storageKey)
          return
        }
        setActiveJob(result.data)
        if (result.data.status === "PENDING" || result.data.status === "PROCESSING") {
          void processImportJob(result.data.id)
        }
      })
  }, [processImportJob, storageKey])

  const startImportJob = useCallback(async (job: ImportJob) => {
    window.localStorage.setItem(storageKey, job.id)
    setActiveJob(job)
    await processImportJob(job.id)
  }, [processImportJob, storageKey])

  const retryFailedBatches = useCallback(async () => {
    if (!activeJob) return
    const response = await fetch(`/api/upload/excel/combined-template/jobs/${activeJob.id}/retry`, { method: "POST" })
    const result = await response.json()
    if (!result.data) {
      toast({ title: "Error", description: result.error || "Gagal menjadwalkan ulang batch", variant: "destructive" })
      return
    }
    setActiveJob(result.data)
    await processImportJob(activeJob.id)
  }, [activeJob, processImportJob, toast])

  return { activeJob, isProcessingBatches, startImportJob, processImportJob, retryFailedBatches }
}
