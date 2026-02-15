import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Plus, Search, Pencil, Trash2, PackagePlus, PackageMinus, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

export default function StokBarang() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  // Master product dialog
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", buy_price: "", sell_price: "" });

  // Add stock dialog
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [stockQty, setStockQty] = useState("");

  // Reduce stock dialog
  const [reduceDialogOpen, setReduceDialogOpen] = useState(false);
  const [reduceComboOpen, setReduceComboOpen] = useState(false);
  const [reduceProductId, setReduceProductId] = useState("");
  const [reduceQty, setReduceQty] = useState("");
  const [reduceReason, setReduceReason] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Save master product
  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        buy_price: Number(form.buy_price),
        sell_price: Number(form.sell_price),
      };
      if (editing) {
        await supabase.from("products").update(payload).eq("id", editing.id);
      } else {
        await supabase.from("products").insert({ ...payload, stock: 0 });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setProductDialogOpen(false);
      setEditing(null);
      toast.success(editing ? "Produk diperbarui" : "Produk baru didaftarkan");
    },
  });

  // Add stock mutation
  const addStockMut = useMutation({
    mutationFn: async () => {
      const product = products.find((p) => p.id === selectedProductId);
      if (!product) throw new Error("Produk tidak ditemukan");
      const qty = Number(stockQty);
      if (qty <= 0) throw new Error("Qty harus lebih dari 0");

      await supabase.from("products").update({ stock: product.stock + qty }).eq("id", product.id);
      await supabase.from("expenses").insert({
        name: `Beli Produk: ${product.name}`,
        amount: product.buy_price * qty,
        category: "Beli Produk",
        note: `Tambah ${qty} unit`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setStockDialogOpen(false);
      setSelectedProductId("");
      setStockQty("");
      toast.success("Stok berhasil ditambahkan & pengeluaran tercatat");
    },
  });

  // Reduce stock mutation
  const reduceStockMut = useMutation({
    mutationFn: async () => {
      const product = products.find((p) => p.id === reduceProductId);
      if (!product) throw new Error("Produk tidak ditemukan");
      const qty = Number(reduceQty);
      if (qty <= 0) throw new Error("Qty harus lebih dari 0");
      if (qty > product.stock) throw new Error("Qty melebihi stok yang tersedia");

      await supabase.from("products").update({ stock: product.stock - qty }).eq("id", product.id);

      // Cari & hapus/kurangi pengeluaran terkait beli produk
      const refundAmount = product.buy_price * qty;
      await supabase.from("expenses").insert({
        name: `Koreksi Stok: ${product.name}`,
        amount: -refundAmount,
        category: "Beli Produk",
        note: reduceReason || `Kurangi ${qty} unit (koreksi input)`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setReduceDialogOpen(false);
      setReduceProductId("");
      setReduceQty("");
      setReduceReason("");
      toast.success("Stok dikurangi & pengeluaran dikoreksi");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("products").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produk dihapus");
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", buy_price: "", sell_price: "" });
    setProductDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, buy_price: String(p.buy_price), sell_price: String(p.sell_price) });
    setProductDialogOpen(true);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const reduceProduct = products.find((p) => p.id === reduceProductId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Stok Barang</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="text-destructive border-destructive/30" onClick={() => setReduceDialogOpen(true)}>
            <PackageMinus className="mr-2 h-4 w-4" /> Kurangi Stok
          </Button>
          <Button variant="outline" onClick={() => setStockDialogOpen(true)}>
            <PackagePlus className="mr-2 h-4 w-4" /> Tambah Stok
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Produk Baru
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Produk</TableHead>
                <TableHead className="text-right">Harga Beli</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Belum ada produk
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{formatRupiah(p.buy_price)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(p.sell_price)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.stock === 0
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : p.stock < 5
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}>
                        {p.stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(p.id)}>
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

      {/* Master Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Produk" : "Daftarkan Produk Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Barang</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Harga Beli</Label>
                <Input type="number" value={form.buy_price} onChange={(e) => setForm({ ...form, buy_price: e.target.value })} />
              </div>
              <div>
                <Label>Harga Jual</Label>
                <Input type="number" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.name}>
              {saveMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stock Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Stok Barang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pilih Barang</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboOpen} className="w-full justify-between font-normal">
                    {selectedProduct ? selectedProduct.name : "Cari & pilih barang..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Ketik nama barang..." />
                    <CommandList>
                      <CommandEmpty>Barang tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {products.map((p) => (
                          <CommandItem key={p.id} value={p.name} onSelect={() => { setSelectedProductId(p.id); setComboOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedProductId === p.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span>{p.name}</span>
                              <span className="text-xs text-muted-foreground">Stok: {p.stock} · Harga Beli: {formatRupiah(p.buy_price)}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Jumlah (Qty) Tambahan</Label>
              <Input type="number" min="1" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="Masukkan jumlah" />
            </div>
            {selectedProduct && Number(stockQty) > 0 && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Harga Beli per unit</span>
                  <span>{formatRupiah(selectedProduct.buy_price)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Pengeluaran</span>
                  <span className="text-rose-500">{formatRupiah(selectedProduct.buy_price * Number(stockQty))}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">* Akan otomatis tercatat di Pengeluaran (kategori "Beli Produk")</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => addStockMut.mutate()} disabled={addStockMut.isPending || !selectedProductId || !stockQty || Number(stockQty) <= 0}>
              {addStockMut.isPending ? "Menyimpan..." : "Tambah Stok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reduce Stock Dialog */}
      <Dialog open={reduceDialogOpen} onOpenChange={setReduceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kurangi Stok Barang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pilih Barang</Label>
              <Popover open={reduceComboOpen} onOpenChange={setReduceComboOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={reduceComboOpen} className="w-full justify-between font-normal">
                    {reduceProduct ? reduceProduct.name : "Cari & pilih barang..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Ketik nama barang..." />
                    <CommandList>
                      <CommandEmpty>Barang tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {products.filter((p) => p.stock > 0).map((p) => (
                          <CommandItem key={p.id} value={p.name} onSelect={() => { setReduceProductId(p.id); setReduceComboOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", reduceProductId === p.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span>{p.name}</span>
                              <span className="text-xs text-muted-foreground">Stok: {p.stock}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Jumlah (Qty) Pengurangan</Label>
              <Input type="number" min="1" max={reduceProduct?.stock ?? 0} value={reduceQty} onChange={(e) => setReduceQty(e.target.value)} placeholder="Masukkan jumlah" />
            </div>
            <div>
              <Label>Alasan Pengurangan</Label>
              <Input value={reduceReason} onChange={(e) => setReduceReason(e.target.value)} placeholder="Contoh: salah input jumlah stok" />
            </div>
            {reduceProduct && Number(reduceQty) > 0 && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stok saat ini</span>
                  <span>{reduceProduct.stock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Setelah dikurangi</span>
                  <span className="font-semibold">{reduceProduct.stock - Number(reduceQty)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Koreksi Pengeluaran</span>
                  <span className="text-emerald-500">-{formatRupiah(reduceProduct.buy_price * Number(reduceQty))}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">* Pengeluaran akan dikoreksi otomatis</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => reduceStockMut.mutate()}
              disabled={reduceStockMut.isPending || !reduceProductId || !reduceQty || Number(reduceQty) <= 0 || Number(reduceQty) > (reduceProduct?.stock ?? 0)}
            >
              {reduceStockMut.isPending ? "Memproses..." : "Kurangi Stok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
