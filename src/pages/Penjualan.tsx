import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, Trash2, ShoppingCart, Pencil, Eye, CalendarIcon, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Sale = Tables<"sales">;
type SaleItem = Tables<"sale_items">;

interface CartItem {
  product_id: string;
  product_name: string;
  buy_price: number;
  sell_price: number;
  qty: number;
}

export default function Penjualan() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selProduct, setSelProduct] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selQty, setSelQty] = useState("1");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // View detail
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [viewItems, setViewItems] = useState<SaleItem[]>([]);
  const [viewOpen, setViewOpen] = useState(false);

  // Edit
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [editName, setEditName] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addToCart = () => {
    const p = products.find((pr) => pr.id === selProduct);
    if (!p) return;
    const qty = Number(selQty);
    if (qty <= 0 || qty > p.stock) {
      toast.error("Qty tidak valid atau stok tidak cukup");
      return;
    }
    const existing = cart.find((c) => c.product_id === p.id);
    if (existing) {
      setCart(cart.map((c) => c.product_id === p.id ? { ...c, qty: c.qty + qty } : c));
    } else {
      setCart([...cart, { product_id: p.id, product_name: p.name, buy_price: p.buy_price, sell_price: p.sell_price, qty }]);
    }
    setSelProduct("");
    setSelQty("1");
  };

  const removeFromCart = (pid: string) => setCart(cart.filter((c) => c.product_id !== pid));

  const cartTotal = cart.reduce((s, c) => s + c.sell_price * c.qty, 0);
  const cartCost = cart.reduce((s, c) => s + c.buy_price * c.qty, 0);

  const submitSale = useMutation({
    mutationFn: async () => {
      const total = cartTotal;
      const cost = cartCost;
      const profit = total - cost;

      const { data: sale } = await supabase
        .from("sales")
        .insert({ customer_name: customerName || "Umum", total, cost, profit })
        .select()
        .single();

      if (!sale) throw new Error("Failed to create sale");

      const items = cart.map((c) => ({
        sale_id: sale.id,
        product_id: c.product_id,
        product_name: c.product_name,
        qty: c.qty,
        buy_price: c.buy_price,
        sell_price: c.sell_price,
        subtotal: c.sell_price * c.qty,
      }));
      await supabase.from("sale_items").insert(items);

      for (const c of cart) {
        const p = products.find((pr) => pr.id === c.product_id);
        if (p) {
          await supabase.from("products").update({ stock: p.stock - c.qty }).eq("id", p.id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      setCart([]);
      setCustomerName("");
      toast.success("Transaksi berhasil!");
    },
  });

  const deleteSaleMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("sale_items").delete().eq("sale_id", id);
      await supabase.from("sales").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Penjualan dihapus");
    },
  });

  const updateSaleMut = useMutation({
    mutationFn: async () => {
      if (!editSale) return;
      await supabase.from("sales").update({ customer_name: editName }).eq("id", editSale.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      setEditOpen(false);
      toast.success("Penjualan diperbarui");
    },
  });

  const openView = async (sale: Sale) => {
    const { data } = await supabase.from("sale_items").select("*").eq("sale_id", sale.id);
    setViewSale(sale);
    setViewItems(data ?? []);
    setViewOpen(true);
  };

  const openEdit = (sale: Sale) => {
    setEditSale(sale);
    setEditName(sale.customer_name);
    setEditOpen(true);
  };

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch = s.customer_name.toLowerCase().includes(search.toLowerCase());
      const saleDate = new Date(s.created_at);
      const matchFrom = dateFrom ? saleDate >= new Date(dateFrom.setHours(0, 0, 0, 0)) : true;
      const matchTo = dateTo ? saleDate <= new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : true;
      return matchSearch && matchFrom && matchTo;
    });
  }, [sales, search, dateFrom, dateTo]);

  const totalPenjualan = filtered.reduce((s, r) => s + r.total, 0);
  const totalProfit = filtered.reduce((s, r) => s + r.profit, 0);

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Penjualan</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Transaksi Baru
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-muted-foreground">Total Penjualan</span>
            <span className="text-xl font-bold text-primary">{formatRupiah(totalPenjualan)}</span>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-muted-foreground">Total Profit</span>
            <span className="text-xl font-bold text-emerald-600">{formatRupiah(totalProfit)}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-end gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Dari"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Sampai"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Modal</TableHead>
                  <TableHead className="text-right">Keuntungan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Belum ada penjualan
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.customer_name}</TableCell>
                      <TableCell>{formatDateTime(s.created_at)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(s.total)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatRupiah(s.cost)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald">{formatRupiah(s.profit)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openView(s)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteSaleMut.mutate(s.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaksi Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Customer</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Opsional" />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Produk</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {selProduct ? products.find(p => p.id === selProduct)?.name : "Pilih produk..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="p-2">
                      <Input
                        placeholder="Cari produk..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {products
                        .filter(p => p.stock > 0 && p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map(p => (
                          <button
                            key={p.id}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer",
                              selProduct === p.id && "bg-accent font-medium"
                            )}
                            onClick={() => {
                              setSelProduct(p.id);
                              setProductSearch("");
                            }}
                          >
                            {p.name} (stok: {p.stock}) - {formatRupiah(p.sell_price)}
                          </button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-20">
                <Label>Qty</Label>
                <Input type="number" min="1" value={selQty} onChange={(e) => setSelQty(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button size="icon" onClick={addToCart} disabled={!selProduct}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((c) => (
                      <TableRow key={c.product_id}>
                        <TableCell>{c.product_name}</TableCell>
                        <TableCell className="text-right">{c.qty}</TableCell>
                        <TableCell className="text-right">{formatRupiah(c.sell_price * c.qty)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(c.product_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="border-t p-3 text-right font-bold">
                  Total: {formatRupiah(cartTotal)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => submitSale.mutate()} disabled={cart.length === 0 || submitSale.isPending}>
              {submitSale.isPending ? "Memproses..." : "Simpan Transaksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Penjualan</DialogTitle>
          </DialogHeader>
          {viewSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{viewSale.customer_name}</span>
                <span className="text-muted-foreground">Tanggal</span>
                <span>{formatDateTime(viewSale.created_at)}</span>
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{formatRupiah(viewSale.total)}</span>
                <span className="text-muted-foreground">Keuntungan</span>
                <span className="font-bold text-emerald">{formatRupiah(viewSale.profit)}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">{formatRupiah(item.sell_price)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Penjualan</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Nama Customer</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => updateSaleMut.mutate()} disabled={updateSaleMut.isPending}>
              {updateSaleMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

