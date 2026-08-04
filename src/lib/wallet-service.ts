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

  /**
   * Ensure 3 Cash Drawers exist in external_wallets
   */
  static async ensureCashDrawers() {
    const drawers = ['درج كاش 1', 'درج كاش 2', 'درج كاش 3'];
    for (const drawerName of drawers) {
      const existing = await db.external_wallets.findFirst({
        where: { wallet_name: drawerName, wallet_type: 'درج كاش' }
      });
      if (!existing) {
        await db.external_wallets.create({
          data: {
            wallet_name: drawerName,
            wallet_type: 'درج كاش',
            current_balance: 0,
            actual_balance: 0,
            is_active: true,
          }
        });
      }
    }
  }

  /**
   * Deposit Cash from Employee Custody Wallet into a Cash Drawer
   */
  static async depositToDrawer(userId: string, userName: string, drawerId: string, amount: number, notes?: string) {
    if (amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');

    return await db.$transaction(async (tx) => {
      const drawer = await tx.external_wallets.findUnique({ where: { id: drawerId } });
      if (!drawer || drawer.wallet_type !== 'درج كاش') throw new Error('الدرج غير موجود');

      // 1. Deduct from employee custody wallet (Negative balance is allowed)
      await tx.users.update({
        where: { id: userId },
        data: { wallet_balance: { decrement: amount } }
      });

      // 2. Increment Drawer balance
      const updatedDrawer = await tx.external_wallets.update({
        where: { id: drawerId },
        data: { current_balance: { increment: amount } }
      });

      // 3. Log transaction
      await tx.wallet_transactions.create({
        data: {
          date: new Date(),
          wallet_id: drawerId,
          wallet_name: drawer.wallet_name,
          wallet_type: 'درج كاش',
          transaction_type: 'إيداع بالدرج',
          amount: amount,
          description: `إيداع بالدرج من الموظف: ${userName} ${notes ? `(${notes})` : ''}`,
          employee_id: userId,
          employee_name: userName,
        }
      });

      return updatedDrawer;
    });
  }

  /**
   * Claim/Withdraw Cash from a Cash Drawer into Employee Custody Wallet
   */
  static async claimFromDrawer(userId: string, userName: string, drawerId: string, amount: number, notes?: string) {
    if (amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');

    return await db.$transaction(async (tx) => {
      const drawer = await tx.external_wallets.findUnique({ where: { id: drawerId } });
      if (!drawer || drawer.wallet_type !== 'درج كاش') throw new Error('الدرج غير موجود');
      if (Number(drawer.current_balance) < amount) {
        throw new Error(`رصيد الدرج الحالي (${Number(drawer.current_balance)} ج.م) لا يكفي لسحب ${amount} ج.م`);
      }

      // 1. Deduct from Drawer balance
      const updatedDrawer = await tx.external_wallets.update({
        where: { id: drawerId },
        data: { current_balance: { decrement: amount } }
      });

      // 2. Increment Employee custody wallet
      await tx.users.update({
        where: { id: userId },
        data: { wallet_balance: { increment: amount } }
      });

      // 3. Log transaction
      await tx.wallet_transactions.create({
        data: {
          date: new Date(),
          wallet_id: drawerId,
          wallet_name: drawer.wallet_name,
          wallet_type: 'درج كاش',
          transaction_type: 'سحب من الدرج',
          amount: amount,
          description: `استلام من الدرج للموظف: ${userName} ${notes ? `(${notes})` : ''}`,
          employee_id: userId,
          employee_name: userName,
        }
      });

      return updatedDrawer;
    });
  }
}

