"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { BookOpen, Users, Send, ArrowRight, Check } from "lucide-react"

// ILUSTRASI SUDAH DIPERBAIKI (SEMUA OPACITY DIHAPUS)
function Step1Illustration() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Decorative Islamic elements */}
      <g transform="translate(50, 240)">
        <ellipse cx="0" cy="10" rx="20" ry="8" fill="currentColor" className="text-muted" />
        <rect x="-8" y="-20" width="16" height="30" rx="8" fill="currentColor" className="text-secondary" />
        <circle cx="-5" cy="-25" r="8" fill="currentColor" className="text-primary" />
        <circle cx="5" cy="-22" r="6" fill="currentColor" className="text-primary" />
      </g>

      {/* Stack of books with Islamic theme */}
      <g transform="translate(340, 240)">
        <rect x="-25" y="0" width="50" height="12" rx="2" fill="currentColor" className="text-accent" />
        <rect x="-22" y="-12" width="44" height="12" rx="2" fill="currentColor" className="text-primary" />
        <rect x="-20" y="-24" width="40" height="12" rx="2" fill="currentColor" className="text-accent" />
        <path
          d="M -15 -30 Q -10 -35, -5 -30 L -5 -25 Q -10 -20, -15 -25 Z"
          fill="currentColor"
          className="text-primary"
        />
      </g>

      {/* Large monitor with E-RAPOT */}
      <g transform="translate(240, 120)">
        <rect x="-80" y="-60" width="160" height="100" rx="8" fill="currentColor" className="text-muted" />
        <rect x="-75" y="-55" width="150" height="85" rx="4" fill="currentColor" className="text-background" />
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
          className="text-[10px] fill-black dark:fill-white"
          style={{ fontFamily: "system-ui" }}
        >
          Nuurush Sholaah
        </text>
        <rect x="-10" y="-35" width="20" height="3" rx="1.5" fill="currentColor" className="text-muted" />
        <rect x="-10" y="15" width="20" height="3" rx="1.5" fill="currentColor" className="text-accent" />
        <rect x="-5" y="40" width="10" height="20" fill="currentColor" className="text-muted" />
        <rect x="-30" y="60" width="60" height="8" rx="4" fill="currentColor" className="text-muted" />
      </g>

      {/* Teacher character with Islamic attire */}
      <g transform="translate(120, 140)">
        <circle cx="0" cy="0" r="30" fill="currentColor" className="text-muted" />
        <path d="M -30 0 Q -35 -20, -20 -35 L 20 -35 Q 35 -20, 30 0 Z" fill="currentColor" className="text-primary" />
        <path
          d="M -25 25 L -40 120 L -25 160 L 25 160 L 40 120 L 25 25 Z"
          fill="currentColor"
          className="text-primary"
        />
        <ellipse cx="-35" cy="70" rx="10" ry="40" fill="currentColor" className="text-primary" />
        <ellipse cx="35" cy="70" rx="10" ry="40" fill="currentColor" className="text-primary" />
        <circle cx="-35" cy="110" r="8" fill="currentColor" className="text-muted" />
        <circle cx="35" cy="110" r="8" fill="currentColor" className="text-muted" />
      </g>
    </svg>
  )
}

function Step2Illustration() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Floating data cards with Islamic theme */}
      <g transform="translate(280, 80)" className="animate-float-enhanced">
        <rect
          x="-30"
          y="-20"
          width="60"
          height="40"
          rx="4"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          className="text-secondary"
        />
        <rect x="-20" y="-10" width="15" height="3" rx="1.5" fill="currentColor" className="text-primary" />
        <rect x="-20" y="-3" width="25" height="3" rx="1.5" fill="currentColor" className="text-muted" />
        <rect x="-20" y="4" width="20" height="3" rx="1.5" fill="currentColor" className="text-muted" />
        <polygon points="-5,-18 0,-12 -5,-15 0,-9 -5,-12" fill="currentColor" className="text-accent" />
      </g>

      {/* Floating chart with Islamic geometric pattern */}
      <g transform="translate(300, 200)" className="animate-float-enhanced" style={{ animationDelay: "0.5s" }}>
        <rect
          x="-35"
          y="-25"
          width="70"
          height="50"
          rx="4"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          className="text-secondary"
        />
        <polyline
          points="-25,-10 -15,5 -5,-5 5,10 15,0 25,8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-accent"
        />
        <circle cx="0" cy="-5" r="3" fill="currentColor" className="text-primary" />
        <circle cx="-10" cy="5" r="2" fill="currentColor" className="text-accent" />
        <circle cx="10" cy="5" r="2" fill="currentColor" className="text-accent" />
      </g>

      {/* Large green checkmark with Islamic crescent */}
      <g transform="translate(100, 80)">
        <circle cx="0" cy="0" r="35" fill="currentColor" className="text-primary" />
        <circle cx="0" cy="0" r="28" fill="currentColor" className="text-primary" />
        <path
          d="M -10 0 L -3 10 L 12 -10"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-background"
        />
        <path d="M 15 -15 Q 25 -20, 20 -5 L 15 0 Q 10 -5, 15 -15 Z" fill="currentColor" className="text-accent" />
      </g>

      {/* Admin character with Islamic attire */}
      <g transform="translate(150, 180)">
        <circle cx="0" cy="0" r="25" fill="currentColor" className="text-muted" />
        <path d="M -25 0 Q -28 -15, -18 -28 L 18 -28 Q 28 -15, 25 0 Z" fill="currentColor" className="text-primary" />
        <path d="M -20 20 L -30 90 L -20 120 L 20 120 L 30 90 L 20 20 Z" fill="currentColor" className="text-primary" />
        <ellipse cx="-28" cy="55" rx="8" ry="30" fill="currentColor" className="text-primary" />
        <ellipse cx="28" cy="55" rx="8" ry="30" fill="currentColor" className="text-primary" />
        <circle cx="-28" cy="85" r="7" fill="currentColor" className="text-muted" />
        <circle cx="28" cy="85" r="7" fill="currentColor" className="text-muted" />
      </g>
    </svg>
  )
}

function Step3Illustration() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Glowing light rays with Islamic theme */}
      <g transform="translate(240, 120)">
        <line x1="0" y1="0" x2="60" y2="-40" stroke="currentColor" strokeWidth="2" className="text-accent" />
        <line x1="0" y1="0" x2="70" y2="-10" stroke="currentColor" strokeWidth="2" className="text-accent" />
        <line x1="0" y1="0" x2="65" y2="20" stroke="currentColor" strokeWidth="2" className="text-accent" />
      </g>

      {/* Paper plane with Islamic star */}
      <g transform="translate(320, 100)" className="animate-float-enhanced">
        <path d="M 0 0 L -15 -8 L -12 0 L -15 8 Z" fill="currentColor" className="text-accent" />
        <circle cx="0" cy="0" r="3" fill="currentColor" className="text-accent" />
        <polygon points="0,-8 2,-3 8,0 2,3 0,8 -2,3 -8,0 -2,-3" fill="currentColor" className="text-primary" />
      </g>

      {/* Tablet with Islamic-themed report */}
      <g transform="translate(240, 120)">
        <rect x="-45" y="-60" width="90" height="120" rx="6" fill="currentColor" className="text-muted" />
        <rect x="-40" y="-55" width="80" height="105" rx="3" fill="currentColor" className="text-background" />

        {/* Islamic-themed report content */}
        <text
          x="0"
          y="-35"
          textAnchor="middle"
          className="text-[8px] font-bold fill-black dark:fill-white"
          style={{ fontFamily: "system-ui" }}
        >
          RAPOR SANTRI
        </text>
        <text
          x="0"
          y="-25"
          textAnchor="middle"
          className="text-[6px] fill-black dark:fill-white"
          style={{ fontFamily: "system-ui" }}
        >
          Nuurush Sholaah
        </text>
        <rect x="-25" y="-15" width="50" height="3" rx="1.5" fill="currentColor" className="text-muted" />
        <rect x="-25" y="-8" width="35" height="3" rx="1.5" fill="currentColor" className="text-muted" />

        {/* Grade bars with Islamic pattern */}
        <rect x="-30" y="5" width="45" height="4" rx="2" fill="currentColor" className="text-primary" />
        <rect x="-30" y="15" width="50" height="4" rx="2" fill="currentColor" className="text-accent" />
        <rect x="-30" y="25" width="40" height="4" rx="2" fill="currentColor" className="text-primary" />

        <circle cx="0" cy="45" r="8" fill="currentColor" className="text-accent" />
        <path
          d="M -3 45 L -1 48 L 4 39"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-background"
        />
        <path d="M 8 35 Q 12 32, 10 38 L 8 40 Q 6 38, 8 35 Z" fill="currentColor" className="text-primary" />
      </g>

      {/* Teacher character with Islamic elements */}
      <g transform="translate(120, 160)">
        <circle cx="0" cy="0" r="28" fill="currentColor" className="text-muted" />
        <path d="M -28 0 Q -30 -18, -20 -30 L 20 -30 Q 30 -18, 28 0 Z" fill="currentColor" className="text-primary" />
        <path
          d="M -22 22 L -32 100 L -22 135 L 22 135 L 32 100 L 22 22 Z"
          fill="currentColor"
          className="text-primary"
        />
        <ellipse cx="-30" cy="60" rx="9" ry="35" fill="currentColor" className="text-primary" />
        <ellipse cx="30" cy="60" rx="9" ry="35" fill="currentColor" className="text-primary" />
        <circle cx="-30" cy="95" r="7" fill="currentColor" className="text-muted" />
        <circle cx="30" cy="95" r="7" fill="currentColor" className="text-muted" />
        <polygon points="-5,70 -3,75 0,73 3,75 5,70 2,72 0,68 -2,72" fill="currentColor" className="text-accent" />
      </g>
    </svg>
  )
}

export default function OnboardingPage() {
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
      window.location.href = "/dashboard"
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    window.location.href = "/dashboard"
  }

  const getCardPosition = (index: number) => {
    const diff = (index - currentStep + steps.length) % steps.length

    const baseStyle = { opacity: 1 }

    if (diff === 0) {
      // Front card
      return {
        ...baseStyle,
        scale: 1,
        zIndex: 3,
        x: 0,
        y: 0,
        rotateY: 0,
      }
    } else if (diff === 1 || diff === -2) {
      // Middle card
      return {
        ...baseStyle,
        scale: 0.9,
        zIndex: 2,
        x: 20,
        y: 15,
        rotateY: 0,
      }
    } else {
      // Back card
      return {
        ...baseStyle,
        scale: 0.8,
        zIndex: 1,
        x: 40,
        y: 30,
        rotateY: 0,
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-6xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-12">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep ? "w-8 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/30"
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="relative w-full max-w-md mx-auto lg:max-w-none aspect-[3/4]">
              {/* Card Stack Container */}
              <div className="relative w-full h-full" style={{ perspective: "1200px" }}>
                {steps.map((step, index) => {
                  const position = getCardPosition(index)

                  return (
                    <motion.div
                      key={index}
                      className="absolute inset-0"
                      animate={position}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        duration: 0.6,
                      }}
                      style={{
                        transformOrigin: "center center",
                      }}
                    >
                      <Card className="w-full h-full bg-card rounded-3xl border border-border shadow-lg overflow-hidden">
                        <div className="w-full h-full flex flex-col">
                          <div className="flex-1 flex items-center justify-center p-8 bg-secondary/30">
                            <div className="w-full h-full max-w-sm">{step.illustration}</div>
                          </div>

                          <div className="p-8 space-y-2 bg-card">
                            <h3 className="text-2xl font-bold text-foreground text-center text-balance">
                              {step.title}
                            </h3>
                            <p className="text-sm text-primary font-medium text-center text-pretty">{step.subtitle}</p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>

              {/* Floating accent elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-accent rounded-full opacity-10 blur-2xl" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary rounded-full opacity-10 blur-2xl" />
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-8">
            {/* Step indicator badge */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full"
            >
              <div className="w-4 h-4 text-primary">
                {(() => {
                  const Icon = steps[currentStep].icon
                  return <Icon />
                })()}
              </div>
              <span className="text-sm font-semibold text-primary">
                Langkah {currentStep + 1} dari {steps.length}
              </span>
            </motion.div>

            <motion.div
              key={`content-${currentStep}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-6"
            >
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight text-balance">
                {steps[currentStep].title}
              </h1>

              <p className="text-xl text-primary font-semibold text-pretty">{steps[currentStep].subtitle}</p>

              <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
                {steps[currentStep].description}
              </p>
            </motion.div>

            {/* Navigation buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              {currentStep > 0 && (
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 font-semibold bg-transparent"
                  onClick={handlePrev}
                >
                  ← Kembali
                </Button>
              )}

              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold group shadow-lg"
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? "Mulai Sekarang" : "Lanjutkan"}
                {currentStep === steps.length - 1 ? (
                  <Check className="ml-2 w-5 h-5" />
                ) : (
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                )}
              </Button>

              {currentStep < steps.length - 1 && (
                <Button
                  size="lg"
                  variant="ghost"
                  className="font-medium text-muted-foreground hover:text-foreground"
                  onClick={handleSkip}
                >
                  Lewati
                </Button>
              )}
            </div>

            {/* Footer quote */}
            <div className="pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground italic text-pretty">
                "Nuurush Sholaah - Cahaya Shalat menerangi jalan ilmu"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
