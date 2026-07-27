import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import toast from "react-hot-toast";
import FormWindow from "../../modals/FormWindow";

const BatchesPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    BatchNumber: "",
    ProductId: "",
    WarehouseId: "",
    Quantity: "",
    ManufacturingDate: "",
    ExpiryDate: "",
    PurchasePrice: "",
    SupplierId: "",
    Notes: "",
  });
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = API.BATCHES.GET_ALL({ limit, page, search, productId: productFilter });
      const response = await axiosInstance.get(url);
      setData(response.data?.data || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error("Failed to fetch batches:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, productFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(API.BATCHES.CREATE, formData);
      toast.success("Batch created");
      setShowForm(false);
      setFormData({ BatchNumber: "", ProductId: "", WarehouseId: "", Quantity: "", ManufacturingDate: "", ExpiryDate: "", PurchasePrice: "", SupplierId: "", Notes: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create batch");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏷️ Batch Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total batches</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md transition"
        >
          + New Batch
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search batch number..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
        />
        <input
          type="text"
          placeholder="Product ID filter"
          value={productFilter}
          onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
          className="border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-40"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No batches found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mfg Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={item.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.BatchNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.ProductName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.WarehouseName || '-'}</td>
                    <td className="px-4 py-3 text-sm">{item.Quantity || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.ManufacturingDate ? new Date(item.ManufacturingDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`${item.ExpiryDate && new Date(item.ExpiryDate) < new Date() ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        {item.ExpiryDate ? new Date(item.ExpiryDate).toLocaleDateString() : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">₹{Number(item.PurchasePrice || 0).toLocaleString()}</td>
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

      <FormWindow isOpen={showForm} onClose={() => setShowForm(false)} title="New Batch Entry" icon="🏷️">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-blueGray-600 text-sm font-bold mb-2">Batch Number <span className="text-red-500">*</span></label>
            <input type="text" name="BatchNumber" value={formData.BatchNumber} onChange={handleInputChange} required className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full" />
          </div>
          <div>
            <label className="block text-blueGray-600 text-sm font-bold mb-2">Product ID <span className="text-red-500">*</span></label>
            <input type="number" name="ProductId" value={formData.ProductId} onChange={handleInputChange} required className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full" />
          </div>
          <div>
            <label className="block text-blueGray-600 text-sm font-bold mb-2">Warehouse ID <span className="text-red-500">*</span></label>
            <input type="number" name="WarehouseId" value={formData.WarehouseId} onChange={handleInputChange} required className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full" />
          </div>
          <div>
            <label className="block text-blueGray-600 text-sm font-bold mb-2">Quantity <span className="text-red-500">*</span></label>
            <input type="number" name="Quantity" value={formData.Quantity} onChange={handleInputChange} required className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full" />
          </div>
          <div>
            <label className="block text-blueGray-600 text-sm font-bold mb-2">Manufacturing Date</label>
            <input type="date" name="ManufacturingDate" value={formData.ManufacturingDate} onChange={handleInputChange} className="border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full" />
          </div>
          <div>
            <label className="block text-blueGray-600 text-sm font-bold mb-2">Expiry Date</label>
            <input type="date" name="ExpiryDate" value={formData.ExpiryDate} onChange={handleInputChange} className="border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full" />
          </div>
          <div>
            <label className="block text-blueGray-600 text-sm font-bold mb-2">Purchase Price</label>
            <input type="number" step="0.01" name="PurchasePrice" value={formData.PurchasePrice} onChange={handleInputChange} className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full" />
          </div>
          <div>
            <label className="block text-blueGray-600 text-sm font-bold mb-2">Notes</label>
            <textarea name="Notes" value={formData.Notes} onChange={handleInputChange} rows={3} className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">Cancel</button>
            <button type="submit" className="bg-blue-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">Create</button>
          </div>
        </form>
      </FormWindow>
    </div>
  );
};

export default BatchesPage;