import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  FileBarChart,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Stok Barang", url: "/stok", icon: Package },
  { title: "Penjualan", url: "/penjualan", icon: ShoppingCart },
  { title: "Pengeluaran", url: "/pengeluaran", icon: Wallet },
  { title: "Laporan", url: "/laporan", icon: FileBarChart },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  
  // Load logo dari localStorage
  const [storeLogo, setStoreLogo] = useState<string>("");
  
  useEffect(() => {
    // Prioritaskan logo dari storeProfile, fallback ke storeLogo
    const storeProfile = localStorage.getItem("storeProfile");
    if (storeProfile) {
      const parsed = JSON.parse(storeProfile);
      if (parsed.logo) {
        setStoreLogo(parsed.logo);
      }
    }
  }, []);

  // Listen untuk perubahan storeProfile
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'storeProfile') {
        const newProfile = e.newValue ? JSON.parse(e.newValue) : null;
        if (newProfile?.logo) {
          setStoreLogo(newProfile.logo);
        } else {
          setStoreLogo("");
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Package className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold tracking-tight text-sidebar-primary">
                  CAMELA
                </h1>
                <p className="text-xs text-sidebar-foreground/60">Manajemen Toko</p>
              </div>
            )}
          </div>
          
          {/* Tombol Edit Profil & Logout */}
          <div className="flex items-center gap-2">
            {!collapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = "/profile"}
                className="text-sidebar-foreground hover:text-sidebar-primary h-8 w-8 p-0"
                title="Edit Profil"
              >
                <User className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
              className="text-sidebar-foreground hover:text-sidebar-primary h-8 w-8 p-0"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
