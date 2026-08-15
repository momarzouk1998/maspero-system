import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const db = new PrismaClient();

async function seedArchivedReports() {
  const csvPath = path.join(process.cwd(), 'archive', 'Financial Report Maspero - log Financial Report.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Skip header line
  const dataRows = lines.slice(1);

  console.log(`Found ${dataRows.length} CSV rows to seed into monthly_financial_reports...`);

  for (const row of dataRows) {
    const cols = row.split(',').map(c => c.trim());
    if (cols.length < 24) continue;

    // Row format:
    // UId,StartDate,EndDate,Wallet Commission,Tickets Commission,Machine Withdrawl Commission,Machine Deposits Commission,Machine Deposits,Service Value,Total Revenue,Opening balance,Purchase value,Closing balance,Purchases Cost,Machine Withdrawl,Purchases Cost Percent,Total Profit,Total Commissions,Other Expenses,Salaries,Net profit,Withdrawn Revenue,Ticket Count,Paper Count

    const startDateStr = cols[1]; // e.g. "12/1/2025" or "1/1/2026"
    const startDate = new Date(startDateStr);
    const month = `${startDate.getFullYear()} ${startDate.getMonth() + 1}`; // e.g. "2025 12", "2026 1"

    const endDate = new Date(cols[2]);
    const wallet_commission = parseFloat(cols[3]) || 0;
    const tickets_commission = parseFloat(cols[4]) || 0;
    const machine_withdrawal_commission = parseFloat(cols[5]) || 0;
    const machine_deposit_commission = parseFloat(cols[6]) || 0;
    const machine_deposits = parseFloat(cols[7]) || 0;
    const service_revenue = parseFloat(cols[8]) || 0;
    const total_revenue = parseFloat(cols[9]) || 0;
    const opening_balance = parseFloat(cols[10]) || 0;
    const closing_balance = parseFloat(cols[12]) || 0;
    const purchases_cost = parseFloat(cols[13]) || 0;
    const purchases_cost_percent = parseFloat(cols[15].replace('%', '')) || 0;
    const total_profit = parseFloat(cols[16]) || 0;
    const total_commissions = parseFloat(cols[17]) || 0;
    const other_expenses = parseFloat(cols[18]) || 0;
    const salaries = parseFloat(cols[19]) || 0;
    const net_profit = parseFloat(cols[20]) || 0;
    const withdrawn_revenue = parseFloat(cols[21]) || 0;
    const ticket_count = parseInt(cols[22]) || 0;
    const paper_count = parseInt(cols[23]) || 0;

    await db.monthly_financial_reports.upsert({
      where: { month },
      update: {
        start_date: startDate,
        end_date: endDate,
        wallet_commission,
        tickets_commission,
        machine_withdrawal_commission,
        machine_deposit_commission,
        machine_deposits,
        service_revenue,
        total_revenue,
        opening_balance,
        closing_balance,
        purchases_cost,
        purchases_cost_percent,
        total_profit,
        total_commissions,
        other_expenses,
        salaries,
        net_profit,
        withdrawn_revenue,
        ticket_count,
        paper_count,
        updated_at: new Date()
      },
      create: {
        month,
        start_date: startDate,
        end_date: endDate,
        wallet_commission,
        tickets_commission,
        machine_withdrawal_commission,
        machine_deposit_commission,
        machine_deposits,
        service_revenue,
        total_revenue,
        opening_balance,
        closing_balance,
        purchases_cost,
        purchases_cost_percent,
        total_profit,
        total_commissions,
        other_expenses,
        salaries,
        net_profit,
        withdrawn_revenue,
        ticket_count,
        paper_count
      }
    });

    console.log(`✓ Seeded archived report for month: ${month}`);
  }

  console.log('Seeding completed successfully! 🎉');
  await db.$disconnect();
}

seedArchivedReports().catch(e => {
  console.error('Seeding error:', e);
  process.exit(1);
});
