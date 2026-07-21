import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import toast from "react-hot-toast";
import TitleBar from "../../TitleBar";

const SerialNumbersPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    SerialNumber: "",
    ProductId: "",
    WarehouseId: "",
    Status: "Available",
    PurchaseDate: "",
    WarrantyExpiry: "",
    Notes: "",
  });
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = API.SERIAL_NUMBERS.GET_ALL({ limit, page, search, status: statusFilter });
      const response = await axiosInstance.get(url);
      setData(response.data?.data || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error("Failed to fetch serial numbers:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(API.SERIAL_NUMBERS.CREATE, formData);
      toast.success("Serial number created");
      setShowForm(false);
      setFormData({ SerialNumber: "", ProductId: "", WarehouseId: "", Status: "Available", PurchaseDate: "", WarrantyExpiry: "", Notes: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create serial number");
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axiosInstance.put(API.SERIAL_NUMBERS.UPDATE_STATUS(id), { Status: status });
      toast.success("Status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status) => {
    const colors = {
      Available: "bg-green-100 text-green-800",
      Sold: "bg-blue-100 text-blue-800",
      Returned: "bg-yellow-100 text-yellow-800",
      Damaged: "bg-red-100 text-red-800",
      InService: "bg-purple-100 text-purple-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔢 Serial Number Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total serial numbers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + New Serial Number
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search serial number..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="Available">Available</option>
          <option value="Sold">Sold</option>
          <option value="Returned">Returned</option>
          <option value="Damaged">Damaged</option>
          <option value="InService">In Service</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No serial numbers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warranty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={item.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.SerialNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.ProductName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.WarehouseName || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(item.Status)}`}>{item.Status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.PurchaseDate ? new Date(item.PurchaseDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.WarrantyExpiry ? new Date(item.WarrantyExpiry).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {item.Status === 'Available' && (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleStatusUpdate(item.Id, 'Sold')} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded bg-blue-50">Mark Sold</button>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl max-h-[90vh] mx-4">
            <TitleBar title="New Serial Number" onClose={() => setShowForm(false)} />
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Serial Number *</label>
                <input type="text" name="SerialNumber" value={formData.SerialNumber} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
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
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select name="Status" value={formData.Status} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="Available">Available</option>
                  <option value="Sold">Sold</option>
                  <option value="InService">In Service</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                <input type="date" name="PurchaseDate" value={formData.PurchaseDate} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Warranty Expiry</label>
                <input type="date" name="WarrantyExpiry" value={formData.WarrantyExpiry} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea name="Notes" value={formData.Notes} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
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

export default SerialNumbersPage;