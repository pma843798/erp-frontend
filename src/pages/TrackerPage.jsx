import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
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
import AIChat from '../components/AIChat';
import * as XLSX from 'xlsx';

import {
  LayoutDashboard, LogOut, Plus, Trash2, Download, Printer,
  Sun, Moon, Columns, Edit3, Users, Database, Grid, FilterX, Menu, Upload, Layers
} from 'lucide-react';
import { exportMasterLedger, exportHistoryLog, exportCSV } from '../utils/excelExport';

const standardFields = [
  '_id', 'createdAt', 'updatedAt', '__v', 'history',
  'catNo', 'styleNo', 'styleName',
  'factoryFOB', 'vendorPhotoShootDate',
  'labdipQualityDeskloomDue', 'labdipPlannedDate', 'labdipPlannedStatus',
  'photoSampleDue', 'photoSamplePlannedDate', 'photoSamplePlannedStatus',
  'fabInHousePlannedDate',
  'fptDueDate', 'plannedFPT', 'plannedFPTStatus',
  'gptDueDate', 'plannedGPT', 'plannedGPTStatus',
  'gsmColorLotsDue', 'gsmColorLotsPlanned', 'gsmColorLotsPlannedStatus', 'remark',
  'approvalStatus', 'pendingStatus', 'buyerApproval', 'priority',
  'labdipApprovedBy', 'labdipApprovedDate',
  'photoSampleApprovedBy', 'photoSampleApprovedDate',
  'plannedFPTApprovedBy', 'plannedFPTApprovedDate',
  'plannedGPTApprovedBy', 'plannedGPTApprovedDate',
  'gsmColorLotsApprovedBy', 'gsmColorLotsApprovedDate'
];

const ignoredColumns = ['LABDIPAPPROVEDBY', 'LABDIPAPPROVEDDATE'];

const statusOptions = [
  { label: 'APPROVE', value: 'Approved' },
  { label: 'PENDING', value: 'Pending' },
  { label: 'REJECT', value: 'Rejected' },
  { label: 'NOT APPLICABLE', value: 'Not Applicable' }
];

const plannedDateFields = [
  'labdipPlannedDate',
  'photoSamplePlannedDate',
  'plannedFPT',
  'plannedGPT',
  'gsmColorLotsPlanned',
  'fabInHousePlannedDate'
];

const statusFields = [
  'labdipPlannedStatus',
  'photoSamplePlannedStatus',
  'plannedFPTStatus',
  'plannedGPTStatus',
  'gsmColorLotsPlannedStatus'
];

const allDateFields = [
  'factoryFOB',
  'vendorPhotoShootDate',
  'labdipQualityDeskloomDue',
  'labdipPlannedDate',
  'photoSampleDue',
  'photoSamplePlannedDate',
  'fabInHousePlannedDate',
  'fptDueDate',
  'plannedFPT',
  'gptDueDate',
  'plannedGPT',
  'gsmColorLotsDue',
  'gsmColorLotsPlanned'
];

const textFields = ['remark'];

const makeLabel = (field) => field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

const parseExcelDate = (val) => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    const jsDate = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(jsDate.getTime())) return jsDate.toISOString().split('T')[0];
    return null;
  }
  const str = String(val).trim();
  if (str === '') return null;
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    const jsDate = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(jsDate.getTime())) return jsDate.toISOString().split('T')[0];
  }
  const ddMmmYyRegex = /^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2})$/;
  const match = str.match(ddMmmYyRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2].toLowerCase();
    const year = 2000 + parseInt(match[3], 10);
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const month = months[monthStr];
    if (month !== undefined && day > 0) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
};

// ─── CUSTOM DATE FILTER COMPONENT ───
const DateColumnFilter = ({ value, filterApplyCallback }) => {
  return (
    <Calendar
      value={value ? new Date(value) : null}
      onChange={(e) => {
        filterApplyCallback(e.value);
      }}
      dateFormat="dd/mm/yy"
      placeholder="Select date"
      className="p-column-filter"
      showIcon
    />
  );
};

// ─── CUSTOM DATE FILTER FUNCTION ───
const dateFilterFunction = (value, filter) => {
  if (!filter || !value) return true;
  const rowDate = value instanceof Date ? value : new Date(value);
  const filterDate = filter instanceof Date ? filter : new Date(filter);
  return rowDate.toDateString() === filterDate.toDateString();
};

const TrackerPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useRef(null);
  const op = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [cellHistory, setCellHistory] = useState([]);
  const [cellField, setCellField] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState(null);
  const [selectedHistoryItems, setSelectedHistoryItems] = useState([]);

  const [customCols, setCustomCols] = useState([]);
  const [renameDialog, setRenameDialog] = useState(false);
  const [colToRename, setColToRename] = useState('');
  const [renamedColName, setRenamedColName] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [exportSelectedOnly, setExportSelectedOnly] = useState(false);
  const [confirmState, setConfirmState] = useState({ visible: false, message: '', accept: null });
  const [filter, setFilter] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState(null);

  // --- Bulk Update State (new) ---
  const [bulkDialogVisible, setBulkDialogVisible] = useState(false);
  const [bulkTab, setBulkTab] = useState('quick'); // 'quick' or 'excel'
  const [bulkUpdateField, setBulkUpdateField] = useState('');
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');
  const [bulkPreviewVisible, setBulkPreviewVisible] = useState(false);
  const [bulkPreviewRows, setBulkPreviewRows] = useState([]);

  const [bulkExcelFile, setBulkExcelFile] = useState(null);
  const [bulkExcelImporting, setBulkExcelImporting] = useState(false);
  const [bulkCatalogForExcel, setBulkCatalogForExcel] = useState(null);
  const [bulkExcelPreviewVisible, setBulkExcelPreviewVisible] = useState(false);
  const [bulkExcelPreviewData, setBulkExcelPreviewData] = useState([]);

  // --- Import State ---
  const [importDialog, setImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [previewEntries, setPreviewEntries] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Global date range filter states
  const [dateFilterField, setDateFilterField] = useState(null);
  const [dateFilterStart, setDateFilterStart] = useState(null);
  const [dateFilterEnd, setDateFilterEnd] = useState(null);

  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === 'admin';
  const isPMA = userRole === 'pma';
  const isVendor = userRole === 'vendor';

  const redFields = plannedDateFields;

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : false;
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const [formDialog, setFormDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterParam = params.get('filter');
    setFilter(filterParam);
  }, [location.search]);

  const fetchData = useCallback(async () => {
    const { data } = await api.get('/tracker');
    return data;
  }, []);

  const saveEntry = useCallback(async (payload, isEditingEntry, id) => {
    if (isEditingEntry && id) return api.put(`/tracker/${id}`, payload);
    return api.post('/tracker', payload);
  }, []);

  const deleteEntries = useCallback(async (ids) => {
    return api.delete('/tracker', { data: { ids } });
  }, []);

  const renameColumn = useCallback(async (oldName, newName) => {
    return api.put('/tracker/column/rename', { oldName, newName });
  }, []);

  const clearHistory = useCallback(async (entryId, field, historyIds = null) => {
    const payload = historyIds ? { field, historyIds } : { field };
    return api.delete(`/tracker/history/${entryId}`, { data: payload });
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

  useEffect(() => {
    if (data.length === 0) loadData();
  }, [loadData, data.length]);

  const catalogOptions = useMemo(() => {
    const catMap = new Map();
    data.forEach(row => {
      if (!row.catNo) return;
      const existing = catMap.get(row.catNo);
      const createdAt = row.createdAt ? new Date(row.createdAt).getTime() : 0;
      if (!existing || createdAt > existing.latest) {
        catMap.set(row.catNo, { catNo: row.catNo, latest: createdAt });
      }
    });
    return Array.from(catMap.values())
      .sort((a, b) => b.latest - a.latest)
      .map(item => ({ label: item.catNo, value: item.catNo }));
  }, [data]);

  const dateFilterFieldOptions = useMemo(() => [
    { label: 'All Date Fields', value: '__all__' },
    ...allDateFields.map(f => ({ label: makeLabel(f), value: f })),
    { label: 'Created Date', value: 'createdAt' },
  ], []);

  const filteredData = useMemo(() => {
  let result = data;
  if (filter && filter !== 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    switch (filter) {
      // --- new cases (from dashboard cards) ---
      case 'pending-labdip':
        result = data.filter(item => item.labdipPlannedStatus === 'Pending');
        break;
      case 'pending-photo':
        result = data.filter(item => item.photoSamplePlannedStatus === 'Pending');
        break;
      case 'pending-gsm':
        result = data.filter(item => item.gsmColorLotsPlannedStatus === 'Pending');
        break;
      // --- existing cases ---
      case 'pending-gpt':
        result = data.filter(item => item.plannedGPTStatus === 'Pending');
        break;
      case 'pending-fpt':
        result = data.filter(item => item.plannedFPTStatus === 'Pending');
        break;
      case 'approved':
        result = data.filter(item =>
          item.labdipPlannedStatus === 'Approved' ||
          item.photoSamplePlannedStatus === 'Approved' ||
          item.plannedFPTStatus === 'Approved' ||
          item.plannedGPTStatus === 'Approved' ||
          item.gsmColorLotsPlannedStatus === 'Approved'
        );
        break;
      case 'delayed':
        result = data.filter(item => {
          const dueDate = new Date(item.labdipQualityDeskloomDue);
          return dueDate < today && item.labdipPlannedStatus !== 'Approved';
        });
        break;
      case 'hold':
        result = data.filter(item => item.pendingStatus === 'Hold');
        break;
      case 'urgent':
        result = data.filter(item => item.priority === 'Urgent');
        break;
      default:
        result = data;
    }
  }

  if (selectedCatalog) result = result.filter(item => item.catNo === selectedCatalog);

    if (dateFilterField && (dateFilterStart || dateFilterEnd)) {
      const start = dateFilterStart ? new Date(dateFilterStart) : null;
      const end = dateFilterEnd ? new Date(dateFilterEnd) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      result = result.filter(item => {
        if (dateFilterField === '__all__') {
          return allDateFields.some(field => {
            const val = item[field];
            if (!val) return false;
            const d = new Date(val);
            if (isNaN(d.getTime())) return false;
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
          });
        }
        const val = item[dateFilterField];
        if (!val) return false;
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    return [...result].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [data, filter, selectedCatalog, dateFilterField, dateFilterStart, dateFilterEnd]);

  const displayData = useMemo(() => {
    return filteredData.map(item => {
      const newItem = { ...item };
      allDateFields.forEach(field => {
        const val = newItem[field];
        if (val && typeof val === 'string') {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            newItem[field] = d;
          }
        }
      });
      return newItem;
    });
  }, [filteredData]);

  const hasData = filteredData.length > 0;

  const openNew = useCallback(() => {
    setIsEditing(false);
    const initialData = {
      catNo: '', styleNo: '', styleName: '',
      factoryFOB: null, vendorPhotoShootDate: null,
      labdipQualityDeskloomDue: null, labdipPlannedDate: null, labdipPlannedStatus: 'Pending',
      photoSampleDue: null, photoSamplePlannedDate: null, photoSamplePlannedStatus: 'Pending',
      fabInHousePlannedDate: null,
      fptDueDate: null, plannedFPT: null, plannedFPTStatus: 'Pending',
      gptDueDate: null, plannedGPT: null, plannedGPTStatus: 'Pending',
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

  // --- Bulk Update Helpers ---
  const getEditableFields = useCallback(() => {
    if (isAdmin) return [...allDateFields, ...statusFields, 'remark'];
    if (isPMA) return statusFields;
    if (isVendor) return plannedDateFields;
    return [];
  }, [isAdmin, isPMA, isVendor]);

  const bulkFieldOptions = useMemo(() => {
    return getEditableFields().map(f => ({ label: makeLabel(f), value: f }));
  }, [getEditableFields]);

  const getFieldType = (field) => {
    if (statusFields.includes(field)) return 'status';
    if (allDateFields.includes(field) || plannedDateFields.includes(field)) return 'date';
    if (textFields.includes(field)) return 'text';
    if (field?.toLowerCase().includes('status')) return 'status';
    if (field?.toLowerCase().includes('date') || field?.toLowerCase().includes('due') || field?.toLowerCase().includes('fob') || field?.toLowerCase().includes('photo')) return 'date';
    return 'text';
  };

  // --- Quick Bulk Update ---
  const handleBulkPreview = useCallback(() => {
    if (!bulkUpdateField || !bulkUpdateValue || selectedRows.length === 0) {
      toast.current.show({ severity: 'warn', summary: 'Validation', detail: 'Select field, value and at least one row.', life: 3000 });
      return;
    }
    const rows = selectedRows.map(row => ({
      styleNo: row.styleNo,
      catNo: row.catNo,
      oldValue: row[bulkUpdateField],
      newValue: bulkUpdateValue,
      checked: true,
      _id: row._id,
    }));
    setBulkPreviewRows(rows);
    setBulkPreviewVisible(true);
  }, [bulkUpdateField, bulkUpdateValue, selectedRows]);

  const handleBulkApplyQuick = useCallback(async () => {
    const toUpdate = bulkPreviewRows.filter(r => r.checked);
    if (toUpdate.length === 0) {
      toast.current.show({ severity: 'warn', summary: 'No rows', detail: 'No rows selected.', life: 3000 });
      return;
    }
    setLoading(true);
    let success = 0;
    for (const row of toUpdate) {
      try {
        await api.put(`/tracker/${row._id}`, { [bulkUpdateField]: row.newValue });
        success++;
      } catch (err) {
        console.error('Update failed for', row.styleNo, err);
      }
    }
    toast.current.show({ severity: 'success', summary: 'Updated', detail: `${success} of ${toUpdate.length} rows updated.`, life: 3000 });
    setBulkPreviewVisible(false);
    setBulkPreviewRows([]);
    setBulkDialogVisible(false);
    loadData();
    setSelectedRows([]);
    setLoading(false);
  }, [bulkPreviewRows, bulkUpdateField, loadData]);

  // --- Excel Bulk Update ---
  const downloadBulkTemplate = useCallback(() => {
    const catalog = bulkCatalogForExcel;
    let rows = data;
    if (catalog) rows = rows.filter(item => item.catNo === catalog);

    const editableFields = getEditableFields();
    const headers = ['Style No.', ...editableFields.map(f => makeLabel(f))];
    const wsData = rows.map(row => {
      const obj = { 'Style No.': row.styleNo };
      editableFields.forEach(f => {
        obj[makeLabel(f)] = row[f] ?? '';
      });
      return obj;
    });
    if (wsData.length === 0) {
      toast.current.show({ severity: 'warn', summary: 'No data', detail: 'No records found for the selected catalog.', life: 3000 });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BulkUpdate');
    XLSX.writeFile(wb, 'bulk_update_template.xlsx');
    toast.current.show({ severity: 'success', summary: 'Template downloaded', detail: `${wsData.length} rows exported.`, life: 2000 });
  }, [data, bulkCatalogForExcel, getEditableFields]);

  const handleBulkExcelUpload = useCallback(async () => {
    if (!bulkExcelFile) {
      toast.current.show({ severity: 'warn', summary: 'No file', detail: 'Please select an Excel file.', life: 3000 });
      return;
    }
    setBulkExcelImporting(true);
    try {
      const buffer = await bulkExcelFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (json.length === 0) {
        toast.current.show({ severity: 'warn', summary: 'Empty', detail: 'No rows found.', life: 3000 });
        setBulkExcelImporting(false);
        return;
      }

      const editableFields = getEditableFields();
      const previewRows = [];
      for (const row of json) {
        const styleNo = row['Style No.']?.toString().trim();
        if (!styleNo) continue;
        const existing = data.find(d => d.styleNo === styleNo);
        if (!existing) continue;
        const changes = {};
        let hasChange = false;
        for (const field of editableFields) {
          const header = makeLabel(field);
          let newVal = row[header];
          if (allDateFields.includes(field)) newVal = parseExcelDate(newVal);
          const oldVal = existing[field] ?? null;
          const oldStr = oldVal ? String(oldVal) : '';
          const newStr = newVal ? String(newVal) : '';
          if (oldStr !== newStr) {
            changes[field] = { old: oldVal, new: newVal };
            hasChange = true;
          }
        }
        if (hasChange) {
          previewRows.push({
            styleNo,
            catNo: existing.catNo,
            _id: existing._id,
            checked: true,
            changes,
          });
        }
      }
      if (previewRows.length === 0) {
        toast.current.show({ severity: 'info', summary: 'No changes', detail: 'No rows with changes found.', life: 3000 });
        setBulkExcelImporting(false);
        return;
      }
      setBulkExcelPreviewData(previewRows);
      setBulkExcelPreviewVisible(true);
      setBulkExcelFile(null);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to parse file.', life: 4000 });
    }
    setBulkExcelImporting(false);
  }, [bulkExcelFile, data, getEditableFields]);

  const handleBulkExcelApply = useCallback(async () => {
    const toUpdate = bulkExcelPreviewData.filter(r => r.checked);
    if (toUpdate.length === 0) {
      toast.current.show({ severity: 'warn', summary: 'No rows', detail: 'No rows selected.', life: 3000 });
      return;
    }
    setLoading(true);
    let success = 0;
    for (const row of toUpdate) {
      const payload = {};
      for (const [field, change] of Object.entries(row.changes)) {
        // Only send fields that are editable (already filtered)
        payload[field] = change.new;
      }
      if (Object.keys(payload).length === 0) continue;
      try {
        await api.put(`/tracker/${row._id}`, payload);
        success++;
      } catch (err) {
        console.error('Update failed for', row.styleNo, err);
      }
    }
    toast.current.show({ severity: 'success', summary: 'Updated', detail: `${success} of ${toUpdate.length} rows updated.`, life: 3000 });
    setBulkExcelPreviewVisible(false);
    setBulkExcelPreviewData([]);
    setBulkDialogVisible(false);
    loadData();
    setLoading(false);
  }, [bulkExcelPreviewData, loadData]);

  // --- Existing handlers ---
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

  // Import functions
  const downloadImportTemplate = useCallback(() => {
    const templateData = [{
      'CAT NO': '',
      'Style No.': '',
      'Style Name': '',
      'Factory FOB': '',
      'Photoshoot date': '',
      'Labdip Due Date': '',
      'Photo Sample Due Date': '',
      'FPT Due Date': '',
      'GPT Due Date': '',
      'GSM/Color Due Date': '',
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'import_template.xlsx');
  }, []);

  const handleParseFile = useCallback(async () => {
    if (!importFile) {
      toast.current?.show({ severity: 'warn', summary: 'No file', detail: 'Please select an Excel file.', life: 3000 });
      return;
    }
    setImporting(true);
    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      if (jsonData.length === 0) {
        toast.current?.show({ severity: 'warn', summary: 'Empty file', detail: 'No rows found.', life: 3000 });
        setImporting(false);
        return;
      }
      const headerMap = {
        'CAT NO': 'catNo',
        'Style No.': 'styleNo',
        'Style Name': 'styleName',
        'Factory FOB': 'factoryFOB',
        'Photoshoot date': 'vendorPhotoShootDate',
        'Labdip Due Date': 'labdipQualityDeskloomDue',
        'Photo Sample Due Date': 'photoSampleDue',
        'FPT Due Date': 'fptDueDate',
        'GPT Due Date': 'gptDueDate',
        'GSM/Color Due Date': 'gsmColorLotsDue',
      };
      const entries = jsonData.map(row => {
        const entry = {
          catNo: '', styleNo: '', styleName: '', factoryFOB: null, vendorPhotoShootDate: null,
          labdipPlannedStatus: 'Pending', photoSamplePlannedStatus: 'Pending',
          plannedFPTStatus: 'Pending', plannedGPTStatus: 'Pending', gsmColorLotsPlannedStatus: 'Pending',
          approvalStatus: 'Pending', pendingStatus: 'In Progress', buyerApproval: 'Pending', priority: 'Medium',
        };
        Object.keys(row).forEach(excelHeader => {
          const field = headerMap[excelHeader];
          if (field) {
            let val = row[excelHeader];
            if (allDateFields.includes(field)) val = parseExcelDate(val);
            entry[field] = val;
          } else {
            entry[excelHeader] = row[excelHeader];
          }
        });
        return entry;
      });
      setPreviewEntries(entries);
      setImportDialog(false);
      setShowPreview(true);
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Import error', detail: 'Could not read file.', life: 4000 });
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  }, [importFile]);

  const confirmImport = useCallback(async () => {
    if (!isAdmin) {
      toast.current?.show({ severity: 'error', summary: 'Permission denied', detail: 'Only admin can import.', life: 3000 });
      return;
    }
    const validEntries = previewEntries.filter(e => e.styleNo);
    if (validEntries.length === 0) {
      toast.current?.show({ severity: 'warn', summary: 'No valid rows', detail: 'All rows missing Style No.', life: 3000 });
      return;
    }
    setImporting(true);
    let success = 0;
    for (const entry of validEntries) {
      try {
        await api.post('/tracker', entry);
        success++;
      } catch (err) { console.error('Import failed:', entry.styleNo, err); }
    }
    toast.current?.show({ severity: 'success', summary: 'Import finished', detail: `${success} of ${validEntries.length} imported.`, life: 4000 });
    setShowPreview(false);
    setPreviewEntries([]);
    loadData();
    setImporting(false);
  }, [isAdmin, previewEntries, loadData]);

  // Export functions
  const handleExportMasterLedger = useCallback(() => {
    const rows = exportSelectedOnly && selectedRows.length ? selectedRows : filteredData;
    exportMasterLedger(rows, customCols, toast);
  }, [filteredData, selectedRows, exportSelectedOnly, customCols]);

  const handleExportHistoryLog = useCallback(() => {
    const rows = exportSelectedOnly && selectedRows.length ? selectedRows : filteredData;
    exportHistoryLog(rows, customCols, toast);
  }, [filteredData, selectedRows, exportSelectedOnly, customCols]);

  const handleExportCSV = useCallback(() => {
    const rows = exportSelectedOnly && selectedRows.length ? selectedRows : filteredData;
    exportCSV(rows, customCols, toast);
  }, [filteredData, selectedRows, exportSelectedOnly, customCols]);

  const handleDeleteSelectedHistory = useCallback(async () => {
    if (selectedHistoryItems.length === 0) return;
    setConfirmState({
      visible: true,
      message: `Delete ${selectedHistoryItems.length} selected history entries?`,
      accept: async () => {
        try {
          await clearHistory(currentEntryId, cellField, selectedHistoryItems);
          toast.current.show({ severity: 'success', summary: 'Deleted', detail: 'Selected history entries removed', life: 2000 });
          const updatedEntry = await api.get(`/tracker/${currentEntryId}`);
          const raw = updatedEntry.data.history || [];
          const filtered = raw.filter((h) => {
            if (h.field !== cellField || ['createdAt', 'updatedAt', '__v', 'history'].includes(h.field)) return false;
            const isDate = cellField === 'factoryFOB' || cellField.toLowerCase().includes('date') || cellField.toLowerCase().includes('due') || cellField.includes('FPT') || cellField.includes('GPT');
            const fOld = isDate ? formatDate(h.oldValue) : String(h.oldValue ?? '');
            const fNew = isDate ? formatDate(h.newValue) : String(h.newValue ?? '');
            return fOld !== fNew;
          });
          setCellHistory(filtered);
          setSelectedHistoryItems([]);
          loadData();
        } catch (err) {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to delete history', life: 3000 });
        }
        setConfirmState(prev => ({ ...prev, visible: false }));
      }
    });
  }, [currentEntryId, cellField, selectedHistoryItems, clearHistory, loadData, formatDate]);

  const showCellHistory = useCallback((e, field, rowData) => {
    setCurrentEntryId(rowData._id);
    setCellField(field);
    setSelectedHistoryItems([]);
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

  const handleClearAllHistory = useCallback(async () => {
    setConfirmState({
      visible: true,
      message: 'Permanently delete ALL history logs for this field?',
      accept: async () => {
        try {
          await clearHistory(currentEntryId, cellField);
          toast.current.show({ severity: 'success', summary: 'Cleared', detail: 'All history deleted', life: 2000 });
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
    let base = '';
    if (s === 'Approved') base = 'border-green-400/50 shadow-[0_4px_12px_rgba(34,197,94,0.4)]';
    else if (s === 'Rejected') base = 'border-red-400/50 shadow-[0_4px_12px_rgba(239,68,68,0.4)]';
    else if (s === 'Not Applicable') base = 'border-slate-400/50 shadow-[0_4px_12px_rgba(100,116,139,0.4)]';
    else base = 'border-yellow-400/50 shadow-[0_4px_12px_rgba(234,179,8,0.4)]';
    const darkBg = {
      Approved: 'bg-green-500/20 text-green-400',
      Rejected: 'bg-red-500/20 text-red-400',
      'Not Applicable': 'bg-slate-500/20 text-slate-300',
      Pending: 'bg-yellow-500/20 text-yellow-400'
    };
    const lightBg = {
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      'Not Applicable': 'bg-slate-100 text-slate-700',
      Pending: 'bg-yellow-100 text-yellow-800'
    };
    const colors = darkMode ? darkBg[s] || darkBg.Pending : lightBg[s] || lightBg.Pending;
    return `${base} ${colors}`;
  }, [darkMode]);

  const rowClassName = useCallback((rowData) => {
    let classes = 'transition-all duration-200';
    const status = rowData.pendingStatus;
    if (status === 'Rejected') classes += darkMode ? ' row-rejected-dark' : ' row-rejected-light';
    else if (status === 'Approved') classes += darkMode ? ' row-done-dark' : ' row-done-light';
    return classes;
  }, [darkMode]);

  const approvalFieldsMap = useMemo(() => ({
    'labdipPlannedStatus': { by: 'labdipApprovedBy', date: 'labdipApprovedDate' },
    'photoSamplePlannedStatus': { by: 'photoSampleApprovedBy', date: 'photoSampleApprovedDate' },
    'plannedFPTStatus': { by: 'plannedFPTApprovedBy', date: 'plannedFPTApprovedDate' },
    'plannedGPTStatus': { by: 'plannedGPTApprovedBy', date: 'plannedGPTApprovedDate' },
    'gsmColorLotsPlannedStatus': { by: 'gsmColorLotsApprovedBy', date: 'gsmColorLotsApprovedDate' }
  }), []);

  const createClickableBody = useCallback((field, isDate = false) => (rowData) => {
    const val = rowData[field];
    const isDateField = (field === 'factoryFOB') || isDate;
    const display = isDateField && val ? formatDate(val) : (val !== undefined && val !== null && val !== 'None' ? String(val) : '');
    const hasHistory = rowData.history && rowData.history.some(h => {
      if (h.field !== field) return false;
      let rawOld = h.oldValue === 'None' || h.oldValue === null || h.oldValue === undefined || h.oldValue === '' ? '' : h.oldValue;
      let rawNew = h.newValue === 'None' || h.newValue === null || h.newValue === undefined || h.newValue === '' ? '' : h.newValue;
      if (!rawOld && rawNew) return false;
      const fOld = isDateField && rawOld ? formatDate(rawOld) : String(rawOld);
      const fNew = isDateField && rawNew ? formatDate(rawNew) : String(rawNew);
      return fOld !== fNew;
    });
    const dateBoxClasses = `rounded-lg px-2 py-1 text-xs font-medium transition-all duration-200 shadow-sm ${darkMode ? 'bg-slate-700 border border-slate-600 text-white' : 'bg-slate-100 border border-slate-200 text-slate-800'}`;
    return (
      <div className="flex items-center gap-2">
        {isDateField ? (
          <div className={dateBoxClasses}>
            <span className={`cursor-pointer flex items-center ${hasHistory ? (darkMode ? 'text-orange-400' : 'text-orange-700') : ''}`}
              onClick={(e) => { e.stopPropagation(); showCellHistory(e, field, rowData); }}
              title={hasHistory ? "Updated recently" : "View History"}>
              {display || '-'}
              {hasHistory && <div className="w-2 h-2 rounded-full bg-orange-500 ml-2 animate-pulse" />}
            </span>
          </div>
        ) : (
          <span className={`cursor-pointer transition-all flex items-center font-medium px-2 py-1 rounded-lg text-sm ${hasHistory ? (darkMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-sm' : 'bg-orange-100 text-orange-700 border border-orange-200 shadow-sm') : (darkMode ? 'hover:text-cyan-400' : 'hover:text-blue-600')}`}
            onClick={(e) => { e.stopPropagation(); showCellHistory(e, field, rowData); }}
            title={hasHistory ? "Updated recently" : "View History"}>
            {display || '-'}
            {hasHistory && <div className="w-2 h-2 rounded-full bg-orange-500 ml-2 animate-pulse" />}
          </span>
        )}
      </div>
    );
  }, [darkMode, formatDate, showCellHistory]);

  const createStatusBody = useCallback((field) => (rowData) => {
    const status = rowData[field] || 'Pending';
    const hasHistory = rowData.history && rowData.history.some(h => h.field === field);
    let displayStatus = status;
    if (status === 'Approved') displayStatus = 'APPROVE';
    else if (status === 'Pending') displayStatus = 'PENDING';
    else if (status === 'Rejected') displayStatus = 'REJECT';
    else if (status === 'Not Applicable') displayStatus = 'N/A';
    else displayStatus = status.toUpperCase();
    const approvalInfo = approvalFieldsMap[field];
    const approvedBy = approvalInfo && rowData[approvalInfo.by];
    const approvedDate = approvalInfo && rowData[approvalInfo.date];
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1 ${getStatusBadgeStyles(status)}`}>
            {displayStatus}
            {hasHistory && (
              <div className="w-2 h-2 rounded-full bg-orange-500 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); showCellHistory(e, field, rowData); }}
                title="View status change history" />
            )}
          </span>
        </div>
        {status === 'Approved' && approvedBy && (
          <div className={`flex flex-col items-start gap-0.5 text-sm font-semibold ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
            <span>✓ {approvedBy.split('(')[0].trim()}</span>
            <span className="cursor-pointer hover:text-blue-500 transition-colors flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); showCellHistory(e, approvalInfo.date, rowData); }}
              title="View approval date history">
              📅 {approvedDate ? formatDate(approvedDate) : '--'}
            </span>
          </div>
        )}
      </div>
    );
  }, [getStatusBadgeStyles, showCellHistory, approvalFieldsMap, formatDate, darkMode]);

  const columnStyle = useCallback((field) => {
    if (redFields.includes(field)) return { backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.12)' : '#fff1f1' };
    return {};
  }, [darkMode]);

  const actionBodyTemplate = useCallback((rowData) => (
    <Button icon="pi pi-pencil" className={`p-button-rounded p-button-text ${darkMode ? '!text-cyan-400 hover:!bg-cyan-400/10' : '!text-blue-600 hover:!bg-blue-50'}`} onClick={() => openEdit(rowData)} />
  ), [darkMode, openEdit]);

  const allColumnDefs = useMemo(() => [
    ...(isAdmin ? [{ field: 'selection', header: '', body: null, frozen: true, style: { width: '50px' } }] : []),
    { field: 'catNo', header: 'CAT NO', frozen: true, style: { width: '160px' }, filter: true, filterPlaceholder: 'Search' },
    { field: 'styleNo', header: 'Style No.', frozen: true, style: { width: '180px' }, filter: true, filterPlaceholder: 'Search' },
    { field: 'styleName', header: 'Style Name', frozen: true, style: { width: '180px' }, filter: true, filterPlaceholder: 'Search' },
    // ─── DATE COLUMNS WITH dataType: 'date' ───
    { field: 'factoryFOB', header: 'Factory FOB', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'vendorPhotoShootDate', header: 'PhotoShoot Date', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'labdipQualityDeskloomDue', header: 'Labdip (Due Date)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'labdipPlannedDate', header: 'Labdip (Planned Date)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'labdipPlannedStatus', header: 'Labdip (Status)', isStatus: true, filter: true, filterPlaceholder: 'Search' },
    { field: 'fabInHousePlannedDate', header: 'Fab in house (Planned date)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'photoSampleDue', header: 'Photo Sample (Due Date)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'photoSamplePlannedDate', header: 'Photo Sample (Planned Date)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'photoSamplePlannedStatus', header: 'Photo Sample (Status)', isStatus: true, filter: true, filterPlaceholder: 'Search' },
    { field: 'fptDueDate', header: 'FPT (Due)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'plannedFPT', header: 'FPT (Planned Date)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'plannedFPTStatus', header: 'FPT (Status)', isStatus: true, filter: true, filterPlaceholder: 'Search' },
    { field: 'gptDueDate', header: 'GPT (Due)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'plannedGPT', header: 'GPT (Planned Date)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'plannedGPTStatus', header: 'GPT (Status)', isStatus: true, filter: true, filterPlaceholder: 'Search' },
    { field: 'gsmColorLotsDue', header: 'Gsm/Color (Due Date)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'gsmColorLotsPlanned', header: 'Gsm/Color (Planned Date)', isDate: true, style: { width: '110px' }, 
      filter: true, dataType: 'date',
      filterElement: (options) => <DateColumnFilter value={options.value} filterApplyCallback={options.filterApplyCallback} />,
      filterFunction: dateFilterFunction,
    },
    { field: 'gsmColorLotsPlannedStatus', header: 'Gsm/Color (Status)', isStatus: true, filter: true, filterPlaceholder: 'Search' },
    { field: 'remark', header: 'Remark', filter: true, filterPlaceholder: 'Search' },
    { field: 'actions', header: 'Edit', frozen: true, style: { width: '80px' } }
  ], [isAdmin]);

  const visibleColumns = useMemo(() => allColumnDefs.filter(col => !hiddenColumns.includes(col.field)), [allColumnDefs, hiddenColumns]);

  const renderHeader = (col) => {
    if (!col.header || !col.header.includes('(')) return col.header;
    const idx = col.header.indexOf('(');
    const main = col.header.substring(0, idx).trim();
    const sub = col.header.substring(idx).trim();
    return (
      <div className="flex flex-col items-center justify-center leading-tight">
        <span className="font-semibold text-base">{main}</span>
        <span className="text-[11px] font-medium opacity-80">{sub}</span>
      </div>
    );
  };

  // Toolbar left – no global search, only date range filter and action buttons
  const toolbarLeft = useMemo(() => (
    <div className="flex gap-2 items-center flex-wrap">
      {hasData && (
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <Menu size={16} />
        </button>
      )}
      {/* Global date range filter */}
      {hasData && (
        <div className="flex items-center gap-1.5">
          <Dropdown
            value={dateFilterField}
            options={dateFilterFieldOptions}
            onChange={(e) => setDateFilterField(e.value)}
            placeholder="Date Field"
            showClear
            className="w-[130px] shadow-sm text-xs"
          />
          <Calendar
            value={dateFilterStart}
            onChange={(e) => setDateFilterStart(e.value)}
            placeholder="From"
            dateFormat="dd/mm/yy"
            showIcon
            className="w-[110px] shadow-sm"
            inputClassName="text-xs p-1"
          />
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>–</span>
          <Calendar
            value={dateFilterEnd}
            onChange={(e) => setDateFilterEnd(e.value)}
            placeholder="To"
            dateFormat="dd/mm/yy"
            showIcon
            className="w-[110px] shadow-sm"
            inputClassName="text-xs p-1"
          />
          {(dateFilterField || dateFilterStart || dateFilterEnd) && (
            <button
              onClick={() => { setDateFilterField(null); setDateFilterStart(null); setDateFilterEnd(null); }}
              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
              title="Clear date filter"
            >
              <FilterX size={14} />
            </button>
          )}
        </div>
      )}
      {(isAdmin || isPMA) && (
        <button onClick={openNew} className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-3 py-1.5 rounded-lg font-bold text-white text-xs transition-all duration-300 shadow-md hover:-translate-y-0.5">
          <Plus size={14} /> New
        </button>
      )}
      {isAdmin && (
        <button onClick={() => setImportDialog(true)} className="flex items-center gap-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 px-3 py-1.5 rounded-lg font-bold text-white text-xs transition-all duration-300 shadow-md hover:-translate-y-0.5">
          <Upload size={14} /> Import
        </button>
      )}
      {selectedRows.length > 0 && (
        <button onClick={() => setBulkDialogVisible(true)} className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 px-3 py-1.5 rounded-lg font-bold text-white text-xs transition-all duration-300 shadow-md hover:-translate-y-0.5">
          <Layers size={14} /> Bulk ({selectedRows.length})
        </button>
      )}
      {isAdmin && (
        <button onClick={confirmDelete} disabled={selectedRows.length === 0} className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-400 hover:from-red-400 hover:to-red-300 px-3 py-1.5 rounded-lg font-bold text-white text-xs transition-all duration-300 shadow-md hover:-translate-y-0.5 disabled:opacity-50">
          <Trash2 size={14} /> Del
        </button>
      )}
    </div>
  ), [isAdmin, isPMA, openNew, selectedRows, confirmDelete, darkMode, hasData, dateFilterField, dateFilterStart, dateFilterEnd, dateFilterFieldOptions]);

  const toolbarRight = useMemo(() => (
    <div className="flex gap-2 items-center flex-wrap">
      <Dropdown value={selectedCatalog} options={catalogOptions} onChange={(e) => setSelectedCatalog(e.value)} placeholder="Catalog" showClear className="w-[120px] shadow-sm" />
      <div className="flex items-center gap-1">
        <Checkbox inputId="exportSelected" checked={exportSelectedOnly} onChange={e => setExportSelectedOnly(e.checked)} disabled={selectedRows.length === 0} />
        <label htmlFor="exportSelected" className={`text-[10px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Selected</label>
      </div>
      <button onClick={handleExportMasterLedger} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border hover:-translate-y-0.5 ${darkMode ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-white/70 hover:bg-white border-gray-200/70 text-gray-700'}`}><Download size={14} /> Excel (L)</button>
      <button onClick={handleExportHistoryLog} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border hover:-translate-y-0.5 ${darkMode ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-white/70 hover:bg-white border-gray-200/70 text-gray-700'}`}><Download size={14} /> Excel (H)</button>
      <button onClick={handleExportCSV} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border hover:-translate-y-0.5 ${darkMode ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-white/70 hover:bg-white border-gray-200/70 text-gray-700'}`}><Download size={14} /> CSV</button>
      <button onClick={() => window.print()} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border hover:-translate-y-0.5 ${darkMode ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-white/70 hover:bg-white border-gray-200/70 text-gray-700'}`}><Printer size={14} /> Print</button>
      {isAdmin && (
        <MultiSelect value={hiddenColumns} options={allColumnDefs.filter(col => col.field !== 'selection' && col.field !== 'actions').map(col => ({ label: col.header, value: col.field }))} onChange={(e) => setHiddenColumns(e.value)} placeholder="Hide" className="max-w-[120px]" display="chip" />
      )}
      <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg transition-all duration-300 border hover:-translate-y-0.5 ${darkMode ? 'bg-slate-800/80 border-slate-700 text-yellow-400' : 'bg-white/80 border-gray-200 text-slate-700'}`}>
        {darkMode ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  ), [exportSelectedOnly, selectedRows, handleExportMasterLedger, handleExportHistoryLog, handleExportCSV, isAdmin, allColumnDefs, darkMode, selectedCatalog, catalogOptions, hiddenColumns]);

  const dialogFooter = useMemo(() => (
    <div className="flex justify-end gap-3 mt-4">
      <button onClick={hideDialog} className="px-4 py-2 rounded-lg font-medium text-gray-500 hover:bg-gray-100 transition-all text-xs">Cancel</button>
      <button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2 rounded-lg font-bold shadow-lg hover:from-blue-500 hover:to-blue-400 transition-all text-white text-xs">Save</button>
    </div>
  ), [hideDialog, handleSave]);

  const isFieldEditable = useCallback((field) => {
    if (isAdmin || isPMA) return true;
    if (isVendor) return redFields.includes(field);
    return false;
  }, [isAdmin, isPMA, isVendor]);

  const NavItem = useCallback(({ icon: Icon, label, path, active }) => (
    <button onClick={() => { navigate(path); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all text-sm ${active ? 'bg-[#0080ff] text-white shadow-md' : (darkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')}`}>
      <Icon size={18} /> {label}
    </button>
  ), [darkMode, navigate]);

  const renderApprovalFields = (statusField, byField, dateField) => {
    if (formData[statusField] !== 'Approved') return null;
    return (
      <div className="field md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 p-2 rounded-lg border border-green-500/30 bg-green-50/10 text-xs">
        <div>
          <label className={`block text-[11px] font-semibold mb-1 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Approved By</label>
          <InputText value={formData[byField] || ''} onChange={(e) => setFormData({ ...formData, [byField]: e.target.value })} placeholder="Enter name" disabled={!isFieldEditable(byField)} className={`w-full p-1.5 text-xs ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'border-gray-300'} rounded-lg`} />
        </div>
        <div>
          <label className={`block text-[11px] font-semibold mb-1 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Approved Date</label>
          <Calendar value={formData[dateField] ? new Date(formData[dateField]) : null} onChange={(e) => setFormData({ ...formData, [dateField]: dateToStr(e.value) })} dateFormat="dd/mm/yy" disabled={!isFieldEditable(dateField)} className="w-full" inputClassName="p-1.5 text-xs" />
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-screen w-full ${darkMode ? 'bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-900 text-white' : 'bg-gradient-to-br from-gray-100 via-blue-50 to-gray-100 text-slate-900'} perspective-[1200px]`}>
      <Toast ref={toast} />
      <ConfirmDialog visible={confirmState.visible} onHide={() => setConfirmState(prev => ({ ...prev, visible: false }))} message={confirmState.message} header="Confirmation" icon="pi pi-exclamation-triangle" accept={confirmState.accept} />

      {hasData && (
        <>
          {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}
          <aside className={`fixed top-0 left-0 z-50 w-[260px] h-full flex flex-col justify-between transition-transform duration-500 ease-out transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${darkMode ? 'bg-white/5 backdrop-blur-2xl border-r border-white/10 shadow-[0_25px_50px_rgba(0,0,0,0.5)]' : 'bg-white/80 backdrop-blur-xl border-r border-gray-200/80 shadow-[0_25px_50px_rgba(0,0,0,0.15)]'} rounded-r-3xl overflow-hidden`}>
            <div>
              <div className="p-6 pb-8 border-b border-transparent flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00a2ff] flex items-center justify-center shadow-md text-white"><Grid size={20} /></div>
                  <div><h1 className="text-xl font-extrabold tracking-tight leading-none">PMA</h1><p className={`text-[11px] font-medium mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Dashboard Panel</p></div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400">✕</button>
              </div>
              <div className="px-4 flex flex-col gap-2 mt-4">
                <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" active={false} />
                <NavItem icon={Database} label="All Entries" path="/tracker" active={true} />
                {isAdmin && <NavItem icon={Users} label="Users" path="/users" active={false} />}
              </div>
            </div>
            <div className="p-4">
              <div className={`p-4 rounded-2xl mb-3 border ${darkMode ? 'bg-white/5 backdrop-blur-md border-white/10 shadow-lg' : 'bg-white/60 backdrop-blur-md border-gray-200/80 shadow-md'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0080ff] text-white flex items-center justify-center font-bold text-lg">{user?.name?.charAt(0).toUpperCase() || 'A'}</div>
                  <div><p className="font-bold text-sm leading-tight">{user?.name || 'Admin'}</p><p className={`text-xs capitalize ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.role || 'Admin'}</p></div>
                </div>
              </div>
              <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-bold bg-[#f14646] text-white hover:bg-red-600 shadow-md"><LogOut size={18} /> Logout</button>
            </div>
          </aside>
        </>
      )}

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="px-2 md:px-4 pt-2 pb-0 shrink-0">
          <Toolbar left={toolbarLeft} right={toolbarRight} className={`rounded-xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${darkMode ? 'bg-[#1e293b]' : 'bg-white'}`} />
        </div>
        <div className="flex-1 px-2 md:px-4 pb-2 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
          <div className={`transition-all duration-300 rounded-2xl overflow-hidden flex-1 flex flex-col border ${darkMode ? 'bg-slate-800/80 backdrop-blur-md border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.6)]' : 'bg-white/80 backdrop-blur-md border-gray-200/80 shadow-[0_20px_60px_rgba(0,0,0,0.1)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.15)]'} transform-gpu`}>
            <DataTable
              value={displayData}
              selection={selectedRows}
              onSelectionChange={(e) => setSelectedRows(e.value)}
              paginator rows={15} rowsPerPageOptions={[15, 30, 50]}
              filterDisplay="row" scrollable scrollHeight="flex"
              showGridlines resizableColumns columnResizeMode="expand"
              loading={loading} emptyMessage="No entries found."
              className={`p-datatable-sm p-datatable-gridlines whitespace-nowrap ${darkMode ? 'custom-dark-table' : ''}`}
              dataKey="_id" tableStyle={{ minWidth: '120rem' }} style={{ height: '100%' }}
              rowClassName={rowClassName}
            >
              {visibleColumns.map(col => {
                if (col.field === 'selection') return <Column key="sel" selectionMode="multiple" frozen alignFrozen="left" style={col.style} />;
                if (col.field === 'actions') return <Column key="act" body={actionBodyTemplate} header="Edit" frozen alignFrozen="right" style={col.style} />;
                const headerContent = renderHeader(col);
                return (
                  <Column
                    key={col.field}
                    field={col.field}
                    header={headerContent}
                    sortable
                    filter={col.filter}
                    filterPlaceholder={col.filterPlaceholder}
                    dataType={col.dataType}
                    body={col.isStatus ? createStatusBody(col.field) : createClickableBody(col.field, col.isDate)}
                    frozen={col.frozen}
                    alignFrozen={col.frozen ? 'left' : undefined}
                    style={{ ...col.style, ...columnStyle(col.field) }}
                    filterElement={col.filterElement}
                    filterFunction={col.filterFunction}
                  />
                );
              })}
            </DataTable>
          </div>
        </div>
      </main>

      {/* ======================== BULK UPDATE DIALOG (with Tabs) ======================== */}
      <Dialog
        visible={bulkDialogVisible}
        header="Bulk Update"
        style={{ width: '650px' }}
        className={`rounded-2xl ${darkMode ? '!bg-slate-900/80 !backdrop-blur-xl !border !border-white/10 !shadow-[0_30px_60px_rgba(0,0,0,0.7)]' : '!bg-white/90 !backdrop-blur-xl !shadow-[0_20px_50px_rgba(0,0,0,0.2)]'}`}
        onHide={() => { setBulkDialogVisible(false); setBulkUpdateField(''); setBulkUpdateValue(''); setBulkExcelFile(null); }}
      >
        <TabView activeIndex={bulkTab === 'quick' ? 0 : 1} onTabChange={(e) => setBulkTab(e.index === 0 ? 'quick' : 'excel')}>
          {/* ---------- QUICK UPDATE TAB ---------- */}
          <TabPanel header="Quick Update">
            <div className="space-y-4 mt-2">
              <p className="text-sm opacity-80">
                {selectedRows.length > 0
                  ? `You have selected ${selectedRows.length} records.`
                  : 'Select rows in the main table first, or use catalog filter below.'}
              </p>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Field</label>
                <Dropdown
                  value={bulkUpdateField}
                  options={bulkFieldOptions}
                  onChange={(e) => { setBulkUpdateField(e.value); setBulkUpdateValue(''); }}
                  placeholder="Choose a field"
                  className="w-full"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                  {getFieldType(bulkUpdateField) === 'date' ? 'Date' : getFieldType(bulkUpdateField) === 'status' ? 'Status' : 'Value'}
                </label>
                {getFieldType(bulkUpdateField) === 'date' ? (
                  <Calendar
                    value={bulkUpdateValue ? new Date(bulkUpdateValue) : null}
                    onChange={(e) => setBulkUpdateValue(dateToStr(e.value))}
                    dateFormat="dd/mm/yy"
                    showIcon
                    className="w-full"
                    inputClassName={`p-2 text-sm rounded-lg ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'border-gray-300'}`}
                  />
                ) : getFieldType(bulkUpdateField) === 'status' ? (
                  <Dropdown
                    value={bulkUpdateValue || ''}
                    options={statusOptions}
                    onChange={(e) => setBulkUpdateValue(e.value)}
                    placeholder="Select status"
                    className="w-full"
                  />
                ) : (
                  <InputText
                    value={bulkUpdateValue}
                    onChange={(e) => setBulkUpdateValue(e.target.value)}
                    placeholder="Enter value"
                    className={`w-full p-2 text-sm rounded-lg ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'border-gray-300'}`}
                  />
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setBulkDialogVisible(false); setBulkUpdateField(''); setBulkUpdateValue(''); }}
                  className="w-1/2 border py-2.5 rounded-xl font-bold transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkPreview}
                  disabled={!bulkUpdateField || !bulkUpdateValue || selectedRows.length === 0}
                  className="w-1/2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold shadow-lg transition-all"
                >
                  Preview Changes
                </button>
              </div>
            </div>
          </TabPanel>

          {/* ---------- EXCEL UPLOAD TAB ---------- */}
          <TabPanel header="Excel Upload">
            <div className="space-y-4 mt-2">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Catalog (optional)</label>
                <Dropdown
                  value={bulkCatalogForExcel}
                  options={catalogOptions}
                  onChange={(e) => setBulkCatalogForExcel(e.value)}
                  placeholder="All Catalogs"
                  showClear
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadBulkTemplate}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  <Download size={14} /> Download Template
                </button>
                <button
                  onClick={() => document.getElementById('bulkExcelInput')?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  <Upload size={14} /> Choose File
                </button>
                <input
                  id="bulkExcelInput"
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => {
                    setBulkExcelFile(e.target.files[0]);
                    toast.current.show({ severity: 'info', summary: 'File selected', detail: e.target.files[0]?.name, life: 2000 });
                  }}
                />
              </div>
              {bulkExcelFile && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="truncate">{bulkExcelFile.name}</span>
                  <button
                    onClick={() => setBulkExcelFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              )}
              <button
                onClick={handleBulkExcelUpload}
                disabled={!bulkExcelFile || bulkExcelImporting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold shadow-lg transition-all"
              >
                {bulkExcelImporting ? 'Processing...' : 'Upload & Preview'}
              </button>
            </div>
          </TabPanel>
        </TabView>
      </Dialog>

      {/* ======================== PREVIEW DIALOG (Quick Update) ======================== */}
      <Dialog
        visible={bulkPreviewVisible}
        header="Confirm Bulk Updates – Quick"
        style={{ width: '90%', maxWidth: '1200px' }}
        className={`rounded-2xl ${darkMode ? '!bg-slate-900/80 !backdrop-blur-xl !border !border-white/10 !shadow-[0_30px_60px_rgba(0,0,0,0.7)]' : '!bg-white/90 !backdrop-blur-xl !shadow-[0_20px_50px_rgba(0,0,0,0.2)]'}`}
        onHide={() => setBulkPreviewVisible(false)}
      >
        <div className="mt-2">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm">
              <span className="font-bold">{bulkPreviewRows.filter(r => r.checked).length}</span> of {bulkPreviewRows.length} rows selected.
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                inputId="selectAllPreview"
                checked={bulkPreviewRows.every(r => r.checked)}
                onChange={(e) => {
                  const checked = e.checked;
                  setBulkPreviewRows(prev => prev.map(r => ({ ...r, checked })));
                }}
              />
              <label htmlFor="selectAllPreview" className="text-sm">Select All</label>
            </div>
          </div>

          <DataTable
            value={bulkPreviewRows}
            paginator={bulkPreviewRows.length > 20}
            rows={20}
            scrollable
            scrollHeight="500px"
            className="text-sm"
          >
            <Column
              header="Apply"
              body={(rowData) => (
                <Checkbox
                  checked={rowData.checked}
                  onChange={(e) => {
                    const val = e.checked;
                    setBulkPreviewRows(prev => prev.map(r =>
                      r.styleNo === rowData.styleNo ? { ...r, checked: val } : r
                    ));
                  }}
                />
              )}
              style={{ width: '70px' }}
            />
            <Column field="styleNo" header="Style No." frozen style={{ minWidth: '140px' }} />
            <Column field="catNo" header="CAT NO" style={{ minWidth: '120px' }} />
            <Column
              header="Old Value"
              body={(row) => {
                const val = row.oldValue;
                return getFieldType(bulkUpdateField) === 'date' ? formatDate(val) : String(val ?? '-');
              }}
            />
            <Column
              header="New Value"
              body={(row) => {
                const val = row.newValue;
                return getFieldType(bulkUpdateField) === 'date' ? formatDate(val) : String(val ?? '-');
              }}
            />
          </DataTable>

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setBulkPreviewVisible(false)} className="px-4 py-2 border rounded">Cancel</button>
            <button
              onClick={handleBulkApplyQuick}
              disabled={bulkPreviewRows.filter(r => r.checked).length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Apply Selected
            </button>
          </div>
        </div>
      </Dialog>

      {/* ======================== PREVIEW DIALOG (Excel Upload) ======================== */}
      <Dialog
        visible={bulkExcelPreviewVisible}
        header="Confirm Bulk Updates – Excel"
        style={{ width: '95%', maxWidth: '1400px' }}
        className={`rounded-2xl ${darkMode ? '!bg-slate-900/80 !backdrop-blur-xl !border !border-white/10 !shadow-[0_30px_60px_rgba(0,0,0,0.7)]' : '!bg-white/90 !backdrop-blur-xl !shadow-[0_20px_50px_rgba(0,0,0,0.2)]'}`}
        onHide={() => { setBulkExcelPreviewVisible(false); setBulkExcelPreviewData([]); }}
      >
        <div className="mt-2">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm">
              <span className="font-bold">{bulkExcelPreviewData.filter(r => r.checked).length}</span> of {bulkExcelPreviewData.length} rows selected.
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                inputId="selectAllExcelPreview"
                checked={bulkExcelPreviewData.every(r => r.checked)}
                onChange={(e) => {
                  const checked = e.checked;
                  setBulkExcelPreviewData(prev => prev.map(r => ({ ...r, checked })));
                }}
              />
              <label htmlFor="selectAllExcelPreview" className="text-sm">Select All</label>
            </div>
          </div>

          <DataTable
            value={bulkExcelPreviewData}
            paginator={bulkExcelPreviewData.length > 20}
            rows={20}
            scrollable
            scrollHeight="600px"
            className="text-sm"
          >
            <Column
              header="Apply"
              body={(rowData) => (
                <Checkbox
                  checked={rowData.checked}
                  onChange={(e) => {
                    const val = e.checked;
                    setBulkExcelPreviewData(prev => prev.map(r =>
                      r.styleNo === rowData.styleNo ? { ...r, checked: val } : r
                    ));
                  }}
                />
              )}
              style={{ width: '70px' }}
            />
            <Column field="styleNo" header="Style No." frozen style={{ minWidth: '140px' }} />
            <Column field="catNo" header="CAT NO" style={{ minWidth: '120px' }} />
            {(() => {
              // Collect all fields that have changes across all rows
              const allFields = new Set();
              bulkExcelPreviewData.forEach(row => {
                if (row.changes) Object.keys(row.changes).forEach(f => allFields.add(f));
              });
              return Array.from(allFields).map(field => (
                <Column
                  key={field}
                  header={makeLabel(field)}
                  body={(row) => {
                    if (!row.changes || !row.changes[field]) return <span className="text-gray-400">-</span>;
                    const change = row.changes[field];
                    const oldVal = change.old ?? '-';
                    const newVal = change.new ?? '-';
                    const isDate = allDateFields.includes(field);
                    return (
                      <div className="flex flex-col">
                        <span className="text-red-500 line-through text-xs">{isDate ? formatDate(oldVal) : String(oldVal)}</span>
                        <span className="text-green-500 font-semibold text-sm">{isDate ? formatDate(newVal) : String(newVal)}</span>
                      </div>
                    );
                  }}
                  style={{ minWidth: '120px' }}
                />
              ));
            })()}
          </DataTable>

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => { setBulkExcelPreviewVisible(false); setBulkExcelPreviewData([]); }} className="px-4 py-2 border rounded">Cancel</button>
            <button
              onClick={handleBulkExcelApply}
              disabled={bulkExcelPreviewData.filter(r => r.checked).length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Apply Selected
            </button>
          </div>
        </div>
      </Dialog>

      {/* Rename Column Dialog */}
      <Dialog visible={renameDialog} style={{ width: '400px' }} header="Rename Column" modal 
        className={`rounded-2xl ${darkMode ? '!bg-slate-900/80 !backdrop-blur-xl !border !border-white/10 !shadow-[0_30px_60px_rgba(0,0,0,0.7)]' : '!bg-white/90 !backdrop-blur-xl !shadow-[0_20px_50px_rgba(0,0,0,0.2)]'}`}
        onHide={() => setRenameDialog(false)}>
        <div className="mt-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Select Column</label>
            <Dropdown value={colToRename} options={customCols.map(c => ({ label: c.toUpperCase(), value: c }))} onChange={(e) => setColToRename(e.value)} placeholder="Select a Column" className="w-full" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>New Name</label>
            <InputText value={renamedColName} onChange={(e) => setRenamedColName(e.target.value)} placeholder="Enter new name" className={`w-full ${darkMode ? 'bg-white/5 border-white/10 text-white' : ''}`} onKeyDown={(e) => e.key === 'Enter' && handleRenameColumn()} />
          </div>
          <button onClick={handleRenameColumn} disabled={!colToRename || !renamedColName} className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-lg transition-all">Rename Column</button>
        </div>
      </Dialog>

      <OverlayPanel ref={op} className={`shadow-2xl rounded-2xl ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`} style={{ maxWidth: '550px' }}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-3 gap-4 flex-wrap">
            <h4 className={`text-lg font-bold ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`}>📜 History Log</h4>
            <div className="flex gap-2">
              {isAdmin && cellHistory.length > 0 && (
                <>
                  {selectedHistoryItems.length > 0 && (
                    <button onClick={handleDeleteSelectedHistory} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-red-600">
                      Delete Selected ({selectedHistoryItems.length})
                    </button>
                  )}
                  <button onClick={handleClearAllHistory} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>
          {cellHistory.length === 0 ? (
            <p className="text-gray-400 text-sm">No changes recorded yet.</p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className={`sticky top-0 ${darkMode ? 'bg-[#1e293b] text-gray-400' : 'bg-slate-50 text-slate-500'}`}>
                  <tr>
                    {isAdmin && <th className="p-2 w-8">✔</th>}
                    <th className="p-2">Old Value</th>
                    <th className="p-2">New Value</th>
                    <th className="p-2">Changed By</th>
                    <th className="p-2">Changed Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {cellHistory.map((h, idx) => (
                    <tr key={idx} className={selectedHistoryItems.includes(h._id) ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50') : ''}>
                      {isAdmin && (
                        <td className="p-2">
                          <input type="checkbox" checked={selectedHistoryItems.includes(h._id)} onChange={(e) => { if (e.target.checked) { setSelectedHistoryItems(prev => [...prev, h._id]); } else { setSelectedHistoryItems(prev => prev.filter(id => id !== h._id)); } }} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </td>
                      )}
                      <td className="p-2">{h.oldValue ? formatDate(h.oldValue) : '-'}</td>
                      <td className={`p-2 font-medium ${darkMode ? 'text-white' : 'text-blue-600'}`}>{h.newValue ? formatDate(h.newValue) : '-'}</td>
                      <td className="p-2 text-xs">{h.changedBy?.name || 'N/A'}</td>
                      <td className="p-2 text-xs text-gray-500 whitespace-nowrap">
                        {(h.changedAt || h.date)
                          ? `${formatDate(h.changedAt || h.date)} ${new Date(h.changedAt || h.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </OverlayPanel>

      <Dialog visible={formDialog} style={{ width: '950px' }} header={isEditing ? 'Edit Record' : 'New Record'} modal footer={dialogFooter} 
        className={`rounded-2xl ${darkMode ? '!bg-slate-900/80 !backdrop-blur-xl !border !border-white/10 !shadow-[0_30px_60px_rgba(0,0,0,0.7)]' : '!bg-white/90 !backdrop-blur-xl !shadow-[0_20px_50px_rgba(0,0,0,0.2)]'}`}
        onHide={hideDialog}>
        <TabView className="mt-2">
          <TabPanel header="Basic Details" className={`${darkMode ? 'bg-white/5 backdrop-blur-sm rounded-xl p-2' : 'bg-white/80 backdrop-blur-sm rounded-xl p-2'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>CAT NO</label>
                <InputText value={formData.catNo || ''} onChange={(e) => setFormData({ ...formData, catNo: e.target.value })} disabled={!isFieldEditable('catNo')} className={`w-full p-2 text-sm rounded-lg ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'border-gray-300'}`} />
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Style No. *</label>
                <InputText value={formData.styleNo || ''} onChange={(e) => setFormData({ ...formData, styleNo: e.target.value })} disabled={!isFieldEditable('styleNo')} className={`w-full p-2 text-sm rounded-lg ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'border-gray-300'}`} />
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Style Name</label>
                <InputText value={formData.styleName || ''} onChange={(e) => setFormData({ ...formData, styleName: e.target.value })} disabled={!isFieldEditable('styleName')} className={`w-full p-2 text-sm rounded-lg ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'border-gray-300'}`} />
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Factory FOB</label>
                <Calendar value={formData.factoryFOB ? new Date(formData.factoryFOB) : null} onChange={(e) => setFormData({ ...formData, factoryFOB: dateToStr(e.value) })} disabled={!isFieldEditable('factoryFOB')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field md:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Remark</label>
                <InputTextarea value={formData.remark || ''} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={3} autoResize disabled={!isFieldEditable('remark')} className={`w-full p-2 text-sm rounded-lg ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'border-gray-300'}`} />
              </div>
            </div>
          </TabPanel>
          <TabPanel header="Labdip & Photo" className={`${darkMode ? 'bg-white/5 backdrop-blur-sm rounded-xl p-2' : 'bg-white/80 backdrop-blur-sm rounded-xl p-2'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
              <div className="field md:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>PhotoShoot Date</label>
                <Calendar value={formData.vendorPhotoShootDate ? new Date(formData.vendorPhotoShootDate) : null} onChange={(e) => setFormData({ ...formData, vendorPhotoShootDate: dateToStr(e.value) })} disabled={!isFieldEditable('vendorPhotoShootDate')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Labdip Due Date</label>
                <Calendar value={formData.labdipQualityDeskloomDue ? new Date(formData.labdipQualityDeskloomDue) : null} onChange={(e) => setFormData({ ...formData, labdipQualityDeskloomDue: dateToStr(e.value) })} disabled={!isFieldEditable('labdipQualityDeskloomDue')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Labdip Planned Date</label>
                <Calendar value={formData.labdipPlannedDate ? new Date(formData.labdipPlannedDate) : null} onChange={(e) => setFormData({ ...formData, labdipPlannedDate: dateToStr(e.value) })} disabled={!isFieldEditable('labdipPlannedDate')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Labdip Status</label>
                <Dropdown value={formData.labdipPlannedStatus || 'Pending'} options={statusOptions} onChange={(e) => setFormData({ ...formData, labdipPlannedStatus: e.value })} disabled={!isFieldEditable('labdipPlannedStatus')} className="w-full" placeholder="Select Status" />
                {renderApprovalFields('labdipPlannedStatus', 'labdipApprovedBy', 'labdipApprovedDate')}
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Fab in house Planned Date</label>
                <Calendar value={formData.fabInHousePlannedDate ? new Date(formData.fabInHousePlannedDate) : null} onChange={(e) => setFormData({ ...formData, fabInHousePlannedDate: dateToStr(e.value) })} disabled={!isFieldEditable('fabInHousePlannedDate')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>Photo Sample Due Date</label>
                <Calendar value={formData.photoSampleDue ? new Date(formData.photoSampleDue) : null} onChange={(e) => setFormData({ ...formData, photoSampleDue: dateToStr(e.value) })} disabled={!isFieldEditable('photoSampleDue')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Photo Sample Planned Date</label>
                <Calendar value={formData.photoSamplePlannedDate ? new Date(formData.photoSamplePlannedDate) : null} onChange={(e) => setFormData({ ...formData, photoSamplePlannedDate: dateToStr(e.value) })} disabled={!isFieldEditable('photoSamplePlannedDate')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Photo Sample Status</label>
                <Dropdown value={formData.photoSamplePlannedStatus || 'Pending'} options={statusOptions} onChange={(e) => setFormData({ ...formData, photoSamplePlannedStatus: e.value })} disabled={!isFieldEditable('photoSamplePlannedStatus')} className="w-full" placeholder="Select Status" />
                {renderApprovalFields('photoSamplePlannedStatus', 'photoSampleApprovedBy', 'photoSampleApprovedDate')}
              </div>
            </div>
          </TabPanel>
          <TabPanel header="FPT, GPT & GSM" className={`${darkMode ? 'bg-white/5 backdrop-blur-sm rounded-xl p-2' : 'bg-white/80 backdrop-blur-sm rounded-xl p-2'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>FPT Due Date</label>
                <Calendar value={formData.fptDueDate ? new Date(formData.fptDueDate) : null} onChange={(e) => setFormData({ ...formData, fptDueDate: dateToStr(e.value) })} disabled={!isFieldEditable('fptDueDate')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>GPT Due Date</label>
                <Calendar value={formData.gptDueDate ? new Date(formData.gptDueDate) : null} onChange={(e) => setFormData({ ...formData, gptDueDate: dateToStr(e.value) })} disabled={!isFieldEditable('gptDueDate')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Planned FPT Date</label>
                <Calendar value={formData.plannedFPT ? new Date(formData.plannedFPT) : null} onChange={(e) => setFormData({ ...formData, plannedFPT: dateToStr(e.value) })} disabled={!isFieldEditable('plannedFPT')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>FPT Status</label>
                <Dropdown value={formData.plannedFPTStatus || 'Pending'} options={statusOptions} onChange={(e) => setFormData({ ...formData, plannedFPTStatus: e.value })} disabled={!isFieldEditable('plannedFPTStatus')} className="w-full" placeholder="Select Status" />
                {renderApprovalFields('plannedFPTStatus', 'plannedFPTApprovedBy', 'plannedFPTApprovedDate')}
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Planned GPT Date</label>
                <Calendar value={formData.plannedGPT ? new Date(formData.plannedGPT) : null} onChange={(e) => setFormData({ ...formData, plannedGPT: dateToStr(e.value) })} disabled={!isFieldEditable('plannedGPT')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>GPT Status</label>
                <Dropdown value={formData.plannedGPTStatus || 'Pending'} options={statusOptions} onChange={(e) => setFormData({ ...formData, plannedGPTStatus: e.value })} disabled={!isFieldEditable('plannedGPTStatus')} className="w-full" placeholder="Select Status" />
                {renderApprovalFields('plannedGPTStatus', 'plannedGPTApprovedBy', 'plannedGPTApprovedDate')}
              </div>
              <div className="field">
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>GSM/Color Due Date</label>
                <Calendar value={formData.gsmColorLotsDue ? new Date(formData.gsmColorLotsDue) : null} onChange={(e) => setFormData({ ...formData, gsmColorLotsDue: dateToStr(e.value) })} disabled={!isFieldEditable('gsmColorLotsDue')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>GSM/Color Planned Date</label>
                <Calendar value={formData.gsmColorLotsPlanned ? new Date(formData.gsmColorLotsPlanned) : null} onChange={(e) => setFormData({ ...formData, gsmColorLotsPlanned: dateToStr(e.value) })} disabled={!isFieldEditable('gsmColorLotsPlanned')} dateFormat="dd/mm/yy" className="w-full" inputClassName="p-2 text-sm rounded-lg" showIcon />
              </div>
              <div className="field">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>GSM/Color Status</label>
                <Dropdown value={formData.gsmColorLotsPlannedStatus || 'Pending'} options={statusOptions} onChange={(e) => setFormData({ ...formData, gsmColorLotsPlannedStatus: e.value })} disabled={!isFieldEditable('gsmColorLotsPlannedStatus')} className="w-full" placeholder="Select Status" />
                {renderApprovalFields('gsmColorLotsPlannedStatus', 'gsmColorLotsApprovedBy', 'gsmColorLotsApprovedDate')}
              </div>
            </div>
          </TabPanel>
        </TabView>
      </Dialog>

      {/* Import Dialog */}
      <Dialog visible={importDialog} onHide={() => { setImportDialog(false); setImportFile(null); }} header="Import Excel" modal style={{ width: '450px' }} 
        className={`rounded-2xl ${darkMode ? '!bg-slate-900/80 !backdrop-blur-xl !border !border-white/10 !shadow-[0_30px_60px_rgba(0,0,0,0.7)]' : '!bg-white/90 !backdrop-blur-xl !shadow-[0_20px_50px_rgba(0,0,0,0.2)]'}`}>
        <div className="mt-4 space-y-4">
          <p className="text-sm">Columns expected: <b>CAT NO, Style No., Style Name, Factory FOB, Photoshoot date, Labdip Due Date, Photo Sample Due Date, FPT Due Date, GPT Due Date, GSM/Color Due Date</b></p>
          <div className="flex gap-2 mb-2">
            <button onClick={downloadImportTemplate} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition">
              <Download size={14} /> Download Template
            </button>
          </div>
          <input type="file" accept=".xlsx" onChange={(e) => setImportFile(e.target.files[0])} className="w-full p-2 border rounded" />
          <div className="flex justify-end gap-3">
            <button onClick={() => { setImportDialog(false); setImportFile(null); }} className="px-4 py-2 rounded border">Cancel</button>
            <button onClick={handleParseFile} disabled={!importFile || importing} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{importing ? 'Reading...' : 'Next'}</button>
          </div>
        </div>
      </Dialog>

      <Dialog visible={showPreview} onHide={() => { setShowPreview(false); setPreviewEntries([]); }} header="Preview Import" modal style={{ width: '95%', maxWidth: '1100px' }} 
        className={`rounded-2xl ${darkMode ? '!bg-slate-900/80 !backdrop-blur-xl !border !border-white/10 !shadow-[0_30px_60px_rgba(0,0,0,0.7)]' : '!bg-white/90 !backdrop-blur-xl !shadow-[0_20px_50px_rgba(0,0,0,0.2)]'}`}>
        <div className="mt-4">
          <div className="flex gap-4 mb-4">
            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-white/5' : 'bg-blue-50'}`}>
              <div className="text-sm">Total Rows</div>
              <div className="text-2xl font-bold">{previewEntries.length}</div>
            </div>
            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-white/5' : 'bg-green-50'}`}>
              <div className="text-sm">Unique Catalogs</div>
              <div className="text-2xl font-bold">{new Set(previewEntries.map(e => e.catNo).filter(Boolean)).size}</div>
            </div>
            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-white/5' : 'bg-purple-50'}`}>
              <div className="text-sm">Unique Styles</div>
              <div className="text-2xl font-bold">{new Set(previewEntries.map(e => e.styleNo).filter(Boolean)).size}</div>
            </div>
          </div>
          <p className="mb-3 text-sm text-gray-500">Only rows with a valid <b>Style No.</b> will be imported.</p>
          <DataTable value={previewEntries} paginator={previewEntries.length > 20} rows={20} scrollable scrollHeight="400px">
            <Column field="catNo" header="CAT NO" style={{ minWidth: '140px' }} />
            <Column field="styleNo" header="Style No." style={{ minWidth: '140px' }} />
            <Column field="styleName" header="Style Name" style={{ minWidth: '200px' }} />
            <Column field="factoryFOB" header="Factory FOB" body={(row) => row.factoryFOB || '-'} style={{ minWidth: '120px' }} />
            <Column field="vendorPhotoShootDate" header="Photoshoot date" body={(row) => row.vendorPhotoShootDate || '-'} style={{ minWidth: '140px' }} />
            <Column field="labdipQualityDeskloomDue" header="Labdip Due" body={(row) => row.labdipQualityDeskloomDue || '-'} />
            <Column field="photoSampleDue" header="Photo Due" body={(row) => row.photoSampleDue || '-'} />
            <Column field="fptDueDate" header="FPT Due" body={(row) => row.fptDueDate || '-'} />
            <Column field="gptDueDate" header="GPT Due" body={(row) => row.gptDueDate || '-'} />
            <Column field="gsmColorLotsDue" header="GSM Due" body={(row) => row.gsmColorLotsDue || '-'} />
          </DataTable>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => { setShowPreview(false); setPreviewEntries([]); }} className="px-4 py-2 rounded border">Cancel</button>
            <button onClick={confirmImport} disabled={importing} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{importing ? 'Importing...' : 'Confirm Import'}</button>
          </div>
        </div>
      </Dialog>

      <AIChat />
    </div>
  );
};

export default TrackerPage;