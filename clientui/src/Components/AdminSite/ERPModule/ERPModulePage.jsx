import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import { ERP } from "../../Endpoint/Endpoint";
import TitleBar from "../../TitleBar";

const ERPModulePage = ({ moduleType, title, icon }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formFields, setFormFields] = useState({});
  const limit = 20;

  const getEndpoint = useCallback(() => {
    const endpoints = {
      departments: ERP.DEPARTMENTS,
      designations: ERP.DESIGNATIONS,
      employees: ERP.EMPLOYEES,
      "purchase-requisitions": ERP.PURCHASE_REQUISITIONS,
      "purchase-returns": ERP.PURCHASE_RETURNS,
      "sales-quotations": ERP.SALES_QUOTATIONS,
      "delivery-challans": ERP.DELIVERY_CHALLANS,
      "sales-returns": ERP.SALES_RETURNS,
      bom: ERP.BOM,
      "production-orders": ERP.PRODUCTION_ORDERS,
      expenses: ERP.EXPENSES,
      approvals: ERP.APPROVALS,
      racks: ERP.RACKS,
      bins: ERP.BINS,
    };
    return endpoints[moduleType];
  }, [moduleType]);

  const getFieldConfig = useCallback(() => {
    const configs = {
      departments: [
        { key: "Name", label: "Department Name", type: "text", required: true },
        { key: "Code", label: "Code", type: "text" },
        { key: "Description", label: "Description", type: "textarea" },
      ],
      designations: [
        { key: "Name", label: "Designation Name", type: "text", required: true },
        { key: "Code", label: "Code", type: "text" },
        { key: "Description", label: "Description", type: "textarea" },
      ],
      employees: [
        { key: "EmployeeCode", label: "Employee Code", type: "text", required: true },
        { key: "FirstName", label: "First Name", type: "text", required: true },
        { key: "LastName", label: "Last Name", type: "text", required: true },
        { key: "Email", label: "Email", type: "email" },
        { key: "Phone", label: "Phone", type: "text" },
        { key: "Gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
        { key: "DateOfJoining", label: "Date of Joining", type: "date" },
        { key: "BasicSalary", label: "Basic Salary", type: "number" },
      ],
      "purchase-requisitions": [
        { key: "Priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"] },
        { key: "RequiredByDate", label: "Required By", type: "date" },
        { key: "Remarks", label: "Remarks", type: "textarea" },
      ],
      "purchase-returns": [
        { key: "ReturnDate", label: "Return Date", type: "date" },
        { key: "Reason", label: "Reason", type: "textarea" },
      ],
      "sales-quotations": [
        { key: "ValidUntil", label: "Valid Until", type: "date" },
        { key: "Terms", label: "Terms & Conditions", type: "textarea" },
        { key: "Notes", label: "Notes", type: "textarea" },
      ],
      "delivery-challans": [
        { key: "DeliveryDate", label: "Delivery Date", type: "date" },
        { key: "VehicleNumber", label: "Vehicle Number", type: "text" },
        { key: "DriverName", label: "Driver Name", type: "text" },
        { key: "DriverPhone", label: "Driver Phone", type: "text" },
        { key: "ShippingAddress", label: "Shipping Address", type: "textarea" },
        { key: "Notes", label: "Notes", type: "textarea" },
      ],
      "sales-returns": [
        { key: "ReturnDate", label: "Return Date", type: "date" },
        { key: "Reason", label: "Reason", type: "textarea" },
      ],
      bom: [
        { key: "BOMCode", label: "BOM Code", type: "text" },
        { key: "ProductName", label: "Product Name", type: "text" },
        { key: "Version", label: "Version", type: "text" },
        { key: "Quantity", label: "Quantity", type: "number" },
        { key: "Description", label: "Description", type: "textarea" },
      ],
      "production-orders": [
        { key: "OrderNumber", label: "Order Number", type: "text" },
        { key: "PlannedQuantity", label: "Planned Quantity", type: "number", required: true },
        { key: "Priority", label: "Priority", type: "select", options: ["Low", "Medium", "High"] },
        { key: "PlannedStartDate", label: "Planned Start Date", type: "date" },
        { key: "PlannedEndDate", label: "Planned End Date", type: "date" },
        { key: "Remarks", label: "Remarks", type: "textarea" },
      ],
      expenses: [
        { key: "Category", label: "Category", type: "text" },
        { key: "Description", label: "Description", type: "textarea" },
        { key: "Amount", label: "Amount", type: "number", required: true },
        { key: "TaxAmount", label: "Tax Amount", type: "number" },
        { key: "ExpenseDate", label: "Expense Date", type: "date" },
        { key: "PaymentMode", label: "Payment Mode", type: "select", options: ["Cash", "Bank Transfer", "Credit Card", "UPI", "Cheque"] },
        { key: "Notes", label: "Notes", type: "textarea" },
      ],
      approvals: [],
      racks: [
        { key: "RackNumber", label: "Rack Number", type: "text", required: true },
        { key: "Name", label: "Name", type: "text" },
        { key: "Description", label: "Description", type: "text" },
        { key: "Capacity", label: "Capacity", type: "number" },
      ],
      bins: [
        { key: "BinNumber", label: "Bin Number", type: "text", required: true },
        { key: "Name", label: "Name", type: "text" },
        { key: "ShelfNumber", label: "Shelf Number", type: "text" },
        { key: "Description", label: "Description", type: "text" },
        { key: "MaxCapacity", label: "Max Capacity", type: "number" },
      ],
    };
    return configs[moduleType] || [];
  }, [moduleType]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = getEndpoint();
      if (!endpoint) return;
      const params = { limit, offset: (page - 1) * limit, search };
      if (statusFilter) params.status = statusFilter;
      const url = endpoint.GET_ALL ? (typeof endpoint.GET_ALL === 'function' ? endpoint.GET_ALL(params) : endpoint.BASE) : endpoint.BASE;
      const response = await axiosInstance.get(url);
      setData(response.data?.data || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [moduleType, page, search, statusFilter, getEndpoint]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (formData) => {
    try {
      const endpoint = getEndpoint();
      await axiosInstance.post(endpoint.CREATE || endpoint.BASE, formData);
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error("Failed to create:", error);
      alert(error.response?.data?.message || "Failed to create");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const endpoint = getEndpoint();
      await axiosInstance.delete(endpoint.DELETE(id));
      fetchData();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const endpoint = getEndpoint();
      const url = endpoint.UPDATE_STATUS ? endpoint.UPDATE_STATUS(id) : `${endpoint.BASE}/${id}/status`;
      await axiosInstance.put(url, { Status: status });
      fetchData();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const columns = {
    departments: [
      { key: "Name", label: "Name" },
      { key: "Code", label: "Code" },
      { key: "Description", label: "Description" },
      { key: "EmployeeCount", label: "Employees" },
      { key: "IsActive", label: "Status", type: "badge" },
    ],
    designations: [
      { key: "Name", label: "Name" },
      { key: "Code", label: "Code" },
      { key: "DepartmentName", label: "Department" },
      { key: "IsActive", label: "Status", type: "badge" },
    ],
    employees: [
      { key: "EmployeeCode", label: "Code" },
      { key: "FirstName", label: "First Name" },
      { key: "LastName", label: "Last Name" },
      { key: "Email", label: "Email" },
      { key: "Phone", label: "Phone" },
      { key: "DepartmentName", label: "Department" },
      { key: "DesignationName", label: "Designation" },
      { key: "IsActive", label: "Status", type: "badge" },
    ],
    "purchase-requisitions": [
      { key: "RequisitionNumber", label: "Number" },
      { key: "Priority", label: "Priority", type: "badge" },
      { key: "Status", label: "Status", type: "badge" },
      { key: "RequiredByDate", label: "Required By" },
      { key: "CreatedAt", label: "Created", type: "date" },
    ],
    "purchase-returns": [
      { key: "ReturnNumber", label: "Number" },
      { key: "SupplierName", label: "Supplier" },
      { key: "Status", label: "Status", type: "badge" },
      { key: "ReturnDate", label: "Return Date", type: "date" },
      { key: "GrandTotal", label: "Amount", type: "currency" },
    ],
    "sales-quotations": [
      { key: "QuotationNumber", label: "Number" },
      { key: "CustomerName", label: "Customer" },
      { key: "Status", label: "Status", type: "badge" },
      { key: "GrandTotal", label: "Amount", type: "currency" },
      { key: "ValidUntil", label: "Valid Until", type: "date" },
    ],
    "delivery-challans": [
      { key: "ChallanNumber", label: "Number" },
      { key: "CustomerName", label: "Customer" },
      { key: "Status", label: "Status", type: "badge" },
      { key: "DeliveryDate", label: "Delivery Date", type: "date" },
      { key: "TotalItems", label: "Items" },
    ],
    "sales-returns": [
      { key: "ReturnNumber", label: "Number" },
      { key: "CustomerName", label: "Customer" },
      { key: "Status", label: "Status", type: "badge" },
      { key: "ReturnDate", label: "Return Date", type: "date" },
      { key: "GrandTotal", label: "Amount", type: "currency" },
    ],
    bom: [
      { key: "BOMCode", label: "Code" },
      { key: "ProductName", label: "Product" },
      { key: "Version", label: "Version" },
      { key: "Quantity", label: "Qty" },
      { key: "IsActive", label: "Status", type: "badge" },
    ],
    "production-orders": [
      { key: "OrderNumber", label: "Order #" },
      { key: "ProductName", label: "Product" },
      { key: "PlannedQuantity", label: "Planned" },
      { key: "ProducedQuantity", label: "Produced" },
      { key: "Status", label: "Status", type: "badge" },
      { key: "Priority", label: "Priority", type: "badge" },
    ],
    expenses: [
      { key: "ExpenseNumber", label: "Number" },
      { key: "Category", label: "Category" },
      { key: "TotalAmount", label: "Amount", type: "currency" },
      { key: "PaymentMode", label: "Payment" },
      { key: "Status", label: "Status", type: "badge" },
      { key: "ExpenseDate", label: "Date", type: "date" },
    ],
    approvals: [
      { key: "WorkflowName", label: "Workflow" },
      { key: "ModuleType", label: "Module" },
      { key: "RequestedByName", label: "Requested By" },
      { key: "Status", label: "Status", type: "badge" },
      { key: "Priority", label: "Priority", type: "badge" },
      { key: "CreatedAt", label: "Date", type: "date" },
    ],
    racks: [
      { key: "RackNumber", label: "Rack #" },
      { key: "Name", label: "Name" },
      { key: "WarehouseName", label: "Warehouse" },
      { key: "Capacity", label: "Capacity" },
    ],
    bins: [
      { key: "BinNumber", label: "Bin #" },
      { key: "ShelfNumber", label: "Shelf" },
      { key: "WarehouseName", label: "Warehouse" },
      { key: "RackNumber", label: "Rack" },
      { key: "MaxCapacity", label: "Capacity" },
    ],
  };

  const getBadgeColor = (value) => {
    const colors = {
      "Draft": "bg-gray-100 text-gray-800",
      "Pending": "bg-yellow-100 text-yellow-800",
      "Approved": "bg-green-100 text-green-800",
      "Rejected": "bg-red-100 text-red-800",
      "Active": "bg-green-100 text-green-800",
      "In Progress": "bg-blue-100 text-blue-800",
      "Completed": "bg-green-100 text-green-800",
      "Cancelled": "bg-red-100 text-red-800",
      "Delivered": "bg-green-100 text-green-800",
      "Processing": "bg-blue-100 text-blue-800",
      "Planned": "bg-purple-100 text-purple-800",
      "Low": "bg-gray-100 text-gray-800",
      "Medium": "bg-yellow-100 text-yellow-800",
      "High": "bg-orange-100 text-orange-800",
      "Urgent": "bg-red-100 text-red-800",
    };
    return colors[value] || "bg-gray-100 text-gray-800";
  };

  const cols = columns[moduleType] || [];
  const fieldConfig = getFieldConfig();
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{icon} {title}</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total records</p>
        </div>
        {moduleType !== "approvals" && (
          <button
            onClick={() => { setEditingItem(null); setShowForm(true); }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            + Add New
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
        {moduleType !== "approvals" && (
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  {cols.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{col.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={item.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * limit + index + 1}</td>
                    {cols.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm">
                        {col.type === "badge" ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(item[col.key])}`}>
                            {item[col.key] || '-'}
                          </span>
                        ) : col.type === "date" ? (
                          <span className="text-gray-600">{item[col.key] ? new Date(item[col.key]).toLocaleDateString() : '-'}</span>
                        ) : col.type === "currency" ? (
                          <span className="font-medium">₹{Number(item[col.key] || 0).toLocaleString()}</span>
                        ) : col.key === "IsActive" ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item[col.key] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item[col.key] ? 'Active' : 'Inactive'}
                          </span>
                        ) : (
                          <span className="text-gray-900">{item[col.key] || '-'}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex gap-1 justify-end">
                        {moduleType === "approvals" && item.Status === "Pending" && (
                          <>
                            <button onClick={() => handleStatusUpdate(item.Id, "Approved")} className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 rounded bg-green-50">Approve</button>
                            <button onClick={() => handleStatusUpdate(item.Id, "Rejected")} className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded bg-red-50">Reject</button>
                          </>
                        )}
                        {moduleType !== "approvals" && (
                          <button onClick={() => handleDelete(item.Id)} className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded bg-red-50">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl max-h-[90vh] mx-4">
            <TitleBar title={editingItem ? `Edit ${title}` : `New ${title}`} onClose={() => setShowForm(false)} />
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = {};
                const fd = new FormData(e.target);
                fd.forEach((value, key) => { if (value) formData[key] = value; });
                handleCreate(formData);
              }}>
                <div className="space-y-4">
                  {fieldConfig.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.required && <span className="text-red-500">*</span>}</label>
                      {field.type === "textarea" ? (
                        <textarea name={field.key} required={field.required} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" rows={3} />
                      ) : field.type === "select" ? (
                        <select name={field.key} required={field.required} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500">
                          <option value="">Select...</option>
                          {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input type={field.type} name={field.key} required={field.required} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-6 p-6 pt-0">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">Create</button>
                </div>
              </form>
            </div>
          {/* </div> */}
        </div>
      )}
    </div>
  );
};

export default ERPModulePage;