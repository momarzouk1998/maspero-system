import { db } from './db';
import { Prisma } from '@prisma/client';

export class WalletService {
  /**
   * Adjust an employee's personal wallet balance atomically
   */
  static async adjustEmployeeWallet(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || db;
    return await client.users.update({
      where: { id: userId },
      data: {
        wallet_balance: {
          increment: amount,
        },
      },
    });
  }

  /**
   * Create a P2P Cash Transfer from Sender to Receiver
   */
  static async sendCashTransfer(data: {
    senderId: string;
    senderName: string;
    receiverId: string;
    amount: number;
    note?: string;
    shiftId?: string;
  }) {
    if (data.amount <= 0) throw new Error('مبلغ التحويل يجب أن يكون أكبر من صفر');
    if (data.senderId === data.receiverId) throw new Error('لا يمكنك التحويل لنفسك');

    const receiver = await db.users.findUnique({
      where: { id: data.receiverId },
      select: { id: true, name: true }
    });

    if (!receiver) throw new Error('الموظف المستلم غير موجود');

    const transfer = await db.employee_transfers.create({
      data: {
        sender_id: data.senderId,
        sender_name: data.senderName,
        receiver_id: data.receiverId,
        receiver_name: receiver.name,
        amount: data.amount,
        status: 'PENDING',
        sender_note: data.note || null,
        shift_id: data.shiftId || null,
      }
    });

    return transfer;
  }

  /**
   * Accept an incoming P2P cash transfer (Atomically updates both wallets)
   */
  static async acceptCashTransfer(transferId: string, receiverId: string) {
    return await db.$transaction(async (tx) => {
      const transfer = await tx.employee_transfers.findUnique({
        where: { id: transferId }
      });

      if (!transfer) throw new Error('الطلب غير موجود');
      if (transfer.receiver_id !== receiverId) throw new Error('غير مصرح لك بقبول هذا الطلب');
      if (transfer.status !== 'PENDING') throw new Error('هذا الطلب تم البت فيه من قبل');

      const amount = Number(transfer.amount);

      // 1. Deduct from Sender Wallet
      await tx.users.update({
        where: { id: transfer.sender_id },
        data: { wallet_balance: { decrement: amount } }
      });

      // 2. Add to Receiver Wallet
      await tx.users.update({
        where: { id: transfer.receiver_id },
        data: { wallet_balance: { increment: amount } }
      });

      // 3. Mark Transfer as ACCEPTED
      const updated = await tx.employee_transfers.update({
        where: { id: transferId },
        data: {
          status: 'ACCEPTED',
          responded_at: new Date()
        }
      });

      return updated;
    });
  }

  /**
   * Reject an incoming P2P cash transfer
   */
  static async rejectCashTransfer(transferId: string, receiverId: string) {
    const transfer = await db.employee_transfers.findUnique({
      where: { id: transferId }
    });

    if (!transfer) throw new Error('الطلب غير موجود');
    if (transfer.receiver_id !== receiverId) throw new Error('غير مصرح لك برفض هذا الطلب');
    if (transfer.status !== 'PENDING') throw new Error('هذا الطلب تم البت فيه من قبل');

    return await db.employee_transfers.update({
      where: { id: transferId },
      data: {
        status: 'REJECTED',
        responded_at: new Date()
      }
    });
  }
}
