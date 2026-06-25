export default {
  nav: {
    fitur: 'Fitur',
    harga: 'Harga',
    testimoni: 'Testimoni',
    register: 'Register',
  },
  hero: {
    tagline: 'Boilerplate sederhana untuk aplikasi bisnis Anda.',
    deskripsi: 'Solusi skeleton digital all-in-one untuk UMKM Indonesia. Kelola pengguna, peran, izin, merchant, dan unggahan dalam satu platform yang mudah digunakan.',
    masuk: 'Masuk',
    daftar: 'Daftar',
    stats: {
      pengguna: 'Pengguna Aktif',
      transaksi: 'Hak Akses',
      outlet: 'Merchant',
      tahun: 'Pengalaman',
    },
    kepercayaan: 'Dipercaya oleh ribuan developer dan merchant di seluruh Indonesia',
  },
  features: {
    title: 'Fitur Unggulan',
    subtitle: 'Semua yang Anda butuhkan untuk mengelola skeleton bisnis Anda.',
    items: [
      { title: 'Manajemen Pengguna', description: 'Pantau dan kelola data pengguna secara real-time.' },
      { title: 'Manajemen Peran', description: 'Kelola peran (roles) untuk membatasi aksi dan akses.' },
      { title: 'Manajemen Hak Akses', description: 'Kelola izin/permissions secara granular dengan mudah.' },
      { title: 'Manajemen Merchant', description: 'Atur detail informasi merchant dan metadata.' },
      { title: 'Manajemen Unggahan', description: 'Unggah file secara aman dengan integrasi S3.' },
      { title: 'Sistem Notifikasi', description: 'Sistem notifikasi bawaan di dalam aplikasi.' },
    ],
  },
  pricing: {
    title: 'Pilihan Harga',
    subtitle: 'Pilih paket yang sesuai dengan kebutuhan bisnis Anda.',
    plans: [
      {
        name: 'Gratis',
        price: 'Rp 0',
        period: '/bulan',
        features: ['Hingga 5 pengguna', '1 merchant', 'Fitur dasar', 'Dukungan email'],
        cta: 'Mulai Gratis',
        featured: false,
      },
      {
        name: 'Bisnis',
        price: 'Rp 99.000',
        period: '/bulan',
        features: ['Pengguna tak terbatas', 'Hingga 3 merchant', 'Fitur lengkap', 'Dukungan prioritas', 'Ekspor data'],
        cta: 'Mulai Trial',
        featured: true,
      },
      {
        name: 'Enterprise',
        price: 'Rp 299.000',
        period: '/bulan',
        features: ['Pengguna tak terbatas', 'Merchant tak terbatas', 'Solusi kustom', 'Dukungan 24/7', 'API akses', 'Dedicated account'],
        cta: 'Hubungi Kami',
        featured: false,
      },
    ],
  },
  testimonials: {
    title: 'Apa Kata Pelanggan',
    subtitle: 'Bergabung dengan ribuan bisnis yang sudah menggunakan GH Skeleton.',
    items: [
      { quote: 'GH Skeleton membantu saya membuat dashboard bisnis dengan sangat cepat. Boilerplatenya sangat rapi!', name: 'Rian Prasetyo', role: 'Software Engineer' },
      { quote: 'Dulu saya kesulitan mengatur RBAC. Sekarang semuanya sudah terkonfigurasi secara out-of-the-box!', name: 'Budi Santoso', role: 'Tech Lead' },
      { quote: 'Struktur merchant-nya sangat bersih dan mudah dimodifikasi untuk proyek SaaS kami.', name: 'Dewi Lestari', role: 'Pendiri SaaS' },
    ],
  },
  register: {
    kicker: 'Buat Akun Baru',
    title: 'Mulai GH Skeleton Sekarang',
    subtitle: 'Isi data berikut untuk membuat akun merchant baru.',
    fields: {
      name: 'Nama Lengkap',
      email: 'Email',
      password: 'Password',
      merchantName: 'Nama Merchant',
      merchantSlug: 'Slug Merchant',
    },
    actions: {
      submit: 'Daftar Sekarang',
      loading: 'Memproses...',
    },
    messages: {
      success: 'Registrasi berhasil. Silakan lanjut login di aplikasi web.',
      failed: 'Registrasi gagal. Coba lagi.',
    },
  },
  footer: {
    hakCipta: 'GH Skeleton Project. Semua hak dilindungi.',
  },
}
