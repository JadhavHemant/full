import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../Components/TitleBar";

const StockValuationPage = () => {
  const [valuations, setValuations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [costingMethods, setCostingMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("WeightedAverage");
  const [report, setReport] = useState([]);
<<<<<<< HEAD
  const [layers, setLayers] = useState([]);
  const [showLayers, setShowLayers] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
=======
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337

  const fetchValuations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/stock-valuation");
      setValuations(response.data?.data || []);
    } catch (error) {
      toast.error("Failed to fetch stock valuations");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCostingMethods = async () => {
    try {
      const response = await axiosInstance.get("/stock-valuation/costing-methods");
      setCostingMethods(response.data || []);
    } catch (error) {
      console.error("Failed to fetch costing methods");
    }
  };

  const fetchReport = async () => {
    try {
      const response = await axiosInstance.get("/stock-valuation/report");
      setReport(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch valuation report");
    }
  };

<<<<<<< HEAD
  const fetchLayers = async (productId) => {
    try {
      const response = await axiosInstance.get(`/stock-valuation/layers/${productId}`);
      setLayers(response.data?.data || []);
      setShowLayers(true);
    } catch (error) {
      toast.error("Failed to fetch valuation layers");
    }
  };

=======
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
  useEffect(() => {
    fetchValuations();
    fetchCostingMethods();
    fetchReport();
  }, [fetchValuations]);

  const handleCalculate = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post("/stock-valuation/calculate", {
        costingMethod: selectedMethod,
      });
      toast.success("Stock valuation calculated successfully");
      setShowCalculateModal(false);
      fetchValuations();
      fetchReport();
    } catch (error) {
      toast.error("Failed to calculate stock valuation");
    }
  };

<<<<<<< HEAD
  const handleExport = async (format = "csv") => {
    setExportLoading(true);
    try {
      const response = await axiosInstance.get(`/stock-valuation/export?format=${format}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `stock-valuation-${new Date().toISOString().split("T")[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Stock valuation exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export stock valuation");
    } finally {
      setExportLoading(false);
    }
  };

=======
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
  const totalValue = valuations.reduce((sum, item) => sum + (parseFloat(item.TotalValue) || 0), 0);
  const totalStock = valuations.reduce((sum, item) => sum + (parseInt(item.TotalStock) || 0), 0);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <TitleBar title="Stock Valuation & Costing" onClose={() => window.history.back()} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
          <p className="text-2xl font-bold text-gray-900">{valuations.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Stock</h3>
          <p className="text-2xl font-bold text-gray-900">{totalStock.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
          <p className="text-2xl font-bold text-green-600">₹{totalValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Stock Valuation</h2>
          <p className="text-sm text-gray-500">Manage stock costing and valuation</p>
        </div>
<<<<<<< HEAD
        <div className="flex gap-2">
          <button
            onClick={() => setShowCalculateModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Calculate Valuation
          </button>
          <button
            onClick={() => handleExport("csv")}
            disabled={exportLoading}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
          >
            {exportLoading ? "Exporting..." : "Export CSV"}
          </button>
        </div>
=======
        <button
          onClick={() => setShowCalculateModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          Calculate Valuation
        </button>
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
      </div>

      {/* Valuation Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : valuations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No valuations found. Click "Calculate Valuation" to start.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
<<<<<<< HEAD
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">FIFO Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">LIFO Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Layers</th>
=======
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {valuations.map((item) => (
                  <tr key={item.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.ProductName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.SKU}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.WarehouseName}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{item.TotalStock}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">₹{parseFloat(item.AverageCost || 0).toFixed(2)}</td>
<<<<<<< HEAD
                    <td className="px-4 py-3 text-sm text-right text-gray-900">₹{parseFloat(item.FIFOCost || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">₹{parseFloat(item.LIFOCost || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">₹{parseFloat(item.TotalValue || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.CostingMethod}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { setSelectedProduct(item); fetchLayers(item.ProductId); }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Layers
                      </button>
                    </td>
=======
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">₹{parseFloat(item.TotalValue || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.CostingMethod}</td>
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warehouse Summary Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Warehouse Valuation Summary</h3>
        {report.length === 0 ? (
          <p className="text-gray-500">No report data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Products</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.WarehouseName}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{item.total_products}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{item.total_stock}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">₹{parseFloat(item.total_value || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">₹{parseFloat(item.avg_cost || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

<<<<<<< HEAD
      {/* FIFO/LIFO Layers Modal */}
      {showLayers && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <TitleBar
              title={`Valuation Layers - ${selectedProduct.ProductName}`}
              onClose={() => { setShowLayers(false); setLayers([]); setSelectedProduct(null); }}
            />
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                Product: {selectedProduct.ProductName} (SKU: {selectedProduct.SKU})
                <br />
                Current Stock: {selectedProduct.TotalStock} units | Total Value: ₹{parseFloat(selectedProduct.TotalValue || 0).toLocaleString()}
              </p>
              {layers.length === 0 ? (
                <p className="text-gray-500">No valuation layers found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Source</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty Received</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty Remaining</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Unit Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Layer Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {layers.map((layer) => (
                        <tr key={layer.Id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-600">{new Date(layer.ReceivedDate).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{layer.SourceDocument || "Manual"}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{layer.QuantityReceived}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{layer.QuantityRemaining}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">₹{parseFloat(layer.UnitCost || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium text-green-600">₹{parseFloat(layer.LayerValue || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

=======
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
      {/* Calculate Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <TitleBar title="Calculate Stock Valuation" onClose={() => setShowCalculateModal(false)} />
            <div className="p-6">
              <form onSubmit={handleCalculate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costing Method
                  </label>
                  <select
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="WeightedAverage">Weighted Average</option>
                    <option value="FIFO">FIFO (First In First Out)</option>
                    <option value="LIFO">LIFO (Last In First Out)</option>
                    <option value="Standard">Standard Cost</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select the costing method for valuation calculation</p>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCalculateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                  >
                    Calculate
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

<<<<<<< HEAD
export default StockValuationPage;
=======
export default StockValuationPage;
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
