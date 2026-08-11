'use client';

import { forwardRef } from 'react';
import { formatNumber } from '@/lib/user-utils';

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
          /* ── Screen Preview Hidden ── */
          .invoice-print-container {
            display: none;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #fff;
            color: #000;
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

          .invoice-print-container .logo {
            width: 90px;
            height: 90px;
            margin: 0 auto 8px;
          }

          .invoice-print-container .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .invoice-print-container .header h1 {
            color: #333;
            font-size: 1.4em;
            margin-bottom: 4px;
            font-weight: 700;
          }

          .invoice-print-container .header .subtitle {
            color: #666;
            font-size: 0.85em;
            font-weight: 500;
          }

          .invoice-print-container .invoice-info {
            background: #fafafa;
            padding: 12px;
            display: flex;
            justify-content: space-around;
            border-bottom: 1px solid #ddd;
            font-size: 0.85em;
          }

          .invoice-print-container .info-item {
            text-align: center;
          }

          .invoice-print-container .info-label {
            color: #666;
            font-size: 0.8em;
            margin-bottom: 3px;
          }

          .invoice-print-container .info-value {
            font-weight: bold;
            color: #333;
          }

          .invoice-print-container .content {
            padding: 15px;
          }

          .invoice-print-container .invoice-details table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 0.85em;
            table-layout: fixed;
          }

          .invoice-print-container .invoice-details th {
            background: #f8f9fa;
            color: #333;
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
            font-weight: 600;
          }

          .invoice-print-container .invoice-details td {
            padding: 8px;
            border: 1px solid #ddd;
            text-align: center;
          }

          .invoice-print-container .total-section {
            background: #f8f9fa;
            padding: 12px;
            margin-top: 12px;
            text-align: center;
            border: 1px solid #ddd;
          }

          .invoice-print-container .total-section h3 {
            color: #555;
            font-size: 1em;
            margin-bottom: 4px;
          }

          .invoice-print-container .total-amount {
            font-size: 1.6em;
            font-weight: bold;
          }

          .invoice-print-container .footer {
            background: #f8f9fa;
            padding: 12px;
            text-align: center;
            border-top: 1px solid #ddd;
            font-size: 0.8em;
            color: #666;
          }

          /* ── PRINT MEDIA RULES (Matching Archive Invoice.html Specs) ── */
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

            @page {
              margin: 2mm;
              size: 80mm auto;
            }

            /* Cashier Thermal Print (80mm) Rules */
            body.cashier-print .container {
              max-width: 80mm !important;
              width: 80mm !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }

            body.cashier-print .header {
              padding: 8px !important;
              border-bottom: 2px solid #000 !important;
              text-align: center !important;
            }

            body.cashier-print .logo {
              width: 80px !important;
              height: 80px !important;
              margin: 0 auto 5px !important;
            }

            body.cashier-print .logo img {
              width: 100% !important;
              height: 100% !important;
              object-fit: contain !important;
            }

            body.cashier-print .header h1 {
              font-size: 1.3em !important;
              margin-bottom: 3px !important;
              font-weight: 700 !important;
              color: #000 !important;
            }

            body.cashier-print .header .subtitle {
              font-size: 0.85em !important;
              font-weight: 600 !important;
              color: #000 !important;
            }

            body.cashier-print .invoice-info {
              padding: 8px !important;
              font-size: 0.8em !important;
              border-bottom: 2px solid #000 !important;
              font-weight: 600 !important;
              display: flex !important;
              justify-content: space-around !important;
            }

            body.cashier-print .content {
              padding: 8px !important;
            }

            body.cashier-print .invoice-details table {
              font-size: 0.8em !important;
              border: 2px solid #000 !important;
              table-layout: fixed !important;
              width: 92% !important;
              margin-left: auto !important;
              margin-right: auto !important;
              border-collapse: collapse !important;
            }

            body.cashier-print .invoice-details th {
              font-weight: 700 !important;
              background: #000 !important;
              color: #fff !important;
              border: 1px solid #000 !important;
              padding: 6px 4px !important;
              text-align: center !important;
              font-size: 0.9em !important;
            }

            body.cashier-print .invoice-details td {
              padding: 6px 4px !important;
              border: 1px solid #000 !important;
              font-weight: 600 !important;
              color: #000 !important;
              text-align: center !important;
              line-height: 1.2 !important;
              vertical-align: top !important;
              font-size: 0.9em !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
            }

            /* Exact Column Specifications */
            body.cashier-print .invoice-details th:nth-child(1),
            body.cashier-print .invoice-details td:nth-child(1) {
              width: 50% !important;
              min-width: 50% !important;
              max-width: 50% !important;
              text-align: center !important;
            }

            body.cashier-print .invoice-details th:nth-child(2),
            body.cashier-print .invoice-details td:nth-child(2) {
              width: 25% !important;
              min-width: 25% !important;
              max-width: 25% !important;
              text-align: center !important;
            }

            body.cashier-print .invoice-details th:nth-child(3),
            body.cashier-print .invoice-details td:nth-child(3) {
              width: 25% !important;
              min-width: 25% !important;
              max-width: 25% !important;
              text-align: center !important;
            }

            body.cashier-print .total-section {
              padding: 10px !important;
              margin-top: 8px !important;
              border-top: 3px solid #000 !important;
              border-bottom: 3px solid #000 !important;
              background: #f0f0f0 !important;
              text-align: center !important;
            }

            body.cashier-print .total-section h3 {
              font-size: 1em !important;
              margin-bottom: 5px !important;
              font-weight: 700 !important;
              color: #000 !important;
            }

            body.cashier-print .total-amount {
              font-size: 1.5em !important;
              font-weight: 900 !important;
              color: #000 !important;
            }

            body.cashier-print .footer {
              padding: 8px !important;
              font-size: 0.75em !important;
              border-top: 2px solid #000 !important;
              font-weight: 600 !important;
              text-align: center !important;
              color: #000 !important;
            }

            /* Normal (A4) Print styling */
            body.normal-print .container {
              box-shadow: none !important;
              max-width: 100% !important;
              border: none !important;
            }
          }
        `}} />
        
        <div className="container">
          <div className="header">
            <div className="logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/maspero-logo.png" 
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://files.catbox.moe/lxsumw.png'; }}
                alt="ماسبيرو" 
              />
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
                    <th>المبلغ</th>
                    <th>العدد</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.total}</td>
                      <td>{item.count}</td>
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
                <span>{formatNumber(Math.abs(total))}</span>
              </div>
            </div>
          </div>

          <div className="footer">
            <p>شكراً لتعاملكم معنا</p>
            <p>العنوان : 1ش الحسن والحسين متفرع من ش العادلي</p>
            <p>بجوار مستشفى العطيفي وأمام مخبز قراقيش حي شركة فريال</p>
          </div>
        </div>
      </div>
    );
  }
);

InvoicePrint.displayName = 'InvoicePrint';
