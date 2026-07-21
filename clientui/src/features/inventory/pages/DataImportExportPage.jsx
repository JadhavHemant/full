import React, { useState, useRef } from "react";
import { Toaster, toast } from "react-hot-toast";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import { API_BASE_URL } from "../../../Components/Endpoint/Endpoint";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  InformationCircleIcon,
  DocumentIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const ENTITIES = [
  { id: "products", label: "Products", icon: "📦" },
  { id: "customers", label: "Customers", icon: "👥" },
  { id: "suppliers", label: "Suppliers", icon: "🚚" },
  { id: "sales-orders", label: "Sales Orders", icon: "🛒" },
  { id: "purchase-orders", label: "Purchase Orders", icon: "📋" },
];

const EXPORT_FORMATS = [
  { id: "pdf", label: "PDF", icon: DocumentTextIcon, color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
  { id: "docx", label: "DOCX", icon: DocumentIcon, color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  { id: "xlsx", label: "Excel", icon: TableCellsIcon, color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" },
  { id: "csv", label: "CSV", icon: DocumentArrowDownIcon, color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
];

export default function DataImportExportPage() {
  const [activeTab, setActiveTab] = useState("export");
  const [selectedEntity, setSelectedEntity] = useState("products");
  const [importFile, setImportFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [template, setTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  // ── Export Data ──
  const handleExport = async (format) => {
    setExporting(true);
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/utils/export/${selectedEntity}/${format}`,
        { responseType: "blob" }
      );
      
      const disposition = response.headers["content-disposition"];
      let filename = `${selectedEntity}.${format}`;
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${selectedEntity} exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Export failed: " + (error.response?.data?.message || error.message));
    } finally {
      setExporting(false);
    }
  };

  // ── Bulk Export (for migration to new system) ──
  const handleBulkExport = async (format) => {
    setExporting(true);
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/utils/export/bulk/${format}`,
        { responseType: "blob" }
      );
      
      const disposition = response.headers["content-disposition"];
      let filename = `full-data-export.${format}`;
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`All data exported as ${format.toUpperCase()} for migration`);
    } catch (error) {
      toast.error("Bulk export failed: " + (error.response?.data?.message || error.message));
    } finally {
      setExporting(false);
    }
  };

  // ── Download Import Template ──
  const handleDownloadTemplate = async () => {
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/utils/export/template/${selectedEntity}`,
        { responseType: "blob" }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${selectedEntity}-import-template.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Template downloaded successfully");
    } catch (error) {
      toast.error("Failed to download template");
    }
  };

  // ── Get Import Template Info ──
  const handleGetTemplateInfo = async () => {
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/utils/import/template/${selectedEntity}`
      );
      setTemplate(response.data);
    } catch (error) {
      toast.error("Failed to get template info");
    }
  };

  // ── Preview Import File ──
  const handlePreview = async () => {
    if (!importFile) {
      toast.error("Please select a file first");
      return;
    }
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      
      const response = await axiosInstance.post(
        `${API_BASE_URL}/utils/import/preview/${selectedEntity}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      
      setPreviewData(response.data);
      setShowPreview(true);
      toast.success(`Preview loaded: ${response.data.totalRows} rows found`);
    } catch (error) {
      toast.error("Preview failed: " + (error.response?.data?.message || error.message));
    } finally {
      setImporting(false);
    }
  };

  // ── Import Data ──
  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a file first");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to import ${importFile.name} into ${selectedEntity}?`)) return;
    
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      
      const response = await axiosInstance.post(
        `${API_BASE_URL}/utils/import/${selectedEntity}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      
      setImportResult(response.data.details);
      toast.success(response.data.message);
    } catch (error) {
      toast.error("Import failed: " + (error.response?.data?.message || error.message));
      setImportResult(error.response?.data?.details || { errors: [error.message] });
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
      setPreviewData(null);
      setShowPreview(false);
      setImportResult(null);
    }
  };

  const entity = ENTITIES.find((e) => e.id === selectedEntity);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Import & Export</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import/export data for migration, backup, or bulk operations. Supports PDF, DOCX, XLSX, CSV formats.
        </p>
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            <strong>Auto-Population:</strong> When importing, the system automatically maps column headers, 
            looks up reference data (e.g., CategoryName → CategoryId), and calculates fields like GrandTotal. 
            Required fields are validated before import.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("export")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "export"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Export Data
        </button>
        <button
          onClick={() => setActiveTab("import")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "import"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <ArrowUpTrayIcon className="h-5 w-5" />
          Import Data
        </button>
        <button
          onClick={() => setActiveTab("migration")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "migration"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <ClipboardDocumentIcon className="h-5 w-5" />
          System Migration
        </button>
      </div>

      {/* ── EXPORT TAB ── */}
      {activeTab === "export" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Entity Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Data to Export</h3>
              <div className="space-y-2">
                {ENTITIES.map((ent) => (
                  <button
                    key={ent.id}
                    onClick={() => setSelectedEntity(ent.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition border ${
                      selectedEntity === ent.id
                        ? "bg-orange-50 border-orange-300 text-orange-700"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span className="mr-2">{ent.icon}</span>
                    {ent.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Export {entity?.label || "Data"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Choose a format to export your data as a downloadable file
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {EXPORT_FORMATS.map((fmt) => {
                  const Icon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => handleExport(fmt.id)}
                      disabled={exporting}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${fmt.color} ${
                        exporting ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Icon className="h-8 w-8" />
                      <span className="text-sm font-semibold">{fmt.label}</span>
                      <span className="text-xs opacity-70">Export</span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                >
                  <TableCellsIcon className="h-5 w-5" />
                  Download Import Template (.xlsx) for {entity?.label}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Get a pre-formatted Excel template with headers, auto-population hints, and required field markers
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT TAB ── */}
      {activeTab === "import" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Entity & File Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Import Into</h3>
              <div className="space-y-2">
                {ENTITIES.map((ent) => (
                  <button
                    key={ent.id}
                    onClick={() => { setSelectedEntity(ent.id); handleGetTemplateInfo(); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition border ${
                      selectedEntity === ent.id
                        ? "bg-orange-50 border-orange-300 text-orange-700"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span className="mr-2">{ent.icon}</span>
                    {ent.label}
                  </button>
                ))}
              </div>
              
              {template && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Template Info</h4>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Fields:</strong> {template.headers?.length}</p>
                    <p><strong>Required:</strong> {template.requiredFields?.join(", ")}</p>
                    {template.autoCalculations?.map((calc, i) => (
                      <p key={i} className="text-blue-600">{calc.description}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Import Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Import {entity?.label}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a CSV, Excel (.xlsx), JSON, or DOCX file. The system will auto-map columns and validate data.
              </p>

              {/* File Upload */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  importFile ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-orange-300"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) setImportFile(file);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".csv,.xlsx,.xls,.json,.docx,.pdf"
                  className="hidden"
                />
                
                {importFile ? (
                  <div>
                    <DocumentArrowDownIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">{importFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(importFile.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={() => { fileInputRef.current?.click(); }}
                      className="mt-2 text-sm text-orange-600 hover:text-orange-700"
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <div>
                    <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Drag & drop a file here, or{" "}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Supported: CSV, Excel, JSON, DOCX, PDF
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {importFile && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handlePreview}
                    disabled={importing}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    <EyeIcon className="h-4 w-4" />
                    Preview
                  </button>
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    <TableCellsIcon className="h-4 w-4" />
                    Template
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Importing...
                      </>
                    ) : (
                      <>
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        Import Data
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Auto-Population Info */}
              {template && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-1">
                    <InformationCircleIcon className="h-4 w-4" />
                    Auto-Population & Validation Rules
                  </h4>
                  <ul className="mt-2 text-xs text-blue-700 space-y-1">
                    <li>• <strong>Column Mapping:</strong> Headers in your file are auto-matched to database fields</li>
                    <li>• <strong>Lookup Fields:</strong> Names (e.g., CategoryName) auto-resolve to IDs</li>
                    {template.autoCalculations?.map((calc, i) => (
                      <li key={i}>• <strong>{calc.target}:</strong> {calc.description}</li>
                    ))}
                    <li>• <strong>Defaults:</strong> Missing optional fields get default values automatically</li>
                    <li>• <strong>Duplicates:</strong> Existing records (by unique key) are updated instead of duplicated</li>
                  </ul>
                </div>
              )}

              {/* Preview */}
              {showPreview && previewData && (
                <div className="mt-6 border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Preview: {previewData.totalRows} rows (showing first {previewData.preview?.length})
                    </h4>
                    <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          {previewData.preview?.[0]?.data && Object.keys(previewData.preview[0].data).map((key) => (
                            <th key={key} className="px-3 py-2 text-left font-medium text-gray-600">{key}</th>
                          ))}
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewData.preview?.map((row) => (
                          <tr key={row.rowNumber} className={row.issues?.length > 0 ? "bg-red-50" : "hover:bg-gray-50"}>
                            <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                            {Object.values(row.data).map((val, i) => (
                              <td key={i} className="px-3 py-2 text-gray-900 max-w-[150px] truncate">{String(val ?? '')}</td>
                            ))}
                            <td className="px-3 py-2">
                              {row.issues?.length > 0 ? (
                                <span className="text-red-600 font-medium" title={row.issues.join(", ")}>
                                  ⚠ Issues
                                </span>
                              ) : (
                                <span className="text-green-600 font-medium">✓ Valid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Result */}
              {importResult && (
                <div className={`mt-6 p-4 rounded-lg border ${
                  importResult.errors?.length > 0
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-green-50 border-green-200"
                }`}>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    Import Results
                  </h4>
                  <div className="text-sm space-y-1">
                    <p className="text-green-700">✅ Imported: {importResult.imported || 0}</p>
                    <p className="text-yellow-700">⚠ Skipped: {importResult.skipped || 0}</p>
                    {importResult.errors?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-600 font-medium">Errors:</p>
                        <ul className="list-disc pl-5 text-xs text-red-600 space-y-1 mt-1">
                          {importResult.errors.slice(0, 10).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {importResult.errors.length > 10 && (
                            <li>... and {importResult.errors.length - 10} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MIGRATION TAB ── */}
      {activeTab === "migration" && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <ClipboardDocumentIcon className="h-8 w-8 text-orange-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">System Migration</h3>
                <p className="text-sm text-gray-500">
                  Export all your data for migration to a new system. New users can import this data to get started quickly.
                </p>
              </div>
            </div>

            {/* Auto-Population Explanation */}
            <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg mb-6">
              <h4 className="text-sm font-semibold text-orange-800 mb-2">📋 Auto-Population for New Users</h4>
              <p className="text-sm text-orange-700">
                When a new user joins, export your complete system data using the options below. 
                They can then import the generated file into their new system. The import process will:
              </p>
              <ul className="mt-2 text-sm text-orange-700 space-y-1 list-disc pl-5">
                <li>Auto-map columns from the file to database fields</li>
                <li>Look up reference data (e.g., Category names → IDs)</li>
                <li>Auto-calculate fields like totals and order numbers</li>
                <li>Set default values for missing optional fields</li>
                <li>Skip or update existing records to avoid duplicates</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PDF Export */}
              <div className="p-4 border rounded-lg hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-3">
                  <DocumentTextIcon className="h-8 w-8 text-red-500" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Export as PDF</h4>
                    <p className="text-xs text-gray-500">Combined document with all entities</p>
                  </div>
                </div>
                <button
                  onClick={() => handleBulkExport("pdf")}
                  disabled={exporting}
                  className="w-full px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition"
                >
                  {exporting ? "Exporting..." : "Download PDF"}
                </button>
              </div>

              {/* Excel Export */}
              <div className="p-4 border rounded-lg hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-3">
                  <TableCellsIcon className="h-8 w-8 text-green-500" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Export as Excel</h4>
                    <p className="text-xs text-gray-500">Multi-sheet workbook for all entities</p>
                  </div>
                </div>
                <button
                  onClick={() => handleBulkExport("xlsx")}
                  disabled={exporting}
                  className="w-full px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 disabled:opacity-50 transition"
                >
                  {exporting ? "Exporting..." : "Download Excel"}
                </button>
              </div>
            </div>

            {/* Per-Entity Download */}
            <div className="mt-6 border-t pt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Or Download Individual Entity Data</h4>
              <div className="space-y-2">
                {ENTITIES.map((ent) => (
                  <div key={ent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      <span className="mr-2">{ent.icon}</span>
                      {ent.label}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedEntity(ent.id); handleExport("pdf"); }}
                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-medium hover:bg-red-100"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => { setSelectedEntity(ent.id); handleExport("docx"); }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs font-medium hover:bg-blue-100"
                      >
                        DOCX
                      </button>
                      <button
                        onClick={() => { setSelectedEntity(ent.id); handleExport("xlsx"); }}
                        className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded text-xs font-medium hover:bg-green-100"
                      >
                        XLSX
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}