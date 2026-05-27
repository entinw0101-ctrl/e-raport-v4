"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { ImportJob } from "@/hooks/use-import-template-job"

interface ImportJobProgressCardProps {
  job: ImportJob | null
  isProcessing: boolean
  onResume: (jobId: string) => void
  onRetry: () => void
}

export function ImportJobProgressCard({ job, isProcessing, onResume, onRetry }: ImportJobProgressCardProps) {
  if (!job) return null

  const percentage = job.total_batches > 0 ? (job.selesai_batches / job.total_batches) * 100 : 0
  const canResume = job.status === "PENDING" || job.status === "PROCESSING"
  const canRetry = job.status === "PARTIAL_FAILED" || job.status === "FAILED"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Import Batch</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percentage} />
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div><p className="text-muted-foreground">Status</p><p className="font-medium">{job.status}</p></div>
          <div><p className="text-muted-foreground">Batch Selesai</p><p className="font-medium">{job.selesai_batches} / {job.total_batches}</p></div>
          <div><p className="text-muted-foreground">Siswa Diproses</p><p className="font-medium">{job.processed_siswa} / {job.total_siswa}</p></div>
          <div><p className="text-muted-foreground">Batch Gagal</p><p className="font-medium">{job.gagal_batches}</p></div>
        </div>
        {job.batches?.length ? (
          <div className="space-y-1 text-sm">
            {job.batches.map((batch) => (
              <p key={batch.id}>
                Batch {batch.nomor_batch}: {batch.status} (percobaan {batch.percobaan})
                {batch.pesan_error ? ` - ${batch.pesan_error}` : ""}
              </p>
            ))}
          </div>
        ) : null}
        {canResume ? (
          <Button onClick={() => onResume(job.id)} disabled={isProcessing}>
            {isProcessing ? "Memproses..." : "Lanjutkan Proses"}
          </Button>
        ) : null}
        {canRetry ? (
          <Button onClick={onRetry} disabled={isProcessing} variant="outline">
            {isProcessing ? "Memproses..." : "Ulangi Batch Gagal"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
