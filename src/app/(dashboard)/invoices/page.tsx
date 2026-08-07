'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, Search, Filter, Calendar, X, Printer, Receipt, 
  ChevronLeft, ChevronRight, RefreshCw, Eye, User
} from 'lucide-react';
import { InvoicePrint, InvoiceItem } from '@/components/pos/invoice-print';

export default function InvoicesHistoryPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Invoice for Drawer Details
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<{
    invoice_code: string;
    items: InvoiceItem[];
    total: number;
    employeeName: string;
    timestamp: string;
  } | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchInvoices = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        startDate,
        endDate
      });

      const res = await fetch(`/api/invoices?${params.toString()}`);
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
    const timer = setTimeout(() => {
      fetchInvoices(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, startDate, endDate]);

  // Open Drawer and fetch details for selected invoice
  const handleOpenDrawer = async (code: string) => {
    setSelectedCode(code);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const res = await fetch(`/api/invoice?code=${code}`);
      if (res.ok) {
        const data = await res.json();
        const formattedDate = data.timestamp 
          ? new Date(data.timestamp).toLocaleString('ar-EG', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          : '';

        setDrawerData({
          invoice_code: data.invoice_code,
          items: data.items || [],
          total: data.total || 0,
          employeeName: data.employeeName || 'غير محدد',
          timestamp: formattedDate
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handlePrint = (mode: 'cashier' | 'normal') => {
    const parent = document.body;
    parent.classList.add(mode === 'cashier' ? 'cashier-print' : 'normal-print');
    
    setTimeout(() => {
      window.print();
      parent.classList.remove(mode === 'cashier' ? 'cashier-print' : 'normal-print');
    }, 100);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            <span>سجل الفواتير</span>
          </h1>
          <p className="text-slate-600 text-xs mt-1">
            عرض وتتبع الفواتير الصادرة وإعادة طباعتها عند الحاجة
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم الفاتورة أو الموظف..."
              className="pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 w-64"
            />
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-slate-900 focus:outline-none"
            />
            <span className="text-slate-500 text-xs">إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-slate-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">رقم الفاتورة</th>
                <th className="px-4 py-3">التاريخ والوقت</th>
                <th className="px-4 py-3">الكاشير / الموظف</th>
                <th className="px-4 py-3">عدد العناصر</th>
                <th className="px-4 py-3">إجمالي الفاتورة</th>
                <th className="px-4 py-3 text-center">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>جاري تحميل سجل الفواتير...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    لا توجد فواتير مسجلة
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.code}
                    onClick={() => handleOpenDrawer(inv.code)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700 group-hover:underline">
                      {inv.code}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {inv.timestamp ? new Date(inv.timestamp).toLocaleString('ar-EG') : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{inv.employeeName}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 font-mono">{inv.itemCount} عناصر</td>
                    <td className="px-4 py-3 font-bold font-mono text-slate-900 text-base">
                      {Number(inv.total).toFixed(2)} ج.م
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer(inv.code);
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center justify-center gap-1 mx-auto transition-colors border border-slate-200"
                      >
                        <Eye className="w-4 h-4 text-emerald-600" />
                        <span>عرض</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-xs text-slate-600">
              صفحة {pagination.page} من {pagination.totalPages} (إجمالي {pagination.total})
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchInvoices(pagination.page - 1)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 border border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchInvoices(pagination.page + 1)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 border border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Drawer for Invoice Details */}
      {selectedCode && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full border-r border-slate-200 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto custom-scrollbar">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <span>تفاصيل الفاتورة</span>
                </h3>
                <p className="text-xs text-emerald-700 font-mono mt-0.5">{selectedCode}</p>
              </div>
              <button
                onClick={() => setSelectedCode(null)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-xl bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 py-6 space-y-6">
              {drawerLoading ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
                  <span className="text-xs">جاري تحميل تفاصيل الفاتورة...</span>
                </div>
              ) : drawerData ? (
                <>
                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-600 block mb-0.5">الكاشير / الموظف</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        {drawerData.employeeName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 block mb-0.5">التاريخ والوقت</span>
                      <span className="font-bold text-slate-900">{drawerData.timestamp}</span>
                    </div>
                  </div>

                  {/* Items Breakdown Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700">عناصر الفاتورة ({drawerData.items.length}):</h4>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-right text-xs text-slate-700">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">الخدمة / المنتج</th>
                            <th className="px-3 py-2.5">الكمية</th>
                            <th className="px-3 py-2.5">السعر</th>
                            <th className="px-3 py-2.5">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {drawerData.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2.5 font-medium text-slate-900">{item.name}</td>
                              <td className="px-3 py-2.5 font-mono">{item.count}</td>
                              <td className="px-3 py-2.5 font-mono">{item.price} ج</td>
                              <td className="px-3 py-2.5 font-mono font-bold text-emerald-700">{item.total} ج</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-700 font-bold text-sm">الإجمالي الكلي</span>
                    <span className="text-2xl font-bold font-mono text-emerald-700">
                      {drawerData.total} <span className="text-xs font-normal text-slate-600">ج.م</span>
                    </span>
                  </div>

                  {/* Print Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <button
                      onClick={() => handlePrint('cashier')}
                      className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <Printer className="w-4 h-4" />
                      <span>إعادة طباعة كاشير</span>
                    </button>
                    <button
                      onClick={() => handlePrint('normal')}
                      className="py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>طباعة A4</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-500 py-12">تعذر تحميل بيانات الفاتورة</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Component */}
      {drawerData && (
        <InvoicePrint
          ref={printRef}
          invoiceCode={drawerData.invoice_code}
          timestamp={drawerData.timestamp}
          employeeName={drawerData.employeeName}
          items={drawerData.items}
          total={drawerData.total}
          isCashierPrint={false}
        />
      )}
    </div>
  );
}
