import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, formatDateTime } from "@/lib/format";
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
import { Plus, Search, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

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
  const [selQty, setSelQty] = useState("1");

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

      // Decrease stock
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

  const filtered = sales.filter((s) =>
    s.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Penjualan</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Transaksi Baru
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Modal</TableHead>
                <TableHead className="text-right">Keuntungan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                <Select value={selProduct} onValueChange={setSelProduct}>
                  <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                  <SelectContent>
                    {products.filter((p) => p.stock > 0).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (stok: {p.stock}) - {formatRupiah(p.sell_price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </div>
  );
}
