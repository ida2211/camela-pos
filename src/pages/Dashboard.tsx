import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import {
  ShoppingCart,
  TrendingUp,
  Wallet,
  Package,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function Dashboard() {
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

  const totalSales = sales?.reduce((s, r) => s + r.total, 0) ?? 0;
  const totalProfit = sales?.reduce((s, r) => s + r.profit, 0) ?? 0;
  const totalExpOps = expenses?.filter((e) => e.category === "Operasional").reduce((s, r) => s + r.amount, 0) ?? 0;
  const totalExpBuy = expenses?.filter((e) => e.category === "Beli Produk").reduce((s, r) => s + r.amount, 0) ?? 0;

  // Weekly sales trend (last 7 days)
  const weeklyData = (() => {
    const days: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(d);
      const total = sales?.filter((s) => s.created_at.startsWith(dateStr)).reduce((sum, s) => sum + s.total, 0) ?? 0;
      days.push({ label, total });
    }
    return days;
  })();

  const pieData = [
    { name: "Operasional", value: totalExpOps },
    { name: "Beli Produk", value: totalExpBuy },
  ];
  const PIE_COLORS = ["hsl(347, 77%, 50%)", "hsl(30, 80%, 55%)"];

  const summaryCards = [
    { title: "Total Penjualan", value: totalSales, icon: ShoppingCart, color: "text-primary" },
    { title: "Total Keuntungan", value: totalProfit, icon: TrendingUp, color: "text-emerald" },
    { title: "Pengeluaran Operasional", value: totalExpOps, icon: Wallet, color: "text-rose" },
    { title: "Pengeluaran Beli Produk", value: totalExpBuy, icon: Package, color: "text-rose" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${c.color}`}>{formatRupiah(c.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tren Penjualan Mingguan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatRupiah(v)} />
                <Bar dataKey="total" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Komposisi Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatRupiah(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
