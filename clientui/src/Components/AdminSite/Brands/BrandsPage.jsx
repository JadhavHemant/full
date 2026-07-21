import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import toast from "react-hot-toast";

const BrandsPage = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ BrandName: "", Description: "", CompanyId: "" });

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const companyId = user?.companyId || "";
    try {
      const res = await axiosInstance.get(API.BRANDS.GET_ALL({ page, limit: 10, search, companyId }));
      if (res.data.success) {
        setBrands(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      toast.error("Failed to fetch brands");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const payload = { ...form, CompanyId: form.CompanyId || user?.companyId };
    if (!payload.BrandName) return toast.error("Brand name is required");

    try {
      if (editing) {
        await axiosInstance.put(API.BRANDS.UPDATE(editing), payload);
        toast.success("Brand updated");
      } else {
        await axiosInstance.post(API.BRANDS.CREATE, payload);
        toast.success("Brand created");
      }
      setShowModal(false);
      setEditing(null);
      setForm({ BrandName: "", Description: "", CompanyId: "" });
      fetchBrands();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this brand?")) return;
    try {
      await axiosInstance.delete(API.BRANDS.DELETE(id));
      toast.success("Brand deleted");
      fetchBrands();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const openEdit = (brand) => {
    setEditing(brand.Id);
    setForm({ BrandName: brand.BrandName, Description: brand.Description || "", CompanyId: brand.CompanyId });
    setShowModal(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Brands</h1>
        <button onClick={() => { setEditing(null); setForm({ BrandName: "", Description: "", CompanyId: "" }); setShowModal(true); }}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition">+ Add Brand</button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Search brands..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {brands.map((brand) => (
                  <tr key={brand.Id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{brand.Id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{brand.BrandName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{brand.Description || "-"}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${brand.IsActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{brand.IsActive ? "Active" : "Inactive"}</span></td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button onClick={() => openEdit(brand)} className="text-blue-600 hover:text-blue-800">Edit</button>
                      <button onClick={() => handleDelete(brand.Id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
                {brands.length === 0 && <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No brands found</td></tr>}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{editing ? "Edit Brand" : "Add Brand"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
                <input type="text" required value={form.BrandName} onChange={e => setForm({ ...form, BrandName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.Description} onChange={e => setForm({ ...form, Description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" rows="3" /></div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">{editing ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandsPage;