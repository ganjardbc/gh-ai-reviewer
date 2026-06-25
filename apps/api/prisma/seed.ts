import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const url = new URL(databaseUrl);

const adapter = new PrismaMariaDb({
  host: url.hostname || 'localhost',
  port: url.port ? parseInt(url.port, 10) : 3306,
  user: url.username || 'root',
  password: url.password || '',
  database: url.pathname.slice(1),
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // 1. Create Merchants
  console.log('📦 Creating merchants...');

  const adminMerchant = await prisma.merchants.upsert({
    where: { slug: 'system-admin' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'System Admin',
      slug: 'system-admin',
    },
  });
  console.log(
    `✅ Merchant created: ${adminMerchant.name} (${adminMerchant.slug})`,
  );

  const demoMerchant = await prisma.merchants.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Demo Company',
      slug: 'demo-company',
    },
  });
  console.log(
    `✅ Merchant created: ${demoMerchant.name} (${demoMerchant.slug})\n`,
  );

  // 2. Create Users
  console.log('👤 Creating users...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.users.upsert({
    where: {
      merchant_id_email: {
        merchant_id: adminMerchant.id,
        email: 'admin@demo.com',
      },
    },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      merchant_id: adminMerchant.id,
      name: 'System Admin',
      username: 'admin',
      email: 'admin@demo.com',
      password_hash: hashedPassword,
      is_active: true,
    },
  });
  console.log(`✅ User created: ${adminUser.name} (${adminUser.email})`);

  const ownerUser = await prisma.users.upsert({
    where: {
      merchant_id_email: {
        merchant_id: demoMerchant.id,
        email: 'owner@demo.com',
      },
    },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440015',
      merchant_id: demoMerchant.id,
      name: 'Owner User',
      username: 'owner',
      email: 'owner@demo.com',
      password_hash: hashedPassword,
      is_active: true,
    },
  });
  console.log(`✅ User created: ${ownerUser.name} (${ownerUser.email})`);

  const viewerUser = await prisma.users.upsert({
    where: {
      merchant_id_email: {
        merchant_id: demoMerchant.id,
        email: 'viewer@demo.com',
      },
    },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440014',
      merchant_id: demoMerchant.id,
      name: 'Viewer User',
      username: 'viewer',
      email: 'viewer@demo.com',
      password_hash: hashedPassword,
      is_active: true,
    },
  });
  console.log(`✅ User created: ${viewerUser.name} (${viewerUser.email})\n`);

  // 3. Create Roles
  console.log('🔐 Seeding RBAC (roles & permissions)...');

  const ROLE_ADMIN_ID = '550e8400-e29b-41d4-a716-446655440081';
  const ROLE_OWNER_ID = '550e8400-e29b-41d4-a716-446655440080';
  const ROLE_VIEWER_ID = '550e8400-e29b-41d4-a716-446655440084';

  const rolesData = [
    { id: ROLE_ADMIN_ID, name: 'admin', description: 'Full system access' },
    {
      id: ROLE_OWNER_ID,
      name: 'owner',
      description: 'Organization owner with full control',
    },
    { id: ROLE_VIEWER_ID, name: 'viewer', description: 'Read-only access' },
  ];

  for (const role of rolesData) {
    const existing = await prisma.roles.findFirst({ where: { id: role.id } });
    if (!existing) {
      await prisma.roles.create({ data: role });
    }
    console.log(`✅ Role: ${role.name}`);
  }

  // 4. Create Permissions
  const permissionsData = [
    // Merchant management
    { code: 'merchants.create', description: 'Create merchants' },
    { code: 'merchants.read', description: 'Read merchants' },
    { code: 'merchants.update', description: 'Update merchant details' },
    { code: 'merchants.delete', description: 'Delete merchants' },
    // Role management
    { code: 'role.create', description: 'Create roles' },
    { code: 'role.read', description: 'Read roles' },
    { code: 'role.update', description: 'Update roles & assign permissions' },
    { code: 'role.delete', description: 'Delete roles' },
    { code: 'role.assign', description: 'Assign & revoke user roles' },
    // Permission management
    { code: 'permission.create', description: 'Create permissions' },
    { code: 'permission.read', description: 'Read permissions' },
    { code: 'permission.delete', description: 'Delete permissions' },
    // User management
    { code: 'user.create', description: 'Create users' },
    { code: 'user.read', description: 'Read users' },
    { code: 'user.update', description: 'Update users' },
    { code: 'user.delete', description: 'Delete (deactivate) users' },
    // Notifications
    { code: 'notification.read', description: 'Read notifications' },
    {
      code: 'notification.update',
      description: 'Mark notifications as read/unread',
    },
    // File uploads
    { code: 'upload.create', description: 'Upload files to S3' },
    { code: 'upload.read', description: 'View file metadata & signed URLs' },
    { code: 'upload.delete', description: 'Delete uploaded files' },
  ];

  for (const perm of permissionsData) {
    await prisma.permissions.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
  }
  console.log(`✅ ${permissionsData.length} permissions seeded\n`);

  // Resolve real IDs from DB after upsert
  const dbPerms = await prisma.permissions.findMany({
    where: { code: { in: permissionsData.map((p) => p.code) } },
    select: { id: true, code: true },
  });
  const pid = (code: string): string => {
    const found = dbPerms.find((p) => p.code === code);
    if (!found) throw new Error(`Permission not found in DB: ${code}`);
    return found.id;
  };

  // 5. Role → Permissions
  console.log('🔗 Assigning permissions to roles...');

  const allPermIds = dbPerms.map((p) => p.id);

  const ownerPermIds = [
    'merchants.read',
    'merchants.update',
    'role.read',
    'role.assign',
    'permission.read',
    'user.create',
    'user.read',
    'user.update',
    'user.delete',
    'notification.read',
    'notification.update',
    'upload.create',
    'upload.read',
    'upload.delete',
  ].map(pid);

  const viewerPermIds = [
    'merchants.read',
    'role.read',
    'permission.read',
    'user.read',
    'notification.read',
    'upload.read',
  ].map(pid);

  const rolePermMap: { roleId: string; permIds: string[] }[] = [
    { roleId: ROLE_ADMIN_ID, permIds: allPermIds },
    { roleId: ROLE_OWNER_ID, permIds: ownerPermIds },
    { roleId: ROLE_VIEWER_ID, permIds: viewerPermIds },
  ];

  for (const { roleId, permIds } of rolePermMap) {
    // Delete stale assignments
    await prisma.role_permissions.deleteMany({
      where: {
        role_id: roleId,
        permission_id: { notIn: permIds },
      },
    });

    // Insert missing assignments
    for (const permissionId of permIds) {
      const exists = await prisma.role_permissions.findFirst({
        where: { role_id: roleId, permission_id: permissionId },
      });
      if (!exists) {
        await prisma.role_permissions.create({
          data: { role_id: roleId, permission_id: permissionId },
        });
      }
    }
  }
  console.log('✅ Role-permission assignments synced\n');

  // 6. User → Roles
  console.log('👥 Assigning roles to users...');

  const userRolesData = [
    {
      user_id: adminUser.id,
      role_id: ROLE_ADMIN_ID,
    },
    {
      user_id: ownerUser.id,
      role_id: ROLE_OWNER_ID,
    },
    {
      user_id: viewerUser.id,
      role_id: ROLE_VIEWER_ID,
    },
  ];

  for (const ur of userRolesData) {
    const exists = await prisma.user_roles.findFirst({
      where: {
        user_id: ur.user_id,
        role_id: ur.role_id,
      },
    });
    if (!exists) {
      await prisma.user_roles.create({ data: ur });
    }
  }
  console.log('✅ User-role assignments synced\n');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
