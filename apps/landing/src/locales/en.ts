export default {
  nav: {
    fitur: 'Features',
    harga: 'Pricing',
    testimoni: 'Testimonials',
    register: 'Register',
  },
  hero: {
    tagline: 'The simple boilerplate for your business apps.',
    deskripsi: 'All-in-one digital skeleton solution for Indonesian UMKM. Manage users, roles, permissions, merchants, and uploads in one easy-to-use platform.',
    masuk: 'Login',
    daftar: 'Register',
    stats: {
      pengguna: 'Active Users',
      transaksi: 'Permissions',
      outlet: 'Merchants',
      tahun: 'Experience',
    },
    kepercayaan: 'Trusted by thousands of developers and merchants across Indonesia',
  },
  features: {
    title: 'Key Features',
    subtitle: 'Everything you need to manage your business skeleton.',
    items: [
      { title: 'User Management', description: 'Real-time user tracking and management.' },
      { title: 'Role Management', description: 'Assign roles to control access and actions.' },
      { title: 'Permission Management', description: 'Easily manage granular permissions.' },
      { title: 'Merchant Management', description: 'Manage merchant details and metadata.' },
      { title: 'Upload Management', description: 'S3-compatible secure file uploads.' },
      { title: 'Notification System', description: 'In-app notification system.' },
    ],
  },
  pricing: {
    title: 'Pricing Plans',
    subtitle: 'Choose the plan that fits your business needs.',
    plans: [
      {
        name: 'Free',
        price: 'Rp 0',
        period: '/month',
        features: ['Up to 5 users', '1 merchant', 'Basic features', 'Email support'],
        cta: 'Get Started',
        featured: false,
      },
      {
        name: 'Business',
        price: 'Rp 99,000',
        period: '/month',
        features: ['Unlimited users', 'Up to 3 merchants', 'All features', 'Priority support', 'Data export'],
        cta: 'Start Trial',
        featured: true,
      },
      {
        name: 'Enterprise',
        price: 'Rp 299,000',
        period: '/month',
        features: ['Unlimited users', 'Unlimited merchants', 'Customized solutions', '24/7 support', 'API access', 'Dedicated account'],
        cta: 'Contact Us',
        featured: false,
      },
    ],
  },
  testimonials: {
    title: 'What Customers Say',
    subtitle: 'Join thousands of businesses already using GH Skeleton.',
    items: [
      { quote: 'GH Skeleton helps me build business dashboards extremely fast. The boilerplate is so clean!', name: 'Rian Prasetyo', role: 'Software Engineer' },
      { quote: 'I used to struggle setting up RBAC. Now it is already configured out-of-the-box!', name: 'Budi Santoso', role: 'Tech Lead' },
      { quote: 'The merchant structures are very clean and easy to customize for our SaaS project.', name: 'Dewi Lestari', role: 'SaaS Founder' },
    ],
  },
  register: {
    kicker: 'Create New Account',
    title: 'Start Using GH Skeleton',
    subtitle: 'Fill in the form below to create a new merchant account.',
    fields: {
      name: 'Full Name',
      email: 'Email',
      password: 'Password',
      merchantName: 'Merchant Name',
      merchantSlug: 'Merchant Slug',
    },
    actions: {
      submit: 'Register Now',
      loading: 'Processing...',
    },
    messages: {
      success: 'Registration successful. Please continue login in the web app.',
      failed: 'Registration failed. Please try again.',
    },
  },
  footer: {
    hakCipta: 'GH Skeleton Project. All rights reserved.',
  },
}
