import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Calculator, Download, Package, ShoppingCart, Wallet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export default function Laporan() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [reportType, setReportType] = useState("keuangan");

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("*");
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

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*");
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

  const filteredSales = sales.filter((s) => {
    const d = s.created_at.split("T")[0];
    return d >= startDate && d <= endDate;
  });

  const filteredExpenses = expenses.filter((e) => {
    return e.expense_date >= startDate && e.expense_date <= endDate;
  });

  const filteredProducts = products.filter((p) => {
    // Filter products berdasarkan created_at atau updated_at
    const created = p.created_at.split("T")[0];
    const updated = p.updated_at.split("T")[0];
    return (created >= startDate && created <= endDate) || (updated >= startDate && updated <= endDate);
  });

  // Get sale items for filtered sales
  const filteredSaleItems = saleItems.filter((item) => {
    const sale = sales.find(s => s.id === item.sale_id);
    if (!sale) return false;
    const saleDate = sale.created_at.split("T")[0];
    return saleDate >= startDate && saleDate <= endDate;
  });

  const totalPendapatan = filteredSales.reduce((s, r) => s + r.total, 0);
  const totalCost = filteredSales.reduce((s, r) => s + r.cost, 0);
  const totalProfit = filteredSales.reduce((s, r) => s + r.profit, 0);
  const totalExpOps = filteredExpenses.filter((e) => e.category === "Operasional").reduce((s, r) => s + r.amount, 0);
  const totalExpBuy = filteredExpenses.filter((e) => e.category === "Beli Produk").reduce((s, r) => s + r.amount, 0);
  const totalPengeluaran = totalExpOps + totalExpBuy;
  // Laba bersih = Total Penjualan - Total Pengeluaran (semua)
  const labaBersih = totalPendapatan - totalPengeluaran;

  // PDF Export Functions
  const exportSalesPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text("Laporan Penjualan", 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 30);
    
    // Summary
    doc.setFontSize(12);
    doc.text("Ringkasan", 14, 45);
    doc.setFontSize(10);
    doc.text(`Total Penjualan: ${formatRupiah(totalPendapatan)}`, 14, 55);
    doc.text(`Total Transaksi: ${filteredSales.length}`, 14, 62);
    doc.text(`Profit Penjualan: ${formatRupiah(totalProfit)}`, 14, 69);
    
    // Table
    const tableData = filteredSales.map((sale, index) => [
      index + 1,
      sale.customer_name || "-",
      formatDate(sale.created_at),
      formatRupiah(sale.total),
      formatRupiah(sale.profit)
    ]);
    
    autoTable(doc, {
      head: [["No", "Customer", "Tanggal", "Total", "Profit"]],
      body: tableData,
      startY: 80,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`laporan-penjualan-${startDate}-${endDate}.pdf`);
  };

  const exportStockPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text("Laporan Stok Barang", 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 30);
    
    // Summary
    const totalStok = filteredProducts.reduce((sum, p) => sum + p.stock, 0);
    const totalModal = filteredProducts.reduce((sum, p) => sum + (p.stock * p.buy_price), 0);
    const totalNilai = filteredProducts.reduce((sum, p) => sum + (p.stock * p.sell_price), 0);
    
    doc.setFontSize(12);
    doc.text("Ringkasan", 14, 45);
    doc.setFontSize(10);
    doc.text(`Total Jenis Produk: ${filteredProducts.length}`, 14, 55);
    doc.text(`Total Stok: ${totalStok} unit`, 14, 62);
    doc.text(`Total Modal: ${formatRupiah(totalModal)}`, 14, 69);
    doc.text(`Total Nilai Jual: ${formatRupiah(totalNilai)}`, 14, 76);
    
    // Table
    const tableData = filteredProducts.map((product, index) => [
      index + 1,
      product.name,
      product.stock,
      formatRupiah(product.buy_price),
      formatRupiah(product.sell_price),
      formatRupiah(product.stock * product.buy_price),
      formatRupiah(product.stock * product.sell_price)
    ]);
    
    autoTable(doc, {
      head: [["No", "Produk", "Stok", "Harga Beli", "Harga Jual", "Modal", "Nilai Jual"]],
      body: tableData,
      startY: 90,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [34, 197, 94] }
    });
    
    doc.save(`laporan-stok-${startDate}-${endDate}.pdf`);
  };

  const exportExpensesPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text("Laporan Pengeluaran", 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 30);
    
    // Summary
    doc.setFontSize(12);
    doc.text("Ringkasan", 14, 45);
    doc.setFontSize(10);
    doc.text(`Total Pengeluaran: ${formatRupiah(totalPengeluaran)}`, 14, 55);
    doc.text(`Pengeluaran Operasional: ${formatRupiah(totalExpOps)}`, 14, 62);
    doc.text(`Pengeluaran Beli Produk: ${formatRupiah(totalExpBuy)}`, 14, 69);
    doc.text(`Total Transaksi: ${filteredExpenses.length}`, 14, 76);
    
    // Table
    const tableData = filteredExpenses.map((expense, index) => [
      index + 1,
      expense.name,
      expense.category,
      formatDate(expense.expense_date),
      formatRupiah(expense.amount),
      expense.note || "-"
    ]);
    
    autoTable(doc, {
      head: [["No", "Nama", "Kategori", "Tanggal", "Jumlah", "Catatan"]],
      body: tableData,
      startY: 90,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [239, 68, 68] }
    });
    
    doc.save(`laporan-pengeluaran-${startDate}-${endDate}.pdf`);
  };

  const exportDetailSalesPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text("Laporan Detail Penjualan", 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 30);
    
    // Summary
    doc.setFontSize(12);
    doc.text("Ringkasan", 14, 45);
    doc.setFontSize(10);
    doc.text(`Total Penjualan: ${formatRupiah(totalPendapatan)}`, 14, 55);
    doc.text(`Total Transaksi: ${filteredSales.length}`, 14, 62);
    doc.text(`Total Item Terjual: ${filteredSaleItems.reduce((sum, item) => sum + item.qty, 0)}`, 14, 69);
    
    // Group by sale
    let currentY = 85;
    filteredSales.forEach((sale, saleIndex) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      // Sale header
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text(`Transaksi ${saleIndex + 1} - ${sale.customer_name || "Customer"}`, 14, currentY);
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      doc.text(`Tanggal: ${formatDate(sale.created_at)} | Total: ${formatRupiah(sale.total)} | Profit: ${formatRupiah(sale.profit)}`, 14, currentY + 6);
      
      currentY += 15;
      
      // Sale items
      const items = filteredSaleItems.filter(item => item.sale_id === sale.id);
      const itemData = items.map((item, index) => [
        index + 1,
        item.product_name,
        item.qty,
        formatRupiah(item.sell_price),
        formatRupiah(item.subtotal)
      ]);
      
      if (itemData.length > 0) {
        autoTable(doc, {
          head: [["No", "Produk", "Qty", "Harga", "Subtotal"]],
          body: itemData,
          startY: currentY,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
          theme: "grid",
          margin: { left: 14, right: 14 }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
    });
    
    doc.save(`laporan-detail-penjualan-${startDate}-${endDate}.pdf`);
  };

  const exportKeuanganPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text("Laporan Keuangan", 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 30);
    
    // Summary Cards
    doc.setFontSize(12);
    doc.text("Ringkasan Keuangan", 14, 45);
    doc.setFontSize(10);
    doc.text(`Total Penjualan: ${formatRupiah(totalPendapatan)}`, 14, 55);
    doc.text(`Total Pengeluaran: ${formatRupiah(totalPengeluaran)}`, 14, 62);
    doc.text(`Keuntungan Bersih: ${formatRupiah(labaBersih)}`, 14, 69);
    
    // Penjualan Detail
    doc.setFontSize(12);
    doc.text("Rincian Penjualan", 14, 85);
    doc.setFontSize(10);
    doc.text(`Total Omzet: ${formatRupiah(totalPendapatan)}`, 14, 95);
    doc.text(`Modal/HPP: ${formatRupiah(totalCost)}`, 14, 102);
    doc.text(`Profit Penjualan (Laba Kotor): ${formatRupiah(totalProfit)}`, 14, 109);
    
    // Pengeluaran Detail
    doc.setFontSize(12);
    doc.text("Rincian Pengeluaran", 14, 125);
    doc.setFontSize(10);
    doc.text(`Pengeluaran Operasional: ${formatRupiah(totalExpOps)}`, 14, 135);
    doc.text(`Pengeluaran Beli Produk: ${formatRupiah(totalExpBuy)}`, 14, 142);
    doc.text(`Total Pengeluaran: ${formatRupiah(totalPengeluaran)}`, 14, 149);
    
    // Final Summary Box
    doc.setDrawColor(59, 130, 246);
    doc.setFillColor(59, 130, 246, 0.1);
    doc.rect(14, 165, 180, 30, 'FD');
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Keuntungan Bersih", 20, 180);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(`Total Penjualan − Total Pengeluaran = ${formatRupiah(labaBersih)}`, 20, 188);
    
    // Sales Table
    if (filteredSales.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Detail Transaksi Penjualan", 14, 20);
      
      const salesTableData = filteredSales.map((sale, index) => [
        index + 1,
        sale.customer_name || "-",
        formatDate(sale.created_at),
        formatRupiah(sale.total),
        formatRupiah(sale.profit)
      ]);
      
      autoTable(doc, {
        head: [["No", "Customer", "Tanggal", "Total", "Profit"]],
        body: salesTableData,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] }
      });
    }
    
    // Expenses Table
    if (filteredExpenses.length > 0) {
      if (filteredSales.length > 0) {
        doc.addPage();
      }
      doc.setFontSize(14);
      doc.text("Detail Pengeluaran", 14, 20);
      
      const expensesTableData = filteredExpenses.map((expense, index) => [
        index + 1,
        expense.name,
        expense.category,
        formatDate(expense.expense_date),
        formatRupiah(expense.amount),
        expense.note || "-"
      ]);
      
      autoTable(doc, {
        head: [["No", "Nama", "Kategori", "Tanggal", "Jumlah", "Catatan"]],
        body: expensesTableData,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [239, 68, 68] }
      });
    }
    
    doc.save(`laporan-keuangan-${startDate}-${endDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan Keuangan</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Dari Tanggal</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Sampai Tanggal</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label>Jenis Laporan</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih laporan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keuangan">Laporan Keuangan</SelectItem>
                  <SelectItem value="penjualan">Laporan Penjualan</SelectItem>
                  <SelectItem value="stok">Laporan Stok</SelectItem>
                  <SelectItem value="pengeluaran">Laporan Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  switch(reportType) {
                    case "keuangan":
                      exportKeuanganPDF();
                      break;
                    case "penjualan":
                      exportSalesPDF();
                      break;
                    case "stok":
                      exportStockPDF();
                      break;
                    case "pengeluaran":
                      exportExpensesPDF();
                      break;
                  }
                }} 
                variant="outline" 
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export {reportType === "keuangan" ? "Keuangan" : reportType === "penjualan" ? "Penjualan" : reportType === "stok" ? "Stok" : "Pengeluaran"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportType === "keuangan" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Laporan Keuangan</h2>
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
              {/* Penjualan */}
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

              {/* Pengeluaran */}
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

              {/* Keuntungan Bersih */}
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
        </div>
      )}

      {reportType === "penjualan" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Laporan Penjualan</h2>
          <div className="flex gap-2">
            <Button onClick={exportSalesPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Ringkasan
            </Button>
            <Button onClick={exportDetailSalesPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Detail
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Penjualan</CardTitle>
                <ShoppingCart className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{formatRupiah(totalPendapatan)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{filteredSales.length} transaksi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profit Penjualan</CardTitle>
                <TrendingUp className="h-5 w-5 text-emerald" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald">{formatRupiah(totalProfit)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Laba kotor</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Item Terjual</CardTitle>
                <Package className="h-5 w-5 text-blue" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue">{filteredSaleItems.reduce((sum, item) => sum + item.qty, 0)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Total unit</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {reportType === "stok" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Laporan Stok Barang</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Jenis Produk</CardTitle>
                <Package className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{filteredProducts.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Total jenis</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Stok</CardTitle>
                <Package className="h-5 w-5 text-emerald" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald">{filteredProducts.reduce((sum, p) => sum + p.stock, 0)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Total unit</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Modal</CardTitle>
                <Wallet className="h-5 w-5 text-blue" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue">{formatRupiah(filteredProducts.reduce((sum, p) => sum + (p.stock * p.buy_price), 0))}</p>
                <p className="mt-1 text-xs text-muted-foreground">Nilai modal tersisa</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {reportType === "pengeluaran" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Laporan Pengeluaran</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
                <Wallet className="h-5 w-5 text-rose" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-rose">{formatRupiah(totalPengeluaran)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{filteredExpenses.length} transaksi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Operasional</CardTitle>
                <TrendingDown className="h-5 w-5 text-orange" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange">{formatRupiah(totalExpOps)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Biaya operasional</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Beli Produk</CardTitle>
                <Package className="h-5 w-5 text-blue" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue">{formatRupiah(totalExpBuy)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Pembelian produk</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
