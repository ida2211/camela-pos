import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [storeLogo, setStoreLogo] = useState<string>("/src/assets/logo-camela-outwear.svg");

  // Load logo dari storeProfile
  useEffect(() => {
    const storeProfile = localStorage.getItem("storeProfile");
    if (storeProfile) {
      const parsed = JSON.parse(storeProfile);
      if (parsed.logo) {
        setStoreLogo(parsed.logo);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Load user credentials dari localStorage (dari profil)
      const storeProfile = localStorage.getItem("storeProfile");
      let userEmail = "camela";
      let userPassword = "321";
      
      if (storeProfile) {
        const parsed = JSON.parse(storeProfile);
        // Jika profil lengkap, gunakan email sebagai username dan password default
        if (parsed.name && parsed.phone) {
          userEmail = parsed.name.toLowerCase().replace(/\s+/g, '');
          userPassword = "321"; // Password default tetap
        }
      }
      
      // Simulasi login dengan credentials dinamis
      if (email === userEmail && password === userPassword) {
        // Simpan login state ke localStorage
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", JSON.stringify({ email: userEmail }));
        
        toast.success("Login berhasil!");
        
        // Redirect ke dashboard
        window.location.href = "/";
      } else {
        setError("Email atau password salah");
        toast.error("Login gagal");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat login");
      toast.error("Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img 
            src={storeLogo} 
            alt="Store Logo" 
            className="h-32 w-auto mx-auto mb-4"
            onError={(e) => {
              // Fallback ke default logo jika gambar error
              const target = e.target as HTMLImageElement;
              target.src = "/src/assets/logo-camela-outwear.svg";
            }}
          />
          <p className="mt-2 text-sm text-gray-600">Manajemen Toko</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">Masuk ke Akun</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="Masukkan email atau nama toko"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-1/2 h-8 w-8 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Memproses..." : "Masuk"}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => window.location.href = "/reset-password"}
                className="text-sm"
              >
                Lupa password?
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Masukkan email dan password untuk masuk</p>
        </div>
      </div>
    </div>
  );
}
