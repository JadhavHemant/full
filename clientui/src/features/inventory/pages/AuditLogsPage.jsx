import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../Components/TitleBar";

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ entityType: "", entityId: "", action: "", startDate: "", endDate: "" });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [complianceData, setComplianceData] = useState([]);
  const [showCompliance, setShowCompliance] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.entityType) params.append("entityType", filters.entityType);
      if (filters.entityId) params.append("entityId", filters.entityId);
      if (filters.action) params.append("action", filters.action);
      params.append("limit", "50");

      const response = await axiosInstance.get(`/audit-logs/detailed?${params}`);
      setLogs(response.data?.data || []);
    } catch (error) {
      toast.error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.entityType) params.append("entityType", filters.entityType);

      const response = await axiosInstance.get(`/audit-logs/export?${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `audit-logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Audit logs exported");
    } catch (error) {
      toast.error("Failed to export audit logs");
    }
  };

  const fetchCompliance = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await axiosInstance.get(`/audit-logs/compliance-report?${params}`);
      setComplianceData(response.data || []);
      setShowCompliance(true);
    } catch (error) {
      toast.error("Failed to fetch compliance report");
    }
  };

  const setupAuditDetails = async () => {
    try {
      await axiosInstance.post("/audit-logs/setup-details");
      toast.success("AuditLogDetails table created. Future changes will track before/after values.");
    } catch (error) {
      toast.error("Failed to setup audit details");
    }
  };

  const getActionBadge = (action) => {
    const colors = {
      CREATE: "bg-green-100 text-green-700",
      UPDATE: "bg-blue-100 text-blue-700",
      DELETE: "bg-red-100 text-red-700",
      LOGIN: "bg-purple-100 text-purple-700",
      LOGOUT: "bg-gray-100 text-gray-700",
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[action] || "bg-gray-100 text-gray-700"}`}>{action}</span>;
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <TitleBar title="Audit Logs & Compliance" onClose={() => window.history.back()} />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
            <select value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All Types</option>
              <option value="Product">Product</option>
              <option value="PurchaseOrder">Purchase Order</option>
              <option value="SalesOrder">Sales Order</option>
              <option value="Lead">Lead</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Invoice">Invoice</option>
              <option value="User">User</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entity ID</label>
            <input type="number" value={filters.entityId} onChange={(e) => setFilters({ ...filters, entityId: e.target.value })} placeholder="ID" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
            <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleExport} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm">Export CSV</button>
          <button onClick={fetchCompliance} className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-sm">Compliance Report</button>
          <button onClick={setupAuditDetails} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm">Enable Change Tracking</button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Audit Trail ({logs.length} entries)</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No audit logs found matching your filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{new Date(log.CreatedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.EntityType} #{log.EntityId}</td>
                    <td className="px-4 py-3">{getActionBadge(log.Action)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.ActionByName || `User #${log.ActionBy}`}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{log.IPAddress || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setSelectedLog(log); setShowDetails(true); }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {log.details ? "View Changes" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <TitleBar title={`Audit Detail: ${selectedLog.Action} on ${selectedLog.EntityType} #${selectedLog.EntityId}`} onClose={() => { setShowDetails(false); setSelectedLog(null); }} />
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><span className="text-xs text-gray-500">Date:</span><p className="text-sm">{new Date(selectedLog.CreatedAt).toLocaleString()}</p></div>
                <div><span className="text-xs text-gray-500">User:</span><p className="text-sm">{selectedLog.ActionByName || `User #${selectedLog.ActionBy}`}</p></div>
                <div><span className="text-xs text-gray-500">IP:</span><p className="text-sm font-mono">{selectedLog.IPAddress || "N/A"}</p></div>
                <div><span className="text-xs text-gray-500">User Agent:</span><p className="text-sm truncate">{selectedLog.UserAgent || "N/A"}</p></div>
              </div>

              {selectedLog.details ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Changed Fields</h4>
                  {selectedLog.details.ChangedFields && selectedLog.details.ChangedFields.length > 0 ? (
                    <div className="space-y-2">
                      {selectedLog.details.ChangedFields.map((field, i) => (
                        <div key={i} className="bg-gray-50 rounded p-3 border border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-1">{field}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-red-50 p-2 rounded"><span className="text-red-600 font-medium">Before:</span> {selectedLog.details.BeforeValues?.[field] || "N/A"}</div>
                            <div className="bg-green-50 p-2 rounded"><span className="text-green-600 font-medium">After:</span> {selectedLog.details.AfterValues?.[field] || "N/A"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Change tracking not available for this entry. Click "Enable Change Tracking" to start tracking field-level changes.</p>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-sm text-yellow-700">Detailed before/after values are not available for this log entry. Click "Enable Change Tracking" above to start capturing field-level changes for future audit entries.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compliance Report Modal */}
      {showCompliance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <TitleBar title="Compliance Report" onClose={() => { setShowCompliance(false); setComplianceData([]); }} />
            <div className="p-6">
              {complianceData.length === 0 ? (
                <p className="text-gray-500 text-center">No compliance data available</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Entity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Action</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Count</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Unique Users</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {complianceData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{new Date(row.Date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm">{row.EntityType}</td>
                        <td className="px-4 py-2">{getActionBadge(row.Action)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{row.Count}</td>
                        <td className="px-4 py-2 text-sm text-right">{row.UniqueUsers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;