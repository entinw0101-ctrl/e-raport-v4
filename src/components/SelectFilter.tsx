"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export interface FilterOption {
  value: string | number
  label: string
}

export interface SelectFilterProps {
  label: string
  placeholder?: string
  options?: FilterOption[]
  value?: string | number
  onValueChange?: (value: string | number | undefined) => void
  // Alternative props for API-based filtering
  endpoint?: string
  onChange?: (value: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
}

export function SelectFilter({
  label,
  placeholder = "Pilih...",
  options: initialOptions,
  value,
  onValueChange,
  endpoint,
  onChange,
  disabled = false,
  required = false,
  className = "",
}: SelectFilterProps) {
  const [options, setOptions] = useState<FilterOption[]>(initialOptions || [])
  const [loading, setLoading] = useState(false)

  // Load options from API if endpoint is provided
  useEffect(() => {
    if (endpoint && !initialOptions) {
      const loadOptions = async () => {
        setLoading(true)
        try {
          const response = await fetch(endpoint)
          if (response.ok) {
            const data = await response.json()
            const apiData = data.data || data
            setOptions(
              apiData.map((item: any) => ({
                value: item.id,
                label: item.nama || item.nama_ajaran || item.nama_tingkatan || item.nama_kelas || item.nama_mapel || `${item.nama} - ${item.nis}`,
              }))
            )
          }
        } catch (error) {
          console.error(`Error loading options from ${endpoint}:`, error)
        } finally {
          setLoading(false)
        }
      }

      loadOptions()
    }
  }, [endpoint, initialOptions])

  const handleValueChange = (val: string) => {
    const actualValue = val === "default" ? "" : val

    if (onChange) {
      onChange(actualValue)
    }

    if (onValueChange) {
      onValueChange(actualValue === "" ? undefined : actualValue)
    }
  }

  const displayOptions = initialOptions || options

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Select
        value={value?.toString() || "default"}
        onValueChange={handleValueChange}
        disabled={disabled || loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Loading..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">-- {placeholder} --</SelectItem>
          {displayOptions.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Cascading Select untuk Tahun Ajaran -> Semester -> Tingkatan -> Kelas
export interface CascadingSelectProps {
  onTahunAjaranChange: (tahunAjaranId: number | undefined) => void
  onSemesterChange: (periodeAjaranId: number | undefined) => void
  onTingkatanChange: (tingkatanId: number | undefined) => void
  onKelasChange: (kelasId: number | undefined) => void
  selectedTahunAjaran?: number
  selectedSemester?: number
  selectedTingkatan?: number
  selectedKelas?: number
  className?: string
}

export function CascadingSelect({
  onTahunAjaranChange,
  onSemesterChange,
  onTingkatanChange,
  onKelasChange,
  selectedTahunAjaran,
  selectedSemester,
  selectedTingkatan,
  selectedKelas,
  className = "",
}: CascadingSelectProps) {
  const [tahunAjaranOptions, setTahunAjaranOptions] = useState<FilterOption[]>([])
  const [semesterOptions, setSemesterOptions] = useState<FilterOption[]>([])
  const [tingkatanOptions, setTingkatanOptions] = useState<FilterOption[]>([])
  const [kelasOptions, setKelasOptions] = useState<FilterOption[]>([])

  const [loading, setLoading] = useState({
    tahunAjaran: false,
    semester: false,
    tingkatan: false,
    kelas: false,
  })

  // Load Tahun Ajaran options
  useEffect(() => {
    const loadTahunAjaran = async () => {
      setLoading((prev) => ({ ...prev, tahunAjaran: true }))
      try {
        const response = await fetch("/api/master-tahun-ajaran")
        if (response.ok) {
          const data = await response.json()
          setTahunAjaranOptions(
            data.data.map((item: any) => ({
              value: item.id,
              label: item.nama_ajaran,
            })),
          )
        }
      } catch (error) {
        console.error("Error loading tahun ajaran:", error)
      } finally {
        setLoading((prev) => ({ ...prev, tahunAjaran: false }))
      }
    }

    loadTahunAjaran()
  }, [])

  // Load Semester options when Tahun Ajaran changes
  useEffect(() => {
    if (!selectedTahunAjaran) {
      setSemesterOptions([])
      setTingkatanOptions([])
      setKelasOptions([])
      return
    }

    const loadSemester = async () => {
      setLoading((prev) => ({ ...prev, semester: true }))
      try {
        const response = await fetch(`/api/periode-ajaran?master_tahun_ajaran_id=${selectedTahunAjaran}`)
        if (response.ok) {
          const data = await response.json()
          setSemesterOptions(
            data.data.map((item: any) => ({
              value: item.id,
              label: item.nama_ajaran,
            })),
          )
        }
      } catch (error) {
        console.error("Error loading semester:", error)
      } finally {
        setLoading((prev) => ({ ...prev, semester: false }))
      }
    }

    loadSemester()
  }, [selectedTahunAjaran])

  // Load Tingkatan options when Semester changes
  useEffect(() => {
    if (!selectedSemester) {
      setTingkatanOptions([])
      setKelasOptions([])
      return
    }

    const loadTingkatan = async () => {
      setLoading((prev) => ({ ...prev, tingkatan: true }))
      try {
        const response = await fetch("/api/tingkatan")
        if (response.ok) {
          const data = await response.json()
          setTingkatanOptions(
            data.data.map((item: any) => ({
              value: item.id,
              label: item.nama_tingkatan,
            })),
          )
        }
      } catch (error) {
        console.error("Error loading tingkatan:", error)
      } finally {
        setLoading((prev) => ({ ...prev, tingkatan: false }))
      }
    }

    loadTingkatan()
  }, [selectedSemester])

  // Load Kelas options when Tingkatan changes
  useEffect(() => {
    if (!selectedTingkatan) {
      setKelasOptions([])
      return
    }

    const loadKelas = async () => {
      setLoading((prev) => ({ ...prev, kelas: true }))
      try {
        const response = await fetch(`/api/kelas?tingkatan_id=${selectedTingkatan}&per_page=1000`)
        if (response.ok) {
          const data = await response.json()
          setKelasOptions(
            data.data.map((item: any) => ({
              value: item.id,
              label: item.nama_kelas,
            })),
          )
        }
      } catch (error) {
        console.error("Error loading kelas:", error)
      } finally {
        setLoading((prev) => ({ ...prev, kelas: false }))
      }
    }

    loadKelas()
  }, [selectedTingkatan])

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <SelectFilter
        label="Tahun Ajaran"
        placeholder="Pilih Tahun Ajaran"
        options={tahunAjaranOptions}
        value={selectedTahunAjaran}
        onValueChange={(value) => {
          onTahunAjaranChange(value ? Number(value) : undefined)
          onSemesterChange(undefined)
          onTingkatanChange(undefined)
          onKelasChange(undefined)
        }}
        disabled={loading.tahunAjaran}
        required
      />

      <SelectFilter
        label="Semester"
        placeholder="Pilih Semester"
        options={semesterOptions}
        value={selectedSemester}
        onValueChange={(value) => {
          onSemesterChange(value ? Number(value) : undefined)
          onTingkatanChange(undefined)
          onKelasChange(undefined)
        }}
        disabled={!selectedTahunAjaran || loading.semester}
        required
      />

      <SelectFilter
        label="Tingkatan"
        placeholder="Pilih Tingkatan"
        options={tingkatanOptions}
        value={selectedTingkatan}
        onValueChange={(value) => {
          onTingkatanChange(value ? Number(value) : undefined)
          onKelasChange(undefined)
        }}
        disabled={!selectedSemester || loading.tingkatan}
      />

      <SelectFilter
        label="Kelas"
        placeholder="Pilih Kelas"
        options={kelasOptions}
        value={selectedKelas}
        onValueChange={(value) => onKelasChange(value ? Number(value) : undefined)}
        disabled={!selectedTingkatan || loading.kelas}
      />
    </div>
  )
}
