
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1FvYcPyeii6oYgiXgKwIlzOtlv96esqwz5VyddEBibhU/edit?gid=0#gid=0';


function doGet(e) {
  const invoiceCode = e.parameter.code;
  
  if (!invoiceCode) {
    return HtmlService.createHtmlOutput('<h3>خطأ: لم يتم تحديد رقم الفاتورة</h3>');
  }
  
  const template = HtmlService.createTemplateFromFile('Invoice');
  template.invoiceCode = invoiceCode;
  
  return template.evaluate()
    .setTitle('فاتورة ماسبيرو')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// كاش للبيانات لتسريع الاستعلامات
let dataCache = null;
let cacheTime = null;
const CACHE_DURATION = 30000; // 30 ثانية

function getInvoiceData(invoiceCode) {
  try {
    const ss = SpreadsheetApp.openByUrl(SHEET_URL);
    const loginSheet = ss.getSheetByName('Login');
    
    if (!loginSheet) {
      throw new Error('جدول Login غير موجود');
    }
    
    // استخدام الكاش إذا كان متاح وحديث
    let data, headers;
    const now = new Date().getTime();
    
    if (dataCache && cacheTime && (now - cacheTime) < CACHE_DURATION) {
      data = dataCache.data;
      headers = dataCache.headers;
    } else {
      // تحديث الكاش
      const range = loginSheet.getDataRange();
      const allData = range.getValues();
      headers = allData[0];
      data = allData;
      
      dataCache = { data: data, headers: headers };
      cacheTime = now;
    }
    
    // البحث عن الأعمدة مرة واحدة
    const invoiceCodeCol = headers.indexOf('Show_Invoice_Code');
    const invoiceCol = headers.indexOf('Show_Invoice');
    const totalCol = headers.indexOf('Show_Total');
    const nameCol = headers.indexOf('Name');
    
    if (invoiceCodeCol === -1 || invoiceCol === -1 || totalCol === -1) {
      throw new Error('الأعمدة المطلوبة غير موجودة');
    }
    
    // البحث المحسن - استخدام findIndex بدلاً من loop
    const rowIndex = data.findIndex((row, index) => 
      index > 0 && row[invoiceCodeCol] == invoiceCode
    );
    
    if (rowIndex !== -1) {
      const row = data[rowIndex];
      return {
        success: true,
        invoiceCode: invoiceCode,
        invoice: row[invoiceCol] || '',
        total: row[totalCol] || 0,
        employeeName: row[nameCol] || 'غير محدد',
        timestamp: new Date().toLocaleString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    }
    
    return {
      success: false,
      message: 'الفاتورة غير موجودة'
    };
    
  } catch (error) {
    // مسح الكاش في حالة الخطأ
    dataCache = null;
    cacheTime = null;
    return {
      success: false,
      message: 'حدث خطأ: ' + error.message
    };
  }
}

