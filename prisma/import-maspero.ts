import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const MASPERO_DIR = path.join(process.cwd());

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function parseCSV(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    results.push(obj);
  }
  return results;
}

function parseNum(val: any): number {
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

async function main() {
  console.log('🚀 Starting Essential Master Data Import for Maspero Services System...\n');

  // 1. Import Users & Employees (Login)
  console.log('1. Importing Employees & Users...');
  const loginRows = parseCSV(path.join(MASPERO_DIR, 'Login - Login.csv'));
  const userMap = new Map<string, string>(); // Legacy Username -> New UUID

  const defaultPasswordHash = await bcrypt.hash('Maspero2026!', 10);

  for (const row of loginRows) {
    const rawId = row['Employee_Id'] || row['Name'];
    if (!rawId || rawId.includes('<table') || rawId.includes('<h4')) continue;
    const legacyId = String(rawId).trim().slice(0, 100);
    if (!legacyId) continue;

    const isManager = row['Position'] === 'Manager' || row['Role'] === 'Manager';
    const userRole = isManager ? 'manager' : 'user';
    const userName = (row['Name'] || legacyId).slice(0, 150);

    const created = await prisma.users.upsert({
      where: { legacy_id: legacyId },
      update: {
        name: userName,
        phone: (row['Phone Number'] || '').slice(0, 50) || null,
        role: userRole,
        job_title: (row['Jop Title'] || row['Position'] || 'موظف مبيعات').slice(0, 100),
        salary: parseNum(row['Salary']),
        is_active: true,
      },
      create: {
        legacy_id: legacyId,
        name: userName,
        phone: (row['Phone Number'] || '').slice(0, 50) || null,
        email: `${legacyId.toLowerCase()}@maspero.internal`,
        password_hash: defaultPasswordHash,
        role: userRole,
        job_title: (row['Jop Title'] || row['Position'] || 'موظف مبيعات').slice(0, 100),
        salary: parseNum(row['Salary']),
        wallet_balance: 0,
        is_active: true,
      }
    });
    userMap.set(legacyId, created.id);
  }
  console.log(`✓ Imported ${userMap.size} Employees/Users.`);

  // 2. Import Services Catalog
  console.log('\n2. Importing Services Catalog & Print Prices...');
  const serviceRows = parseCSV(path.join(MASPERO_DIR, 'Services Maspero - Services.csv'));
  let serviceCount = 0;

  for (const row of serviceRows) {
    const legacyId = row['Service_Id'] || row['Service Name'];
    if (!legacyId) continue;

    await prisma.services.upsert({
      where: { legacy_id: legacyId },
      update: {
        service_name: row['Service Name'] || legacyId,
        is_commissionable: row['IsCommissionable'] === 'Y',
        commission_percent: parseNum(row['Commission %']),
        sort: parseInt(row['Sort']) || 0,
      },
      create: {
        legacy_id: legacyId,
        service_name: row['Service Name'] || legacyId,
        is_commissionable: row['IsCommissionable'] === 'Y',
        commission_percent: parseNum(row['Commission %']),
        sort: parseInt(row['Sort']) || 0,
        is_active: true,
      }
    });
    serviceCount++;
  }
  console.log(`✓ Imported ${serviceCount} Services.`);

  // 3. Import External Wallets & Fawry Machines
  console.log('\n3. Importing External Wallets & Fawry Machines...');
  const walletRows = parseCSV(path.join(MASPERO_DIR, 'Wallets Maspero - Wallets.csv'));
  const walletMap = new Map<string, string>();

  for (const row of walletRows) {
    const legacyId = row['Wallet_Id'] || row['Wallet_Name'];
    if (!legacyId) continue;

    const created = await prisma.external_wallets.upsert({
      where: { legacy_id: legacyId },
      update: {
        wallet_type: row['Wallet_Type'] || 'محفظة',
        wallet_name: row['Wallet_Name'] || '',
        wallet_number: row['Wallet_Number'] || null,
        current_balance: parseNum(row['Current Balance']),
        actual_balance: parseNum(row['Actual Balance']),
        confirm_status: row['Confirm'] || null,
        custodian_name: row['Casher_name'] || null,
        sort: parseInt(row['Sort']) || 0
      },
      create: {
        legacy_id: legacyId,
        wallet_type: row['Wallet_Type'] || 'محفظة',
        wallet_name: row['Wallet_Name'] || '',
        wallet_number: row['Wallet_Number'] || null,
        current_balance: parseNum(row['Current Balance']),
        actual_balance: parseNum(row['Actual Balance']),
        confirm_status: row['Confirm'] || null,
        custodian_name: row['Casher_name'] || null,
        sort: parseInt(row['Sort']) || 0
      }
    });
    walletMap.set(legacyId, created.id);
  }

  // Ensure default 3 Cash Drawers exist
  const defaultDrawers = ['درج كاش 1', 'درج كاش 2', 'درج كاش 3'];
  for (let i = 0; i < defaultDrawers.length; i++) {
    const dName = defaultDrawers[i];
    await prisma.external_wallets.upsert({
      where: { legacy_id: `drawer-default-${i + 1}` },
      update: { wallet_name: dName, wallet_type: 'درج كاش' },
      create: {
        legacy_id: `drawer-default-${i + 1}`,
        wallet_name: dName,
        wallet_type: 'درج كاش',
        current_balance: 0,
        actual_balance: 0,
        sort: 100 + i,
        is_active: true,
      }
    });
  }
  console.log(`✓ Imported ${walletMap.size} External Wallets & verified 3 Cash Drawers.`);

  console.log('\n🎉 Master Data Import Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
