import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;

export default function Pengeluaran() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "Operasional" | "Beli Produk">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    category: "Operasional" as "Operasional" | "Beli Produk",
    note: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  // View
  const [viewExp, setViewExp] = useState<Expense | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Edit
  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({ name: "", amount: "", category: "Operasional" as string, note: "", expense_date: "" });
  const [editOpen, setEditOpen] = useState(false);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      await supabase.from("expenses").insert({
        name: form.name,
        amount: Number(form.amount),
        category: form.category,
        note: form.note,
        expense_date: form.expense_date,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setDialogOpen(false);
      setForm({ name: "", amount: "", category: "Operasional", note: "", expense_date: new Date().toISOString().split("T")[0] });
      toast.success("Pengeluaran ditambahkan");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("expenses").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Pengeluaran dihapus");
    },
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editExp) return;
      await supabase.from("expenses").update({
        name: editForm.name,
        amount: Number(editForm.amount),
        category: editForm.category,
        note: editForm.note,
        expense_date: editForm.expense_date,
      }).eq("id", editExp.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setEditOpen(false);
      toast.success("Pengeluaran diperbarui");
    },
  });

  const openEdit = (e: Expense) => {
    setEditExp(e);
    setEditForm({
      name: e.name,
      amount: String(e.amount),
      category: e.category,
      note: e.note ?? "",
      expense_date: e.expense_date,
    });
    setEditOpen(true);
  };

  const filtered = expenses.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesDateFrom = !dateFrom || e.expense_date >= dateFrom;
    const matchesDateTo = !dateTo || e.expense_date <= dateTo;
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchesSearch && matchesDateFrom && matchesDateTo && matchesCategory;
  });

  const totalFiltered = filtered.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Pengeluaran</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Pengeluaran
        </Button>
      </div>

      <Card className="border-rose/20 bg-rose/5">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <span className="text-sm font-medium text-muted-foreground">Total Pengeluaran</span>
            <span className="text-xs text-muted-foreground ml-2">
              ({filtered.length} dari {expenses.length} data)
            </span>
          </div>
          <span className="text-xl font-bold text-rose">{formatRupiah(totalFiltered)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari pengeluaran..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              <div>
                <Label className="text-xs">Dari Tanggal</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div>
                <Label className="text-xs">Sampai Tanggal</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
              </div>
              <div>
                <Label className="text-xs">Kategori</Label>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="Operasional">Operasional</SelectItem>
                    <SelectItem value="Beli Produk">Beli Produk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Belum ada pengeluaran
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{formatDate(e.expense_date)}</TableCell>
                    <TableCell>
                      <Badge variant={e.category === "Operasional" ? "destructive" : "secondary"}>
                        {e.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-rose">{formatRupiah(e.amount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{e.note}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setViewExp(e); setViewOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pengeluaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Pengeluaran</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nominal</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as typeof form.category })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operasional">Operasional</SelectItem>
                  <SelectItem value="Beli Produk">Beli Produk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addMut.mutate()} disabled={addMut.isPending || !form.name || !form.amount}>
              {addMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pengeluaran</DialogTitle>
          </DialogHeader>
          {viewExp && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Nama</span>
              <span className="font-medium">{viewExp.name}</span>
              <span className="text-muted-foreground">Tanggal</span>
              <span>{formatDate(viewExp.expense_date)}</span>
              <span className="text-muted-foreground">Kategori</span>
              <Badge variant={viewExp.category === "Operasional" ? "destructive" : "secondary"} className="w-fit">
                {viewExp.category}
              </Badge>
              <span className="text-muted-foreground">Nominal</span>
              <span className="font-bold text-rose">{formatRupiah(viewExp.amount)}</span>
              <span className="text-muted-foreground">Catatan</span>
              <span>{viewExp.note || "-"}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengeluaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Pengeluaran</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nominal</Label>
                <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={editForm.expense_date} onChange={(e) => setEditForm({ ...editForm, expense_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operasional">Operasional</SelectItem>
                  <SelectItem value="Beli Produk">Beli Produk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending || !editForm.name || !editForm.amount}>
              {updateMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
