"use client"

import { useState, useEffect } from "react"
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
  selectedTingkatan?: string
  selectedKelas?: string
  onTingkatanChange: (value: string) => void
  onKelasChange: (value: string) => void
  onReset: () => void
}

export function FilterBar({
  tingkatanOptions,
  kelasOptions,
  selectedTingkatan,
  selectedKelas,
  onTingkatanChange,
  onKelasChange,
  onReset,
}: FilterBarProps) {
  const [filteredKelasOptions, setFilteredKelasOptions] = useState<FilterOption[]>(kelasOptions)

  useEffect(() => {
    if (selectedTingkatan) {
      // Filter kelas that belong to selected tingkatan
      // This assumes kelas options have tingkatan info in their value or we need to fetch filtered data
      setFilteredKelasOptions(
        kelasOptions.filter(
          (kelas) => kelas.value.includes(selectedTingkatan) || kelas.label.includes(selectedTingkatan),
        ),
      )
    } else {
      setFilteredKelasOptions(kelasOptions)
    }
  }, [selectedTingkatan, kelasOptions])

  const handleTingkatanChange = (value: string) => {
    onTingkatanChange(value)
    if (selectedKelas) {
      onKelasChange("")
    }
  }

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

        <Select value={selectedKelas || "all"} onValueChange={onKelasChange} disabled={!selectedTingkatan}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pilih Kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {filteredKelasOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onReset}>
            <X className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
