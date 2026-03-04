import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart, TrendingUp, Wallet, BarChart3, Trophy, Package,
  CreditCard, PiggyBank,
} from "lucide-react";

const MONTHS = [
  { value: "all", label: "Semua Bulan" },
  { value: "1", label: "Januari" }, { value: "2", label: "Februari" },
  { value: "3", label: "Maret" }, { value: "4", label: "April" },
  { value: "5", label: "Mei" }, { value: "6", label: "Juni" },
  { value: "7", label: "Juli" }, { value: "8", label: "Agustus" },
  { value: "9", label: "September" }, { value: "10", label: "Oktober" },
  { value: "11", label: "November" }, { value: "12", label: "Desember" },
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  // Realtime subscription for products, sales, sale_items, expenses, debts, savings
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        queryClient.invalidateQueries({ queryKey: ["sale_items"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sale_items" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sale_items"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "debts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["debts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "savings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["savings"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*");
      return data ?? [];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("*");
      return data ?? [];
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*");
      return data ?? [];
    },
  });

  const { data: saleItems } = useQuery({
    queryKey: ["sale_items"],
    queryFn: async () => {
      const { data } = await supabase.from("sale_items").select("*");
      return data ?? [];
    },
  });

  const { data: debts } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const { data } = await supabase.from("debts").select("*");
      return data ?? [];
    },
  });

  const { data: savings } = useQuery({
    queryKey: ["savings"],
    queryFn: async () => {
      const { data } = await supabase.from("savings").select("*");
      return data ?? [];
    },
  });

  // Build year options from sales & expenses data
  const availableYears = (() => {
    const years = new Set<string>();
    sales?.forEach((s) => years.add(new Date(s.created_at).getFullYear().toString()));
    expenses?.forEach((e) => years.add(new Date(e.expense_date).getFullYear().toString()));
    return Array.from(years).sort().reverse();
  })();

  // Filter function
  const matchDate = (dateStr: string) => {
    if (filterMonth === "all" && filterYear === "all") return true;
    const d = new Date(dateStr);
    if (filterYear !== "all" && d.getFullYear().toString() !== filterYear) return false;
    if (filterMonth !== "all" && (d.getMonth() + 1).toString() !== filterMonth) return false;
    return true;
  };

  const filteredSales = sales?.filter((s) => matchDate(s.created_at)) ?? [];
  const filteredExpenses = expenses?.filter((e) => matchDate(e.expense_date)) ?? [];
  const filteredSaleItems = saleItems?.filter((si) => {
    const sale = sales?.find((s) => s.id === si.sale_id);
    return sale ? matchDate(sale.created_at) : false;
  }) ?? [];

  const totalSales = filteredSales.reduce((s, r) => s + r.total, 0);
  const totalProfit = filteredSales.reduce((s, r) => s + r.profit, 0);
  const totalModalStok = products?.reduce((s, p) => s + p.buy_price * p.stock, 0) ?? 0;
  const totalSellStok = products?.reduce((s, p) => s + p.sell_price * p.stock, 0) ?? 0;
  const estimatedProfit = totalSellStok - totalModalStok;
  const totalExpOps = filteredExpenses.filter((e) => e.category === "Operasional").reduce((s, r) => s + r.amount, 0);
  const totalExpBuy = filteredExpenses.filter((e) => e.category === "Beli Produk").reduce((s, r) => s + r.amount, 0);
  const totalExpenses = totalExpOps + totalExpBuy;
  const selisih = totalSales - totalExpenses;

  // Calculate total debts and savings
  const totalDebts = debts?.filter(d => d.status !== 'paid').reduce((sum, d) => sum + (d.amount - d.paid_amount), 0) || 0;
  const totalSavings = savings?.length > 0 ? savings[savings.length - 1]?.balance_after || 0 : 0;

  const topProducts = (() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    for (const item of filteredSaleItems) {
      const existing = map.get(item.product_id);
      if (existing) {
        existing.qty += item.qty;
        existing.total += item.subtotal;
      } else {
        map.set(item.product_id, { name: item.product_name, qty: item.qty, total: item.subtotal });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 10);
  })();

  const filterLabel = filterMonth === "all" && filterYear === "all"
    ? "Semua Waktu"
    : `${filterMonth !== "all" ? MONTHS.find(m => m.value === filterMonth)?.label : ""} ${filterYear !== "all" ? filterYear : ""}`.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filterLabel !== "Semua Waktu" && (
        <p className="text-sm text-muted-foreground">Menampilkan data: <span className="font-medium">{filterLabel}</span></p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Penjualan</CardTitle>
            <ShoppingCart className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatRupiah(totalSales)}</p>
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>Profit</span>
              <span className="font-semibold text-emerald">{formatRupiah(totalProfit)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modal Produk Tersisa</CardTitle>
            <Package className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-500">{formatRupiah(totalModalStok)}</p>
            <p className="text-xs text-muted-foreground mt-1">{products?.filter(p => p.stock > 0).length ?? 0} produk · {products?.reduce((s, p) => s + p.stock, 0) ?? 0} stok</p>
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>Harga Jual</span>
              <span className="font-semibold text-primary">{formatRupiah(totalSellStok)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
            <Wallet className="h-5 w-5 text-rose" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose">{formatRupiah(totalExpenses)}</p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Operasional</span>
                <span>{formatRupiah(totalExpOps)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Beli Produk</span>
                <span>{formatRupiah(totalExpBuy)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Keuntungan</CardTitle>
            <BarChart3 className={`h-5 w-5 ${selisih >= 0 ? "text-emerald" : "text-rose"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${selisih >= 0 ? "text-emerald" : "text-rose"}`}>
              {formatRupiah(selisih)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Penjualan − Pengeluaran</p>
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>Estimasi jika laku semua</span>
              <span className="font-semibold text-emerald">{formatRupiah(selisih + totalSellStok)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hutang</CardTitle>
            <CreditCard className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">{formatRupiah(totalDebts)}</p>
            <p className="text-xs text-muted-foreground mt-1">Hutang aktif</p>
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>Jumlah</span>
              <span className="font-semibold">{debts?.filter(d => d.status !== 'paid').length || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tabungan</CardTitle>
            <PiggyBank className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">{formatRupiah(totalSavings)}</p>
            <p className="text-xs text-muted-foreground mt-1">Saldo saat ini</p>
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>Transaksi</span>
              <span className="font-semibold">{savings?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">10 Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Belum ada data penjualan
                    </TableCell>
                  </TableRow>
                ) : (
                  topProducts.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right">{formatRupiah(p.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
