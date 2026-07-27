import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../Components/TitleBar";

const ReorderLevelsPage = () => {
  const [reorderLevels, setReorderLevels] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("levels");

  const [formData, setFormData] = useState({
    productId: "",
    warehouseId: "",
    minStockLevel: 0,
    maxStockLevel: 0,
    reorderPoint: 0,
    reorderQuantity: 0,
    notes: "",
  });

  const fetchReorderLevels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/reorder-levels");
      setReorderLevels(response.data?.data || []);
    } catch (error) {
      toast.error("Failed to fetch reorder levels");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axiosInstance.get("/reorder-levels/alerts");
      setAlerts(response.data || []);
    } catch (error) {
      console.error("Failed to fetch alerts");
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await axiosInstance.get("/reorder-levels/history");
      setHistory(response.data?.data || []);
    } catch (error) {
      toast.error("Failed to fetch reorder history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchReorderLevels();
    fetchAlerts();
  }, [fetchReorderLevels]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        // Fixed: Use POST (upsert) instead of PUT - the route only supports POST
        await axiosInstance.post("/reorder-levels", formData);
        toast.success("Reorder level updated successfully");
      } else {
        await axiosInstance.post("/reorder-levels", formData);
        toast.success("Reorder level created successfully");
      }
      setShowModal(false);
      resetForm();
      fetchReorderLevels();
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to save reorder level");
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      productId: item.ProductId,
      warehouseId: item.WarehouseId,
      minStockLevel: item.MinStockLevel,
      maxStockLevel: item.MaxStockLevel,
      reorderPoint: item.ReorderPoint,
      reorderQuantity: item.ReorderQuantity,
      notes: item.Notes || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reorder level?")) return;
    try {
      await axiosInstance.delete(`/reorder-levels/${id}`);
      toast.success("Reorder level deleted successfully");
      fetchReorderLevels();
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to delete reorder level");
    }
  };

  const handleAutoReplenish = async (id) => {
    try {
      await axiosInstance.post("/reorder-levels/auto-replenish", { reorderLevelId: id });
      toast.success("Auto-replenishment initiated");
      fetchReorderLevels();
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to initiate auto-replenishment");
    }
  };

  const handleBulkAutoReplenish = async () => {
    if (!window.confirm(`Auto-replenish all ${alerts.length} items with alerts?`)) return;
    let success = 0;
    let failed = 0;
    for (const alert of alerts) {
      try {
        await axiosInstance.post("/reorder-levels/auto-replenish", { reorderLevelId: alert.Id });
        success++;
      } catch (error) {
        failed++;
      }
    }
    toast.success(`${success} auto-replenished, ${failed} failed`);
    fetchReorderLevels();
    fetchAlerts();
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({
      productId: "",
      warehouseId: "",
      minStockLevel: 0,
      maxStockLevel: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      notes: "",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Critical":
        return "bg-red-100 text-red-800";
      case "Reorder":
        return "bg-yellow-100 text-yellow-800";
      case "Overstocked":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <TitleBar title="Reorder Level Management" onClose={() => window.history.back()} />

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {alerts.length} Reorder Alert{alerts.length > 1 ? "s" : ""}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {alerts.slice(0, 3).map((alert, index) => (
                  <p key={index} className="ml-1">
                    • {alert.ProductName} ({alert.SKU}) - Current: {alert.CurrentStock}, Reorder Point: {alert.ReorderPoint}
                  </p>
                ))}
                {alerts.length > 3 && <p className="ml-1">...and {alerts.length - 3} more</p>}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={handleBulkAutoReplenish}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm font-medium"
            >
              Auto-Replenish All
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab("levels")}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === "levels"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Reorder Levels
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === "alerts"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Alerts ({alerts.length})
            </button>
            <button
              onClick={() => { setActiveTab("history"); fetchHistory(); }}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === "history"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              History
            </button>
          </nav>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {activeTab === "levels" && "Reorder Levels"}
            {activeTab === "alerts" && "Reorder Alerts"}
            {activeTab === "history" && "Reorder History"}
          </h2>
          <p className="text-sm text-gray-500">
            {activeTab === "levels" && "Manage min-max stock levels and reorder points"}
            {activeTab === "alerts" && "Products that need immediate attention"}
            {activeTab === "history" && "Track reorder actions and replenishments"}
          </p>
        </div>
        {activeTab === "levels" && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Add Reorder Level
          </button>
        )}
      </div>

      {/* Reorder Levels Table */}
      {activeTab === "levels" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : reorderLevels.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No reorder levels configured</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Max Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reorderLevels.map((item) => (
                    <tr key={item.Id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.ProductName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.WarehouseName}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{item.MinStockLevel}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{item.MaxStockLevel}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{item.ReorderPoint}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.CurrentStock}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.Status)}`}>
                          {item.Status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
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
      )}

      {/* Alerts Table */}
      {activeTab === "alerts" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No alerts at this time</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alerts.map((item) => (
                    <tr key={item.Id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.ProductName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.WarehouseName}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600">{item.CurrentStock}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{item.ReorderPoint}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.Status)}`}>
                          {item.Status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleAutoReplenish(item.Id)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs font-medium"
                        >
                          Auto Replenish
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Table */}
      {activeTab === "history" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {historyLoading ? (
            <div className="p-8 text-center text-gray-500">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No history found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Before</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock After</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Triggered By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item.Id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(item.CreatedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.ProductName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.WarehouseName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {item.ActionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{item.Quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{item.StockBefore}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{item.StockAfter}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.TriggeredBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <TitleBar title={selectedItem ? "Edit Reorder Level" : "Add Reorder Level"} onClose={() => { setShowModal(false); resetForm(); }} />
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                    <input
                      type="number"
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse ID</label>
                    <input
                      type="number"
                      value={formData.warehouseId}
                      onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                    <input
                      type="number"
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock Level</label>
                    <input
                      type="number"
                      value={formData.maxStockLevel}
                      onChange={(e) => setFormData({ ...formData, maxStockLevel: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                    <input
                      type="number"
                      value={formData.reorderPoint}
                      onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Quantity</label>
                    <input
                      type="number"
                      value={formData.reorderQuantity}
                      onChange={(e) => setFormData({ ...formData, reorderQuantity: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    rows="3"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                  >
                    {selectedItem ? "Update" : "Create"}
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

export default ReorderLevelsPage;
