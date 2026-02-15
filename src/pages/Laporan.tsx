import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, DollarSign, Calculator } from "lucide-react";

export default function Laporan() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

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
  // Laba bersih = Total Penjualan - Total Pengeluaran (semua)
  const labaBersih = totalPendapatan - totalPengeluaran;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan Keuangan</h1>

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
  );
}
