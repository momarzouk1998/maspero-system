import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { WalletService } from '@/lib/wallet-service';

// GET transfers (Pending for employee, or transfer history)
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'all'; // 'pending' | 'sent' | 'received' | 'all'

  let where: any = {};
  if (user.role === 'manager') {
    if (type === 'pending') where = { status: 'PENDING' };
  } else {
    if (type === 'pending') {
      where = { receiver_id: user.id, status: 'PENDING' };
    } else if (type === 'sent') {
      where = { sender_id: user.id };
    } else if (type === 'received') {
      where = { receiver_id: user.id };
    } else {
      where = {
        OR: [
          { sender_id: user.id },
          { receiver_id: user.id }
        ]
      };
    }
  }

  const transfers = await db.employee_transfers.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 100,
  });

  const pendingCount = await db.employee_transfers.count({
    where: { receiver_id: user.id, status: 'PENDING' }
  });

  return NextResponse.json({ transfers, pendingCount });
}

// POST create transfer request OR action (accept/reject)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const body = await req.json();
    const { action } = body;

    // Action 1: Send Cash Transfer to another employee
    if (action === 'send') {
      const { receiverId, amount, note } = body;
      const transfer = await WalletService.sendCashTransfer({
        senderId: user.id,
        senderName: user.name,
        receiverId,
        amount: Number(amount),
        note,
      });
      return NextResponse.json({ success: true, transfer });
    }

    // Action 2: Accept incoming Cash Transfer
    if (action === 'accept') {
      const { transferId } = body;
      const updated = await WalletService.acceptCashTransfer(transferId, user.id);
      return NextResponse.json({ success: true, transfer: updated });
    }

    // Action 3: Reject incoming Cash Transfer
    if (action === 'reject') {
      const { transferId } = body;
      const updated = await WalletService.rejectCashTransfer(transferId, user.id);
      return NextResponse.json({ success: true, transfer: updated });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    console.error('Transfer API error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في عملية التحويل' }, { status: 400 });
  }
}
