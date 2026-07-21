import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import toast from "react-hot-toast";
import TitleBar from "../../TitleBar";

const StockTransfersPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ FromWarehouseId: "", ToWarehouseId: "", TransferDate: "", Notes: "", items: [{ ProductId: "", Quantity: 1 }] });

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const companyId = user?.companyId || "";
    try {
      const res = await axiosInstance.get(API.STOCK_TRANSFERS.GET_ALL({ page, limit: 10, companyId }));
      if (res.data.success) { setTransfers(res.data.data); setTotalPages(res.data.pagination.totalPages); }
    } catch (err) { toast.error("Failed to fetch transfers"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const openCreateModal = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const companyId = user?.companyId || "";
    try {
      const [whRes, prodRes] = await Promise.all([
        axiosInstance.get(`${API.WAREHOUSES.BASE}?companyId=${companyId}&isActive=true`),
        axiosInstance.get(API.PRODUCTS.GET_ALL(null, null, null, null, companyId))
      ]);
      setWarehouses(whRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setShowCreateModal(true);
    } catch (err) { toast.error("Failed to load data"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const companyId = user?.companyId || "";
    if (!form.FromWarehouseId || !form.ToWarehouseId) return toast.error("Source and destination warehouses required");
    if (form.FromWarehouseId === form.ToWarehouseId) return toast.error("Source and destination must be different");
    if (!form.items.length || !form.items[0].ProductId) return toast.error("At least one item required");
    try {
      await axiosInstance.post(API.STOCK_TRANSFERS.CREATE, { ...form, CompanyId: companyId });
      toast.success("Stock transfer created");
      setShowCreateModal(false);
      setForm({ FromWarehouseId: "", ToWarehouseId: "", TransferDate: "", Notes: "", items: [{ ProductId: "", Quantity: 1 }] });
      fetchTransfers();
    } catch (err) { toast.error(err.response?.data?.message || "Transfer failed"); }
  };

  const updateStatus = async (id, Status) => {
    try {
      await axiosInstance.put(API.STOCK_TRANSFERS.UPDATE_STATUS(id), { Status });
      toast.success("Status updated");
      fetchTransfers();
    } catch (err) { toast.error("Failed to update status"); }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ProductId: "", Quantity: 1 }] });
  const removeItem = (idx) => { if (form.items.length > 1) setForm({ ...form, items: form.items.filter((_, i) => i !== idx) }); };
  const updateItem = (idx, field, value) => { const items = [...form.items]; items[idx][field] = value; setForm({ ...form, items }); };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Stock Transfers</h1>
        <button onClick={openCreateModal} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">+ New Transfer</button>
      </div>

      {loading ? <div className="text-center py-8 text-gray-500">Loading...</div> : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transfers.map(t => (
                  <tr key={t.Id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.TransferNo}</td>
                    <td className="px-6 py-4 text-sm">{t.FromWarehouseName}</td>
                    <td className="px-6 py-4 text-sm">{t.ToWarehouseName}</td>
                    <td className="px-6 py-4 text-sm">{new Date(t.TransferDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${t.Status === 'Received' ? 'bg-green-100 text-green-800' : t.Status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{t.Status}</span></td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      {t.Status === 'Pending' && <><button onClick={() => updateStatus(t.Id, 'In Transit')} className="text-blue-600">Dispatch</button>
                        <button onClick={() => updateStatus(t.Id, 'Cancelled')} className="text-red-600">Cancel</button></>}
                      {t.Status === 'In Transit' && <button onClick={() => updateStatus(t.Id, 'Received')} className="text-green-600">Receive</button>}
                    </td>
                  </tr>
                ))}
                {transfers.length === 0 && <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No transfers found</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
              <span className="px-3 py-1">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 flex flex-col" onClick={e => e.stopPropagation()}>
              <TitleBar title="Create Stock Transfer" onClose={() => setShowCreateModal(false)} />
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">From Warehouse *</label>
                      <select value={form.FromWarehouseId} onChange={e => setForm({ ...form, FromWarehouseId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
                        <option value="">Select Source</option>
                        {warehouses.map(w => <option key={w.Id} value={w.Id}>{w.Name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">To Warehouse *</label>
                      <select value={form.ToWarehouseId} onChange={e => setForm({ ...form, ToWarehouseId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
                        <option value="">Select Destination</option>
                        {warehouses.map(w => <option key={w.Id} value={w.Id}>{w.Name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input type="date" value={form.TransferDate} onChange={e => setForm({ ...form, TransferDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea value={form.Notes} onChange={e => setForm({ ...form, Notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows="2" />
                  </div>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Items</h3>
                    {form.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 mb-2 p-2 bg-gray-50 rounded">
                        <select value={item.ProductId} onChange={e => updateItem(idx, "ProductId", e.target.value)} className="px-2 py-1 border rounded text-sm" required>
                          <option value="">Select Product</option>
                          {products.map(p => <option key={p.Id} value={p.Id}>{p.ProductName}</option>)}
                        </select>
                        <input type="number" placeholder="Qty" value={item.Quantity} onChange={e => updateItem(idx, "Quantity", parseInt(e.target.value) || 0)} className="px-2 py-1 border rounded text-sm" min="1" />
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-sm" disabled={form.items.length <= 1}>X</button>
                      </div>
                    ))}
                    <button type="button" onClick={addItem} className="text-blue-600 text-sm">+ Add Item</button>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Create Transfer</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTransfersPage;