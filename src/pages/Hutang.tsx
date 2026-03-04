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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Debt = Database["public"]["Tables"]["debts"]["Row"];

export default function Hutang() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // Auto-setup database tables on component mount
  useEffect(() => {
    const autoSetupTables = async () => {
      try {
        console.log("Auto-checking debts table...");
        
        // Check if debts table exists
        const { error: checkError } = await supabase
          .from("debts")
          .select("*")
          .limit(1);
        
        if (checkError && checkError.message.includes('relation')) {
          console.log("Debts table doesn't exist, setting up automatically...");
          
          const setupSQL = `
            CREATE TABLE IF NOT EXISTS debts (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              person_name TEXT NOT NULL,
              amount DECIMAL(15,2) NOT NULL,
              description TEXT,
              due_date DATE,
              status TEXT NOT NULL CHECK (status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
              paid_amount DECIMAL(15,2) DEFAULT 0.00
            );
            
            CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
            CREATE INDEX IF NOT EXISTS idx_debts_person_name ON debts(person_name);
            CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
            
            ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Users can view all debts" ON debts FOR SELECT USING (true);
            CREATE POLICY "Users can insert debts" ON debts FOR INSERT WITH CHECK (true);
            CREATE POLICY "Users can update debts" ON debts FOR UPDATE WITH CHECK (true);
            CREATE POLICY "Users can delete debts" ON debts FOR DELETE WITH CHECK (true);
            
            GRANT ALL ON debts TO authenticated;
            GRANT SELECT ON debts TO anon;
          `;
          
          console.log("Debts table setup SQL:", setupSQL);
          
          // Copy to clipboard
          try {
            await navigator.clipboard.writeText(setupSQL);
            console.log("✅ Debts table SQL copied to clipboard!");
            
            toast.error("Tabel Hutang perlu dibuat. SQL sudah disalin ke clipboard.", {
              duration: 10000
            });
            
            // Auto open dashboard
            window.open("https://supabase.com/dashboard/project/iyjtduaxwujsyrcdglia/sql", "_blank");
            
            alert(`TABEL HUTANG PERLU DIBUAT!

SQL sudah disalin ke clipboard dan dashboard dibuka.

1. Paste SQL di SQL Editor
2. Click "Run"
3. Refresh halaman ini

SQL:
${setupSQL}
            `);
          } catch (clipboardError) {
            toast.error("Tabel Hutang perlu dibuat. Lihat console untuk SQL.", {
              duration: 10000
            });
          }
        } else {
          console.log("✅ Debts table already exists");
        }
      } catch (error) {
        console.log("Auto-setup check failed:", error);
      }
    };
    
    autoSetupTables();
  }, []);

  const { data: debts, isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("debts")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addDebtMut = useMutation({
    mutationFn: async () => {
      await supabase.from("debts").insert({
        person_name: personName,
        amount: Number(amount),
        description: description || null,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        status: "unpaid",
        paid_amount: 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] });
      setDialogOpen(false);
      setPersonName("");
      setAmount("");
      setDescription("");
      setDueDate(undefined);
      toast.success("Hutang berhasil ditambahkan");
    },
  });

  const updateDebtMut = useMutation({
    mutationFn: async (debt: Debt) => {
      const updates: any = {};
      if (debt.status !== "paid") {
        updates.status = "paid";
        updates.paid_amount = debt.amount;
      }
      await supabase.from("debts").update(updates).eq("id", debt.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] });
      setEditingDebt(null);
      toast.success("Status hutang berhasil diperbarui");
    },
  });

  const deleteDebtMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("debts").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] });
      toast.success("Hutang berhasil dihapus");
    },
  });

  const totalDebt = debts?.reduce((sum, debt) => {
    if (debt.status === "paid") return sum;
    return sum + (debt.amount - (debt.paid_amount || 0));
  }, 0) || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unpaid":
        return <Badge variant="destructive">Belum Dibayar</Badge>;
      case "partial":
        return <Badge variant="secondary">Sebagian</Badge>;
      case "paid":
        return <Badge variant="default">Lunas</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold">Hutang</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              Tambah Hutang
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tambah Hutang Baru</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="personName">Nama Peminjam</Label>
                <Input
                  id="personName"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Masukkan nama peminjam"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Jumlah Hutang</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Masukkan jumlah hutang"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masukkan deskripsi (opsional)"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tanggal Jatuh Tempo</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button 
                onClick={() => addDebtMut.mutate()} 
                disabled={!personName || !amount || addDebtMut.isPending}
                className="w-full"
              >
                {addDebtMut.isPending ? "Menyimpan..." : "Simpan Hutang"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center justify-between py-4">
          <span className="text-sm font-medium text-red-700">Total Hutang Aktif</span>
          <span className="text-xl font-bold text-red-700">{formatRupiah(totalDebt)}</span>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle>Daftar Hutang</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Dibayar</TableHead>
                  <TableHead>Sisa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Memuat...
                    </TableCell>
                  </TableRow>
                ) : debts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Belum ada data hutang
                    </TableCell>
                  </TableRow>
                ) : (
                  debts?.map((debt) => {
                    const remaining = debt.amount - (debt.paid_amount || 0);
                    return (
                      <TableRow key={debt.id}>
                        <TableCell className="font-medium">{debt.person_name}</TableCell>
                        <TableCell>{formatRupiah(debt.amount)}</TableCell>
                        <TableCell>{formatRupiah(debt.paid_amount || 0)}</TableCell>
                        <TableCell className={remaining > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                          {formatRupiah(remaining)}
                        </TableCell>
                        <TableCell>{getStatusBadge(debt.status)}</TableCell>
                        <TableCell>{formatDateTime(debt.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {debt.status !== "paid" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateDebtMut.mutate(debt)}
                                disabled={updateDebtMut.isPending}
                              >
                                Bayar
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteDebtMut.mutate(debt.id)}
                              disabled={deleteDebtMut.isPending}
                            >
                              Hapus
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
