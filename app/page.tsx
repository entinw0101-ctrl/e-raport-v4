"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  Users,
  Send,
  ArrowRight,
  Check,
  FileText,
  Upload,
  UserCheck,
  Sparkles,
  Info,
  ChevronRight
} from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import Link from "next/link"

// Illustrations for Onboarding Steps (Clean SVG vectors using theme colors)
function Step1Illustration() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full text-primary" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(50, 240)">
        <ellipse cx="0" cy="10" rx="20" ry="8" fill="currentColor" className="opacity-20" />
        <rect x="-8" y="-20" width="16" height="30" rx="8" fill="currentColor" className="opacity-40" />
        <circle cx="-5" cy="-25" r="8" fill="currentColor" />
        <circle cx="5" cy="-22" r="6" fill="currentColor" />
      </g>
      <g transform="translate(340, 240)">
        <rect x="-25" y="0" width="50" height="12" rx="2" fill="currentColor" className="opacity-40" />
        <rect x="-22" y="-12" width="44" height="12" rx="2" fill="currentColor" />
        <rect x="-20" y="-24" width="40" height="12" rx="2" fill="currentColor" className="opacity-40" />
        <path
          d="M -15 -30 Q -10 -35, -5 -30 L -5 -25 Q -10 -20, -15 -25 Z"
          fill="currentColor"
        />
      </g>
      <g transform="translate(240, 120)">
        <rect x="-80" y="-60" width="160" height="100" rx="8" fill="currentColor" className="opacity-20" />
        <rect x="-75" y="-55" width="150" height="85" rx="4" fill="currentColor" className="text-card fill-card" />
        <text
          x="0"
          y="-20"
          textAnchor="middle"
          className="text-[14px] font-bold fill-primary"
          style={{ fontFamily: "system-ui" }}
        >
          E-RAPOT
        </text>
        <text
          x="0"
          y="0"
          textAnchor="middle"
          className="text-[10px] fill-foreground"
          style={{ fontFamily: "system-ui" }}
        >
          Nuurush Sholaah
        </text>
        <rect x="-10" y="-35" width="20" height="3" rx="1.5" fill="currentColor" className="opacity-20" />
        <rect x="-10" y="15" width="20" height="3" rx="1.5" fill="currentColor" className="opacity-40" />
        <rect x="-5" y="40" width="10" height="20" fill="currentColor" className="opacity-20" />
        <rect x="-30" y="60" width="60" height="8" rx="4" fill="currentColor" className="opacity-20" />
      </g>
      <g transform="translate(120, 140)">
        <circle cx="0" cy="0" r="30" fill="currentColor" className="opacity-20" />
        <path d="M -30 0 Q -35 -20, -20 -35 L 20 -35 Q 35 -20, 30 0 Z" fill="currentColor" />
        <path
          d="M -25 25 L -40 120 L -25 160 L 25 160 L 40 120 L 25 25 Z"
          fill="currentColor"
        />
        <ellipse cx="-35" cy="70" rx="10" ry="40" fill="currentColor" />
        <ellipse cx="35" cy="70" rx="10" ry="40" fill="currentColor" />
        <circle cx="-35" cy="110" r="8" fill="currentColor" className="opacity-20" />
        <circle cx="35" cy="110" r="8" fill="currentColor" className="opacity-20" />
      </g>
    </svg>
  )
}

function Step2Illustration() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full text-primary" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(280, 80)">
        <rect
          x="-30"
          y="-20"
          width="60"
          height="40"
          rx="4"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-40"
        />
        <rect x="-20" y="-10" width="15" height="3" rx="1.5" fill="currentColor" />
        <rect x="-20" y="-3" width="25" height="3" rx="1.5" fill="currentColor" className="opacity-20" />
        <rect x="-20" y="4" width="20" height="3" rx="1.5" fill="currentColor" className="opacity-20" />
        <polygon points="-5,-18 0,-12 -5,-15 0,-9 -5,-12" fill="currentColor" className="text-accent" />
      </g>
      <g transform="translate(300, 200)">
        <rect
          x="-35"
          y="-25"
          width="70"
          height="50"
          rx="4"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-40"
        />
        <polyline
          points="-25,-10 -15,5 -5,-5 5,10 15,0 25,8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-accent"
        />
        <circle cx="0" cy="-5" r="3" fill="currentColor" />
        <circle cx="-10" cy="5" r="2" fill="currentColor" className="text-accent" />
        <circle cx="10" cy="5" r="2" fill="currentColor" className="text-accent" />
      </g>
      <g transform="translate(100, 80)">
        <circle cx="0" cy="0" r="35" fill="currentColor" />
        <circle cx="0" cy="0" r="28" fill="currentColor" />
        <path
          d="M -10 0 L -3 10 L 12 -10"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-card"
        />
        <path d="M 15 -15 Q 25 -20, 20 -5 L 15 0 Q 10 -5, 15 -15 Z" fill="currentColor" className="text-accent" />
      </g>
      <g transform="translate(150, 180)">
        <circle cx="0" cy="0" r="25" fill="currentColor" className="opacity-20" />
        <path d="M -25 0 Q -28 -15, -18 -28 L 18 -28 Q 28 -15, 25 0 Z" fill="currentColor" />
        <path d="M -20 20 L -30 90 L -20 120 L 20 120 L 30 90 L 20 20 Z" fill="currentColor" />
        <ellipse cx="-28" cy="55" rx="8" ry="30" fill="currentColor" />
        <ellipse cx="28" cy="55" rx="8" ry="30" fill="currentColor" />
        <circle cx="-28" cy="85" r="7" fill="currentColor" className="opacity-20" />
        <circle cx="28" cy="85" r="7" fill="currentColor" className="opacity-20" />
      </g>
    </svg>
  )
}

function Step3Illustration() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full text-primary" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(240, 120)">
        <line x1="0" y1="0" x2="60" y2="-40" stroke="currentColor" strokeWidth="2" className="text-accent" />
        <line x1="0" y1="0" x2="70" y2="-10" stroke="currentColor" strokeWidth="2" className="text-accent" />
        <line x1="0" y1="0" x2="65" y2="20" stroke="currentColor" strokeWidth="2" className="text-accent" />
      </g>
      <g transform="translate(320, 100)">
        <path d="M 0 0 L -15 -8 L -12 0 L -15 8 Z" fill="currentColor" className="text-accent" />
        <circle cx="0" cy="0" r="3" fill="currentColor" className="text-accent" />
        <polygon points="0,-8 2,-3 8,0 2,3 0,8 -2,3 -8,0 -2,-3" fill="currentColor" />
      </g>
      <g transform="translate(240, 120)">
        <rect x="-45" y="-60" width="90" height="120" rx="6" fill="currentColor" className="opacity-20" />
        <rect x="-40" y="-55" width="80" height="105" rx="3" fill="currentColor" className="text-card fill-card" />
        <text
          x="0"
          y="-35"
          textAnchor="middle"
          className="text-[8px] font-bold fill-foreground"
          style={{ fontFamily: "system-ui" }}
        >
          RAPOR SANTRI
        </text>
        <text
          x="0"
          y="-25"
          textAnchor="middle"
          className="text-[6px] fill-foreground"
          style={{ fontFamily: "system-ui" }}
        >
          Nuurush Sholaah
        </text>
        <rect x="-25" y="-15" width="50" height="3" rx="1.5" fill="currentColor" className="opacity-20" />
        <rect x="-25" y="-8" width="35" height="3" rx="1.5" fill="currentColor" className="opacity-20" />
        <rect x="-30" y="5" width="45" height="4" rx="2" fill="currentColor" />
        <rect x="-30" y="15" width="50" height="4" rx="2" fill="currentColor" className="text-accent" />
        <rect x="-30" y="25" width="40" height="4" rx="2" fill="currentColor" />
        <circle cx="0" cy="45" r="8" fill="currentColor" className="text-accent" />
        <path
          d="M -3 45 L -1 48 L 4 39"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-card"
        />
        <path d="M 8 35 Q 12 32, 10 38 L 8 40 Q 6 38, 8 35 Z" fill="currentColor" />
      </g>
      <g transform="translate(120, 160)">
        <circle cx="0" cy="0" r="28" fill="currentColor" className="opacity-20" />
        <path d="M -28 0 Q -30 -18, -20 -30 L 20 -30 Q 30 -18, 28 0 Z" fill="currentColor" />
        <path
          d="M -22 22 L -32 100 L -22 135 L 22 135 L 32 100 L 22 22 Z"
          fill="currentColor"
        />
        <ellipse cx="-30" cy="60" rx="9" ry="35" fill="currentColor" />
        <ellipse cx="30" cy="60" rx="9" ry="35" fill="currentColor" />
        <circle cx="-30" cy="95" r="7" fill="currentColor" className="opacity-20" />
        <circle cx="30" cy="95" r="7" fill="currentColor" className="opacity-20" />
        <polygon points="-5,70 -3,75 0,73 3,75 5,70 2,72 0,68 -2,72" fill="currentColor" className="text-accent" />
      </g>
    </svg>
  )
}

export default function LandingDashboardPage() {
  const [activeTab, setActiveTab] = useState<"ujian" | "hafalan" | "kehadiran" | "sikap">("ujian")
  const [guideOpen, setGuideOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: "Selamat Datang",
      subtitle: "E-Raport Nuurush Sholaah",
      description:
        "Platform terintegrasi untuk mengelola nilai dan rapot santri Pondok Pesantren Nuurush Sholaah dengan mudah dan efisien. Sistem modern yang memudahkan pengelolaan data akademik santri.",
      illustration: <Step1Illustration />,
      icon: BookOpen,
    },
    {
      title: "Kelola Data Santri",
      subtitle: "Organisasi Terstruktur",
      description:
        "Input, pantau, dan kelola nilai ujian, hafalan, kehadiran, dan sikap santri dengan antarmuka yang intuitif dan terorganisir. Semua data tersimpan aman dan mudah diakses kapan saja.",
      illustration: <Step2Illustration />,
      icon: Users,
    },
    {
      title: "Generate Rapot",
      subtitle: "Laporan Berkualitas",
      description:
        "Buat rapot modern dengan template Word, generate surat keluar, dan bagikan informasi perkembangan santri kapan saja. Proses otomatis yang menghemat waktu dan tenaga.",
      illustration: <Step3Illustration />,
      icon: Send,
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setGuideOpen(false)
      setCurrentStep(0)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Fade-in Stagger variants for Hero components
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.05 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  }

  return (
    <div className="w-full space-y-12 pb-12 relative">
      {/* Decorative Background Mesh Blobs (strictly transparent overlays based on global primary/accent opacity) */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] -z-10 pointer-events-none" />

      {/* HERO SECTION */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center"
      >
        {/* Hero Left Content */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Sistem Informasi Rapot Digital</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-balance">
            Manajemen Rapor Santri Jadi Lebih{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Cepat & Akurat
            </span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-base text-muted-foreground leading-relaxed text-pretty">
            Platform modern khusus untuk Pondok Pesantren Nuurush Sholaah. Kelola nilai ujian, rekam hafalan kitab, catat kehadiran, akhlak, hingga pembuatan dokumen rapor instan tanpa kendala performa.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
            <Link href="/dashboard">
              <Button size="lg" className="font-semibold shadow-lg shadow-primary/10 px-6 h-11 text-sm">
                Buka Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setCurrentStep(0)
                setGuideOpen(true)
              }}
              className="font-semibold border-2 h-11 px-5 text-sm"
            >
              <Info className="w-4 h-4 mr-2" />
              Panduan Sistem
            </Button>
          </motion.div>
        </div>

        {/* Hero Right: Interactive Dashboard Preview Card Mockup */}
        <motion.div 
          variants={itemVariants} 
          className="lg:col-span-6 w-full max-w-xl mx-auto"
        >
          <Card className="border border-border/85 bg-card/90 shadow-xl rounded-xl overflow-hidden backdrop-blur-sm">
            {/* Mock App Window Header */}
            <div className="flex items-center justify-between border-b border-border/40 bg-secondary/50 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                <span className="text-[10px] text-muted-foreground ml-2 font-mono">pratinjau-raport-digital.id</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <UserCheck className="w-3 h-3 text-primary" />
                <span className="font-semibold">Aktif</span>
              </div>
            </div>

            {/* Student Bio Info inside Mockup */}
            <div className="p-4 bg-card border-b border-border/40 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  AF
                </div>
                <div>
                  <h4 className="font-bold text-xs">Ahmad Fauzi</h4>
                  <span className="text-[10px] text-muted-foreground block">NIS: 1204990 / Kelas VIII-A</span>
                </div>
              </div>
              <div className="text-right text-[10px]">
                <span className="text-muted-foreground block">Semester</span>
                <span className="font-semibold block">Ganjil (T.A. 2025/2026)</span>
              </div>
            </div>

            {/* Interactive Tabs inside Mockup */}
            <div className="px-3 pt-2 bg-secondary/30 flex gap-1 border-b border-border/40 overflow-x-auto scrollbar-none">
              {[
                { id: "ujian", label: "Nilai Ujian" },
                { id: "hafalan", label: "Hafalan" },
                { id: "kehadiran", label: "Kehadiran" },
                { id: "sikap", label: "Adab/Sikap" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-3.5 py-1.5 text-[11px] font-semibold rounded-t-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-card text-primary border-t border-x border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents Container */}
            <div className="p-5 h-[190px] flex flex-col justify-between">
              <AnimatePresence mode="wait">
                {activeTab === "ujian" && (
                  <motion.div
                    key="ujian"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-3"
                  >
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-[11px] font-medium mb-1">
                          <span>Bahasa Arab (Nahwu & Sharaf)</span>
                          <span className="font-bold text-primary">9.4 (Istimewa)</span>
                        </div>
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: "94%" }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-medium mb-1">
                          <span>Fiqih Ibadah</span>
                          <span className="font-bold text-primary">8.8 (Sangat Baik)</span>
                        </div>
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: "88%" }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-medium mb-1">
                          <span>Hadits & Akhlak</span>
                          <span className="font-bold text-accent">8.0 (Baik)</span>
                        </div>
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div className="bg-accent h-full rounded-full" style={{ width: "80%" }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "hafalan" && (
                  <motion.div
                    key="hafalan"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 bg-secondary/40 rounded-lg">
                        <span className="text-muted-foreground block mb-0.5">Target Kitab</span>
                        <span className="font-bold block text-primary">Imrithi & Juz 29</span>
                      </div>
                      <div className="p-2 bg-secondary/40 rounded-lg">
                        <span className="text-muted-foreground block mb-0.5">Status Capaian</span>
                        <span className="font-bold block text-emerald-600 dark:text-emerald-400">Tercapai</span>
                      </div>
                      <div className="p-2 bg-secondary/40 rounded-lg">
                        <span className="text-muted-foreground block mb-0.5">Batas Hafalan Terakhir</span>
                        <span className="font-semibold block">Bait 150 (Bab Fail)</span>
                      </div>
                      <div className="p-2 bg-secondary/40 rounded-lg">
                        <span className="text-muted-foreground block mb-0.5">Predikat Ujian</span>
                        <span className="font-bold block text-primary">Mumtaz (A+)</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "kehadiran" && (
                  <motion.div
                    key="kehadiran"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative size-16 flex items-center justify-center bg-secondary/50 rounded-full border border-border">
                        <span className="text-xs font-bold text-primary">96.5%</span>
                        <span className="text-[6px] text-muted-foreground block absolute bottom-2">Kehadiran</span>
                      </div>
                      <div className="flex-1 space-y-1.5 text-[10px]">
                        <div className="flex justify-between border-b border-border/40 pb-1">
                          <span className="text-muted-foreground">Sakit</span>
                          <span className="font-semibold">0 Hari</span>
                        </div>
                        <div className="flex justify-between border-b border-border/40 pb-1">
                          <span className="text-muted-foreground">Izin (Pulang/Syar'i)</span>
                          <span className="font-semibold">2 Hari</span>
                        </div>
                        <div className="flex justify-between border-b border-border/40 pb-1">
                          <span className="text-muted-foreground">Alpha (Tanpa Keterangan)</span>
                          <span className="font-semibold">0 Hari</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "sikap" && (
                  <motion.div
                    key="sikap"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-2"
                  >
                    <div className="space-y-2 text-[10px]">
                      <div className="flex justify-between items-center p-1.5 bg-secondary/30 rounded-lg">
                        <span className="font-medium">Adab & Sopan Santun</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary font-bold rounded-md">Sangat Baik (A)</span>
                      </div>
                      <div className="flex justify-between items-center p-1.5 bg-secondary/30 rounded-lg">
                        <span className="font-medium">Kerajinan & Istiqomah</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary font-bold rounded-md">Sangat Baik (A)</span>
                      </div>
                      <div className="flex justify-between items-center p-1.5 bg-secondary/30 rounded-lg">
                        <span className="font-medium">Kerapihan & Kebersihan</span>
                        <span className="px-2 py-0.5 bg-accent/15 text-accent-foreground font-bold rounded-md">Baik (B)</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Subtitle Footer info in Mockup Card */}
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground border-t border-border/40 pt-2 mt-auto">
                <Info className="w-3 h-3" />
                <span>Tekan tombol di atas untuk melihat data evaluasi lainnya.</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.section>

      {/* FEATURES BENTO GRID SECTION */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Kemudahan Pengelolaan Rapot Digital
          </h2>
          <p className="text-sm text-muted-foreground">
            Dirancang khusus dengan fitur unggulan untuk mempermudah tugas asatidzah dan pengurus Pondok Pesantren Nuurush Sholaah.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Bento Card 1: Excel Bulk Import */}
          <Card className="p-6 border border-border/70 hover:border-primary/40 hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Upload className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base group-hover:text-primary transition-colors">Bulk Import Excel</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Unggah seluruh lembar nilai santri sekaligus. Didukung SQL bulk upsert teroptimasi tanpa kendala batas waktu timeout.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-primary gap-1">
              <span>Pelajari Selengkapnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Card>

          {/* Bento Card 2: Monitoring Hafalan */}
          <Card className="p-6 border border-border/70 hover:border-primary/40 hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base group-hover:text-primary transition-colors">Evaluasi Hafalan</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pantau target kitab kuning dan setoran juz Al-Qur'an santri sesuai tingkatan kelas dengan status yang mudah diverifikasi.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-primary gap-1">
              <span>Pelajari Selengkapnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Card>

          {/* Bento Card 3: Kehadiran & Sikap */}
          <Card className="p-6 border border-border/70 hover:border-primary/40 hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base group-hover:text-primary transition-colors">Absensi & Sikap</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kelola data ketidakhadiran (sakit/izin/alpha) serta rekapitulasi penilaian adab/karakter sikap santri yang otomatis.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-primary gap-1">
              <span>Pelajari Selengkapnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Card>

          {/* Bento Card 4: Word Docx Generator */}
          <Card className="p-6 border border-border/70 hover:border-primary/40 hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <FileText className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base group-hover:text-primary transition-colors">Cetak Rapor Instan</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Generate file rapor lengkap dalam format Microsoft Word (.docx) instan siap print dan bagikan kepada walisantri.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-primary gap-1">
              <span>Pelajari Selengkapnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Card>
        </div>
      </section>

      {/* QUICK STATS SECTION */}
      <section className="bg-secondary/30 border border-border/30 rounded-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div>
          <span className="text-2xl sm:text-3xl font-extrabold block text-primary">5+ Sheet</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Gabungan Template Data</span>
        </div>
        <div>
          <span className="text-2xl sm:text-3xl font-extrabold block text-primary">100%</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">SQL Upsert Terlindungi</span>
        </div>
        <div>
          <span className="text-2xl sm:text-3xl font-extrabold block text-primary">&lt;1 Detik</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Waktu Proses Per Batch</span>
        </div>
        <div>
          <span className="text-2xl sm:text-3xl font-extrabold block text-primary">Instan</span>
          <span className="text-[10px] text-muted-foreground mt-1 block">Word Rapor Generation</span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40 pt-6 text-center text-[10px] text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">
          Pondok Pesantren Nuurush Sholaah
        </p>
        <p>
          © 2026 E-Rapot Nuurush Sholaah. Hak Cipta Dilindungi Undang-Undang.
        </p>
        <p className="italic">
          "Cahaya Shalat Menerangi Jalan Ilmu dan Akhlak Karimah"
        </p>
      </footer>

      {/* INTERACTIVE ONBOARDING DIALOG (Reusing previous step slider in a modern overlay modal) */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border border-border bg-card shadow-2xl rounded-xl">
          <div className="flex flex-col h-[500px]">
            {/* Modal Image/Illustration Area */}
            <div className="h-[200px] bg-secondary/30 flex items-center justify-center p-6 border-b border-border/40">
              <div className="w-full h-full max-w-[240px]">
                {steps[currentStep].illustration}
              </div>
            </div>

            {/* Modal Text Content Area */}
            <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  Langkah {currentStep + 1} dari {steps.length}
                </div>
                <h3 className="text-lg font-extrabold text-foreground">
                  {steps[currentStep].title}
                </h3>
                <p className="text-xs font-semibold text-primary">
                  {steps[currentStep].subtitle}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {steps[currentStep].description}
                </p>
              </div>

              {/* Progress Dots */}
              <div className="flex gap-1.5 justify-center py-2">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStep ? "w-6 bg-primary" : "w-1.5 bg-muted"
                    }`}
                    aria-label={`Buka panduan langkah ke-${idx + 1}`}
                  />
                ))}
              </div>

              {/* Navigation controls in footer */}
              <div className="flex items-center justify-between border-t border-border/30 pt-4 mt-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentStep === 0}
                  onClick={handlePrev}
                  className="text-xs font-bold"
                >
                  Kembali
                </Button>

                <Button
                  size="sm"
                  onClick={handleNext}
                  className="text-xs font-bold px-4"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      Selesai
                      <Check className="w-3.5 h-3.5 ml-1.5" />
                    </>
                  ) : (
                    <>
                      Lanjutkan
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
