import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const MASPERO_DIR = 'D:\\OPEN APPS\\DigitalOcian Projects\\Maspero';

function parseCSV(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    console.log(`[WARN] File not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Robust CSV parser supporting quotes and commas inside quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(v => v.replace(/^"|"$/g, '').trim());
  };

  const headers = parseLine(lines[0]);
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(row);
  }

  return rows;
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-') return null;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    
    // Try M/D/YYYY or YYYY-MM-DD
    const parts = dateStr.split(' ')[0].split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        // M/D/YYYY
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
    }
  } catch (e) {
    // Ignore invalid dates
  }
  return null;
}

function parseNum(val: any): number {
  if (!val || val === '' || val === '-') return 0;
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function main() {
  console.log('=== STARTING MASPERO FULL APPSHEET DATA MIGRATION ===\n');

  // 1. Import Users (Login.csv)
  console.log('1. Importing Users...');
  const usersRows = parseCSV(path.join(MASPERO_DIR, 'Login - Login.csv'));
  const userMap = new Map<string, string>(); // legacy_id -> DB uuid
  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  for (const row of usersRows) {
    const legacyId = row['Employee_Id'];
    if (!legacyId) continue;

    const name = row['Name'] || 'مستخدم غير معروف';
    const role = (row['Position'] || '').toLowerCase() === 'manager' ? 'manager' : 'user';
    const plainPass = row['Password'] || '123456';
    const passwordHash = await bcrypt.hash(plainPass, 10);

    const createdUser = await prisma.users.upsert({
      where: { legacy_id: legacyId },
      update: {
        name,
        phone: row['Phone Number'] || null,
        whatsapp: row['WhatsApp Number'] || null,
        email: row['Email'] || null,
        role,
        job_title: row['Jop Title'] || null,
        salary: parseNum(row['Salary']),
        day_off: row['Day off'] || null,
        shift_hours: parseInt(row['Shift Hours']) || 8,
        borrowing_allowed: row['Borrowing'] !== 'حظر',
      },
      create: {
        legacy_id: legacyId,
        name,
        phone: row['Phone Number'] || null,
        whatsapp: row['WhatsApp Number'] || null,
        email: row['Email'] || null,
        password_hash: passwordHash,
        role,
        job_title: row['Jop Title'] || null,
        salary: parseNum(row['Salary']),
        day_off: row['Day off'] || null,
        shift_hours: parseInt(row['Shift Hours']) || 8,
        wallet_balance: 0,
        borrowing_allowed: row['Borrowing'] !== 'حظر',
      }
    });

    userMap.set(legacyId, createdUser.id);
  }
  console.log(`✓ Imported ${userMap.size} Users.`);

  // 2. Import Services & Print Prices
  console.log('\n2. Importing Services catalog & Print Prices...');
  const servicesRows = parseCSV(path.join(MASPERO_DIR, 'Services Maspero - Services.csv'));
  const serviceMap = new Map<string, string>();

  for (const row of servicesRows) {
    const legacyId = row['Service_Id'];
    if (!legacyId) continue;

    const created = await prisma.services.upsert({
      where: { legacy_id: legacyId },
      update: {
        service_name: row['Service_Name'],
        is_commissionable: row['Is_Commissionable'] === 'عمولة',
        commission_percent: parseNum(row['Commission_Percent']),
        description: row['Description'] || null,
        sort: parseInt(row['Sort']) || 0
      },
      create: {
        legacy_id: legacyId,
        service_name: row['Service_Name'],
        is_commissionable: row['Is_Commissionable'] === 'عمولة',
        commission_percent: parseNum(row['Commission_Percent']),
        description: row['Description'] || null,
        sort: parseInt(row['Sort']) || 0
      }
    });
    serviceMap.set(legacyId, created.id);
  }

  const printPriceRows = parseCSV(path.join(MASPERO_DIR, 'Services Maspero - Print price.csv'));
  for (const row of printPriceRows) {
    if (!row['Print Type']) continue;
    await prisma.print_prices.create({
      data: {
        print_type: row['Print Type'],
        face_type: row['Face Type'] || 'وجه واحد',
        key_name: row['Key'] || '',
        price: parseNum(row['Price'])
      }
    });
  }
  console.log(`✓ Imported ${servicesRows.length} Services & ${printPriceRows.length} Print Price tiers.`);

  // 3. Import External Wallets
  console.log('\n3. Importing External Wallets / Fawry Machines...');
  const walletRows = parseCSV(path.join(MASPERO_DIR, 'Wallets Maspero - Wallets.csv'));
  const walletMap = new Map<string, string>();

  for (const row of walletRows) {
    const legacyId = row['Wallet_Id'];
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
  console.log(`✓ Imported ${walletMap.size} External Wallets.`);

  // 4. Import ServiceEntries (21,288 rows)
  console.log('\n4. Importing Service Entries (21,000+ records)...');
  const serviceEntryRows = parseCSV(path.join(MASPERO_DIR, 'ServiceEntry Maspero - ServiceEntry (2).csv'));
  let seCount = 0;

  for (let i = 0; i < serviceEntryRows.length; i += 500) {
    const chunk = serviceEntryRows.slice(i, i + 500);
    const data = chunk.map(row => {
      const d = parseDate(row['Date']) || new Date();
      return {
        legacy_id: row['Service_Entry_Id'] || undefined,
        date: d,
        month: row['Month'] || null,
        shift_id: row['Shift_Id'] || null,
        shift_name: row['Shift_Name'] || null,
        shift_cashier: row['Shift_Cashier'] || null,
        service_id: serviceMap.get(row['Serviceid']) || null,
        service_name: row['Servicename'] || '',
        paper_count: parseInt(row['Paper_Count']) || 1,
        page_count: parseInt(row['Page Count']) || 1,
        face_type: row['Face Type'] || null,
        amount: parseNum(row['Amount']),
        notes: row['Notes'] || null,
        is_commissionable: row['Is_Commissionable'] || null,
        employee_commission: parseNum(row['Employee_Commission']),
        employee_id: userMap.get(row['Employee_Id']) || null,
        employee_name: row['Employee_ Name'] || null,
        invoice_code: row['Invoice_Code'] || null,
        timestamp: parseDate(row['Timestamp']) || d,
      };
    });

    await prisma.service_entries.createMany({
      data,
      skipDuplicates: true
    });
    seCount += chunk.length;
    process.stdout.write(`\rImported ${seCount} / ${serviceEntryRows.length} Service Entries...`);
  }
  console.log('\n✓ Service Entries import complete.');

  // 5. Import Train Ticket Bookings (346 rows)
  console.log('\n5. Importing Train Ticket Bookings...');
  const ticketRows = parseCSV(path.join(MASPERO_DIR, 'TrainTicketBooking Maspero - TrainTicketBooking (1).csv'));
  for (const row of ticketRows) {
    const d = parseDate(row['Date']) || new Date();
    await prisma.train_ticket_bookings.create({
      data: {
        legacy_id: row['Ticket_Booking_Id'] || undefined,
        date: d,
        month: row['Month'] || null,
        shift_id: row['Shift_Id'] || null,
        shift_name: row['Shift_Name'] || null,
        shift_cashier: row['Shift_Cashier'] || null,
        service_name: row['Servicename'] || 'قطار',
        item_count: parseInt(row['Item_Count']) || 1,
        amount: parseNum(row['Amount']),
        ticket_price: parseNum(row['Ticket_Price']),
        ticket_commission: parseNum(row['Ticket_Commission']),
        notes: row['Notes'] || null,
        employee_id: userMap.get(row['Employee_Id']) || null,
        employee_name: row['Employee_ Name'] || null,
        invoice_code: row['Invoice_Code'] || null,
        timestamp: parseDate(row['Timestamp']) || d,
      }
    });
  }
  console.log(`✓ Imported ${ticketRows.length} Ticket Bookings.`);

  // 6. Import Wallet Transactions (20,725 rows)
  console.log('\n6. Importing Wallet Transactions (20,700+ records)...');
  const wtRows = parseCSV(path.join(MASPERO_DIR, 'WalletTransactions Maspero - WalletTransactions (1).csv'));
  let wtCount = 0;

  for (let i = 0; i < wtRows.length; i += 500) {
    const chunk = wtRows.slice(i, i + 500);
    const data = chunk.map(row => {
      const d = parseDate(row['Date']) || new Date();
      return {
        legacy_id: row['Wallet_Transaction_Id'] || undefined,
        date: d,
        transaction_month: row['Transactionmonth'] || null,
        time_str: row['Time'] || null,
        wallet_id: walletMap.get(row['Wallet_Id']) || null,
        wallet_name: row['Wallet_Name'] || null,
        transaction_type: row['Transaction_Type'] || 'إيداع',
        wallet_type: row['Wallet_Type'] || null,
        amount: parseNum(row['Amount']),
        wallet_commission: parseNum(row['Wallet_Commission']),
        description: row['Description'] || null,
        employee_id: userMap.get(row['Employee_Id']) || null,
        employee_name: row['Employee_ Name'] || null,
        shift_id: row['Shift_Id'] || null,
        shift_name: row['Shift_Name'] || null,
        shift_cashier: row['Shift_Cashier'] || null,
        invoice_code: row['Invoice_Code'] || null,
        back_amount: parseNum(row['BackAmount']),
        comanda_type: row['Comanda type'] || null,
        fawry_type: row['Fawry type'] || null,
        timestamp: parseDate(row['Timestamp']) || d,
      };
    });

    await prisma.wallet_transactions.createMany({
      data,
      skipDuplicates: true
    });
    wtCount += chunk.length;
    process.stdout.write(`\rImported ${wtCount} / ${wtRows.length} Wallet Transactions...`);
  }
  console.log('\n✓ Wallet Transactions import complete.');

  // 7. Import Shifts (1,214 rows)
  console.log('\n7. Importing Shifts...');
  const shiftRows = parseCSV(path.join(MASPERO_DIR, 'Shift Maspero - Shift (1).csv'));
  for (const row of shiftRows) {
    const d = parseDate(row['Shift_Date']) || new Date();
    await prisma.shifts.create({
      data: {
        legacy_id: row['Shift_Id'] || undefined,
        shift_date: d,
        shift_day: row['Shift_Day'] || null,
        shift_month: row['Shift_Month'] || null,
        shift_type: row['Shift_Type'] || null,
        shift_cashier: row['Shift_Cashier'] || null,
        shift_name: row['Shift_Name'] || null,
        employee_id: userMap.get(row['Employee_Id']) || null,
        employee_name: row['Employee_Name'] || null,
        start_time: parseDate(row['Start_Time']) || d,
        end_time: parseDate(row['End_Time']),
        total_hours: parseNum(row['Total_Hours']),
        shift_note: row['ShiftNote'] || null,
        timestamp: parseDate(row['Timestamp']) || d,
      }
    });
  }
  console.log(`✓ Imported ${shiftRows.length} Shifts.`);

  // 8. Import Expenses (2,446 rows)
  console.log('\n8. Importing Expenses...');
  const expenseRows = parseCSV(path.join(MASPERO_DIR, 'Expenses Maspero - Expenses (1).csv'));
  for (const row of expenseRows) {
    const d = parseDate(row['Date']) || new Date();
    await prisma.expenses.create({
      data: {
        legacy_id: row['Expense_Id'] || undefined,
        date: d,
        month: row['Month'] || null,
        shift_id: row['Shift_Id'] || null,
        shift_name: row['Shift_Name'] || null,
        shift_cashier: row['Shift_Cashier'] || null,
        main_type: row['Main_Type'] || 'مصروفات',
        expense_type: row['Type'] || null,
        items: row['Items'] || null,
        notes: row['Notes'] || null,
        amount: parseNum(row['Amount']),
        employee_id: userMap.get(row['Employee_Id']) || null,
        employee_name: row['Employee_ Name'] || null,
        back_amount: parseNum(row['BackAmount']),
        timestamp: parseDate(row['Timestamp']) || d,
      }
    });
  }
  console.log(`✓ Imported ${expenseRows.length} Expenses.`);

  console.log('\n========================================');
  console.log('🎉 APPSHEET DATA MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
