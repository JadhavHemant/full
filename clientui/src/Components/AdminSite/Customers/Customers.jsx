// src/Components/AdminSite/Customers/Customers.jsx
// Customer management component with CRUD operations, filtering, search, and export functionality

import React, { useState, useEffect, useRef } from "react";
// Import Heroicons for UI icons
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
// Import toast notifications
import { toast, Toaster } from "react-hot-toast";
// Import customer service for API calls
import * as customerService from "../../../services/customerService";
// Import portal access hook for permission checking
import { usePortalAccess } from "../../../utils/portalAccess";

/**
 * Customers component
 * Provides full CRUD functionality for customer management including:
 * - List view with pagination, search, and filtering
 * - Create, edit, view, and delete operations
 * - Export to CSV functionality
 * - Active/inactive status toggle
 * - Customer statistics dashboard
 */
const Customers = () => {
  // Check if user has permission for restricted actions
  const { canManageRestrictedActions } = usePortalAccess();
  // State for customers list
  const [customers, setCustomers] = useState([]);
  // State for loading status
  const [loading, setLoading] = useState(false);
  // State for customer statistics
  const [stats, setStats] = useState(null);
  // State for pagination information
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    totalPages: 0,
    currentPage: 1,
  });
  // State for search term
  const [searchTerm, setSearchTerm] = useState("");
  // State for filter options
  const [filters, setFilters] = useState({
    isActive: "",
    customerType: "",
    sortBy: "CreatedAt",
    sortOrder: "DESC",
    includeDeleted: "false",
  });
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  // Form data state
  const [formData, setFormData] = useState({
    Name: "",
    Email: "",
    Phone: "",
    AlternatePhone: "",
    Address: "",
    City: "",
    State: "",
    Country: "India",
    PostalCode: "",
    GSTNumber: "",
    PANNumber: "",
    CustomerType: "Retail",
    CreditLimit: 0,
    Notes: "",
  });
  // Form validation errors state
  const [errors, setErrors] = useState({});
  // Refs to prevent double-fetching on mount
  const isInitialMount = useRef(true);
  const isFiltersInitialMount = useRef(true);

  // Load stats and customers on mount
  useEffect(() => {
    fetchStats();
    fetchCustomers(pagination.limit, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filters change effect
  useEffect(() => {
    if (isFiltersInitialMount.current) {
      isFiltersInitialMount.current = false;
      return;
    }
    fetchCustomers(pagination.limit, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Debounced search effect
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchCustomers(pagination.limit, 0);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  /**
   * Fetch customer statistics from API
   */
  const fetchStats = async () => {
    try {
      const data = await customerService.getCustomerStats();
      setStats(data.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  /**
   * Fetch customers from API with pagination, search, and filters
   * @param {number} limit - Number of items per page
   * @param {number} offset - Offset for pagination
   */
  const fetchCustomers = async (limit = 10, offset = 0) => {
    setLoading(true);
    try {
      const data = await customerService.getAllCustomers({
        limit,
        offset,
        search: searchTerm,
        ...filters,
      });

      setCustomers(data.data || []);

      if (data.pagination) {
        setPagination({
          ...data.pagination,
          totalPages:
            Math.ceil(data.pagination.total / data.pagination.limit) || 1,
          currentPage:
            Math.floor(data.pagination.offset / data.pagination.limit) + 1,
        });
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error(error.response?.data?.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({
      Name: "",
      Email: "",
      Phone: "",
      AlternatePhone: "",
      Address: "",
      City: "",
      State: "",
      Country: "India",
      PostalCode: "",
      GSTNumber: "",
      PANNumber: "",
      CustomerType: "Retail",
      CreditLimit: 0,
      Notes: "",
    });
    setErrors({});
  };

  /**
   * Handle form input changes
   * @param {object} e - Event object
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  /**
   * Validate form data
   * @returns {boolean} True if form is valid
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.Name?.trim()) {
      newErrors.Name = "Customer name is required";
    }

    if (formData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
      newErrors.Email = "Invalid email format";
    }

    // Phone validation (simplified regex)
    if (
      formData.Phone &&
      !/^\d{10}$/.test(formData.Phone.replace(/[\s\-()]/g, ""))
    ) {
      newErrors.Phone = "Phone must be 10 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Open create modal with empty form
   */
  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
    setSelectedCustomer(null);
    setShowModal(true);
  };

  /**
   * Open edit modal with customer data
   * @param {object} customer - Customer object to edit
   */
  const openEditModal = (customer) => {
    setFormData({
      Name: customer.Name || "",
      Email: customer.Email || "",
      Phone: customer.Phone || "",
      AlternatePhone: customer.AlternatePhone || "",
      Address: customer.Address || "",
      City: customer.City || "",
      State: customer.State || "",
      Country: customer.Country || "India",
      PostalCode: customer.PostalCode || "",
      GSTNumber: customer.GSTNumber || "",
      PANNumber: customer.PANNumber || "",
      CustomerType: customer.CustomerType || "Retail",
      CreditLimit: customer.CreditLimit || 0,
      Notes: customer.Notes || "",
    });
    setModalMode("edit");
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  /**
   * Open view modal with customer data (read-only)
   * @param {object} customer - Customer object to view
   */
  const openViewModal = (customer) => {
    setFormData({
      Name: customer.Name || "",
      Email: customer.Email || "",
      Phone: customer.Phone || "",
      AlternatePhone: customer.AlternatePhone || "",
      Address: customer.Address || "",
      City: customer.City || "",
      State: customer.State || "",
      Country: customer.Country || "India",
      PostalCode: customer.PostalCode || "",
      GSTNumber: customer.GSTNumber || "",
      PANNumber: customer.PANNumber || "",
      CustomerType: customer.CustomerType || "Retail",
      CreditLimit: customer.CreditLimit || 0,
      Notes: customer.Notes || "",
    });
    setModalMode("view");
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  /**
   * Handle form submission for create or update
   * @param {object} e - Event object
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modalMode === "view") return;

    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }

    setLoading(true);
    try {
      if (modalMode === "create") {
        await customerService.createCustomer(formData);
        toast.success("Customer created successfully!");
      } else if (modalMode === "edit" && selectedCustomer) {
        await customerService.updateCustomer(selectedCustomer.Id, formData);
        toast.success("Customer updated successfully!");
      }

      setShowModal(false);
      resetForm();
      await fetchCustomers(pagination.limit, pagination.offset);
      await fetchStats();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error(error.response?.data?.message || "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle customer active/inactive status
   * @param {object} customer - Customer object to toggle
   */
  const handleToggleActive = async (customer) => {
    try {
      await customerService.toggleActiveStatus(customer.Id);
      toast.success(
        `Customer ${
          customer.IsActive ? "deactivated" : "activated"
        } successfully!`
      );
      await fetchCustomers(pagination.limit, pagination.offset);
      await fetchStats();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  /**
   * Handle customer deletion (soft delete)
   */
  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setLoading(true);
    try {
      await customerService.softDeleteCustomer(selectedCustomer.Id);
      toast.success("Customer deleted successfully!");
      setShowDeleteModal(false);
      setSelectedCustomer(null);
      await fetchCustomers(pagination.limit, pagination.offset);
      await fetchStats();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error(error.response?.data?.message || "Failed to delete customer");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export customers to CSV file
   */
  const handleExport = () => {
    if (customers.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvContent = [
      "Code,Name,Email,Phone,Type,City,State,Credit Limit,Outstanding,Status",
      ...customers.map((c) =>
        [
          c.CustomerCode || "",
          `"${c.Name || ""}"`,
          c.Email || "",
          c.Phone || "",
          c.CustomerType || "",
          c.City || "",
          c.State || "",
          c.CreditLimit || 0,
          c.OutstandingBalance || 0,
          c.IsActive ? "Active" : "Inactive",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Customers exported successfully!");
  };

  /**
   * Handle pagination page change
   * @param {number} newPage - New page number
   */
  const handlePageChange = (newPage) => {
    const newOffset = (newPage - 1) * pagination.limit;
    fetchCustomers(pagination.limit, newOffset);
  };

  /**
   * Handle items per page limit change
   * @param {number} newLimit - New limit value
   */
  const handleLimitChange = (newLimit) => {
    fetchCustomers(newLimit, 0);
  };

  // Derived values for modal and badges
  const isViewMode = modalMode === "view";
  const modalTitle =
    modalMode === "create"
      ? "Add Customer"
      : modalMode === "edit"
      ? "Edit Customer"
      : "Customer Details";

  /**
   * Get badge color class based on customer type
   * @param {string} type - Customer type
   * @returns {string} CSS class for badge
   */
  const getTypeBadge = (type) => {
    const badges = {
      Retail: "bg-blue-100 text-blue-800",
      Wholesale: "bg-green-100 text-green-800",
      Corporate: "bg-purple-100 text-purple-800",
      Distributor: "bg-orange-100 text-orange-800",
    };
    return badges[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <>
      {/* Toast notification component */}
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            duration: 3000,
            style: { background: "#10B981", color: "#fff" },
          },
          error: {
            duration: 4000,
            style: { background: "#EF4444", color: "#fff" },
          },
        }}
      />

      {/* Main container */}
      <section className="py-1 bg-blueGray-50 min-h-screen">
        <div className="w-full xl:w-11/12 px-4 mx-auto mt-6">
          {/* Statistics cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blueGray-500 font-semibold">
                      Total Customers
                    </p>
                    <p className="text-3xl font-bold text-blueGray-700">
                      {stats.total_customers}
                    </p>
                  </div>
                  <UserGroupIcon className="h-12 w-12 text-blue-500 opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blueGray-500 font-semibold">
                      Active
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {stats.active_customers}
                    </p>
                  </div>
                  <CheckCircleIcon className="h-12 w-12 text-green-500 opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blueGray-500 font-semibold">
                      Retail
                    </p>
                    <p className="text-3xl font-bold text-purple-600">
                      {stats.retail_customers}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blueGray-500 font-semibold">
                      Outstanding
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹
                      {Number(stats.total_outstanding || 0).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 }
                      )}
                    </p>
                  </div>
                  <BanknotesIcon className="h-12 w-12 text-red-500 opacity-50" />
                </div>
              </div>
            </div>
          )}

          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
            {/* Header section with title and action buttons */}
            <div className="rounded-t bg-white mb-0 px-6 py-6">
              <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="h-8 w-8 text-blue-500" />
                  <div className="text-left">
                    <h6 className="text-blueGray-700 text-2xl font-bold">
                      Customers
                    </h6>
                    <p className="text-sm text-blueGray-500">
                      Manage customer information
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {pagination.total} Total
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() =>
                      fetchCustomers(pagination.limit, pagination.offset)
                    }
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                    disabled={loading}
                  >
                    <ArrowPathIcon
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                  {canManageRestrictedActions && (
                    <button
                      onClick={handleExport}
                      className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                      disabled={customers.length === 0}
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Export
                    </button>
                  )}
                  <button
                    onClick={openCreateModal}
                    className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Customer
                  </button>
                </div>
              </div>
            </div>

            {/* Filter section */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Status filter dropdown */}
                <select
                  value={filters.isActive}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      isActive: e.target.value,
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>

                {/* Customer type filter dropdown */}
                <select
                  value={filters.customerType}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      customerType: e.target.value,
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="">All Types</option>
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Distributor">Distributor</option>
                </select>

                {/* Sort by dropdown */}
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, sortBy: e.target.value }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="CreatedAt">Date Added</option>
                  <option value="Name">Name</option>
                  <option value="OutstandingBalance">Outstanding</option>
                </select>

                {/* Sort order dropdown */}
                <select
                  value={filters.sortOrder}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      sortOrder: e.target.value,
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="DESC">Newest First</option>
                  <option value="ASC">Oldest First</option>
                </select>
              </div>

              {/* Search input field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                  placeholder="Search by name, email, phone, or customer code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Customers table */}
            <div className="block w-full overflow-x-auto">
              <table className="items-center w-full bg-transparent border-collapse">
                <thead>
                  <tr>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Customer
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Contact
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Location
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Type
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-right bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Outstanding
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Status
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-blueGray-500">
                            Loading...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8">
                        <UserGroupIcon className="h-12 w-12 mx-auto mb-2 text-blueGray-300" />
                        <p className="text-lg font-semibold text-blueGray-500">
                          No customers found
                        </p>
                        <p className="text-sm text-blueGray-400">
                          Click "Add Customer" to create your first customer
                        </p>
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr
                        key={customer.Id}
                        className="hover:bg-blueGray-50 transition-colors"
                      >
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div>
                            <p className="font-semibold text-blueGray-700">
                              {customer.Name}
                            </p>
                            <p className="text-xs text-blueGray-500">
                              {customer.CustomerCode}
                            </p>
                          </div>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div>
                            <p className="text-blueGray-600">
                              {customer.Phone || "-"}
                            </p>
                            <p className="text-xs text-blueGray-500">
                              {customer.Email || "-"}
                            </p>
                          </div>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div>
                            <p className="text-blueGray-600">
                              {customer.City || "-"}
                            </p>
                            <p className="text-xs text-blueGray-500">
                              {customer.State || "-"}
                            </p>
                          </div>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeBadge(
                              customer.CustomerType
                            )}`}
                          >
                            {customer.CustomerType}
                          </span>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-right">
                          <span
                            className={`font-bold ${
                              customer.OutstandingBalance > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            ₹
                            {Number(
                              customer.OutstandingBalance || 0
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                          <button
                            onClick={() => handleToggleActive(customer)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              customer.IsActive
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            } transition`}
                          >
                            {customer.IsActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openViewModal(customer)}
                              className="text-blue-500 hover:text-blue-700"
                              title="View"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openEditModal(customer)}
                              className="text-green-500 hover:text-green-700"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            {canManageRestrictedActions && (
                              <button
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setShowDeleteModal(true);
                                }}
                                className="text-red-500 hover:text-red-700"
                                title="Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {pagination.total > 0 && (
              <div className="px-6 py-4 border-t border-blueGray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-blueGray-600">Show</label>
                    <select
                      value={pagination.limit}
                      onChange={(e) =>
                        handleLimitChange(Number(e.target.value))
                      }
                      className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                    <span className="text-sm text-blueGray-600">
                      Showing {pagination.offset + 1} to{" "}
                      {Math.min(
                        pagination.offset + customers.length,
                        pagination.total
                      )}{" "}
                      of {pagination.total}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handlePageChange(pagination.currentPage - 1)
                      }
                      disabled={pagination.currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1
                    ).map((page) => {
                      if (
                        page === 1 ||
                        page === pagination.totalPages ||
                        (page >= pagination.currentPage - 1 &&
                          page <= pagination.currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              page === pagination.currentPage
                                ? "text-white bg-blue-500 shadow-md"
                                : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === pagination.currentPage - 2 ||
                        page === pagination.currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    <button
                      onClick={() =>
                        handlePageChange(pagination.currentPage + 1)
                      }
                      disabled={
                        pagination.currentPage === pagination.totalPages
                      }
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Create/Edit/View Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
              <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="h-6 w-6 text-blue-500" />
                  <h3 className="text-xl font-bold text-blueGray-700">
                    {modalTitle}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="col-span-2">
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Customer Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="Name"
                        value={formData.Name}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          errors.Name ? "ring-2 ring-red-500" : ""
                        } ${isViewMode ? "bg-gray-100" : ""}`}
                        placeholder="Enter customer name"
                      />
                      {errors.Name && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.Name}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="Email"
                        value={formData.Email}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          errors.Email ? "ring-2 ring-red-500" : ""
                        } ${isViewMode ? "bg-gray-100" : ""}`}
                        placeholder="email@example.com"
                      />
                      {errors.Email && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.Email}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Phone
                      </label>
                      <input
                        type="text"
                        name="Phone"
                        value={formData.Phone}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          errors.Phone ? "ring-2 ring-red-500" : ""
                        } ${isViewMode ? "bg-gray-100" : ""}`}
                        placeholder="10-digit phone"
                      />
                      {errors.Phone && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.Phone}
                        </p>
                      )}
                    </div>

                    {/* Alternate Phone */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Alternate Phone
                      </label>
                      <input
                        type="text"
                        name="AlternatePhone"
                        value={formData.AlternatePhone}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="Optional"
                      />
                    </div>

                    {/* Customer Type */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Customer Type
                      </label>
                      <select
                        name="CustomerType"
                        value={formData.CustomerType}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                      >
                        <option value="Retail">Retail</option>
                        <option value="Wholesale">Wholesale</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Distributor">Distributor</option>
                      </select>
                    </div>

                    {/* Address */}
                    <div className="col-span-2">
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Address
                      </label>
                      <textarea
                        name="Address"
                        value={formData.Address}
                        onChange={handleChange}
                        rows="2"
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="Street address"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="City"
                        value={formData.City}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="City"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        name="State"
                        value={formData.State}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="State"
                      />
                    </div>

                    {/* Country */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        name="Country"
                        value={formData.Country}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="Country"
                      />
                    </div>

                    {/* Postal Code */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        name="PostalCode"
                        value={formData.PostalCode}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="Postal/ZIP"
                      />
                    </div>

                    {/* GST Number */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        GST Number
                      </label>
                      <input
                        type="text"
                        name="GSTNumber"
                        value={formData.GSTNumber}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="GST Number"
                      />
                    </div>

                    {/* PAN Number */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        name="PANNumber"
                        value={formData.PANNumber}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="PAN Number"
                      />
                    </div>

                    {/* Credit Limit */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Credit Limit
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="CreditLimit"
                        value={formData.CreditLimit}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="0.00"
                      />
                    </div>

                    {/* Notes */}
                    <div className="col-span-2">
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Notes
                      </label>
                      <textarea
                        name="Notes"
                        value={formData.Notes}
                        onChange={handleChange}
                        rows="3"
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
                  {isViewMode && selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedCustomer)}
                      className="bg-emerald-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition"
                  >
                    {isViewMode ? "Close" : "Cancel"}
                  </button>
                  {!isViewMode && (
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md disabled:opacity-50 flex items-center gap-2 transition"
                    >
                      {loading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      {loading
                        ? "Saving..."
                        : modalMode === "create"
                        ? "Add Customer"
                        : "Update"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && canManageRestrictedActions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                <h3 className="text-xl font-bold text-blueGray-700">
                  Delete Customer
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-blueGray-600">
                Are you sure you want to delete this customer? This action can
                be undone later.
              </p>
              {selectedCustomer && (
                <div className="mt-4 bg-blueGray-50 p-3 rounded">
                  <p className="text-sm">
                    <strong>Customer:</strong> {selectedCustomer.Name}
                  </p>
                  <p className="text-sm">
                    <strong>Code:</strong> {selectedCustomer.CustomerCode}
                  </p>
                  <p className="text-sm">
                    <strong>Phone:</strong> {selectedCustomer.Phone || "-"}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCustomer(null);
                }}
                className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Customers;
