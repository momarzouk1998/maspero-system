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
    
    // We will conditionally add "cashier-print" class to the document body when printing
    // This logic needs to be handled in the parent component before calling window.print()
    
    return (
      <div ref={ref} className="invoice-print-container" style={{ display: 'none' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          /* Invoice Base Styles - Extracted from AppSheet template */
          .invoice-print-container {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            color: #333;
            direction: rtl;
          }
          
          .invoice-print-container .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          }
          
          .invoice-print-container .header {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-bottom: 2px solid #ddd;
          }
          
          .invoice-print-container .logo {
            width: 120px;
            height: 120px;
            margin: 0 auto 10px;
          }
          
          .invoice-print-container .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          
          .invoice-print-container .header h1 {
            color: #333;
            font-size: 1.5em;
            margin-bottom: 5px;
            font-weight: 700;
          }
          
          .invoice-print-container .header .subtitle {
            color: #666;
            font-size: 0.9em;
            font-weight: 500;
          }
          
          .invoice-print-container .invoice-info {
            background: #fafafa;
            padding: 15px;
            display: flex;
            justify-content: space-around;
            border-bottom: 1px solid #ddd;
            font-size: 0.85em;
          }
          
          .invoice-print-container .info-item {
            text-align: center;
          }
          
          .invoice-print-container .info-label {
            color: #888;
            margin-bottom: 3px;
            font-size: 0.8em;
          }
          
          .invoice-print-container .info-value {
            color: #333;
            font-weight: bold;
            font-size: 0.95em;
          }
          
          .invoice-print-container .content {
            padding: 15px;
          }
          
          .invoice-print-container .invoice-details table {
            width: 92%;
            border-collapse: collapse;
            margin-bottom: 10px;
            margin-left: auto;
            margin-right: auto;
            font-size: 0.85em;
            table-layout: fixed;
          }
          
          .invoice-print-container .invoice-details th {
            background: #f0f0f0;
            color: #333;
            padding: 8px;
            font-weight: 600;
            text-align: center;
            border: 1px solid #ddd;
            word-wrap: break-word;
            overflow-wrap: break-word;
            font-size: 0.9em;
          }
          
          .invoice-print-container .invoice-details td {
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: normal;
            hyphens: auto;
            line-height: 1.3;
            vertical-align: top;
            font-size: 0.9em;
          }
          
          .invoice-print-container .total-section {
            background: #f8f9fa;
            padding: 15px;
            margin-top: 15px;
            text-align: center;
            border: 1px solid #ddd;
          }
          
          .invoice-print-container .total-section h3 {
            color: #555;
            font-size: 1.1em;
            margin-bottom: 5px;
          }
          
          .invoice-print-container .total-amount {
            font-size: 1.8em;
            font-weight: bold;
          }
          
          .invoice-print-container .footer {
            background: #f8f9fa;
            padding: 15px;
            text-align: center;
            border-top: 1px solid #ddd;
            font-size: 0.85em;
          }
          
          /* ====== Cashier Print (8cm) ====== */
          @media print {
            body.cashier-print {
              background: white;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              direction: rtl;
            }
            
            body.cashier-print * {
              color: #000 !important;
              font-weight: 600;
            }
            
            body.cashier-print .invoice-print-container {
              display: block !important;
            }
            
            /* Hide the main application UI when printing invoice */
            body.cashier-print > *:not(.invoice-print-wrapper) {
              display: none !important;
            }
            
            body.cashier-print .container {
              max-width: 80mm;
              width: 80mm;
              margin: 0 auto;
              padding: 0;
              box-shadow: none;
              border: none;
            }
            
            body.cashier-print .header {
              padding: 8px;
              border-bottom: 2px solid #000;
            }
            
            body.cashier-print .logo {
              width: 80px;
              height: 80px;
              margin: 0 auto 5px;
            }
            
            body.cashier-print .header h1 {
              font-size: 1.3em;
              margin-bottom: 3px;
              font-weight: 700;
            }
            
            body.cashier-print .header .subtitle {
              font-size: 0.85em;
              font-weight: 600;
            }
            
            body.cashier-print .invoice-info {
              padding: 8px;
              font-size: 0.8em;
              border-bottom: 2px solid #000;
              font-weight: 600;
            }
            
            body.cashier-print .content {
              padding: 8px;
            }
            
            body.cashier-print .invoice-details table {
              font-size: 0.8em;
              border: 2px solid #000;
              width: 90%;
              margin: 0 auto;
            }
            
            body.cashier-print .invoice-details th {
              font-weight: 700;
              background: #000 !important;
              color: #fff !important;
              border: 1px solid #000;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: normal !important;
              font-size: 0.9em !important;
            }
            
            body.cashier-print .invoice-details td {
              padding: 4px 2px;
              border: 1px solid #000;
              font-weight: 600;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
              line-height: 1.2;
              vertical-align: top;
              max-width: 0;
              overflow: hidden;
              font-size: 0.9em !important;
            }
            
            body.cashier-print .invoice-details th:nth-child(1),
            body.cashier-print .invoice-details td:nth-child(1) {
              width: 50% !important;
              min-width: 50% !important;
              max-width: 50% !important;
              text-align: center;
              white-space: normal !important;
              word-break: break-word !important;
            }
            
            body.cashier-print .invoice-details th:nth-child(2),
            body.cashier-print .invoice-details td:nth-child(2) {
              width: 25% !important;
              min-width: 25% !important;
              max-width: 25% !important;
            }
            
            body.cashier-print .invoice-details th:nth-child(3),
            body.cashier-print .invoice-details td:nth-child(3) {
              width: 25% !important;
              min-width: 25% !important;
              max-width: 25% !important;
            }
            
            body.cashier-print .total-section {
              padding: 10px;
              margin-top: 8px;
              border-top: 3px solid #000;
              border-bottom: 3px solid #000;
              background: #f0f0f0 !important;
            }
            
            body.cashier-print .total-section h3 {
              font-size: 1em;
              margin-bottom: 5px;
              font-weight: 700;
            }
            
            body.cashier-print .total-amount {
              font-size: 1.5em;
              font-weight: 900;
            }
            
            body.cashier-print .footer {
              padding: 8px;
              font-size: 0.75em;
              text-align: center;
              font-weight: 600;
            }
          }
          
          @page {
            margin: 2mm;
            size: 80mm auto;
          }
          
          /* ====== Normal Print (A4) ====== */
          @media print {
            body.normal-print {
              background: white;
              direction: rtl;
            }
            
            body.normal-print .invoice-print-container {
              display: block !important;
            }
            
            /* Hide the main application UI when printing invoice */
            body.normal-print > *:not(.invoice-print-wrapper) {
              display: none !important;
            }
            
            body.normal-print .container {
              box-shadow: none;
              max-width: 100%;
              border: none;
              page-break-inside: avoid;
            }
            
            body.normal-print .invoice-details table {
              page-break-inside: avoid;
            }
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
            <div className="subtitle" style={{ marginTop: '5px', fontWeight: 'bold' }}>WhatsApp📞 01100300222</div>
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
                      <td colSpan={3} style={{ padding: '20px', color: '#666' }}>الفاتورة فارغة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="total-section">
              <h3>الإجمالي الكلي</h3>
              <div className="total-amount" style={{ color: total < 0 ? '#c62828' : '#2e7d32' }}>
                <span style={{ fontSize: '0.6em', marginRight: '5px' }}>جنيه</span>
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
