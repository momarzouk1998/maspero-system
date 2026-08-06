'use client';

import { useState, useEffect, useRef } from 'react';
import { Receipt, Search, Filter, Printer, X, Eye } from 'lucide-react';
import { InvoicePrint, InvoiceItem } from '@/components/pos/invoice-print';

export default function InvoicesHistoryPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [showFilter, setShowFilter] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Side Panel State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      // Fetch users for admin filter
      if (!currentUser) {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const data = await meRes.json();
          setCurrentUser(data.user);
          if (data.user?.role === 'manager') {
            const usersRes = await fetch('/api/users');
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setUsers(usersData.users || []);
            }
          }
        }
      }

      // Fetch invoices
      let url = `/api/invoices/history?page=${page}&limit=25`;
      if (employeeId) url += `&employee_id=${employeeId}`;
      if (date) url += `&date=${date}`;
      if (invoiceNumber) url += `&invoice_number=${invoiceNumber}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [employeeId, date, invoiceNumber]);

  const handleOpenDetails = async (invoice: any) => {
    setSelectedInvoice(invoice);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/invoice?code=${invoice.invoice_number}`);
      if (res.ok) {
        const data = await res.json();
        setInvoiceDetails(data);
      } else {
        setInvoiceDetails({ items: [], total: invoice.total_invoice });
      }
    } catch (e) {
      console.error(e);
      setInvoiceDetails({ items: [], total: invoice.total_invoice });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current || !invoiceDetails) return;
    
    // Create print window
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    const isKiosk = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>طباعة الفاتورة - ${selectedInvoice?.invoice_number}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; background: white; }
              /* Force cashier print width */
              .invoice-print-container { width: 80mm !important; margin: 0 auto !important; }
              .invoice-print-container .container { border: none !important; box-shadow: none !important; }
            }
          </style>
        </head>
        <body class="cashier-print">
          ${printRef.current.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              ${isKiosk ? '' : 'window.close();'}
            }, 500);
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto space-y-6 pr-2 ${selectedInvoice ? 'hidden lg:block' : 'block'}`}>
        {/* Title & Actions */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Receipt className="w-7 h-7 text-cyan-400" />
              <span>سجل الفواتير</span>
            </h1>
            <p className="text-slate-400 text-sm">
              عرض تفاصيل الفواتير المسجلة وإعادة طباعتها
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="رقم الفاتورة..."
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 border border-slate-700 transition-colors shrink-0"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">تصفية</span>
            </button>
          </div>
        </div>

        {/* Filter Modal */}
        {showFilter && (
          <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 bg-slate-800/40 grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentUser?.role === 'manager' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الموظف</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="">جميع الموظفين</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => { setEmployeeId(''); setDate(''); }}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          </div>
        )}

        {/* Invoices List */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          {loading ? (
            <div className="p-10 text-center text-slate-400">جاري تحميل الفواتير...</div>
          ) : invoices.length === 0 ? (
            <div className="p-10 text-center text-slate-400">لا توجد فواتير تطابق بحثك</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">رقم الفاتورة</th>
                    <th className="px-4 py-3">الموظف</th>
                    <th className="px-4 py-3">التاريخ والوقت</th>
                    <th className="px-4 py-3">الإجمالي</th>
                    <th className="px-4 py-3 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invoices.map((inv) => (
                    <tr 
                      key={inv.id} 
                      className={`hover:bg-slate-800/40 transition-colors ${selectedInvoice?.id === inv.id ? 'bg-slate-800/60 border-l-2 border-cyan-500' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-cyan-400">{inv.invoice_number}</td>
                      <td className="px-4 py-3 font-medium text-white">{inv.employee_name || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(inv.timestamp || inv.date).toLocaleString('ar-EG')}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-emerald-400">
                        {Number(inv.total_invoice).toLocaleString('ar-EG')} ج
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenDetails(inv)}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors inline-flex"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {Array.from({ length: pagination.totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => fetchData(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold ${
                        pagination.page === i + 1
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Side Panel for Details */}
      {selectedInvoice && (
        <div className="w-full lg:w-96 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0 h-full">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-cyan-400" />
              <span>تفاصيل الفاتورة</span>
            </h3>
            <button
              onClick={() => setSelectedInvoice(null)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">رقم الفاتورة</span>
                <span className="font-mono text-sm text-cyan-400">{selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">التاريخ</span>
                <span className="text-sm text-white">{new Date(selectedInvoice.timestamp || selectedInvoice.date).toLocaleString('ar-EG')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">الموظف</span>
                <span className="text-sm text-white">{selectedInvoice.employee_name}</span>
              </div>
            </div>

            {loadingDetails ? (
              <div className="text-center p-8 text-slate-400">جاري جلب تفاصيل العناصر...</div>
            ) : invoiceDetails ? (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">عناصر الفاتورة ({invoiceDetails.items?.length || 0})</h4>
                {invoiceDetails.items?.length > 0 ? (
                  <div className="space-y-2">
                    {invoiceDetails.items.map((item: any) => (
                      <div key={item.id} className="p-3 bg-slate-800/30 border border-slate-700/40 rounded-xl">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-bold text-white">{item.name}</span>
                          <span className="text-sm font-bold text-emerald-400">{Number(item.total).toLocaleString('ar-EG')} ج</span>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-400">
                          <span>الكمية: {item.count}</span>
                          {item.price > 0 && <span>السعر: {Number(item.price).toLocaleString('ar-EG')}</span>}
                          <span>[{item.type}]</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 text-xs text-slate-500">
                    لا توجد عناصر مسجلة تحت هذا الكود حالياً (قد تكون تم حذفها أو تجميعها قديماً).
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-white">إجمالي الفاتورة</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {Number(invoiceDetails.total || selectedInvoice.total_invoice).toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900">
            <button
              onClick={handlePrint}
              disabled={loadingDetails || !invoiceDetails}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl shadow-lg border border-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Printer className="w-5 h-5 text-slate-300" />
              <span>إعادة طباعة كاشير</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Hidden Print Container */}
      {selectedInvoice && invoiceDetails && (
        <InvoicePrint
          ref={printRef}
          invoiceCode={selectedInvoice.invoice_number}
          timestamp={new Date(selectedInvoice.timestamp || selectedInvoice.date).toLocaleString('ar-EG')}
          employeeName={selectedInvoice.employee_name}
          items={invoiceDetails.items || []}
          total={invoiceDetails.total || selectedInvoice.total_invoice}
          isCashierPrint={true}
        />
      )}
    </div>
  );
}
