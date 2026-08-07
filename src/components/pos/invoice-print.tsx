'use client';

import { forwardRef } from 'react';

export interface InvoiceItem {
  id: string;
  type: 'service' | 'ticket' | 'wallet';
  name: string;
  price: number;
  count: number;
  total: number;
}

interface InvoicePrintProps {
  invoiceCode: string;
  timestamp: string;
  employeeName: string;
  items: InvoiceItem[];
  total: number;
  isCashierPrint: boolean;
}

export const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(
  ({ invoiceCode, timestamp, employeeName, items, total, isCashierPrint }, ref) => {
    return (
      <div ref={ref} className="invoice-print-container">
        <style dangerouslySetInnerHTML={{ __html: `
          /* ── Screen: hidden ── */
          .invoice-print-container {
            display: none;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #fff;
            color: #333;
            direction: rtl;
          }
          .invoice-print-container .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border: 1px solid #ddd;
          }
          .invoice-print-container .header {
            background: #f8f9fa;
            padding: 15px;
            text-align: center;
            border-bottom: 2px solid #ddd;
          }
          .invoice-print-container .logo { width:90px;height:90px;margin:0 auto 8px; }
          .invoice-print-container .logo img { width:100%;height:100%;object-fit:contain; }
          .invoice-print-container .header h1 { color:#333;font-size:1.4em;margin-bottom:4px;font-weight:700; }
          .invoice-print-container .header .subtitle { color:#666;font-size:0.85em;font-weight:500; }
          .invoice-print-container .invoice-info {
            background:#fafafa;padding:12px;display:flex;
            justify-content:space-around;border-bottom:1px solid #ddd;font-size:0.85em;
          }
          .invoice-print-container .info-item { text-align:center; }
          .invoice-print-container .info-label { color:#666;font-size:0.8em;margin-bottom:3px; }
          .invoice-print-container .info-value { font-weight:bold;color:#333; }
          .invoice-print-container .content { padding:15px; }
          .invoice-print-container .invoice-details table {
            width:100%;border-collapse:collapse;margin-top:10px;font-size:0.85em;
          }
          .invoice-print-container .invoice-details th {
            background:#f8f9fa;color:#333;padding:10px;text-align:right;
            border-bottom:2px solid #ddd;font-weight:bold;
          }
          .invoice-print-container .invoice-details td {
            padding:10px;border-bottom:1px solid #eee;text-align:right;
          }
          .invoice-print-container .total-section {
            background:#f8f9fa;padding:12px;margin-top:12px;
            text-align:center;border:1px solid #ddd;
          }
          .invoice-print-container .total-section h3 { color:#555;font-size:1em;margin-bottom:4px; }
          .invoice-print-container .total-amount { font-size:1.6em;font-weight:bold; }
          .invoice-print-container .footer {
            background:#f8f9fa;padding:12px;text-align:center;
            border-top:1px solid #ddd;font-size:0.8em;
          }

          /* ── Print: show invoice only, hide everything else ── */
          @media print {
            body * {
              visibility: hidden !important;
            }
            .invoice-print-container, .invoice-print-container * {
              visibility: visible !important;
            }
            .invoice-print-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              display: block !important;
            }

            /* Cashier (80mm) styling */
            body.cashier-print .container {
              max-width:80mm !important;width:80mm !important;margin:0 auto !important;
              box-shadow:none !important;border:none !important;
            }
            body.cashier-print .header { padding:6px;border-bottom:2px solid #000; }
            body.cashier-print .logo { width:70px;height:70px;margin:0 auto 4px; }
            body.cashier-print .header h1 { font-size:1.2em;font-weight:700; }
            body.cashier-print .invoice-info { padding:6px;font-size:0.75em;border-bottom:2px solid #000; }
            body.cashier-print .content { padding:6px; }
            body.cashier-print .invoice-details table { font-size:0.75em;border:2px solid #000;width:100%;margin:0 auto; }
            body.cashier-print .invoice-details th { font-weight:700;background:#000 !important;color:#fff !important;border:1px solid #000; }
            body.cashier-print .invoice-details td { padding:4px 2px;border:1px solid #000;font-weight:600;line-height:1.2;vertical-align:top; }
            body.cashier-print .total-section { padding:8px;margin-top:6px;border-top:2px solid #000;border-bottom:2px solid #000; }
            body.cashier-print .total-amount { font-size:1.4em;font-weight:900; }
            body.cashier-print .footer { padding:6px;font-size:0.7em; }

            /* Normal (A4) styling */
            body.normal-print .container { box-shadow:none;max-width:100%;border:none; }

            @page { margin:2mm; size:80mm auto; }
          }
        `}} />
        
        <div className="container">
          <div className="header">
            <div className="logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://files.catbox.moe/lxsumw.png" alt="ماسبيرو" />
            </div>
            <h1>ماسبيرو</h1>
            <div className="subtitle">لخدمات الطباعة والإنترنت</div>
            <div className="subtitle" style={{ marginTop: '4px', fontWeight: 'bold' }}>WhatsApp📞 01100300222</div>
          </div>

          <div className="invoice-info">
            <div className="info-item">
              <div className="info-label">رقم الفاتورة</div>
              <div className="info-value">{invoiceCode}</div>
            </div>
            <div className="info-item">
              <div className="info-label">التاريخ</div>
              <div className="info-value">{timestamp}</div>
            </div>
            <div className="info-item">
              <div className="info-label">الموظف</div>
              <div className="info-value">{employeeName}</div>
            </div>
          </div>

          <div className="content">
            <div className="invoice-details">
              <table>
                <thead>
                  <tr>
                    <th>الخدمة / المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.count}</td>
                      <td>{item.price}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '15px', color: '#666' }}>الفاتورة فارغة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="total-section">
              <h3>الإجمالي الكلي</h3>
              <div className="total-amount" style={{ color: total < 0 ? '#c62828' : '#2e7d32' }}>
                <span>{Number.isInteger(Math.abs(total)) ? Math.abs(total) : Math.abs(total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="footer">
            <p>شكراً لتعاملكم معنا</p>
            <p>العنوان : 1ش الحسن والحسين متفرع من ش العادلي </p>
            <p>بجوار مستسفي العطيفي وامام مخبز قراقيش حي شركة فريال</p>
          </div>
        </div>
      </div>
    );
  }
);

InvoicePrint.displayName = 'InvoicePrint';
