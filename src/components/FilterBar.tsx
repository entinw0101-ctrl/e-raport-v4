"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  tingkatanOptions: FilterOption[]
  kelasOptions: FilterOption[]
}

export function FilterBar({
  tingkatanOptions,
  kelasOptions,
}: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize state from URL params
  const [selectedTingkatan, setSelectedTingkatan] = useState<string>(
    searchParams.get('tingkatan') || ""
  )
  const [selectedKelas, setSelectedKelas] = useState<string>(
    searchParams.get('kelas') || ""
  )

  // Filter kelas options based on selected tingkatan
  const filteredKelasOptions = useMemo(() => {
    if (!selectedTingkatan) {
      return kelasOptions
    }

    // Filter kelas that belong to selected tingkatan
    return kelasOptions.filter(
      (kelas) => kelas.value.includes(selectedTingkatan) || kelas.label.includes(selectedTingkatan),
    )
  }, [selectedTingkatan, kelasOptions])

  // Update URL when filters change
  const updateURL = useCallback((tingkatan: string, kelas: string) => {
    const params = new URLSearchParams()

    if (tingkatan && tingkatan !== "all") {
      params.set('tingkatan', tingkatan)
    }

    if (kelas && kelas !== "all") {
      params.set('kelas', kelas)
    }

    // Only update if params actually changed to prevent unnecessary re-renders
    const currentParams = searchParams.toString()
    const newParams = params.toString()

    if (currentParams !== newParams) {
      router.push(`${pathname}?${newParams}`, { scroll: false })
    }
  }, [router, pathname, searchParams])

  // Handle tingkatan change
  const handleTingkatanChange = useCallback((value: string) => {
    const newTingkatan = value === "all" ? "" : value
    setSelectedTingkatan(newTingkatan)

    // Reset kelas when tingkatan changes
    if (selectedKelas) {
      setSelectedKelas("")
      updateURL(newTingkatan, "")
    } else {
      updateURL(newTingkatan, selectedKelas)
    }
  }, [selectedKelas, updateURL])

  // Handle kelas change
  const handleKelasChange = useCallback((value: string) => {
    const newKelas = value === "all" ? "" : value
    setSelectedKelas(newKelas)
    updateURL(selectedTingkatan, newKelas)
  }, [selectedTingkatan, updateURL])

  // Handle reset
  const handleReset = useCallback(() => {
    setSelectedTingkatan("")
    setSelectedKelas("")
    router.push(pathname, { scroll: false })
  }, [router, pathname])

  // Sync state with URL changes (for browser back/forward navigation)
  useEffect(() => {
    const tingkatan = searchParams.get('tingkatan') || ""
    const kelas = searchParams.get('kelas') || ""

    setSelectedTingkatan(tingkatan)
    setSelectedKelas(kelas)
  }, [searchParams])

  const hasActiveFilters = selectedTingkatan || selectedKelas

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filter:</span>

        <Select value={selectedTingkatan || "all"} onValueChange={handleTingkatanChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pilih Tingkatan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tingkatan</SelectItem>
            {tingkatanOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedKelas || "all"}
          onValueChange={handleKelasChange}
          disabled={!selectedTingkatan}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pilih Kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {filteredKelasOptions.map((option: FilterOption) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <X className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
