import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const baseExcelHeaders = {
  catNo: 'CAT NO',
  styleNo: 'Style No.',
  factoryFOB: 'Factory FOB',
  vendorPhotoShootDate: 'PhotoShoot Date',
  labdipQualityDeskloomDue: 'Labdip Due',
  labdipPlannedDate: 'Labdip Planned',
  labdipPlannedStatus: 'Labdip Status',
  labdipApprovedBy: 'Labdip Approved By',
  labdipApprovedDate: 'Labdip Approved Date',
  photoSampleDue: 'Photo Sample Due',
  photoSamplePlannedDate: 'Photo Sample Planned',
  photoSamplePlannedStatus: 'Photo Sample Status',
  photoSampleApprovedBy: 'Photo Sample Approved By',
  photoSampleApprovedDate: 'Photo Sample Approved Date',
  testReportDue: 'Test Report Due',
  plannedFPT: 'Planned FPT',
  plannedFPTStatus: 'FPT Status',
  plannedFPTApprovedBy: 'FPT Approved By',
  plannedFPTApprovedDate: 'FPT Approved Date',
  plannedGPT: 'Planned GPT',
  plannedGPTStatus: 'GPT Status',
  plannedGPTApprovedBy: 'GPT Approved By',
  plannedGPTApprovedDate: 'GPT Approved Date',
  gsmColorLotsDue: 'GSM/Color Due',
  gsmColorLotsPlanned: 'GSM/Color Planned',
  gsmColorLotsPlannedStatus: 'GSM/Color Status',
  gsmColorLotsApprovedBy: 'GSM/Color Approved By',
  gsmColorLotsApprovedDate: 'GSM/Color Approved Date',
  remark: 'Remark',
  lastModifiedBy: 'Last Modified By',
  lastModifiedAt: 'Last Modified Date & Time'
};

const formatDate = (val) => {
  if (!val || val === '-') return '';
  if (typeof val === 'string' && !val.includes('-') && !val.includes('/') && !val.includes('T')) return val;
  const date = new Date(val);
  if (isNaN(date.getTime())) return String(val);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d}/${m}/${y}`;
};

export const prepareExportData = (rows, customCols) => {
  const exportHeaders = { ...baseExcelHeaders };
  customCols.forEach(col => exportHeaders[col] = col);

  return rows.map(row => {
    let cleanRow = {};
    let latestChange = null;
    if (row.history && row.history.length) {
      latestChange = row.history.reduce((latest, curr) => {
        const currDate = new Date(curr.changedAt || curr.date);
        const latestDate = new Date(latest.changedAt || latest.date);
        return currDate > latestDate ? curr : latest;
      }, row.history[0]);
    }

    Object.keys(exportHeaders).forEach(key => {
      if (key === 'lastModifiedBy') {
        cleanRow[exportHeaders[key]] = latestChange?.changedBy?.name || '-';
        return;
      }
      if (key === 'lastModifiedAt') {
        cleanRow[exportHeaders[key]] = latestChange
          ? `${formatDate(latestChange.changedAt || latestChange.date)} ${new Date(latestChange.changedAt || latestChange.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
          : '-';
        return;
      }
      const rawVal = row[key];
      const isDateType = key === 'factoryFOB' || key.toLowerCase().includes('date') || key.toLowerCase().includes('due') || key.includes('FPT') || key.includes('GPT') || key.includes('ApprovedDate');
      cleanRow[exportHeaders[key]] = isDateType ? formatDate(rawVal) : (rawVal ?? '-');
    });
    return cleanRow;
  });
};

export const prepareHistoryData = (rows) => {
  const historyEntries = [];
  rows.forEach(row => {
    if (!row.history || !row.history.length) return;
    row.history.forEach(hist => {
      if (['createdAt', 'updatedAt', '__v'].includes(hist.field)) return;
      let oldVal = hist.oldValue === 'None' || hist.oldValue === null || hist.oldValue === undefined ? '' : hist.oldValue;
      let newVal = hist.newValue === 'None' || hist.newValue === null || hist.newValue === undefined ? '' : hist.newValue;
      if (String(oldVal) === String(newVal)) return;

      historyEntries.push({
        'CAT NO': row.catNo,
        'Style No.': row.styleNo,
        'Field': hist.field,
        'Old Value': (hist.field.toLowerCase().includes('date') || hist.field === 'factoryFOB') ? formatDate(oldVal) : String(oldVal),
        'New Value': (hist.field.toLowerCase().includes('date') || hist.field === 'factoryFOB') ? formatDate(newVal) : String(newVal),
        'Changed By': hist.changedBy?.name || 'System',
        'Changed Date & Time': hist.changedAt || hist.date
          ? `${formatDate(hist.changedAt || hist.date)} ${new Date(hist.changedAt || hist.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
          : '-'
      });
    });
  });
  historyEntries.sort((a, b) => new Date(b['Changed Date & Time']) - new Date(a['Changed Date & Time']));
  return historyEntries;
};

export const exportMasterLedger = (rows, customCols, toastRef) => {
  const mainData = prepareExportData(rows, customCols);
  const worksheet = XLSX.utils.json_to_sheet(mainData);
  const colWidths = Object.keys(mainData[0] || {}).map(key => ({ wch: Math.max(key.length + 5, 15) }));
  worksheet['!cols'] = colWidths;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Ledger');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'erp-master-ledger.xlsx');
  if (toastRef?.current) {
    toastRef.current.show({ severity: 'success', summary: 'Exported', detail: 'Master Ledger exported', life: 2000 });
  }
};

export const exportHistoryLog = (rows, customCols, toastRef) => {
  const historyData = prepareHistoryData(rows);
  if (historyData.length === 0) {
    if (toastRef?.current) {
      toastRef.current.show({ severity: 'info', summary: 'No History', detail: 'No changes recorded for selected entries', life: 2000 });
    }
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(historyData);
  const colWidths = Object.keys(historyData[0] || {}).map(key => ({ wch: Math.max(key.length + 5, 20) }));
  worksheet['!cols'] = colWidths;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'History Log');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'erp-history-log.xlsx');
  if (toastRef?.current) {
    toastRef.current.show({ severity: 'success', summary: 'Exported', detail: 'History Log exported', life: 2000 });
  }
};

export const exportCSV = (rows, customCols, toastRef) => {
  const mainData = prepareExportData(rows, customCols);
  const worksheet = XLSX.utils.json_to_sheet(mainData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  saveAs(new Blob([csv], { type: 'text/csv' }), 'erp-master-ledger.csv');
  if (toastRef?.current) {
    toastRef.current.show({ severity: 'success', summary: 'Exported', detail: 'CSV exported successfully', life: 2000 });
  }
};