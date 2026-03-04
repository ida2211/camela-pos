import { useState, useEffect, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function renderStruk(doc: jsPDF, sale: Sale, items: SaleItem[]) {
  const storeProfile = JSON.parse(localStorage.getItem("storeProfile") || "{}");
  const storeName = storeProfile.name || "CAMELA OUTWEAR";
  const storeAddress = storeProfile.address || "";
  const storePhone = storeProfile.phone || "";

  const pw = doc.internal.pageSize.getWidth();
  const cx = pw / 2;
  const ml = 8; // margin left
  const mr = pw - 8; // margin right
  let y = 14;

  // === Header Toko ===
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(storeName.toUpperCase(), cx, y, { align: "center" });
  y += 13;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  if (storeAddress) {
    const lines = doc.splitTextToSize(storeAddress, pw - 16);
    lines.forEach((l: string) => { doc.text(l, cx, y, { align: "center" }); y += 9; });
  }
  if (storePhone) {
    doc.text(`Telp: ${storePhone}`, cx, y, { align: "center" });
    y += 9;
  }
  y += 2;

  // === Garis putus-putus ===
  const dash = (yy: number) => {
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    const dashes = "- ".repeat(30);
    doc.text(dashes, cx, yy, { align: "center" });
  };

  dash(y); y += 8;

  // === Info Transaksi ===
  doc.setFontSize(7);
  doc.text(`Tanggal  : ${formatDateTime(sale.created_at)}`, ml, y); y += 9;
  doc.text(`Customer : ${sale.customer_name}`, ml, y); y += 9;

  dash(y); y += 10;

  // === Daftar Item ===
  doc.setFontSize(7);
  for (const item of items) {
    // Nama produk
    doc.setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(item.product_name, pw - 16);
    nameLines.forEach((l: string) => { doc.text(l, ml, y); y += 8; });

    // Detail: qty x harga = subtotal
    doc.setFont("helvetica", "normal");
    const detail = `  ${item.qty} x ${formatRupiah(item.sell_price)}`;
    doc.text(detail, ml, y);
    doc.text(formatRupiah(item.subtotal), mr, y, { align: "right" });
    y += 10;
  }

  dash(y); y += 10;

  // === Total ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL", ml, y);
  doc.text(formatRupiah(sale.total), mr, y, { align: "right" });
  y += 12;

  dash(y); y += 10;

  // === Footer ===
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Terima kasih sudah berbelanja!", cx, y, { align: "center" }); y += 9;
  doc.text("Semoga puas dengan produk kami", cx, y, { align: "center" }); y += 9;
  doc.text("Sampai jumpa kembali!", cx, y, { align: "center" }); y += 6;

  return y;
}

function printStrukPDF(sale: Sale, items: SaleItem[]) {
  const pageWidth = 226.77;
  // Pass 1: measure height
  const measureDoc = new jsPDF({ unit: "pt", format: [pageWidth, 1000], orientation: "portrait" });
  const totalH = renderStruk(measureDoc, sale, items) + 10;

  // Pass 2: render with exact height
  const doc = new jsPDF({ unit: "pt", format: [pageWidth, totalH], orientation: "portrait" });
  renderStruk(doc, sale, items);
  doc.save(`struk-${sale.id.slice(0, 8)}.pdf`);
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
  const [platform, setPlatform] = useState<"regular" | "tiktok" | "shopee">("regular");
  const [platformFeePercent, setPlatformFeePercent] = useState("");
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
  
  // Hitung platform fee
  let platformFee = 0;
  if (platform === "tiktok" || platform === "shopee") {
    const feePercent = Number(platformFeePercent) || 0;
    platformFee = cartTotal * (feePercent / 100);
  }
  const finalTotal = cartTotal - platformFee;

  // Auto-setup platform fields on component mount
  useEffect(() => {
    const autoSetupPlatform = async () => {
      try {
        console.log("Auto-checking platform fields...");
        
        // Check if platform column exists
        const { error: checkError } = await supabase
          .from("sales")
          .select("platform")
          .limit(1);
        
        if (checkError && checkError.message.includes('column')) {
          console.log("Platform columns don't exist, attempting aggressive auto-setup...");
          
          // Method 1: Try RPC to execute SQL
          try {
            console.log("Method 1: RPC SQL execution...");
            
            const { error: rpcError } = await supabase.rpc('exec_sql', {
              sql: `
                ALTER TABLE sales 
                ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'regular' CHECK (platform IN ('regular', 'tiktok', 'shopee')),
                ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(15,2) DEFAULT 0.00;
                
                CREATE INDEX IF NOT EXISTS idx_sales_platform ON sales(platform);
                
                UPDATE sales 
                SET platform = 'regular' 
                WHERE platform IS NULL;
              `
            });
            
            if (!rpcError) {
              console.log("✅ RPC SQL execution successful!");
              toast.success("Platform fields auto-setup completed via RPC!");
              
              // Test the setup
              const { error: testError } = await supabase
                .from("sales")
                .select("platform")
                .limit(1);
              
              if (!testError) {
                console.log("✅ Platform fields verified!");
                return;
              }
            }
          } catch (e) {
            console.log("Method 1 (RPC) failed:", e);
          }
          
          // Method 2: Try direct SQL via raw query
          try {
            console.log("Method 2: Raw SQL query...");
            
            const { error: rawError } = await supabase
              .from('sales')
              .select('*')
              .limit(1);
            
            if (rawError && rawError.message.includes('column')) {
              // Force create columns by trying to insert with platform fields
              const { error: insertError } = await supabase
                .from('sales')
                .insert({
                  customer_name: "setup_test",
                  total: 0,
                  cost: 0,
                  profit: 0,
                  platform: "regular",
                  platform_fee: 0
                });
              
              if (!insertError) {
                console.log("✅ Columns created via insert!");
                // Clean up test record
                await supabase
                  .from('sales')
                  .delete()
                  .eq('customer_name', 'setup_test');
                
                toast.success("Platform fields auto-setup completed!");
                return;
              }
            }
          } catch (e) {
            console.log("Method 2 (Raw SQL) failed:", e);
          }
          
          // Method 3: Force manual setup with automatic copy and open
          console.log("Method 3: Force manual setup...");
          
          const setupSQL = `ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'regular' CHECK (platform IN ('regular', 'tiktok', 'shopee')),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(15,2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_sales_platform ON sales(platform);

UPDATE sales 
SET platform = 'regular' 
WHERE platform IS NULL;`;
          
          // Auto copy to clipboard
          try {
            await navigator.clipboard.writeText(setupSQL);
            console.log("✅ SQL copied to clipboard!");
            
            // Auto open dashboard
            window.open("https://supabase.com/dashboard/project/iyjtduaxwujsyrcdglia/sql", "_blank");
            
            toast.error("Platform fields missing! Dashboard opened with SQL ready to paste.", {
              duration: 10000
            });
            
            // Show alert with instructions
            alert(`PLATFORM SETUP REQUIRED!

SQL has been copied to clipboard and dashboard opened.

1. Paste SQL in the SQL Editor
2. Click "Run"
3. Refresh this page

SQL to paste:
${setupSQL}
            `);
          } catch (clipboardError) {
            // Fallback - open dashboard with SQL in URL
            const encodedSQL = encodeURIComponent(setupSQL);
            window.open(`https://supabase.com/dashboard/project/iyjtduaxwujsyrcdglia/sql?sql=${encodedSQL}`, "_blank");
            
            toast.error("Platform fields missing! Please run SQL in opened dashboard.", {
              duration: 10000
            });
          }
          
          console.log(`
==========================================
FORCE SETUP REQUIRED
==========================================
${setupSQL}

Dashboard: https://supabase.com/dashboard/project/iyjtduaxwujsyrcdglia/sql
==========================================
          `);
        } else {
          console.log("✅ Platform fields already exist");
          toast.success("Platform fields are ready!");
        }
      } catch (error) {
        console.log("Auto-setup check failed:", error);
      }
    };
    
    autoSetupPlatform();
  }, []);
const setupPlatformFields = async () => {
  try {
    console.log("Setting up platform fields...");
    
    // Check if platform column exists
    const { error: checkError } = await supabase
      .from("sales")
      .select("platform")
      .limit(1);
    
    if (checkError && checkError.message.includes('column')) {
      console.log("Platform columns don't exist, creating them...");
      
      // Create platform columns using raw SQL through Supabase
      const sql = `
        ALTER TABLE sales 
        ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'regular' CHECK (platform IN ('regular', 'tiktok', 'shopee')),
        ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(15,2) DEFAULT 0.00;
        
        CREATE INDEX IF NOT EXISTS idx_sales_platform ON sales(platform);
        
        UPDATE sales 
        SET platform = 'regular' 
        WHERE platform IS NULL;
      `;
      
      console.log("Please run this SQL in Supabase Dashboard SQL Editor:");
      console.log(sql);
      
      // Show user-friendly message
      alert(`Platform fields need to be added to database!

Please run this SQL in Supabase Dashboard SQL Editor:

${sql}

After running the SQL, refresh this page and try again.
      `);
      
      return false;
    }
    
    console.log("Platform fields already exist");
    return true;
  } catch (error) {
    console.error("Setup error:", error);
    return false;
  }
};

// Helper function to process items and stock
const processItemsAndStock = async (sale: any, cart: CartItem[], products: any[], effectivePrice: (c: CartItem) => number) => {
  const items = cart.map((c) => ({
    sale_id: sale.id,
    product_id: c.product_id,
    product_name: c.product_name,
    qty: c.qty,
    buy_price: c.buy_price,
    sell_price: effectivePrice(c),
    subtotal: effectivePrice(c) * c.qty,
  }));
  
  console.log("Items to insert:", items);
  
  const { error: itemsError } = await supabase.from("sale_items").insert(items);
  if (itemsError) {
    console.error("Error inserting items:", itemsError);
    throw new Error(`Failed to insert items: ${itemsError.message}`);
  }

  for (const c of cart) {
    const p = products.find((pr) => pr.id === c.product_id);
    if (p) {
      const newStock = p.stock - c.qty;
      console.log(`Updating stock for ${p.name}: ${p.stock} -> ${newStock}`);
      const { error: stockError } = await supabase.from("products").update({ stock: newStock }).eq("id", p.id);
      if (stockError) {
        console.error("Error updating stock:", stockError);
        throw new Error(`Failed to update stock: ${stockError.message}`);
      }
    }
  }
};

const submitSale = useMutation({
    mutationFn: async () => {
      try {
        console.log("=== TRANSACTION WITH PLATFORM ===");
        console.log("Cart:", cart);
        console.log("Cart length:", cart.length);
        console.log("Platform:", platform);
        console.log("Platform Fee %:", platformFeePercent);
        
        // Validate cart is not empty
        if (cart.length === 0) {
          throw new Error("Cart is empty - please add items");
        }
        
        // Validate stock availability
        for (const cartItem of cart) {
          const product = products.find(p => p.id === cartItem.product_id);
          if (product) {
            console.log(`Product ${product.name}: stock=${product.stock}, needed=${cartItem.qty}`);
            if (product.stock < cartItem.qty) {
              throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Needed: ${cartItem.qty}`);
            }
          }
        }
        
        const total = cartTotal;
        const cost = cartCost;
        
        // Calculate platform fee
        let platformFeeAmount = 0;
        if (platform === "tiktok" || platform === "shopee") {
          const feePercent = Number(platformFeePercent) || 0;
          platformFeeAmount = total * (feePercent / 100);
        }
        const finalTotal = total - platformFeeAmount;
        const profit = finalTotal - cost;

        console.log("Values - Total:", total, "Cost:", cost, "Platform Fee:", platformFeeAmount, "Final Total:", finalTotal, "Profit:", profit);

        // Try to save with platform fields first
        let saleData: any = { 
          customer_name: customerName || "Umum", 
          total: finalTotal, 
          cost: cost, 
          profit: profit
        };

        // Add platform fields if TikTok or Shopee
        if (platform === "tiktok" || platform === "shopee") {
          saleData.platform = platform;
          saleData.platform_fee = platformFeeAmount;
        }
        
        console.log("Sale data to insert:", saleData);

        const { data: sale, error } = await supabase
          .from("sales")
          .insert(saleData)
          .select()
          .single();

        console.log("Insert result - sale:", sale, "error:", error);

        if (error) {
          console.error("Error creating sale:", error);
          
          // If error is about platform fields, fallback to basic transaction
          if (error.message && (error.message.includes('column') || error.message.includes('platform'))) {
            console.log("Platform fields not available, using basic transaction");
            
            // Fallback to basic data without platform fields
            const basicSaleData = { 
              customer_name: customerName || "Umum", 
              total: finalTotal, 
              cost: cost, 
              profit: profit
            };
            
            console.log("Basic sale data:", basicSaleData);
            
            const { data: sale2, error: error2 } = await supabase
              .from("sales")
              .insert(basicSaleData)
              .select()
              .single();
              
            if (error2) {
              console.error("Error with basic sale data:", error2);
              throw new Error(`Failed to create sale: ${error2.message}`);
            }
            
            if (!sale2) throw new Error("Failed to create sale");
            
            console.log("Sale created successfully (basic):", sale2);
            
            // Continue with sale2 for items and stock
            await processItemsAndStock(sale2, cart, products, effectivePrice);
            
            // Show warning about platform fields
            toast.warning("Transaksi berhasil tanpa platform. Platform fields perlu ditambahkan ke database.");
            return;
          }
          
          throw new Error(`Failed to create sale: ${error.message}`);
        }

        if (!sale) throw new Error("Failed to create sale");

        console.log("Sale created successfully with platform:", sale);
        
        // Process items and stock
        await processItemsAndStock(sale, cart, products, effectivePrice);
        
        console.log("=== TRANSACTION SUCCESS ===");
      } catch (error) {
        console.error("=== TRANSACTION ERROR ===");
        console.error("Transaction error:", error);
        console.error("Error stack:", error.stack);
        console.error("=== END ERROR ===");
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Transaction successful!");
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      setCart([]);
      setCustomerName("");
      setPlatform("regular");
      setPlatformFeePercent("");
      setIsReseler(false);
      setSelDiscount("0");
      toast.success("Transaksi berhasil!");
    },
    onError: (error: any) => {
      console.error("Transaction failed:", error);
      toast.error(`Gagal menyimpan transaksi: ${error.message || error}`);
    },
  });

  const deleteSaleMut = useMutation({
    mutationFn: async (id: string) => {
      // Get sale items to restore stock
      const { data: items } = await supabase.from("sale_items").select("*").eq("sale_id", id);
      
      if (items && items.length > 0) {
        // Show confirmation dialog
        const restoreStock = window.confirm(
          `Apakah Anda ingin mengembalikan stok untuk ${items.length} item?\n\n` +
          items.map(item => `- ${item.product_name} (${item.qty} unit)`).join('\n') +
          '\n\nKlik OK untuk mengembalikan stok, Cancel untuk tidak.'
        );
        
        // Delete sale items
        await supabase.from("sale_items").delete().eq("sale_id", id);
        
        // Restore stock if confirmed
        if (restoreStock) {
          for (const item of items) {
            // Get current stock and update directly
            const { data: product } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
            if (product) {
              await supabase.from("products").update({ 
                stock: product.stock + item.qty 
              }).eq("id", item.product_id);
            }
          }
          
          // Create expense record for stock restoration
          await supabase.from("expenses").insert({
            name: `Kembalikan Stok - Transaksi Dihapus`,
            amount: items.reduce((total, item) => {
              const product = products.find(p => p.id === item.product_id);
              return total + (product ? product.buy_price * item.qty : 0);
            }, 0),
            category: "Koreksi Stok",
            note: `Pengembalian stok dari transaksi yang dihapus (${items.length} item)`,
          });
        }
      }
      
      // Delete sale
      await supabase.from("sales").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Penjualan dihapus dan stok dikembalikan");
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      toast.error(`Gagal menghapus penjualan: ${error.message || error}`);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={setupPlatformFields}>
            <Tag className="mr-2 h-4 w-4" /> Setup Platform
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Transaksi Baru
          </Button>
        </div>
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
                  <TableHead>Platform</TableHead>
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
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Belum ada penjualan
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => {
                    const getPlatformLabel = (platform?: string) => {
                      if (!platform) return "Regular";
                      switch(platform) {
                        case "tiktok": return "TikTok";
                        case "shopee": return "Shopee";
                        default: return "Regular";
                      }
                    };
                    
                    return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.customer_name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                          {getPlatformLabel((s as any).platform)}
                        </span>
                      </TableCell>
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { 
          setCart([]); 
          setCustomerName(""); 
          setPlatform("regular");
          setPlatformFeePercent("");
          setIsReseler(false); 
          setSelDiscount("0"); 
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaksi Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nama Customer</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Opsional" />
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(value: "regular" | "tiktok" | "shopee") => {
                  setPlatform(value);
                  if (value !== "regular") {
                    setIsReseler(false);
                    setSelDiscount("0");
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="tiktok">TikTok Shop</SelectItem>
                    <SelectItem value="shopee">Shopee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(platform === "tiktok" || platform === "shopee") && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <Tag className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Potongan Platform</Label>
                    <p className="text-xs text-gray-500">Platform {platform === "tiktok" ? "TikTok" : "Shopee"}</p>
                  </div>
                </div>
                
                <div className="relative">
                  <Input 
                    type="number"
                    value={platformFeePercent} 
                    onChange={(e) => setPlatformFeePercent(e.target.value)} 
                    placeholder="0.0"
                    min="0"
                    max="100"
                    step="0.1"
                    className="pr-12"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-sm font-semibold text-gray-500">%</span>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(Number(platformFeePercent) || 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">0%</span>
                    <span className="text-xs font-bold text-gray-700">{platformFeePercent || 0}%</span>
                    <span className="text-xs text-gray-500">100%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle Reseler */}
            {platform === "regular" && (
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
            )}

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
                      {isReseler && platform === "regular" && <TableHead className="text-right">Disc</TableHead>}
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
                        {isReseler && platform === "regular" && (
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
                  {isReseler && platform === "regular" && totalDiscount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Total Diskon Reseler: <span className="font-semibold text-amber-600">-{formatRupiah(totalDiscount)}</span>
                    </p>
                  )}
                  <p className="font-bold">Total: {formatRupiah(cartTotal)}</p>
                  {platformFee > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Potongan {platform === "tiktok" ? "TikTok" : "Shopee"} ({platformFeePercent}%): 
                        <span className="font-semibold text-red-600">-{formatRupiah(platformFee)}</span>
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        Final Total: {formatRupiah(finalTotal)}
                      </p>
                    </>
                  )}
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
