import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../Components/TitleBar";

const FinancialYearsPage = () => {
  const [financialYears, setFinancialYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedFY, setSelectedFY] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [showPeriods, setShowPeriods] = useState(false);
  const [form, setForm] = useState({
    fiscalYearName: "",
    startDate: "",
    endDate: "",
    periodType: "Monthly",
    notes: "",
  });

  const fetchFinancialYears = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/financial-years?limit=50");
      setFinancialYears(response.data?.data || []);
    } catch (error) {
      toast.error("Failed to fetch financial years");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFinancialYears(); }, [fetchFinancialYears]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.fiscalYearName || !form.startDate || !form.endDate) {
      return toast.error("Fiscal year name, start date, and end date are required");
    }
    try {
      await axiosInstance.post("/financial-years", form);
      toast.success("Financial year created successfully");
      setShowModal(false);
      setForm({ fiscalYearName: "", startDate: "", endDate: "", periodType: "Monthly", notes: "" });
      fetchFinancialYears();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create financial year");
    }
  };

  const handleEdit = (fy) => {
    setIsEditMode(true);
    setSelectedFY(fy);
    setForm({
      fiscalYearName: fy.FiscalYearName,
      startDate: fy.StartDate ? fy.StartDate.split("T")[0] : "",
      endDate: fy.EndDate ? fy.EndDate.split("T")[0] : "",
      periodType: fy.PeriodType || "Monthly",
      notes: fy.Notes || "",
    });
    setShowModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!form.fiscalYearName || !form.startDate || !form.endDate) {
      return toast.error("Fiscal year name, start date, and end date are required");
    }
    try {
      await axiosInstance.put(`/financial-years/${selectedFY.Id}`, form);
      toast.success("Financial year updated successfully");
      setShowModal(false);
      setIsEditMode(false);
      setSelectedFY(null);
      setForm({ fiscalYearName: "", startDate: "", endDate: "", periodType: "Monthly", notes: "" });
      fetchFinancialYears();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update financial year");
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm("Are you sure you want to close this financial year? This action cannot be undone.")) return;
    try {
      await axiosInstance.post(`/financial-years/${id}/close`);
      toast.success("Financial year closed successfully");
      fetchFinancialYears();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to close financial year");
    }
  };

  const handleReopen = async (id) => {
    if (!window.confirm("Are you sure you want to re-open this financial year?")) return;
    try {
      await axiosInstance.post(`/financial-years/${id}/reopen`);
      toast.success("Financial year re-opened successfully");
      fetchFinancialYears();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to re-open financial year");
    }
  };

  const handleClosePeriod = async (id) => {
    if (!window.confirm("Are you sure you want to close this accounting period?")) return;
    try {
      await axiosInstance.post(`/financial-years/periods/${id}/close`);
      toast.success("Period closed successfully");
      if (selectedFY) fetchPeriods(selectedFY.Id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to close period");
    }
  };

  const handleReopenPeriod = async (id) => {
    if (!window.confirm("Are you sure you want to re-open this accounting period?")) return;
    try {
      await axiosInstance.post(`/financial-years/periods/${id}/reopen`);
      toast.success("Period re-opened successfully");
      if (selectedFY) fetchPeriods(selectedFY.Id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to re-open period");
    }
  };

  const fetchPeriods = async (fyId) => {
    try {
      const response = await axiosInstance.get(`/financial-years/${fyId}/periods`);
      setPeriods(response.data || []);
      setShowPeriods(true);
    } catch (error) {
      toast.error("Failed to fetch periods");
    }
  };

  const activeFY = financialYears.filter(fy => fy.IsActive);
  const closedFY = financialYears.filter(fy => fy.IsClosed);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <TitleBar title="Financial Year Management" onClose={() => window.history.back()} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Financial Years</h3>
          <p className="text-2xl font-bold text-gray-900">{financialYears.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Active Years</h3>
          <p className="text-2xl font-bold text-green-600">{activeFY.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Closed Years</h3>
          <p className="text-2xl font-bold text-gray-600">{closedFY.length}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Financial Years</h2>
          <p className="text-sm text-gray-500">Manage fiscal years and accounting periods</p>
        </div>
        <button
          onClick={() => { setIsEditMode(false); setSelectedFY(null); setForm({ fiscalYearName: "", startDate: "", endDate: "", periodType: "Monthly", notes: "" }); setShowModal(true); }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + New Financial Year
        </button>
      </div>

      {/* Financial Years Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : financialYears.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No financial years found. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Period Type</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Periods</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {financialYears.map((fy) => (
                  <tr key={fy.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{fy.FiscalYearName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(fy.StartDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(fy.EndDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{fy.PeriodType || "Monthly"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        fy.IsClosed ? 'bg-red-100 text-red-700' : fy.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {fy.IsClosed ? 'Closed' : fy.IsActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setSelectedFY(fy); fetchPeriods(fy.Id); }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Periods
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!fy.IsClosed && (
                        <button
                          onClick={() => handleEdit(fy)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-2"
                        >
                          Edit
                        </button>
                      )}
                      {!fy.IsClosed && fy.IsActive && (
                        <button
                          onClick={() => handleClose(fy.Id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Close Year
                        </button>
                      )}
                      {fy.IsClosed && (
                        <button
                          onClick={() => handleReopen(fy.Id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Re-open
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Periods Modal */}
      {showPeriods && selectedFY && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <TitleBar title={`Periods - ${selectedFY.FiscalYearName}`} onClose={() => { setShowPeriods(false); setPeriods([]); }} />
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                {new Date(selectedFY.StartDate).toLocaleDateString()} - {new Date(selectedFY.EndDate).toLocaleDateString()}
                {" "} | Period Type: {selectedFY.PeriodType || "Monthly"}
              </p>
              {periods.length === 0 ? (
                <p className="text-gray-500">No accounting periods found.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Period</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Start</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">End</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {periods.map((p) => (
                      <tr key={p.Id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{p.PeriodName}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{new Date(p.StartDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{new Date(p.EndDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            p.IsClosed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {p.IsClosed ? 'Closed' : 'Open'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {p.IsClosed ? (
                            <button
                              onClick={() => handleReopenPeriod(p.Id)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Re-open
                            </button>
                          ) : (
                            <button
                              onClick={() => handleClosePeriod(p.Id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Close
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <TitleBar title={isEditMode ? "Edit Financial Year" : "Create Financial Year"} onClose={() => { setShowModal(false); setIsEditMode(false); setSelectedFY(null); }} />
            <div className="p-6">
              <form onSubmit={isEditMode ? handleUpdate : handleCreate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fiscal Year Name</label>
                  <input
                    type="text"
                    value={form.fiscalYearName}
                    onChange={(e) => setForm({ ...form, fiscalYearName: e.target.value })}
                    placeholder="e.g., FY 2026-2027"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period Type</label>
                  <select
                    value={form.periodType}
                    onChange={(e) => setForm({ ...form, periodType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Monthly">Monthly (12 periods)</option>
                    <option value="Quarterly">Quarterly (4 periods)</option>
                    <option value="Weekly">Weekly (52 periods)</option>
                    <option value="Bi-Weekly">Bi-Weekly (26 periods)</option>
                    <option value="Annual">Annual (1 period)</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setIsEditMode(false); setSelectedFY(null); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                  >
                    {isEditMode ? "Update Financial Year" : "Create Financial Year"}
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

export default FinancialYearsPage;
