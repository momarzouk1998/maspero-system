import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const MASPERO_DIR = path.join(process.cwd());

// Robust CSV parser supporting quotes and multiline fields
function parseCSV(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      if (char === '\r') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.replace(/^"|"$/g, '').trim());
  const results = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx].replace(/^"|"$/g, '').trim() : '';
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

function parseDate(val: any): Date {
  if (!val) return new Date();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function main() {
  console.log('🚀 Starting Clean Master Data & Expenses Import for Maspero Services System...\n');

  // Clean up any garbage users containing HTML code in their name
  await prisma.users.deleteMany({
    where: {
      OR: [
        { name: { contains: '<' } },
        { name: { contains: '>' } },
        { name: { contains: 'style=' } },
        { name: { contains: 'padding:' } },
        { name: { contains: 'tr>' } },
        { name: { contains: 'td>' } },
        { name: { contains: 'th>' } },
      ]
    }
  });
  console.log('✓ Cleaned invalid HTML user entries from database.');

  // 1. Import Active Users & Employees (Login)
  console.log('1. Importing Active Employees & Users...');
  const loginRows = parseCSV(path.join(MASPERO_DIR, 'Login - Login.csv'));
  const userMap = new Map<string, string>(); // Legacy Username -> New UUID

  for (const row of loginRows) {
    const rawId = row['Employee_Id'] || row['Name'];
    if (!rawId) continue;
    const legacyId = String(rawId).trim().slice(0, 100);
    const userName = (row['Name'] || legacyId).slice(0, 150);
    if (!userName || userName.includes('<') || userName.includes('style=')) continue;

    const isManager = row['Position'] === 'Manager' || row['Role'] === 'Manager';
    const userRole = isManager ? 'manager' : 'user';
    const userPassword = (row['Password'] || '').trim() || '123456';
    const passwordHash = await bcrypt.hash(userPassword, 10);

    const created = await prisma.users.upsert({
      where: { legacy_id: legacyId },
      update: {
        name: userName,
        phone: (row['Phone Number'] || '').slice(0, 50) || null,
        password_hash: passwordHash,
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
        password_hash: passwordHash,
        role: userRole,
        job_title: (row['Jop Title'] || row['Position'] || 'موظف مبيعات').slice(0, 100),
        salary: parseNum(row['Salary']),
        wallet_balance: 0,
        is_active: true,
      }
    });
    userMap.set(legacyId, created.id);
  }
  console.log(`✓ Imported ${userMap.size} Active Employees/Users.`);

  // 1b. Import Former / Deleted Employees (Login - Deleted users)
  console.log('\n1b. Importing Former & Deleted Employees (for historical reports)...');
  const deletedRows = parseCSV(path.join(MASPERO_DIR, 'Login - Deleted users.csv'));
  let deletedCount = 0;

  for (const row of deletedRows) {
    const rawId = row['Employee_Id DU'] || row['Name DU'];
    if (!rawId) continue;
    const legacyId = String(rawId).trim().slice(0, 100);
    const userName = (row['Name DU'] || legacyId).slice(0, 150);
    if (!userName || userName.includes('<') || userName.includes('style=')) continue;

    const userPassword = (row['Password DU'] || '').trim() || '123456';
    const passwordHash = await bcrypt.hash(userPassword, 10);

    const created = await prisma.users.upsert({
      where: { legacy_id: legacyId },
      update: {
        name: userName,
        phone: (row['Phone Number DU'] || '').slice(0, 50) || null,
        password_hash: passwordHash,
        job_title: (row['Position DU'] || 'موظف سابق').slice(0, 100),
        salary: parseNum(row['Salary DU']),
        is_active: false,
      },
      create: {
        legacy_id: legacyId,
        name: userName,
        phone: (row['Phone Number DU'] || '').slice(0, 50) || null,
        email: `${legacyId.toLowerCase()}@maspero.internal`,
        password_hash: passwordHash,
        role: 'user',
        job_title: (row['Position DU'] || 'موظف سابق').slice(0, 100),
        salary: parseNum(row['Salary DU']),
        wallet_balance: 0,
        is_active: false,
      }
    });
    userMap.set(legacyId, created.id);
    deletedCount++;
  }
  console.log(`✓ Imported ${deletedCount} Former/Deleted Employees.`);

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

  // 4. Import Expenses Records
  console.log('\n4. Importing Historical Expenses & Advances...');
  const expenseRows = parseCSV(path.join(MASPERO_DIR, 'Expenses Maspero - Expenses (1).csv'));
  let expenseCount = 0;

  for (const row of expenseRows) {
    const legacyId = row['Expense_Id'];
    if (!legacyId) continue;

    const empLegacyId = row['Employee_Id'];
    const empId = empLegacyId ? userMap.get(empLegacyId) || null : null;

    await prisma.expenses.upsert({
      where: { legacy_id: legacyId },
      update: {
        date: parseDate(row['Date']),
        month: row['Month'] || null,
        shift_id: row['Shift_Id'] || null,
        shift_name: row['Shift_Name'] || null,
        shift_cashier: row['Shift_Cashier'] || null,
        main_type: row['Main_Type'] || 'مصروفات',
        expense_type: row['Type'] || 'مصروفات',
        items: row['Items'] || null,
        notes: row['Notes'] || null,
        amount: parseNum(row['Amount']),
        employee_id: empId,
        employee_name: row['Employee_ Name'] || row['Employee_Id'] || null,
        back_amount: parseNum(row['BackAmount']),
      },
      create: {
        legacy_id: legacyId,
        date: parseDate(row['Date']),
        month: row['Month'] || null,
        shift_id: row['Shift_Id'] || null,
        shift_name: row['Shift_Name'] || null,
        shift_cashier: row['Shift_Cashier'] || null,
        main_type: row['Main_Type'] || 'مصروفات',
        expense_type: row['Type'] || 'مصروفات',
        items: row['Items'] || null,
        notes: row['Notes'] || null,
        amount: parseNum(row['Amount']),
        employee_id: empId,
        employee_name: row['Employee_ Name'] || row['Employee_Id'] || null,
        back_amount: parseNum(row['BackAmount']),
      }
    });
    expenseCount++;
  }
  console.log(`✓ Imported ${expenseCount} Expense records.`);

  console.log('\n🎉 Clean Import Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
