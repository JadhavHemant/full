import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../Components/TitleBar";

/**
 * Generic Inventory Workspace component for ERP sub-modules
 * (Finance, Sales, Production, Approvals, etc.)
 */
const InventoryWorkspace = ({
  title,
  description,
  icon: Icon,
  endpoint,
  columns,
  fieldConfig,
  statusOptions,
  enableCreate = true,
  enableStatusUpdate = true,
  enableDelete = true,
  enableApproveReject = false,
  actions = [],
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!endpoint?.BASE) {
        setData([]);
        return;
      }
      const params = { limit, offset: (page - 1) * limit, search };
      if (statusFilter) params.status = statusFilter;
      const url = endpoint.GET_ALL
        ? (typeof endpoint.GET_ALL === 'function' ? endpoint.GET_ALL(params) : endpoint.BASE)
        : endpoint.BASE;
      const response = await axiosInstance.get(url);
      setData(response.data?.data || []);
      setTotal(response.data?.total || response.data?.pagination?.total || 0);
    } catch (error) {
      console.error(`Failed to fetch ${title}:`, error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [title, page, search, statusFilter, endpoint]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (formData) => {
    try {
      if (!endpoint?.CREATE) return;
      await axiosInstance.post(endpoint.CREATE, formData);
      toast.success(`${title} created successfully`);
      setShowForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to create ${title}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      if (!endpoint?.DELETE) return;
      await axiosInstance.delete(endpoint.DELETE(id));
      toast.success(`${title} deleted`);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const url = endpoint.UPDATE_STATUS
        ? endpoint.UPDATE_STATUS(id)
        : `${endpoint.BASE}/${id}/status`;
      await axiosInstance.put(url, { Status: status });
      toast.success(`Status updated to ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleApproveReject = async (id, action) => {
    try {
      const url = endpoint.PROCESS
        ? endpoint.PROCESS(id)
        : `${endpoint.BASE}/${id}/process`;
      await axiosInstance.put(url, { action });
      toast.success(`Request ${action}d`);
      fetchData();
    } catch (error) {
      toast.error(`Failed to ${action}`);
    }
  };

  const getBadgeColor = (value) => {
    const colors = {
      Draft: "bg-gray-100 text-gray-800",
      Pending: "bg-yellow-100 text-yellow-800",
      Approved: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
      Active: "bg-green-100 text-green-800",
      "In Progress": "bg-blue-100 text-blue-800",
      Completed: "bg-green-100 text-green-800",
      Cancelled: "bg-red-100 text-red-800",
      Delivered: "bg-green-100 text-green-800",
      Processing: "bg-blue-100 text-blue-800",
      Planned: "bg-purple-100 text-purple-800",
      Low: "bg-gray-100 text-gray-800",
      Medium: "bg-yellow-100 text-yellow-800",
      High: "bg-orange-100 text-orange-800",
      Urgent: "bg-red-100 text-red-800",
    };
    return colors[value] || "bg-gray-100 text-gray-800";
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
            {Icon && <Icon className="h-6 w-6 text-orange-500" />}
            {title}
          </h1>
          {description && <p className="text-sm text-[#64748B] mt-1">{description}</p>}
          <p className="text-xs text-blueGray-400 mt-1">{total} total records</p>
        </div>
        {enableCreate && (
          <button
            onClick={() => { setEditingItem(null); setShowForm(true); }}
            className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md transition"
          >
            + Add New
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
        />
        {statusOptions && (
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
          >
            <option value="">All Status</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{col.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={item.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * limit + index + 1}</td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm">
                        {col.type === "badge" ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(item[col.key])}`}>
                            {item[col.key] || '-'}
                          </span>
                        ) : col.type === "date" ? (
                          <span className="text-gray-600">{item[col.key] ? new Date(item[col.key]).toLocaleDateString() : '-'}</span>
                        ) : col.type === "currency" ? (
                          <span className="font-medium">₹{Number(item[col.key] || 0).toLocaleString()}</span>
                        ) : col.key === "IsActive" ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item[col.key] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item[col.key] ? 'Active' : 'Inactive'}
                          </span>
                        ) : (
                          <span className="text-gray-900">{item[col.key] || '-'}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex gap-1 justify-end">
                        {enableApproveReject && item.Status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApproveReject(item.Id, "Approved")}
                              className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 rounded bg-green-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproveReject(item.Id, "Rejected")}
                              className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded bg-red-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {enableStatusUpdate && !enableApproveReject && (
                          <select
                            value={item.Status || ""}
                            onChange={(e) => handleStatusUpdate(item.Id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1 py-1"
                          >
                            <option value="">Status</option>
                            {statusOptions?.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {enableDelete && (
                          <button
                            onClick={() => handleDelete(item.Id)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && fieldConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4 flex flex-col">
            <TitleBar title={editingItem ? `Edit ${title}` : `New ${title}`} onClose={() => setShowForm(false)} />
            <div className="p-6">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = {};
                const fd = new FormData(e.target);
                fd.forEach((value, key) => { if (value) formData[key] = value; });
                handleCreate(formData);
              }}>
                <div className="space-y-4">
                  {fieldConfig.map((field) => (
                    <div key={field.key}>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          name={field.key}
                          required={field.required}
                          className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                          rows={3}
                        />
                      ) : field.type === "select" ? (
                        <select
                          name={field.key}
                          required={field.required}
                          className="border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                        >
                          <option value="">Select...</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.key}
                          required={field.required}
                          className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryWorkspace;