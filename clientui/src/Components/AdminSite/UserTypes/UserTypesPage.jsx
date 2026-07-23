import React, { useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_BASE_URL } from "../../Endpoint/Endpoint";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../TitleBar";

const UserTypesPage = () => {
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ userType: "" });

  useEffect(() => { fetchUserTypes(); }, []);

  const fetchUserTypes = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`${API_BASE_URL}/usertypes/get/usertypes`);
      setUserTypes(res.data || []);
    } catch (err) {
      console.error("Error fetching user types:", err);
      toast.error("Failed to load user types");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setFormData({ userType: "" });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({ userType: item.UserType });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.userType.trim()) {
      toast.error("User type name is required");
      return;
    }
    try {
      if (editItem) {
        await axiosInstance.put(
          `${API_BASE_URL}/usertypes/update/usertypes/${editItem.UserTypeId}`,
          { userType: formData.userType.trim() }
        );
        toast.success("User type updated");
      } else {
        await axiosInstance.post(
          `${API_BASE_URL}/usertypes/create/usertypes`,
          { userType: formData.userType.trim() }
        );
        toast.success("User type created");
      }
      setShowModal(false);
      fetchUserTypes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user type? This action cannot be undone.")) return;
    try {
      await axiosInstance.delete(`${API_BASE_URL}/usertypes/delete/usertype/${id}`);
      toast.success("User type deleted");
      fetchUserTypes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Toaster position="top-right" />
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">User Types</h2>
            <p className="text-sm text-slate-500 mt-1">Manage user access types and classifications</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            + New User Type
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : userTypes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No user types found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">User Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userTypes.map((item) => (
                <tr key={item.UserTypeId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-500">{item.UserTypeId}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.UserType}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-semibold mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.UserTypeId)}
                      className="text-red-600 hover:text-red-800 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <TitleBar
              title={editItem ? "Edit User Type" : "Create User Type"}
              onClose={() => setShowModal(false)}
            />
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">User Type Name *</label>
                <input
                  type="text"
                  value={formData.userType}
                  onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Sales Manager, Support Agent"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  {editItem ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTypesPage;