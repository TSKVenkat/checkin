import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('Starting seed process...');

  // Create admin user
  const adminPasswordHash = await hashPassword('admin123');
  const admin = await prisma.staff.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['all', 'manage_users', 'manage_events', 'emergency'],
      passwordHash: adminPasswordHash,
      emailVerified: true
    }
  });
  console.log('Admin user created:', admin);

  // Create staff user
  const staffPasswordHash = await hashPassword('staff123');
  const staff = await prisma.staff.upsert({
    where: { email: 'staff@example.com' },
    update: {},
    create: {
      name: 'Staff User',
      email: 'staff@example.com',
      role: 'staff',
      permissions: ['check_in', 'distribution'],
      passwordHash: staffPasswordHash,
      emailVerified: true
    }
  });
  console.log('Staff user created:', staff);

  // Create manager user 
  const managerPasswordHash = await hashPassword('manager123');
  const manager = await prisma.staff.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      name: 'Manager User',
      email: 'manager@example.com',
      role: 'manager',
      permissions: ['check_in', 'distribution', 'view_reports', 'manage_resources'],
      passwordHash: managerPasswordHash,
      emailVerified: true
    }
  });
  console.log('Manager user created:', manager);

  // Create sample event with the specific ID
  const event = await prisma.event.upsert({
    where: { id: '5b6a8b3e-5510-40cc-b961-aade214524f8' },
    update: {},
    create: {
      id: '5b6a8b3e-5510-40cc-b961-aade214524f8',
      name: 'Tech Conference 2024',
      description: 'Main conference event for check-in app testing',
      startDate: new Date(Date.now() - 86400000), // yesterday
      endDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
      venue: 'Convention Center',
      status: 'active',
      isEmergencyActive: false,
      maxAttendees: 500,
      resources: {
        create: [
          {
            name: 'Lunch Vouchers',
            type: 'lunch',
            description: 'Meal voucher valid for lunch each day',
            totalQuantity: 200,
            claimedQuantity: 0,
            lowThreshold: 20
          },
          {
            name: 'Welcome Kits',
            type: 'kit',
            description: 'Conference welcome kit with notebook, pen, and branded swag',
            totalQuantity: 200,
            claimedQuantity: 0,
            lowThreshold: 20
          },
          {
            name: 'Conference Badges',
            type: 'badge',
            description: 'Access badge for the conference',
            totalQuantity: 200,
            claimedQuantity: 0,
            lowThreshold: 10
          },
          {
            name: 'Swag Bags',
            type: 'swag',
            description: 'Event branded promotional items',
            totalQuantity: 200,
            claimedQuantity: 0,
            lowThreshold: 20
          }
        ]
      },
      locations: {
        create: [
          {
            name: 'Main Entrance',
            type: 'check-in',
            capacity: 4
          },
          {
            name: 'Dining Hall',
            type: 'lunch',
            capacity: 150
          },
          {
            name: 'Registration Desk',
            type: 'kit',
            capacity: 3
          }
        ]
      }
    }
  });
  console.log('Sample event created:', event);

  // Create the specific attendee (Mohana)
  const mohana = await prisma.attendee.upsert({
    where: { email: 'mohana.kam@gmail.com' },
    update: {},
    create: {
      name: 'Mohana Kam',
      email: 'mohana.kam@gmail.com',
      phone: '+1234567890',
      role: 'VIP',
      eventId: '5b6a8b3e-5510-40cc-b961-aade214524f8',
      isCheckedIn: false,
      uniqueId: 'ATT-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      qrCodeUrl: '/api/qr/generate?id=mohana'
    }
  });
  console.log('Special attendee created:', mohana);

  // Create a few more attendees for the same event
  for (let i = 1; i <= 5; i++) {
    const attendee = await prisma.attendee.create({
      data: {
        name: `Test Attendee ${i}`,
        email: `attendee${i}@example.com`,
        phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        role: ['Regular', 'VIP', 'Speaker', 'Staff'][Math.floor(Math.random() * 4)],
        eventId: '5b6a8b3e-5510-40cc-b961-aade214524f8',
        isCheckedIn: false,
        uniqueId: 'ATT-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        qrCodeUrl: `/api/qr/generate?id=attendee${i}`
      }
    });
    console.log(`Attendee ${i} created:`, attendee.name);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed process:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 