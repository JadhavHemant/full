import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import toast from "react-hot-toast";
import TitleBar from "../../TitleBar";
import { getSessionUser } from "../../../utils/sessionUser";

const getSessionCompanyId = () => {
  const user = getSessionUser();
  return user?.companyId || user?.CompanyId || "";
};

const GRNPage = () => {
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ SupplierId: "", WarehouseId: "", PurchaseOrderId: "", ReceivedDate: "", Notes: "", items: [{ ProductId: "", QuantityReceived: 1, UnitCost: 0, BatchNo: "", ManufacturingDate: "", ExpiryDate: "" }] });

  const fetchGRNs = useCallback(async () => {
    setLoading(true);
    const companyId = getSessionCompanyId();
    try {
      const res = await axiosInstance.get(API.GRN.GET_ALL({ page, limit: 10, search, companyId }));
      if (res.data.success) { setGrns(res.data.data); setTotalPages(res.data.pagination.totalPages); }
    } catch { toast.error("Failed to fetch GRNs"); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchGRNs(); }, [fetchGRNs]);

  const openCreateModal = async () => {
    const companyId = getSessionCompanyId();
    try {
      const [supRes, whRes, prodRes] = await Promise.all([
        axiosInstance.get(API.SUPPLIERS.GET_ACTIVE),
        axiosInstance.get(`${API.WAREHOUSES.BASE}?companyId=${companyId}&isActive=true`),
        axiosInstance.get(`${API.PRODUCTS.GET_ALL(null, null, null, null, companyId)}`)
      ]);
      setSuppliers(supRes.data.data || []);
      setWarehouses(whRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setShowCreateModal(true);
    } catch { toast.error("Failed to load reference data"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const companyId = getSessionCompanyId();
    const payload = { ...form, CompanyId: companyId };
    if (!form.SupplierId || !form.WarehouseId) return toast.error("Supplier and Warehouse are required");
    if (!form.items.length || !form.items[0].ProductId) return toast.error("At least one item with product required");
    try {
      await axiosInstance.post(API.GRN.CREATE, payload);
      toast.success("GRN created successfully");
      setShowCreateModal(false);
      setForm({ SupplierId: "", WarehouseId: "", PurchaseOrderId: "", ReceivedDate: "", Notes: "", items: [{ ProductId: "", QuantityReceived: 1, UnitCost: 0, BatchNo: "", ManufacturingDate: "", ExpiryDate: "" }] });
      fetchGRNs();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to create GRN"); }
  };

  const viewDetail = async (id) => {
    try {
      const res = await axiosInstance.get(API.GRN.GET_BY_ID(id));
      if (res.data.success) { setDetailData(res.data.data); setShowDetailModal(id); }
    } catch { toast.error("Failed to fetch details"); }
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ProductId: "", QuantityReceived: 1, UnitCost: 0, BatchNo: "", ManufacturingDate: "", ExpiryDate: "" }] });
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx][field] = value;
    setForm({ ...form, items });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Goods Receipt Notes (GRN)</h1>
        <button onClick={openCreateModal} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">+ Create GRN</button>
      </div>
      <div className="mb-4">
        <input type="text" placeholder="Search GRN..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>

      {loading ? <div className="text-center py-8 text-gray-500">Loading...</div> : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GRN #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grns.map(grn => (
                  <tr key={grn.Id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{grn.GRNNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{grn.PONumber || "-"}</td>
                    <td className="px-6 py-4 text-sm">{grn.SupplierName}</td>
                    <td className="px-6 py-4 text-sm">{grn.WarehouseName}</td>
                    <td className="px-6 py-4 text-sm">{new Date(grn.ReceivedDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{grn.Status}</span></td>
                    <td className="px-6 py-4 text-sm"><button onClick={() => viewDetail(grn.Id)} className="text-blue-600 hover:text-blue-800">View</button></td>
                  </tr>
                ))}
                {grns.length === 0 && <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No GRNs found</td></tr>}
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8 flex flex-col" onClick={e => e.stopPropagation()}>
              <TitleBar title="Create GRN" onClose={() => setShowCreateModal(false)} />
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Supplier *</label>
                      <select value={form.SupplierId} onChange={e => setForm({ ...form, SupplierId: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" required>
                        <option value="">Select Supplier</option>
                        {suppliers.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Warehouse *</label>
                      <select value={form.WarehouseId} onChange={e => setForm({ ...form, WarehouseId: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" required>
                        <option value="">Select Warehouse</option>
                        {warehouses.map(w => <option key={w.Id} value={w.Id}>{w.Name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input type="date" value={form.ReceivedDate} onChange={e => setForm({ ...form, ReceivedDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">PO Reference</label>
                      <input type="text" value={form.PurchaseOrderId} onChange={e => setForm({ ...form, PurchaseOrderId: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="PO ID" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea value={form.Notes} onChange={e => setForm({ ...form, Notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" rows="2" />
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Items</h3>
                    {form.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-6 gap-2 mb-2 p-2 bg-gray-50 rounded">
                        <div className="col-span-2">
                          <select value={item.ProductId} onChange={e => updateItem(idx, "ProductId", e.target.value)} className="w-full px-2 py-1 border rounded text-sm" required>
                            <option value="">Select Product</option>
                            {products.map(p => <option key={p.Id} value={p.Id}>{p.ProductName}</option>)}
                          </select>
                        </div>
                        <div>
                          <input type="number" placeholder="Qty" value={item.QuantityReceived} onChange={e => updateItem(idx, "QuantityReceived", parseInt(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm" min="1" />
                        </div>
                        <div>
                          <input type="number" placeholder="Cost" value={item.UnitCost} onChange={e => updateItem(idx, "UnitCost", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm" step="0.01" />
                        </div>
                        <div>
                          <input type="text" placeholder="Batch" value={item.BatchNo} onChange={e => updateItem(idx, "BatchNo", e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
                        </div>
                        <div>
                          <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-sm" disabled={form.items.length <= 1}>X</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addItem} className="text-blue-600 text-sm">+ Add Item</button>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Create GRN</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && detailData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 flex flex-col" onClick={e => e.stopPropagation()}>
              <TitleBar title={`GRN Details: ${detailData.GRNNumber}`} onClose={() => { setShowDetailModal(null); setDetailData(null); }} />
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{detailData.SupplierName}</span></div>
                  <div><span className="text-gray-500">Warehouse:</span> <span className="font-medium">{detailData.WarehouseName}</span></div>
                  <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(detailData.ReceivedDate).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-500">Status:</span> <span className="font-medium">{detailData.Status}</span></div>
                </div>
                <h3 className="font-semibold mb-2">Items</h3>
                <table className="min-w-full divide-y divide-gray-200 mb-4">
                  <thead><tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Accepted</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rejected</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailData.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm">{item.ProductName}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.QuantityReceived}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.QuantityAccepted}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.QuantityRejected}</td>
                        <td className="px-4 py-2 text-sm text-right">₹{item.UnitCost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end">
                  <button onClick={() => { setShowDetailModal(null); setDetailData(null); }} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GRNPage;