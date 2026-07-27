import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../Components/TitleBar";

const FieldPermissionsPage = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState({
    roleId: "",
    module: "",
    fieldName: "",
    permissionLevel: "read",
    isActive: true,
  });

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/field-permissions");
      setPermissions(response.data?.data || response.data || []);
    } catch (error) {
      toast.error("Failed to fetch field permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await axiosInstance.put(`/field-permissions/${selectedItem.Id}`, form);
        toast.success("Field permission updated successfully");
      } else {
        await axiosInstance.post("/field-permissions", form);
        toast.success("Field permission created successfully");
      }
      setShowModal(false);
      setIsEditMode(false);
      setSelectedItem(null);
      setForm({ roleId: "", module: "", fieldName: "", permissionLevel: "read", isActive: true });
      fetchPermissions();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save field permission");
    }
  };

  const handleEdit = (item) => {
    setIsEditMode(true);
    setSelectedItem(item);
    setForm({
      roleId: item.RoleId,
      module: item.Module,
      fieldName: item.FieldName,
      permissionLevel: item.PermissionLevel,
      isActive: item.IsActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this field permission?")) return;
    try {
      await axiosInstance.delete(`/field-permissions/${id}`);
      toast.success("Field permission deleted successfully");
      fetchPermissions();
    } catch (error) {
      toast.error("Failed to delete field permission");
    }
  };

  const getPermissionLevelColor = (level) => {
    switch (level) {
      case "read":
        return "bg-blue-100 text-blue-800";
      case "write":
        return "bg-green-100 text-green-800";
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "none":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <TitleBar title="Field-Level Permissions" onClose={() => window.history.back()} />

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Field-Level Permissions</h2>
          <p className="text-sm text-gray-500">Control access to specific fields based on user roles</p>
        </div>
        <button
          onClick={() => { setIsEditMode(false); setSelectedItem(null); setForm({ roleId: "", module: "", fieldName: "", permissionLevel: "read", isActive: true }); setShowModal(true); }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + Add Field Permission
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : permissions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No field permissions found. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field Name</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Permission Level</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissions.map((item) => (
                  <tr key={item.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.RoleId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.Module}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.FieldName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPermissionLevelColor(item.PermissionLevel)}`}>
                        {item.PermissionLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.IsActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.IsActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                      <button onClick={() => handleDelete(item.Id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <TitleBar title={isEditMode ? "Edit Field Permission" : "Add Field Permission"} onClose={() => { setShowModal(false); setIsEditMode(false); setSelectedItem(null); }} />
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role ID</label>
                  <input
                    type="number"
                    value={form.roleId}
                    onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
                  <input
                    type="text"
                    value={form.module}
                    onChange={(e) => setForm({ ...form, module: e.target.value })}
                    placeholder="e.g., Products, SalesOrders"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Field Name</label>
                  <input
                    type="text"
                    value={form.fieldName}
                    onChange={(e) => setForm({ ...form, fieldName: e.target.value })}
                    placeholder="e.g., Price, Cost, Description"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permission Level</label>
                  <select
                    value={form.permissionLevel}
                    onChange={(e) => setForm({ ...form, permissionLevel: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="read">Read</option>
                    <option value="write">Write</option>
                    <option value="admin">Admin</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="mb-4 flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">Active</label>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setIsEditMode(false); setSelectedItem(null); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                  >
                    {isEditMode ? "Update" : "Create"}
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

export default FieldPermissionsPage;
