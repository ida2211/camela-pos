

# Aplikasi Manajemen Keuangan & Stok - CAMELA

## Gambaran Umum
Aplikasi manajemen toko pakaian **CAMELA** dengan sistem keuangan dan stok yang terintegrasi. Setiap perubahan stok dan penjualan akan otomatis mempengaruhi catatan keuangan secara real-time.

---

## Database (Supabase)

### Tabel-tabel utama:
1. **products** — Data produk (nama, harga beli, harga jual, stok)
2. **sales** — Transaksi penjualan (customer, tanggal, total, profit)
3. **sale_items** — Detail item per transaksi (produk, qty, harga)
4. **expenses** — Pengeluaran (nama, nominal, tanggal, kategori: "Operasional" / "Beli Produk", catatan)

### Logika Otomatis:
- **Tambah/update stok** → otomatis buat entri expense kategori "Beli Produk" (Harga Beli × Jumlah)
- **Penjualan berhasil** → stok produk berkurang sesuai qty, profit dihitung (Harga Jual - Harga Beli) × Qty

---

## Halaman & Fitur

### 1. Sidebar Navigasi
- Logo & nama "CAMELA" di atas
- Menu: Dashboard, Stok Barang, Penjualan, Pengeluaran, Laporan
- Collapsible, responsif untuk mobile
- Warna tema profesional dengan aksen emerald

### 2. Dashboard
- **4 Kartu Ringkasan**: Total Penjualan, Total Keuntungan (hijau emerald), Total Pengeluaran Operasional (rose), Total Pengeluaran Beli Produk (rose)
- **Grafik Tren Penjualan Mingguan** (line/bar chart via Recharts)
- **Pie Chart Komposisi Pengeluaran** (Operasional vs Beli Produk)

### 3. Menu Stok Barang
- Tabel produk: Nama, Harga Beli, Harga Jual, Stok, Aksi (Edit/Hapus)
- Search bar untuk filter produk
- Dialog/form tambah produk baru (nama, harga beli, harga jual, stok awal)
- Dialog edit produk & tambah stok
- Otomatis catat pengeluaran "Beli Produk" saat stok ditambah

### 4. Menu Penjualan
- **Form Transaksi Baru**: Nama customer, pilih produk (dropdown), qty, total harga otomatis
- Bisa tambah multiple item per transaksi
- **Riwayat Penjualan**: Tabel dengan ID, Customer, Tanggal, Total, Modal (HPP), Keuntungan, Aksi
- Search bar untuk filter riwayat
- Stok otomatis berkurang saat transaksi sukses

### 5. Menu Pengeluaran
- **Form Tambah Pengeluaran**: Nama, nominal, tanggal, catatan, kategori (Operasional/Beli Produk)
- **Tabel Pengeluaran**: Gabungan pengeluaran manual & otomatis dari stok
- Search bar, badge warna untuk kategori

### 6. Menu Laporan
- Filter rentang tanggal (date range picker)
- Ringkasan: Total pendapatan, total pengeluaran, laba bersih
- Breakdown per kategori
- Format scannable dengan kartu dan tabel ringkas

---

## Desain & UI/UX
- Tema bersih dan profesional, warna utama dark/neutral dengan aksen emerald
- **Emerald/hijau** untuk angka positif & keuntungan
- **Rose/merah** untuk pengeluaran & kerugian
- Semua tabel dilengkapi search bar
- Fully responsive (mobile & desktop)
- Menggunakan komponen Shadcn UI (Card, Table, Dialog, Select, Tabs, dll.)
- Recharts untuk grafik dashboard

