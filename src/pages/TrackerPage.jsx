import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { OverlayPanel } from 'primereact/overlaypanel';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { MultiSelect } from 'primereact/multiselect';
import { Checkbox } from 'primereact/checkbox';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import AIChat from '../components/AIChat';
import {
  LayoutDashboard, LogOut, Plus, Trash2, Download, Printer,
  Sun, Moon, Columns, Edit3, Users, Database, Grid
} from 'lucide-react';

const standardFields = [
  '_id', 'createdAt', 'updatedAt', '__v', 'history',
  'catNo', 'styleNo', 'factoryFOB', 'vendorPhotoShootDate',
  'labdipQualityDeskloomDue', 'labdipPlannedDate', 'labdipPlannedStatus',
  'photoSampleDue', 'photoSamplePlannedDate', 'photoSamplePlannedStatus',
  'testReportDue', 'plannedFPT', 'plannedFPTStatus', 'plannedGPT', 'plannedGPTStatus',
  'gsmColorLotsDue', 'gsmColorLotsPlanned', 'gsmColorLotsPlannedStatus', 'remark',
  'approvalStatus', 'pendingStatus', 'buyerApproval', 'priority'
];

const ignoredColumns = ['LABDIPAPPROVEDBY', 'LABDIPAPPROVEDDATE'];

const baseExcelHeaders = {
  catNo: 'CAT NO', styleNo: 'Style No.', factoryFOB: 'Factory FOB',
  vendorPhotoShootDate: 'PhotoShoot Date', labdipQualityDeskloomDue: 'Labdip Due',
  labdipPlannedDate: 'Labdip Planned', labdipPlannedStatus: 'Labdip Status',
  photoSampleDue: 'Photo Sample Due', photoSamplePlannedDate: 'Photo Sample Planned',
  photoSamplePlannedStatus: 'Photo Sample Status', testReportDue: 'Test Report Due',
  plannedFPT: 'Planned FPT', plannedFPTStatus: 'FPT Status',
  plannedGPT: 'Planned GPT', plannedGPTStatus: 'GPT Status',
  gsmColorLotsDue: 'GSM/Color Due', gsmColorLotsPlanned: 'GSM/Color Planned',
  gsmColorLotsPlannedStatus: 'GSM/Color Status', remark: 'Remark'
};

const statusOptions = ['Pending', 'In Progress', 'Approved', 'Completed', 'Hold', 'Rejected'];

const TrackerPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useRef(null);
  const op = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [cellHistory, setCellHistory] = useState([]);
  const [cellField, setCellField] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState(null);

  const [customCols, setCustomCols] = useState([]);
  const [colDialog, setColDialog] = useState(false);
  const [newColName, setNewColName] = useState('');

  const [renameDialog, setRenameDialog] = useState(false);
  const [colToRename, setColToRename] = useState('');
  const [renamedColName, setRenamedColName] = useState('');

  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [exportSelectedOnly, setExportSelectedOnly] = useState(false);
  const [confirmState, setConfirmState] = useState({ visible: false, message: '', accept: null });

  const isAdmin = user?.role === 'admin';
  const isPMA = user?.role === 'pma';
  const isVendor = user?.role === 'vendor';

  const redFields = [
    'labdipPlannedDate', 'labdipPlannedStatus',
    'photoSamplePlannedDate', 'photoSamplePlannedStatus',
    'plannedFPT', 'plannedFPTStatus',
    'plannedGPT', 'plannedGPTStatus',
    'gsmColorLotsPlanned', 'gsmColorLotsPlannedStatus'
  ];

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : false;
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const [formDialog, setFormDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  // 🔥 Stable API callbacks - no more infinite loop!
  const fetchData = useCallback(async () => {
    const { data } = await api.get('/tracker');
    return data;
  }, []);

  const saveEntry = useCallback(async (payload, isEditingEntry, id) => {
    if (isEditingEntry && id) {
      return api.put(`/tracker/${id}`, payload);
    }
    return api.post('/tracker', payload);
  }, []);

  const deleteEntries = useCallback(async (ids) => {
    return api.delete('/tracker', { data: { ids } });
  }, []);

  const renameColumn = useCallback(async (oldName, newName) => {
    return api.put('/tracker/column/rename', { oldName, newName });
  }, []);

  const clearHistory = useCallback(async (entryId, field) => {
    return api.delete(`/tracker/history/${entryId}`, { data: { field } });
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      const detectedCols = new Set();
      data.forEach(row => {
        Object.keys(row).forEach(key => {
          if (!standardFields.includes(key) && !ignoredColumns.includes(key.toUpperCase())) {
            detectedCols.add(key);
          }
        });
      });
      setCustomCols(Array.from(detectedCols));
    }
  }, [data]);

  const formatDate = useCallback((val) => {
    if (!val || val === '-') return '';
    if (typeof val === 'string' && !val.includes('-') && !val.includes('/') && !val.includes('T')) return val;
    const date = new Date(val);
    if (isNaN(date.getTime())) return String(val);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }, []);

  const getTodayDate = useCallback(() => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }, []);

  const cleanData = useCallback((row) => {
    const { _id, createdAt, updatedAt, __v, history, ...rest } = row;
    return rest;
  }, []);

  const dateToStr = useCallback((dateObj) => {
    if (!dateObj) return null;
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchData();
      setData(res);
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to load data', life: 3000 });
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // ✅ Effect only runs once now because loadData is stable
  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNew = useCallback(() => {
    setIsEditing(false);
    const initialData = {
      catNo: '', styleNo: '', factoryFOB: null, vendorPhotoShootDate: null,
      labdipQualityDeskloomDue: null, labdipPlannedDate: null, labdipPlannedStatus: 'Pending',
      photoSampleDue: null, photoSamplePlannedDate: null, photoSamplePlannedStatus: 'Pending',
      testReportDue: null, plannedFPT: null, plannedFPTStatus: 'Pending',
      plannedGPT: null, plannedGPTStatus: 'Pending',
      gsmColorLotsDue: null, gsmColorLotsPlanned: null, gsmColorLotsPlannedStatus: 'Pending',
      approvalStatus: 'Pending', pendingStatus: 'In Progress',
      buyerApproval: 'Pending', priority: 'Medium',
      remark: ''
    };
    customCols.forEach(col => initialData[col] = '');
    setFormData(initialData);
    setFormDialog(true);
  }, [customCols]);

  const openEdit = useCallback((rowData) => {
    setIsEditing(true);
    setFormData({ ...rowData });
    setFormDialog(true);
  }, []);

  const hideDialog = useCallback(() => setFormDialog(false), []);

  const handleSave = useCallback(async () => {
    if (!formData.styleNo) {
      toast.current.show({ severity: 'warn', summary: 'Validation', detail: 'Style No. is required', life: 3000 });
      return;
    }
    let payload = cleanData(formData);
    if (isVendor) {
      const redOnly = {};
      redFields.forEach(f => { if (payload[f] !== undefined) redOnly[f] = payload[f]; });
      payload = redOnly;
    }
    try {
      await saveEntry(payload, isEditing, formData._id);
      toast.current.show({ severity: 'success', summary: isEditing ? 'Updated' : 'Created', detail: 'Entry saved successfully', life: 1500 });
      setFormDialog(false);
      loadData();
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'Failed to save', life: 3000 });
    }
  }, [formData, isEditing, isVendor, cleanData, saveEntry, loadData]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedRows.length === 0) return;
    const ids = selectedRows.map(r => r._id).filter(id => id);
    if (ids.length > 0) {
      await deleteEntries(ids);
      toast.current.show({ severity: 'success', summary: 'Deleted', detail: `${ids.length} entries deleted`, life: 1500 });
    }
    loadData();
    setSelectedRows([]);
  }, [selectedRows, deleteEntries, loadData]);

  const confirmDelete = useCallback(() => {
    setConfirmState({
      visible: true,
      message: `Delete ${selectedRows.length} selected entries?`,
      accept: async () => {
        await handleDeleteSelected();
        setConfirmState(prev => ({ ...prev, visible: false }));
      }
    });
  }, [selectedRows, handleDeleteSelected]);

  const handleAddColumn = useCallback(() => {
    if (!newColName.trim()) return;
    const colName = newColName.trim();
    if (standardFields.includes(colName) || customCols.includes(colName)) {
      toast.current.show({ severity: 'warn', summary: 'Warning', detail: 'Column already exists!', life: 3000 });
      return;
    }
    setCustomCols([...customCols, colName]);
    setNewColName('');
    setColDialog(false);
    toast.current.show({ severity: 'success', summary: 'Column Added', detail: 'New column added.', life: 4000 });
  }, [newColName, customCols]);

  const handleRenameColumn = useCallback(async () => {
    if (!colToRename || !renamedColName.trim()) return;
    const newName = renamedColName.trim();
    if (standardFields.includes(newName) || customCols.includes(newName)) {
      toast.current.show({ severity: 'warn', summary: 'Warning', detail: 'Column name exists.', life: 3000 });
      return;
    }
    try {
      await renameColumn(colToRename, newName);
      toast.current.show({ severity: 'success', summary: 'Renamed', detail: `Column renamed to ${newName}`, life: 3000 });
      setRenameDialog(false);
      setColToRename('');
      setRenamedColName('');
      loadData();
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to rename column.', life: 3000 });
    }
  }, [colToRename, renamedColName, customCols, renameColumn, loadData]);

  const prepareExportData = useCallback((rows) => {
    const exportHeaders = { ...baseExcelHeaders };
    customCols.forEach(col => exportHeaders[col] = col);
    return rows.map(row => {
      let cleanRow = {};
      Object.keys(exportHeaders).forEach(key => {
        const isDateType = key === 'factoryFOB' || key.toLowerCase().includes('date') || key.toLowerCase().includes('due') || key.includes('FPT') || key.includes('GPT');
        cleanRow[exportHeaders[key]] = isDateType ? formatDate(row[key]) : row[key];
      });
      return cleanRow;
    });
  }, [customCols, formatDate]);

  const exportExcel = useCallback(() => {
    const rows = exportSelectedOnly && selectedRows.length ? selectedRows : data;
    const formatted = prepareExportData(rows);
    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const colWidths = Object.keys(formatted[0] || {}).map(key => ({ wch: Math.max(key.length + 5, 15) }));
    worksheet['!cols'] = colWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Ledger');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'erp-master-ledger.xlsx');
    toast.current.show({ severity: 'success', summary: 'Exported', detail: 'Excel exported successfully', life: 2000 });
  }, [data, selectedRows, exportSelectedOnly, prepareExportData]);

  const exportCSV = useCallback(() => {
    const rows = exportSelectedOnly && selectedRows.length ? selectedRows : data;
    const formatted = prepareExportData(rows);
    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    saveAs(new Blob([csv], { type: 'text/csv' }), 'erp-master-ledger.csv');
    toast.current.show({ severity: 'success', summary: 'Exported', detail: 'CSV exported successfully', life: 2000 });
  }, [data, selectedRows, exportSelectedOnly, prepareExportData]);

  const showCellHistory = useCallback((e, field, rowData) => {
    setCurrentEntryId(rowData._id);
    setCellField(field);
    const raw = rowData.history || [];
    const filtered = raw.filter((h) => {
      if (h.field !== field || ['createdAt', 'updatedAt', '__v', 'history'].includes(h.field)) return false;
      const isDate = field === 'factoryFOB' || field.toLowerCase().includes('date') || field.toLowerCase().includes('due') || field.includes('FPT') || field.includes('GPT');
      const fOld = isDate ? formatDate(h.oldValue) : String(h.oldValue ?? '');
      const fNew = isDate ? formatDate(h.newValue) : String(h.newValue ?? '');
      return fOld !== fNew;
    });
    setCellHistory(filtered);
    op.current.toggle(e);
  }, [formatDate]);

  const handleClearHistory = useCallback(async () => {
    setConfirmState({
      visible: true,
      message: 'Permanently delete this history log?',
      accept: async () => {
        try {
          await clearHistory(currentEntryId, cellField);
          toast.current.show({ severity: 'success', summary: 'Cleared', detail: 'History deleted', life: 2000 });
          op.current.hide();
          loadData();
        } catch (err) {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to clear history', life: 3000 });
        }
        setConfirmState(prev => ({ ...prev, visible: false }));
      }
    });
  }, [currentEntryId, cellField, clearHistory, loadData]);

  const getStatusBadgeStyles = useCallback((status) => {
    const s = status || 'Pending';
    if (['Approved', 'Completed'].includes(s)) return darkMode ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-green-50 text-green-700 border-green-200';
    if (['Hold', 'Rejected'].includes(s)) return darkMode ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200';
    return darkMode ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-yellow-50 text-yellow-700 border-yellow-200';
  }, [darkMode]);

  const rowClassName = useCallback((rowData) => {
    const status = rowData.pendingStatus;
    if (status === 'Hold') return darkMode ? 'row-hold-dark' : 'row-hold-light';
    if (status === 'Rejected') return darkMode ? 'row-rejected-dark' : 'row-rejected-light';
    if (status === 'Approved' || status === 'Completed') return darkMode ? 'row-done-dark' : 'row-done-light';
    return '';
  }, [darkMode]);

const createClickableBody = useCallback((field, isDate = false, statusField = null) => (rowData) => {
    let val = rowData[field];
    const isDateField = (field === 'factoryFOB') || isDate;
    
    // Format current value safely
    const display = isDateField && val ? formatDate(val) : (val !== undefined && val !== null && val !== 'None' ? String(val) : '');
    
    const hasHistory = rowData.history && rowData.history.some(h => {
      if (h.field !== field) return false;
      
      // ✅ FIX 3: Properly handle null/None values so empty dates don't trigger alerts
      let rawOld = h.oldValue === 'None' || h.oldValue === null || h.oldValue === undefined || h.oldValue === '' ? '' : h.oldValue;
      let rawNew = h.newValue === 'None' || h.newValue === null || h.newValue === undefined || h.newValue === '' ? '' : h.newValue;

      const fOld = isDateField && rawOld ? formatDate(rawOld) : String(rawOld);
      const fNew = isDateField && rawNew ? formatDate(rawNew) : String(rawNew);
      
      return fOld !== fNew;
    });

    return (
      <div className="flex items-center justify-start gap-2 whitespace-nowrap">
        <span
          className={`cursor-pointer transition-all flex items-center font-medium p-1 rounded-lg text-sm ${hasHistory
              ? (darkMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-200')
              : (darkMode ? 'hover:text-cyan-400' : 'hover:text-blue-600')
            }`}
          onClick={(e) => {
            e.stopPropagation();
            showCellHistory(e, field, rowData);
          }}
          title={hasHistory ? "Updated recently" : "View History"}
        >
          {display || '-'}
          {hasHistory && <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 ml-2 animate-pulse" />}
        </span>
        {statusField && (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-block ${getStatusBadgeStyles(rowData[statusField])}`}>
            {rowData[statusField] || 'Pending'}
          </span>
        )}
      </div>
    );
  }, [darkMode, formatDate, showCellHistory, getStatusBadgeStyles]);

  const columnStyle = useCallback((field) => {
    if (redFields.includes(field)) return { backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.12)' : '#fff1f1' };
    return {};
  }, [darkMode]);

  const actionBodyTemplate = useCallback((rowData) => (
    <Button icon="pi pi-pencil" className={`p-button-rounded p-button-text ${darkMode ? '!text-cyan-400 hover:!bg-cyan-400/10' : '!text-blue-600 hover:!bg-blue-50'}`} onClick={() => openEdit(rowData)} />
  ), [darkMode, openEdit]);

  const allColumnDefs = useMemo(() => [
    ...(isAdmin ? [{ field: 'selection', header: '', body: null, frozen: true, style: { width: '50px' } }] : []),
    { field: 'catNo', header: 'CAT NO', frozen: true, style: { width: '160px' } },
    { field: 'styleNo', header: 'Style No.', frozen: true, style: { width: '180px' } },
    { field: 'factoryFOB', header: 'Factory FOB', isDate: true },
    { field: 'vendorPhotoShootDate', header: 'PhotoShoot Date', isDate: true },
    { field: 'labdipQualityDeskloomDue', header: 'Labdip Due', isDate: true },
    { field: 'labdipPlannedDate', header: 'Labdip Planned', isDate: true, statusField: 'labdipPlannedStatus' },
    { field: 'photoSampleDue', header: 'Photo Sample Due', isDate: true },
    { field: 'photoSamplePlannedDate', header: 'Photo Sample Planned', isDate: true, statusField: 'photoSamplePlannedStatus' },
    { field: 'testReportDue', header: 'Test Report Due', isDate: true },
    { field: 'plannedFPT', header: 'Planned FPT', isDate: true, statusField: 'plannedFPTStatus' },
    { field: 'plannedGPT', header: 'Planned GPT', isDate: true, statusField: 'plannedGPTStatus' },
    { field: 'gsmColorLotsDue', header: 'GSM/Color Due', isDate: true },
    { field: 'gsmColorLotsPlanned', header: 'GSM/Color Planned', isDate: true, statusField: 'gsmColorLotsPlannedStatus' },
    { field: 'remark', header: 'Remark' },
    ...customCols.map(col => ({ field: col, header: col.toUpperCase() })),
    { field: 'actions', header: 'Edit', frozen: true, style: { width: '80px' } }
  ], [isAdmin, customCols]);

  const visibleColumns = useMemo(() => allColumnDefs.filter(col => !hiddenColumns.includes(col.field)), [allColumnDefs, hiddenColumns]);

  const toolbarLeft = useMemo(() => (
    <div className="flex gap-3">
      {(isAdmin || isPMA) && (
        <button onClick={openNew} className="flex items-center gap-2 bg-[#0080ff] hover:bg-blue-600 px-5 py-2 rounded-xl font-semibold shadow-sm transition-all text-white text-sm">
          <Plus size={16} /> New Entry
        </button>
      )}
      {isAdmin && (
        <div className="flex gap-2">
          <button onClick={() => setColDialog(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${darkMode ? 'text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10' : 'text-slate-700 bg-white border-gray-200 hover:bg-gray-50'}`}>
            <Columns size={16} /> Add Column
          </button>
          <button onClick={() => setRenameDialog(true)} disabled={customCols.length === 0} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border disabled:opacity-50 ${darkMode ? 'text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10' : 'text-slate-700 bg-white border-gray-200 hover:bg-gray-50'}`}>
            <Edit3 size={16} /> Rename Column
          </button>
          <button onClick={confirmDelete} disabled={selectedRows.length === 0} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50 text-white ml-2">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}
    </div>
  ), [isAdmin, isPMA, openNew, customCols, selectedRows, confirmDelete, darkMode]);

  const toolbarRight = useMemo(() => (
    <div className="flex gap-3 items-center">
      <div className="flex items-center gap-2">
        <Checkbox inputId="exportSelected" checked={exportSelectedOnly} onChange={e => setExportSelectedOnly(e.checked)} disabled={selectedRows.length === 0} />
        <label htmlFor="exportSelected" className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Export Selected</label>
      </div>
      <button onClick={exportExcel} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${darkMode ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm'}`}>
        <Download size={16} /> Excel
      </button>
      <button onClick={exportCSV} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${darkMode ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm'}`}>
        <Download size={16} /> CSV
      </button>
      <button onClick={() => window.print()} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${darkMode ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm'}`}>
        <Printer size={16} /> Print
      </button>
      {isAdmin && (
        <MultiSelect
          value={hiddenColumns}
          options={allColumnDefs.filter(col => col.field !== 'selection' && col.field !== 'actions').map(col => ({ label: col.header, value: col.field }))}
          onChange={(e) => setHiddenColumns(e.value)}
          placeholder="Hide Columns"
          className="max-w-[200px]"
          display="chip"
        />
      )}
    </div>
  ), [exportSelectedOnly, selectedRows, exportExcel, exportCSV, isAdmin, allColumnDefs, darkMode]);

  const dialogFooter = useMemo(() => (
    <div className="flex justify-end gap-3 mt-4">
      <button onClick={hideDialog} className="px-5 py-2.5 rounded-xl font-medium text-gray-500 hover:bg-gray-100 transition-all">Cancel</button>
      <button onClick={handleSave} className="bg-[#0080ff] px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:bg-blue-600 transition-all text-white">Save Record</button>
    </div>
  ), [hideDialog, handleSave]);

  const isFieldEditable = useCallback((field) => {
    if (isAdmin || isPMA) return true;
    if (isVendor) return redFields.includes(field);
    return false;
  }, [isAdmin, isPMA, isVendor]);

  const NavItem = useCallback(({ icon: Icon, label, path, active }) => (
    <button
      onClick={() => navigate(path)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${active
          ? 'bg-[#0080ff] text-white shadow-md'
          : (darkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
        }`}
    >
      <Icon size={20} />
      {label}
    </button>
  ), [darkMode, navigate]);

  const totalEntries = data.length;
  const pendingCount = data.filter(row => row.pendingStatus && !['Approved','Completed'].includes(row.pendingStatus)).length;

  return (
    <div className={`flex h-screen w-full transition-all duration-300 overflow-hidden ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-[#f4f7fb] text-slate-900'}`}>
      
      <Toast ref={toast} />
      <ConfirmDialog visible={confirmState.visible} onHide={() => setConfirmState(prev => ({ ...prev, visible: false }))} message={confirmState.message} 
        header="Confirmation" icon="pi pi-exclamation-triangle" accept={confirmState.accept} />

      <aside className={`w-[260px] h-full flex flex-col justify-between border-r shrink-0 transition-all ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div>
          <div className="p-6 pb-8 border-b border-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00a2ff] flex items-center justify-center shadow-md text-white"><Grid size={20} /></div>
              <div><h1 className="text-xl font-extrabold tracking-tight leading-none">PMA</h1><p className={`text-[11px] font-medium mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Dashboard Panel</p></div>
            </div>
          </div>
          <div className="px-4 flex flex-col gap-2 mt-4">
            <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" active={false} />
            <NavItem icon={Database} label="All Entries" path="/tracker" active={true} />
            {isAdmin && <NavItem icon={Users} label="Users" path="/users" active={false} />}
          </div>
        </div>
        <div className="p-4">
          <div className={`p-4 rounded-2xl mb-3 border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0080ff] text-white flex items-center justify-center font-bold text-lg">{user?.name?.charAt(0).toUpperCase() || 'A'}</div>
              <div><p className="font-bold text-sm leading-tight">{user?.name || 'Admin'}</p><p className={`text-xs capitalize ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.role || 'Admin'}</p></div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-bold bg-[#f14646] text-white hover:bg-red-600 shadow-sm"><LogOut size={18} /> Logout</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="px-8 py-6 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-2xl font-extrabold flex items-center gap-2">Master Ledger 📋</h2>
            <p className={`mt-1 text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage all production entries, columns, and history logs.</p>
            <div className="flex gap-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${darkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                Total: {totalEntries}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${darkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-800'}`}>
                Pending: {pendingCount}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setDarkMode(!darkMode)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${darkMode ? 'bg-[#0080ff] text-white' : 'bg-[#00a2ff] text-white hover:bg-blue-500'}`}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <div className={`px-4 py-2 rounded-xl flex flex-col shadow-sm border ${darkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-100'}`}><span className={`text-[9px] font-bold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Today's Date</span><span className="font-extrabold text-xs">{getTodayDate()}</span></div>
          </div>
        </header>

        <div className="flex-1 px-8 pb-8 overflow-hidden flex flex-col">
          <Toolbar left={toolbarLeft} right={toolbarRight} className={`mb-4 rounded-xl border-none shadow-sm ${darkMode ? 'bg-[#1e293b]' : 'bg-white'}`} />

          <div className={`transition-all rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col border ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-100'}`} style={{ height: '100%', minHeight: 0 }}>
            <DataTable
              value={data}
              selection={selectedRows}
              onSelectionChange={(e) => setSelectedRows(e.value)}
              paginator rows={15} rowsPerPageOptions={[15, 30, 50]}
              filterDisplay="row"
              scrollable scrollHeight="flex"
              showGridlines
              loading={loading}
              emptyMessage="No entries found. Click 'New Entry' to add."
              className={`p-datatable-sm p-datatable-gridlines whitespace-nowrap ${darkMode ? 'custom-dark-table' : ''}`}
              dataKey="_id"
              tableStyle={{ minWidth: '120rem' }}
              style={{ height: '100%' }}
              rowClassName={rowClassName}
            >
              {visibleColumns.map(col => {
                if (col.field === 'selection') return <Column key="sel" selectionMode="multiple" frozen alignFrozen="left" style={col.style} />;
                if (col.field === 'actions') return <Column key="act" body={actionBodyTemplate} header="Edit" frozen alignFrozen="right" style={col.style} />;
                const isDate = col.isDate || false;
                const statusField = col.statusField || null;
                return (
                  <Column
                    key={col.field}
                    field={col.field}
                    header={col.header}
                    sortable
                    filter
                    body={createClickableBody(col.field, isDate, statusField)}
                    frozen={col.frozen}
                    alignFrozen={col.frozen ? 'left' : undefined}
                    style={{ ...col.style, ...columnStyle(col.field) }}
                  />
                );
              })}
            </DataTable>
          </div>
        </div>
      </main>

      <Dialog visible={colDialog} style={{ width: '400px' }} header="Add Custom Column" modal onHide={() => setColDialog(false)} className={darkMode ? 'dark-dialog' : ''}>
        <div className="mt-4">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Column Header Name</label>
          <InputText value={newColName} onChange={(e) => setNewColName(e.target.value)} placeholder="e.g. Courier Info" className={`w-full ${darkMode ? 'bg-white/5 border-white/10 text-white' : ''}`} onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()} />
          <button onClick={handleAddColumn} className="w-full mt-5 bg-[#0080ff] hover:bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg transition-all">Add to Ledger</button>
        </div>
      </Dialog>

      <Dialog visible={renameDialog} style={{ width: '400px' }} header="Rename Column" modal onHide={() => setRenameDialog(false)} className={darkMode ? 'dark-dialog' : ''}>
        <div className="mt-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Select Column</label>
            <Dropdown value={colToRename} options={customCols.map(c => ({ label: c.toUpperCase(), value: c }))} onChange={(e) => setColToRename(e.value)} placeholder="Select a Column" className="w-full" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>New Name</label>
            <InputText value={renamedColName} onChange={(e) => setRenamedColName(e.target.value)} placeholder="Enter new name" className={`w-full ${darkMode ? 'bg-white/5 border-white/10 text-white' : ''}`} onKeyDown={(e) => e.key === 'Enter' && handleRenameColumn()} />
          </div>
          <button onClick={handleRenameColumn} disabled={!colToRename || !renamedColName} className="w-full mt-2 bg-[#0080ff] hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-lg transition-all">Rename Column</button>
        </div>
      </Dialog>

      <OverlayPanel ref={op} className={`shadow-2xl rounded-2xl ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`} style={{ maxWidth: '450px' }}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-3 gap-8">
            <h4 className={`text-lg font-bold ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`}>📜 History Log</h4>
            {isAdmin && cellHistory.length > 0 && (
              <button onClick={handleClearHistory} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">Clear History</button>
            )}
          </div>
          {cellHistory.length === 0 ? (
            <p className="text-gray-400 text-sm">No changes recorded yet.</p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className={`sticky top-0 ${darkMode ? 'bg-[#1e293b] text-gray-400' : 'bg-slate-50 text-slate-500'}`}>
                  <tr><th className="p-2">Old Value</th><th className="p-2">New Value</th><th className="p-2">Changed By</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {cellHistory.map((h, i) => (
                    <tr key={i}>
                      <td className="p-2">{h.oldValue ? formatDate(h.oldValue) : '-'}</td>
                      <td className={`p-2 font-medium ${darkMode ? 'text-white' : 'text-blue-600'}`}>{h.newValue ? formatDate(h.newValue) : '-'}</td>
                      <td className="p-2 text-xs">{h.changedBy?.name || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </OverlayPanel>

      <Dialog visible={formDialog} style={{ width: '850px' }} header={isEditing ? 'Edit Record' : 'New Record'} modal footer={dialogFooter} onHide={hideDialog} className={darkMode ? 'dark-dialog' : ''}>
        <TabView className="mt-2">
          {/* ... (Tab panels unchanged, same as before) ... */}
          <TabPanel header="Basic Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>CAT NO</label>
                <InputText value={formData.catNo || ''} onChange={(e) => setFormData({ ...formData, catNo: e.target.value })} disabled={!isFieldEditable('catNo')} className={`w-full p-2 text-sm ${darkMode ? 'bg-white/5 border-white/10 text-white' : ''}`} />
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Style No. *</label>
                <InputText value={formData.styleNo || ''} onChange={(e) => setFormData({ ...formData, styleNo: e.target.value })} disabled={!isFieldEditable('styleNo')} className={`w-full p-2 text-sm ${darkMode ? 'bg-white/5 border-white/10 text-white' : ''}`} />
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Factory FOB</label>
                <Calendar value={formData.factoryFOB ? new Date(formData.factoryFOB) : null} onChange={(e) => setFormData({ ...formData, factoryFOB: dateToStr(e.value) })} disabled={!isFieldEditable('factoryFOB')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm" />
              </div>
              <div className="field md:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Remark</label>
                <InputText value={formData.remark || ''} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} disabled={!isFieldEditable('remark')} className={`w-full p-2 text-sm ${darkMode ? 'bg-white/5 border-white/10 text-white' : ''}`} />
              </div>
              {customCols.map(col => (
                <div className="field" key={col}>
                  <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>{col.toUpperCase()}</label>
                  <InputText value={formData[col] || ''} onChange={(e) => setFormData({ ...formData, [col]: e.target.value })} disabled={!isFieldEditable(col)} className={`w-full p-2 text-sm ${darkMode ? 'bg-indigo-900/20 border-indigo-500/30 text-white' : 'bg-indigo-50 border-indigo-200'}`} />
                </div>
              ))}
            </div>
          </TabPanel>

          <TabPanel header="Labdip & Photo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="field md:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>PhotoShoot Date</label>
                <Calendar value={formData.vendorPhotoShootDate ? new Date(formData.vendorPhotoShootDate) : null} onChange={(e) => setFormData({ ...formData, vendorPhotoShootDate: dateToStr(e.value) })} disabled={!isFieldEditable('vendorPhotoShootDate')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm" />
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Labdip Due</label>
                <Calendar value={formData.labdipQualityDeskloomDue ? new Date(formData.labdipQualityDeskloomDue) : null} onChange={(e) => setFormData({ ...formData, labdipQualityDeskloomDue: dateToStr(e.value) })} disabled={!isFieldEditable('labdipQualityDeskloomDue')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm" />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Labdip Planned</label>
                <div className="flex gap-2">
                  <Calendar value={formData.labdipPlannedDate ? new Date(formData.labdipPlannedDate) : null} onChange={(e) => setFormData({ ...formData, labdipPlannedDate: dateToStr(e.value) })} disabled={!isFieldEditable('labdipPlannedDate')} dateFormat="dd/mm/yy" className="flex-1" inputClassName="p-2 text-sm" />
                  <Dropdown value={formData.labdipPlannedStatus || 'Pending'} options={statusOptions} onChange={(e) => setFormData({ ...formData, labdipPlannedStatus: e.value })} disabled={!isFieldEditable('labdipPlannedStatus')} className="flex-1" placeholder="Select Status" />
                </div>
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Photo Sample Due</label>
                <Calendar value={formData.photoSampleDue ? new Date(formData.photoSampleDue) : null} onChange={(e) => setFormData({ ...formData, photoSampleDue: dateToStr(e.value) })} disabled={!isFieldEditable('photoSampleDue')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm" />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Photo Sample Planned</label>
                <div className="flex gap-2">
                  <Calendar value={formData.photoSamplePlannedDate ? new Date(formData.photoSamplePlannedDate) : null} onChange={(e) => setFormData({ ...formData, photoSamplePlannedDate: dateToStr(e.value) })} disabled={!isFieldEditable('photoSamplePlannedDate')} dateFormat="dd/mm/yy" className="flex-1" inputClassName="p-2 text-sm" />
                  <Dropdown value={formData.photoSamplePlannedStatus || 'Pending'} options={statusOptions} onChange={(e) => setFormData({ ...formData, photoSamplePlannedStatus: e.value })} disabled={!isFieldEditable('photoSamplePlannedStatus')} className="flex-1" placeholder="Select Status" />
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel header="Test, FPT, GPT & GSM">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="field md:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Test Report Due</label>
                <Calendar value={formData.testReportDue ? new Date(formData.testReportDue) : null} onChange={(e) => setFormData({ ...formData, testReportDue: dateToStr(e.value) })} disabled={!isFieldEditable('testReportDue')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm" />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Planned FPT</label>
                <div className="flex gap-2">
                  <Calendar value={formData.plannedFPT ? new Date(formData.plannedFPT) : null} onChange={(e) => setFormData({ ...formData, plannedFPT: dateToStr(e.value) })} disabled={!isFieldEditable('plannedFPT')} dateFormat="dd/mm/yy" className="flex-1" inputClassName="p-2 text-sm" />
                  <Dropdown value={formData.plannedFPTStatus || 'Pending'} options={statusOptions} onChange={(e) => setFormData({ ...formData, plannedFPTStatus: e.value })} disabled={!isFieldEditable('plannedFPTStatus')} className="flex-1" placeholder="Select Status" />
                </div>
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Planned GPT</label>
                <div className="flex gap-2">
                  <Calendar value={formData.plannedGPT ? new Date(formData.plannedGPT) : null} onChange={(e) => setFormData({ ...formData, plannedGPT: dateToStr(e.value) })} disabled={!isFieldEditable('plannedGPT')} dateFormat="dd/mm/yy" className="flex-1" inputClassName="p-2 text-sm" />
                  <Dropdown value={formData.plannedGPTStatus || 'Pending'} options={statusOptions} onChange={(e) => setFormData({ ...formData, plannedGPTStatus: e.value })} disabled={!isFieldEditable('plannedGPTStatus')} className="flex-1" placeholder="Select Status" />
                </div>
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>GSM/Color Due</label>
                <Calendar value={formData.gsmColorLotsDue ? new Date(formData.gsmColorLotsDue) : null} onChange={(e) => setFormData({ ...formData, gsmColorLotsDue: dateToStr(e.value) })} disabled={!isFieldEditable('gsmColorLotsDue')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm" />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>GSM/Color Planned</label>
                <div className="flex gap-2">
                  <Calendar value={formData.gsmColorLotsPlanned ? new Date(formData.gsmColorLotsPlanned) : null} onChange={(e) => setFormData({ ...formData, gsmColorLotsPlanned: dateToStr(e.value) })} disabled={!isFieldEditable('gsmColorLotsPlanned')} dateFormat="dd/mm/yy" className="flex-1" inputClassName="p-2 text-sm" />
                  <Dropdown value={formData.gsmColorLotsPlannedStatus || 'Pending'} options={statusOptions} onChange={(e) => setFormData({ ...formData, gsmColorLotsPlannedStatus: e.value })} disabled={!isFieldEditable('gsmColorLotsPlannedStatus')} className="flex-1" placeholder="Select Status" />
                </div>
              </div>
            </div>
          </TabPanel>
        </TabView>
      </Dialog>

      <AIChat />
    </div>
  );
};

export default TrackerPage;