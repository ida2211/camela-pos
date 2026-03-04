import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

type Saving = Database["public"]["Tables"]["savings"]["Row"];

export default function Tabungan() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit");
  const [note, setNote] = useState("");

  // Auto-setup database tables on component mount
  useEffect(() => {
    const autoSetupTables = async () => {
      try {
        console.log("Auto-checking savings table...");
        
        // Check if savings table exists
        const { error: checkError } = await supabase
          .from("savings")
          .select("*")
          .limit(1);
        
        if (checkError && checkError.message.includes('relation')) {
          console.log("Savings table doesn't exist, setting up automatically...");
          
          const setupSQL = `
            CREATE TABLE IF NOT EXISTS savings (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              description TEXT NOT NULL,
              amount DECIMAL(15,2) NOT NULL,
              type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
              balance_after DECIMAL(15,2) NOT NULL,
              note TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_savings_type ON savings(type);
            CREATE INDEX IF NOT EXISTS idx_savings_created_at ON savings(created_at);
            
            ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Users can view all savings" ON savings FOR SELECT USING (true);
            CREATE POLICY "Users can insert savings" ON savings FOR INSERT WITH CHECK (true);
            CREATE POLICY "Users can update savings" ON savings FOR UPDATE WITH CHECK (true);
            CREATE POLICY "Users can delete savings" ON savings FOR DELETE WITH CHECK (true);
            
            GRANT ALL ON savings TO authenticated;
            GRANT SELECT ON savings TO anon;
          `;
          
          console.log("Savings table setup SQL:", setupSQL);
          
          // Copy to clipboard
          try {
            await navigator.clipboard.writeText(setupSQL);
            console.log("✅ Savings table SQL copied to clipboard!");
            
            toast.error("Tabel Tabungan perlu dibuat. SQL sudah disalin ke clipboard.", {
              duration: 10000
            });
            
            // Auto open dashboard
            window.open("https://supabase.com/dashboard/project/iyjtduaxwujsyrcdglia/sql", "_blank");
            
            alert(`TABEL TABUNGAN PERLU DIBUAT!

SQL sudah disalin ke clipboard dan dashboard dibuka.

1. Paste SQL di SQL Editor
2. Click "Run"
3. Refresh halaman ini

SQL:
${setupSQL}
            `);
          } catch (clipboardError) {
            toast.error("Tabel Tabungan perlu dibuat. Lihat console untuk SQL.", {
              duration: 10000
            });
          }
        } else {
          console.log("✅ Savings table already exists");
        }
      } catch (error) {
        console.log("Auto-setup check failed:", error);
      }
    };
    
    autoSetupTables();
  }, []);

  const { data: savings, isLoading } = useQuery({
    queryKey: ["savings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("savings")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: lastBalance } = useQuery({
    queryKey: ["current_balance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("savings")
        .select("balance_after")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0]?.balance_after || 0;
    },
  });

  const addSavingMut = useMutation({
    mutationFn: async () => {
      const currentBalance = lastBalance || 0;
      const amountNum = Number(amount);
      const newBalance = type === "deposit" 
        ? currentBalance + amountNum 
        : currentBalance - amountNum;

      await supabase.from("savings").insert({
        description,
        amount: amountNum,
        type,
        balance_after: newBalance,
        note: note || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["current_balance"] });
      setDialogOpen(false);
      setDescription("");
      setAmount("");
      setType("deposit");
      setNote("");
      toast.success(`${type === "deposit" ? "Setoran" : "Penarikan"} berhasil ditambahkan`);
    },
  });

  const deleteSavingMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("savings").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["current_balance"] });
      toast.success("Transaksi tabungan berhasil dihapus");
    },
  });

  const totalDeposits = savings?.filter(s => s.type === "deposit").reduce((sum, s) => sum + s.amount, 0) || 0;
  const totalWithdrawals = savings?.filter(s => s.type === "withdrawal").reduce((sum, s) => sum + s.amount, 0) || 0;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "deposit":
        return <Badge className="bg-green-100 text-green-800">Setoran</Badge>;
      case "withdrawal":
        return <Badge className="bg-red-100 text-red-800">Penarikan</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold">Tabungan</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              Tambah Transaksi
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tambah Transaksi Tabungan</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Jenis Transaksi</Label>
                <RadioGroup value={type} onValueChange={(value) => setType(value as "deposit" | "withdrawal")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="deposit" id="deposit" />
                    <Label htmlFor="deposit" className="font-normal">
                      Setoran
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="withdrawal" id="withdrawal" />
                    <Label htmlFor="withdrawal" className="font-normal">
                      Penarikan
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masukkan deskripsi"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Jumlah</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Masukkan jumlah"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note">Catatan</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Masukkan catatan (opsional)"
                />
              </div>
              <Button 
                onClick={() => addSavingMut.mutate()} 
                disabled={!description || !amount || addSavingMut.isPending}
                className="w-full"
              >
                {addSavingMut.isPending ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3 flex-shrink-0">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-blue-700">Saldo Saat Ini</span>
            <span className="text-xl font-bold text-blue-700">{formatRupiah(lastBalance || 0)}</span>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-green-700">Total Setoran</span>
            <span className="text-xl font-bold text-green-700">{formatRupiah(totalDeposits)}</span>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-red-700">Total Penarikan</span>
            <span className="text-xl font-bold text-red-700">{formatRupiah(totalWithdrawals)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle>Riwayat Tabungan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Saldo Setelah</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Memuat...
                    </TableCell>
                  </TableRow>
                ) : savings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Belum ada data tabungan
                    </TableCell>
                  </TableRow>
                ) : (
                  savings?.map((saving) => (
                    <TableRow key={saving.id}>
                      <TableCell className="font-medium">{saving.description}</TableCell>
                      <TableCell>{getTypeBadge(saving.type)}</TableCell>
                      <TableCell className={saving.type === "deposit" ? "text-green-600" : "text-red-600"}>
                        {saving.type === "deposit" ? "+" : "-"}{formatRupiah(saving.amount)}
                      </TableCell>
                      <TableCell className="font-medium">{formatRupiah(saving.balance_after)}</TableCell>
                      <TableCell>{formatDateTime(saving.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSavingMut.mutate(saving.id)}
                          disabled={deleteSavingMut.isPending}
                        >
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
