import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import toast from "react-hot-toast";
import TitleBar from "../../TitleBar";

const StockAdjustmentsPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    AdjustmentType: "",
    ProductId: "",
    WarehouseId: "",
    Quantity: "",
    Reason: "",
    ReferenceNumber: "",
  });
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = API.STOCK_ADJUSTMENTS.GET_ALL({
        limit,
        page,
        search,
        status: statusFilter,
        adjustmentType: adjustmentTypeFilter,
      });
      const response = await axiosInstance.get(url);
      setData(response.data?.data || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error("Failed to fetch stock adjustments:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, adjustmentTypeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(API.STOCK_ADJUSTMENTS.CREATE, formData);
      toast.success("Stock adjustment created");
      setShowForm(false);
      setFormData({ AdjustmentType: "", ProductId: "", WarehouseId: "", Quantity: "", Reason: "", ReferenceNumber: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create adjustment");
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await axiosInstance.put(API.STOCK_ADJUSTMENTS.UPDATE_STATUS(id), { Status: status });
      toast.success("Status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 Stock Adjustments</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total records</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + New Adjustment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
        />
        <select
          value={adjustmentTypeFilter}
          onChange={(e) => { setAdjustmentTypeFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="Damage">Damage</option>
          <option value="Lost">Lost</option>
          <option value="Correction">Manual Correction</option>
          <option value="Found">Found</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No adjustments found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={item.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.AdjustmentType === 'Damage' ? 'bg-red-100 text-red-800' :
                        item.AdjustmentType === 'Lost' ? 'bg-orange-100 text-orange-800' :
                        item.AdjustmentType === 'Correction' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>{item.AdjustmentType}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.ProductName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.WarehouseName || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.Quantity || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.Status === 'Approved' ? 'bg-green-100 text-green-800' :
                        item.Status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        item.Status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{item.Status || 'Draft'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.CreatedAt ? new Date(item.CreatedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {item.Status === 'Pending' && (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleUpdateStatus(item.Id, 'Approved')} className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 rounded bg-green-50">Approve</button>
                          <button onClick={() => handleUpdateStatus(item.Id, 'Rejected')} className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded bg-red-50">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl max-h-[90vh] mx-4">
            <TitleBar title="New Stock Adjustment" onClose={() => setShowForm(false)} />
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Adjustment Type *</label>
                <select name="AdjustmentType" value={formData.AdjustmentType} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  <option value="Damage">Damage</option>
                  <option value="Lost">Lost</option>
                  <option value="Correction">Manual Correction</option>
                  <option value="Found">Found</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Product ID *</label>
                <input type="number" name="ProductId" value={formData.ProductId} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Warehouse ID *</label>
                <input type="number" name="WarehouseId" value={formData.WarehouseId} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                <input type="number" name="Quantity" value={formData.Quantity} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea name="Reason" value={formData.Reason} onChange={handleInputChange} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                <input type="text" name="ReferenceNumber" value={formData.ReferenceNumber} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAdjustmentsPage;