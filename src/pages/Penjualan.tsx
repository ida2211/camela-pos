import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, Trash2, ShoppingCart, Pencil, Eye, CalendarIcon, X, Printer, Tag, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Sale = Tables<"sales">;
type SaleItem = Tables<"sale_items">;

interface CartItem {
  product_id: string;
  product_name: string;
  buy_price: number;
  sell_price: number;
  qty: number;
  discount: number; // diskon per item (rupiah)
}

function printStrukPDF(sale: Sale, items: SaleItem[]) {
  const storeProfile = JSON.parse(localStorage.getItem("storeProfile") || "{}");
  const storeName = storeProfile.name || "CAMELA OUTWEAR";
  const storeAddress = storeProfile.address || "";
  const storePhone = storeProfile.phone || "";

  // Ukuran thermal 80mm = ~226.77 pt lebar, panjang dinamis
  const pageWidth = 226.77;
  const doc = new jsPDF({ unit: "pt", format: [pageWidth, 600], orientation: "portrait" });

  let y = 16;
  const cx = pageWidth / 2;

  // Header toko
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(storeName, cx, y, { align: "center" });
  y += 16;

  if (storeAddress) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    const addrLines = doc.splitTextToSize(storeAddress, pageWidth - 20);
    addrLines.forEach((line: string) => { doc.text(line, cx, y, { align: "center" }); y += 10; });
  }
  if (storePhone) {
    doc.setFontSize(7.5);
    doc.text(`Telp: ${storePhone}`, cx, y, { align: "center" });
    y += 10;
  }

  // Garis
  doc.setLineWidth(0.5);
  doc.line(10, y, pageWidth - 10, y); y += 10;

  // Info transaksi
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Tanggal : ${formatDateTime(sale.created_at)}`, 10, y); y += 11;
  doc.text(`Customer: ${sale.customer_name}`, 10, y); y += 11;

  doc.line(10, y, pageWidth - 10, y); y += 10;

  // Header tabel item
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Produk", 10, y);
  doc.text("Qty", pageWidth - 110, y, { align: "right" });
  doc.text("Harga", pageWidth - 65, y, { align: "right" });
  doc.text("Subtotal", pageWidth - 10, y, { align: "right" });
  y += 4;
  doc.setLineWidth(0.3);
  doc.line(10, y, pageWidth - 10, y); y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  for (const item of items) {
    const nameLine = doc.splitTextToSize(item.product_name, 110);
    nameLine.forEach((line: string, idx: number) => {
      doc.text(line, 10, y + idx * 9);
    });
    const lineH = Math.max(nameLine.length * 9, 9);
    doc.text(`${item.qty}`, pageWidth - 110, y, { align: "right" });
    doc.text(formatRupiah(item.sell_price), pageWidth - 65, y, { align: "right" });
    doc.text(formatRupiah(item.subtotal), pageWidth - 10, y, { align: "right" });
    y += lineH + 3;
  }

  doc.setLineWidth(0.5);
  doc.line(10, y, pageWidth - 10, y); y += 10;

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL", 10, y);
  doc.text(formatRupiah(sale.total), pageWidth - 10, y, { align: "right" });
  y += 16;

  // Ucapan terima kasih
  doc.setLineWidth(0.5);
  doc.line(10, y, pageWidth - 10, y); y += 12;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Terima kasih sudah berbelanja!", cx, y, { align: "center" }); y += 11;
  doc.text("Semoga puas dengan produk kami 😊", cx, y, { align: "center" }); y += 11;
  doc.text("Sampai jumpa kembali!", cx, y, { align: "center" }); y += 14;

  // Buat ulang PDF dengan tinggi sesuai konten
  const finalHeight = y + 10;
  const finalDoc = new jsPDF({ unit: "pt", format: [pageWidth, finalHeight], orientation: "portrait" });

  let fy = 16;

  // Header toko
  finalDoc.setFontSize(13);
  finalDoc.setFont("helvetica", "bold");
  finalDoc.text(storeName, cx, fy, { align: "center" });
  fy += 16;

  if (storeAddress) {
    finalDoc.setFontSize(7.5);
    finalDoc.setFont("helvetica", "normal");
    const addrLines = finalDoc.splitTextToSize(storeAddress, pageWidth - 20);
    addrLines.forEach((line: string) => { finalDoc.text(line, cx, fy, { align: "center" }); fy += 10; });
  }
  if (storePhone) {
    finalDoc.setFontSize(7.5);
    finalDoc.text(`Telp: ${storePhone}`, cx, fy, { align: "center" });
    fy += 10;
  }

  finalDoc.setLineWidth(0.5);
  finalDoc.line(10, fy, pageWidth - 10, fy); fy += 10;

  finalDoc.setFontSize(8);
  finalDoc.setFont("helvetica", "normal");
  finalDoc.text(`Tanggal : ${formatDateTime(sale.created_at)}`, 10, fy); fy += 11;
  finalDoc.text(`Customer: ${sale.customer_name}`, 10, fy); fy += 11;

  finalDoc.line(10, fy, pageWidth - 10, fy); fy += 10;

  finalDoc.setFont("helvetica", "bold");
  finalDoc.setFontSize(8);
  finalDoc.text("Produk", 10, fy);
  finalDoc.text("Qty", pageWidth - 110, fy, { align: "right" });
  finalDoc.text("Harga", pageWidth - 65, fy, { align: "right" });
  finalDoc.text("Subtotal", pageWidth - 10, fy, { align: "right" });
  fy += 4;
  finalDoc.setLineWidth(0.3);
  finalDoc.line(10, fy, pageWidth - 10, fy); fy += 9;

  finalDoc.setFont("helvetica", "normal");
  finalDoc.setFontSize(7.5);
  for (const item of items) {
    const nameLine = finalDoc.splitTextToSize(item.product_name, 110);
    nameLine.forEach((line: string, idx: number) => {
      finalDoc.text(line, 10, fy + idx * 9);
    });
    const lineH = Math.max(nameLine.length * 9, 9);
    finalDoc.text(`${item.qty}`, pageWidth - 110, fy, { align: "right" });
    finalDoc.text(formatRupiah(item.sell_price), pageWidth - 65, fy, { align: "right" });
    finalDoc.text(formatRupiah(item.subtotal), pageWidth - 10, fy, { align: "right" });
    fy += lineH + 3;
  }

  finalDoc.setLineWidth(0.5);
  finalDoc.line(10, fy, pageWidth - 10, fy); fy += 10;

  finalDoc.setFont("helvetica", "bold");
  finalDoc.setFontSize(9);
  finalDoc.text("TOTAL", 10, fy);
  finalDoc.text(formatRupiah(sale.total), pageWidth - 10, fy, { align: "right" });
  fy += 16;

  finalDoc.setLineWidth(0.5);
  finalDoc.line(10, fy, pageWidth - 10, fy); fy += 12;
  finalDoc.setFont("helvetica", "italic");
  finalDoc.setFontSize(8);
  finalDoc.text("Terima kasih sudah berbelanja!", cx, fy, { align: "center" }); fy += 11;
  finalDoc.text("Semoga puas dengan produk kami", cx, fy, { align: "center" }); fy += 11;
  finalDoc.text("Sampai jumpa kembali!", cx, fy, { align: "center" });

  finalDoc.save(`struk-${sale.id.slice(0, 8)}.pdf`);
}

function shareWhatsApp(sale: Sale, items: SaleItem[]) {
  const storeProfile = JSON.parse(localStorage.getItem("storeProfile") || "{}");
  const storeName = storeProfile.name || "CAMELA OUTWEAR";
  const storeAddress = storeProfile.address || "";
  const storePhone = storeProfile.phone || "";

  let msg = `🧾 *${storeName}*\n`;
  if (storeAddress) msg += `📍 ${storeAddress}\n`;
  if (storePhone) msg += `📞 ${storePhone}\n`;
  msg += `\n📅 ${formatDateTime(sale.created_at)}\n`;
  msg += `👤 Customer: ${sale.customer_name}\n`;
  msg += `─────────────────\n`;
  for (const item of items) {
    msg += `▪️ ${item.product_name}\n`;
    msg += `   ${item.qty} x ${formatRupiah(item.sell_price)} = ${formatRupiah(item.subtotal)}\n`;
  }
  msg += `─────────────────\n`;
  msg += `*TOTAL: ${formatRupiah(sale.total)}*\n\n`;
  msg += `Terima kasih sudah berbelanja! 🙏\nSemoga puas dengan produk kami 😊`;

  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
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
  const [selDiscount, setSelDiscount] = useState("0");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [isReseler, setIsReseler] = useState(false);

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
    const discount = Number(selDiscount) || 0;
    if (qty <= 0 || qty > p.stock) {
      toast.error("Qty tidak valid atau stok tidak cukup");
      return;
    }
    const existing = cart.find((c) => c.product_id === p.id);
    if (existing) {
      setCart(cart.map((c) => c.product_id === p.id ? { ...c, qty: c.qty + qty } : c));
    } else {
      setCart([...cart, {
        product_id: p.id,
        product_name: p.name,
        buy_price: p.buy_price,
        sell_price: p.sell_price,
        qty,
        discount,
      }]);
    }
    setSelProduct("");
    setSelQty("1");
    setSelDiscount("0");
  };

  const removeFromCart = (pid: string) => setCart(cart.filter((c) => c.product_id !== pid));

  // Harga efektif per item = sell_price - discount
  const effectivePrice = (c: CartItem) => Math.max(0, c.sell_price - c.discount);
  const cartTotal = cart.reduce((s, c) => s + effectivePrice(c) * c.qty, 0);
  const cartCost = cart.reduce((s, c) => s + c.buy_price * c.qty, 0);
  const totalDiscount = cart.reduce((s, c) => s + c.discount * c.qty, 0);

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
        sell_price: effectivePrice(c),
        subtotal: effectivePrice(c) * c.qty,
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
      setIsReseler(false);
      setSelDiscount("0");
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

  const handlePrint = async (sale: Sale) => {
    const { data } = await supabase.from("sale_items").select("*").eq("sale_id", sale.id);
    printStrukPDF(sale, data ?? []);
  };

  const handleShareWA = async (sale: Sale) => {
    const { data } = await supabase.from("sale_items").select("*").eq("sale_id", sale.id);
    shareWhatsApp(sale, data ?? []);
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
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold">Penjualan</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Transaksi Baru
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 flex-shrink-0">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-muted-foreground">Total Penjualan</span>
            <span className="text-xl font-bold text-primary">{formatRupiah(totalPenjualan)}</span>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-muted-foreground">Total Profit</span>
            <span className="text-xl font-bold" style={{ color: "hsl(152, 57%, 38%)" }}>{formatRupiah(totalProfit)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Table Card (scrollable) */}
      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader className="pb-3 flex-shrink-0">
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
        <CardContent className="p-0 flex-1 min-h-0">
          <div className="h-full overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
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
                      <TableCell className="text-right font-semibold" style={{ color: "hsl(152, 57%, 38%)" }}>{formatRupiah(s.profit)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openView(s)} title="Detail">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(s)} title="Cetak Struk">
                            <Printer className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleShareWA(s)} title="Share WhatsApp">
                            <MessageCircle className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteSaleMut.mutate(s.id)} title="Hapus">
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
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setCart([]); setCustomerName(""); setIsReseler(false); setSelDiscount("0"); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaksi Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Customer</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Opsional" />
            </div>

            {/* Toggle Reseler */}
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
              <Tag className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Harga Reseler</p>
                <p className="text-xs text-muted-foreground">Aktifkan untuk input potongan per item</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isReseler}
                onClick={() => {
                  setIsReseler(!isReseler);
                  if (isReseler) setSelDiscount("0");
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                  isReseler ? "bg-primary" : "bg-input"
                )}
              >
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", isReseler ? "translate-x-6" : "translate-x-1")} />
              </button>
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
                        autoFocus
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
                      {products.filter(p => p.stock > 0 && p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-4 text-sm text-muted-foreground text-center">Produk tidak ditemukan</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-20">
                <Label>Qty</Label>
                <Input type="number" min="1" value={selQty} onChange={(e) => setSelQty(e.target.value)} />
              </div>
              {isReseler && (
                <div className="w-28">
                  <Label>Disc/item (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={selDiscount}
                    onChange={(e) => setSelDiscount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
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
                      <TableHead className="text-right">Harga</TableHead>
                      {isReseler && <TableHead className="text-right">Disc</TableHead>}
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((c) => (
                      <TableRow key={c.product_id}>
                        <TableCell className="text-xs">{c.product_name}</TableCell>
                        <TableCell className="text-right">{c.qty}</TableCell>
                        <TableCell className="text-right text-xs">{formatRupiah(c.sell_price)}</TableCell>
                        {isReseler && (
                          <TableCell className="text-right text-xs text-amber-600">
                            {c.discount > 0 ? `-${formatRupiah(c.discount)}` : "-"}
                          </TableCell>
                        )}
                        <TableCell className="text-right text-xs font-medium">{formatRupiah(effectivePrice(c) * c.qty)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(c.product_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="border-t p-3 space-y-1 text-right">
                  {isReseler && totalDiscount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Total Diskon Reseler: <span className="font-semibold text-amber-600">-{formatRupiah(totalDiscount)}</span>
                    </p>
                  )}
                  <p className="font-bold">Total: {formatRupiah(cartTotal)}</p>
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
                <span className="font-bold" style={{ color: "hsl(152, 57%, 38%)" }}>{formatRupiah(viewSale.profit)}</span>
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
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => printStrukPDF(viewSale, viewItems)}>
                  <Printer className="mr-2 h-4 w-4" /> Cetak Struk
                </Button>
                <Button variant="outline" size="sm" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => shareWhatsApp(viewSale, viewItems)}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Share WA
                </Button>
              </div>
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
