import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Save, LogOut, Store, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

interface StoreProfile {
  name: string;
  logo: string;
  address: string;
  phone: string;
}

export default function StoreProfile() {
  const qc = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [profile, setProfile] = useState<StoreProfile>({
    name: "",
    logo: "",
    address: "",
    phone: ""
  });
  
  // Load profile dari localStorage
  useState(() => {
    const savedProfile = localStorage.getItem("storeProfile");
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setProfile(parsed);
      if (parsed.logo) {
        setLogoPreview(parsed.logo);
      }
    }
    
    // Load logo dari storeProfile untuk preview
    const storeLogo = localStorage.getItem("storeLogo");
    if (storeLogo) {
      setLogoPreview(storeLogo);
    }
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        setProfile(prev => ({ ...prev, logo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    setIsLoading(true);
    try {
      // Simpan ke localStorage
      localStorage.setItem("storeProfile", JSON.stringify(profile));
      
      // Update logo di public folder jika ada
      if (logoPreview) {
        // Simpan logo untuk digunakan di sidebar dan login
        localStorage.setItem("storeLogo", logoPreview);
      }
      
      // Trigger storage event untuk update sidebar
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'storeProfile',
        newValue: JSON.stringify(profile),
        oldValue: localStorage.getItem('storeProfile')
      }));
      
      toast.success("Profil toko berhasil disimpan!");
      
      // Redirect ke dashboard setelah 1 detik
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (error) {
      toast.error("Gagal menyimpan profil toko");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
    toast.success("Berhasil keluar");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profil Toko</h1>
        </div>

        <div className="space-y-6">
          {/* Form Nama Toko */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Nama Toko
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Nama Toko</Label>
                <Input
                  id="storeName"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Masukkan nama toko"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">No. HP/WA</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 text-gray-400" />
                  <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Masukkan nomor HP/WA"
                      className="pl-10"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Textarea
                    id="address"
                    value={profile.address}
                    onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Masukkan alamat lengkap toko"
                    rows={3}
                    className="pl-10 resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Logo */}
          <Card>
            <CardHeader className="flex items-center justify-center">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Upload Logo Toko
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="relative">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo Toko"
                      className="h-32 w-32 object-cover rounded-lg border-2 border-gray-200"
                    />
                  ) : (
                    <div className="h-32 w-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <label
                    htmlFor="logo-upload"
                    className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                  </label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="text-center text-sm text-gray-500">
                <p>Upload logo toko (PNG, JPG, maksimal 2MB)</p>
                <p>Rekomendasi ukuran: 200x200px</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => window.location.href = "/"}>
            Batal
          </Button>
          <Button variant="default" onClick={saveProfile} disabled={isLoading}>
            Simpan Profil
          </Button>
        </div>
      </div>
    </div>
  );
}
