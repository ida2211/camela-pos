import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, DollarSign, Calculator, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Laporan() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("pdf");
  const [exportOptions, setExportOptions] = useState({
    stok: false,
    penjualan: false,
    pengeluaran: false,
    keuangan: false,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("*");
      return data ?? [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*");
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: saleItems = [] } = useQuery({
    queryKey: ["sale_items"],
    queryFn: async () => {
      const { data } = await supabase.from("sale_items").select("*");
      return data ?? [];
    },
  });

  const filteredSales = sales.filter((s) => {
    const d = s.created_at.split("T")[0];
    return d >= startDate && d <= endDate;
  });

  const filteredExpenses = expenses.filter((e) => {
    return e.expense_date >= startDate && e.expense_date <= endDate;
  });

  const totalPendapatan = filteredSales.reduce((s, r) => s + r.total, 0);
  const totalCost = filteredSales.reduce((s, r) => s + r.cost, 0);
  const totalProfit = filteredSales.reduce((s, r) => s + r.profit, 0);
  const totalExpOps = filteredExpenses.filter((e) => e.category === "Operasional").reduce((s, r) => s + r.amount, 0);
  const totalExpBuy = filteredExpenses.filter((e) => e.category === "Beli Produk").reduce((s, r) => s + r.amount, 0);
  const totalPengeluaran = totalExpOps + totalExpBuy;
  const labaBersih = totalPendapatan - totalPengeluaran;

  const toggleExport = (key: keyof typeof exportOptions) => {
    setExportOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const selected = Object.entries(exportOptions).filter(([, v]) => v).map(([k]) => k);
    if (selected.length === 0) {
      toast.error("Pilih minimal satu data untuk di-export");
      return;
    }

    if (exportFormat === "csv") {
      if (exportOptions.stok) {
        downloadCSV(`stok_barang_${endDate}.csv`, ["Nama Produk", "Harga Beli", "Harga Jual", "Stok", "Total Modal"], products.map((p) => [p.name, String(p.buy_price), String(p.sell_price), String(p.stock), String(p.buy_price * p.stock)]));
      }
      if (exportOptions.penjualan) {
        downloadCSV(`penjualan_${startDate}_${endDate}.csv`, ["Tanggal", "Customer", "Total", "Modal", "Profit"], filteredSales.map((s) => [s.created_at.split("T")[0], s.customer_name, String(s.total), String(s.cost), String(s.profit)]));
      }
      if (exportOptions.pengeluaran) {
        downloadCSV(`pengeluaran_${startDate}_${endDate}.csv`, ["Tanggal", "Nama", "Kategori", "Nominal", "Catatan"], filteredExpenses.map((e) => [e.expense_date, e.name, e.category, String(e.amount), e.note ?? ""]));
      }
      if (exportOptions.keuangan) {
        const rows: string[][] = [
          ["Total Penjualan (Omzet)", String(totalPendapatan)],
          ["Modal / HPP", String(totalCost)],
          ["Profit Penjualan (Laba Kotor)", String(totalProfit)],
          ["Pengeluaran Operasional", String(totalExpOps)],
          ["Pengeluaran Beli Produk", String(totalExpBuy)],
          ["Total Pengeluaran", String(totalPengeluaran)],
          ["Keuntungan Bersih", String(labaBersih)],
        ];
        downloadCSV(`laporan_keuangan_${startDate}_${endDate}.csv`, ["Keterangan", "Nominal"], rows);
      }
      toast.success(`${selected.length} file CSV berhasil di-export`);
    } else {
      exportPDF(selected);
      toast.success("File PDF berhasil di-export");
    }

    setExportOpen(false);
  };

  const exportPDF = (selected: string[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header
    doc.setFontSize(16);
    doc.text("Laporan Keuangan CAMELA", pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(10);
    doc.text(`Periode: ${startDate} s/d ${endDate}`, pageWidth / 2, y, { align: "center" });
    y += 10;

    if (selected.includes("keuangan")) {
      doc.setFontSize(12);
      doc.text("Ringkasan Keuangan", 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Keterangan", "Nominal"]],
        body: [
          ["Total Penjualan (Omzet)", formatRupiah(totalPendapatan)],
          ["Modal / HPP", formatRupiah(totalCost)],
          ["Profit Penjualan (Laba Kotor)", formatRupiah(totalProfit)],
          ["", ""],
          ["Pengeluaran Operasional", formatRupiah(totalExpOps)],
          ["Pengeluaran Beli Produk", formatRupiah(totalExpBuy)],
          ["Total Pengeluaran", formatRupiah(totalPengeluaran)],
          ["", ""],
          ["KEUNTUNGAN BERSIH", formatRupiah(labaBersih)],
        ],
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
        didParseCell: (data) => {
          if (data.row.index === 8) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 249, 255];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    }

    if (selected.includes("penjualan")) {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.text("Data Penjualan", 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Tanggal", "Customer", "Total", "Modal", "Profit"]],
        body: filteredSales.map((s) => [
          s.created_at.split("T")[0],
          s.customer_name,
          formatRupiah(s.total),
          formatRupiah(s.cost),
          formatRupiah(s.profit),
        ]),
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    }

    if (selected.includes("pengeluaran")) {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.text("Data Pengeluaran", 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Tanggal", "Nama", "Kategori", "Nominal", "Catatan"]],
        body: filteredExpenses.map((e) => [
          e.expense_date,
          e.name,
          e.category,
          formatRupiah(e.amount),
          e.note ?? "",
        ]),
        theme: "striped",
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 8 },
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    }

    if (selected.includes("stok")) {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.text("Data Stok Barang", 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Nama Produk", "Harga Beli", "Harga Jual", "Stok", "Total Modal"]],
        body: products.map((p) => [
          p.name,
          formatRupiah(p.buy_price),
          formatRupiah(p.sell_price),
          String(p.stock),
          formatRupiah(p.buy_price * p.stock),
        ]),
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 8 },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }

    doc.save(`laporan_camela_${startDate}_${endDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
        <Button onClick={() => setExportOpen(true)}>
          <Download className="mr-2 h-4 w-4" /> Export Data
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <Label>Dari Tanggal</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Sampai Tanggal</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Penjualan</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatRupiah(totalPendapatan)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{filteredSales.length} transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
            <TrendingDown className="h-5 w-5 text-rose" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose">{formatRupiah(totalPengeluaran)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{filteredExpenses.length} pengeluaran</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Keuntungan Bersih</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${labaBersih >= 0 ? "text-emerald" : "text-rose"}`}>
              {formatRupiah(labaBersih)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Penjualan − Pengeluaran</p>
          </CardContent>
        </Card>
      </div>

      {/* Rincian Perhitungan */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Rincian Perhitungan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Penjualan</h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Penjualan (Omzet)</span>
              <span className="font-semibold">{formatRupiah(totalPendapatan)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modal / HPP</span>
              <span className="font-semibold">{formatRupiah(totalCost)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Profit Penjualan (Laba Kotor)</span>
              <span className="font-bold text-emerald">{formatRupiah(totalProfit)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pengeluaran</h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pengeluaran Operasional</span>
              <span className="font-semibold text-rose">{formatRupiah(totalExpOps)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pengeluaran Beli Produk</span>
              <span className="font-semibold text-rose">{formatRupiah(totalExpBuy)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Total Pengeluaran</span>
              <span className="font-bold text-rose">{formatRupiah(totalPengeluaran)}</span>
            </div>
          </div>

          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-lg">Keuntungan Bersih</span>
                <p className="text-xs text-muted-foreground">Total Penjualan − Total Pengeluaran</p>
              </div>
              <span className={`text-2xl font-bold ${labaBersih >= 0 ? "text-emerald" : "text-rose"}`}>
                {formatRupiah(labaBersih)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Pilih format dan data yang ingin di-export. Data penjualan, pengeluaran, dan keuangan mengikuti filter tanggal ({startDate} s/d {endDate}).
          </p>

          <div className="flex gap-2 py-1">
            <Button
              variant={exportFormat === "pdf" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportFormat("pdf")}
            >
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button
              variant={exportFormat === "csv" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportFormat("csv")}
            >
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>

          <div className="space-y-4 py-2">
            <div className="flex items-center space-x-3">
              <Checkbox id="exp-stok" checked={exportOptions.stok} onCheckedChange={() => toggleExport("stok")} />
              <Label htmlFor="exp-stok" className="cursor-pointer">
                <span className="font-medium">Data Stok Barang</span>
                <p className="text-xs text-muted-foreground">Daftar produk, harga, stok, dan total modal</p>
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="exp-penjualan" checked={exportOptions.penjualan} onCheckedChange={() => toggleExport("penjualan")} />
              <Label htmlFor="exp-penjualan" className="cursor-pointer">
                <span className="font-medium">Data Penjualan</span>
                <p className="text-xs text-muted-foreground">Riwayat penjualan sesuai rentang tanggal</p>
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="exp-pengeluaran" checked={exportOptions.pengeluaran} onCheckedChange={() => toggleExport("pengeluaran")} />
              <Label htmlFor="exp-pengeluaran" className="cursor-pointer">
                <span className="font-medium">Data Pengeluaran</span>
                <p className="text-xs text-muted-foreground">Riwayat pengeluaran sesuai rentang tanggal</p>
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="exp-keuangan" checked={exportOptions.keuangan} onCheckedChange={() => toggleExport("keuangan")} />
              <Label htmlFor="exp-keuangan" className="cursor-pointer">
                <span className="font-medium">Ringkasan Keuangan</span>
                <p className="text-xs text-muted-foreground">Laporan ringkasan omzet, pengeluaran, dan laba bersih</p>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Batal</Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export {exportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
