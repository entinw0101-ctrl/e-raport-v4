"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Settings, User, Key, LogOut, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PengaturanPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Password baru dan konfirmasi password tidak cocok",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password baru minimal 6 karakter",
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: "Password berhasil diubah",
        })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Gagal mengubah password",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengubah password",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login" })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Pengaturan Akun
          </h1>
          <p className="text-muted-foreground">Kelola pengaturan akun dan keamanan Anda</p>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informasi Akun
            </CardTitle>
            <CardDescription>Detail akun admin yang sedang login</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Nama</Label>
                <p className="text-sm text-muted-foreground">{session?.user?.name || "Tidak ada nama"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Role</Label>
                <p className="text-sm text-muted-foreground capitalize">{session?.user?.role}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <p className="text-sm text-muted-foreground">Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Ubah Password
            </CardTitle>
            <CardDescription>Ubah password akun Anda untuk keamanan yang lebih baik</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Lama</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Masukkan password lama"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Masukkan password baru (minimal 6 karakter)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Konfirmasi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isChangingPassword ? "Mengubah Password..." : "Ubah Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Keluar dari Sistem
            </CardTitle>
            <CardDescription>Keluar dari akun admin</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
