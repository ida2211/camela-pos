import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Simulasi reset password - validasi email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(email);
      
      if (isValidEmail) {
        // Simulasi pengiriman email
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setIsSuccess(true);
        toast.success("Link reset password telah dikirim ke email Anda");
      } else {
        setError("Format email tidak valid");
        toast.error("Format email tidak valid");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat mengirim reset password");
      toast.error("Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Email Terkirim!</h2>
                  <p className="mt-2 text-gray-600">
                    Link reset password telah dikirim ke <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Silakan cek inbox Anda dan ikuti instruksi untuk reset password.
                  </p>
                </div>
                <Button
                  onClick={() => window.location.href = "/login"}
                  className="w-full"
                >
                  Kembali ke Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">Lupa Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                Masukkan email Anda untuk menerima link reset password
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Masukkan email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Mengirim..." : "Kirim Link Reset"}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => window.location.href = "/login"}
                className="text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Kembali ke Login
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Masukkan email terdaftar untuk reset password</p>
        </div>
      </div>
    </div>
  );
}
