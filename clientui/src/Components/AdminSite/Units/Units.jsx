// src/Components/AdminSite/Units/Units.jsx
// Unit management component with CRUD operations, filtering, search, and bulk create functionality

import React, { useState, useEffect, useRef } from 'react';
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
  Square3Stack3DIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
// Import axios instance for API calls
import axiosInstance from '../utils/axiosInstance';
// Import toast notifications
import toast, { Toaster } from 'react-hot-toast';
// Import endpoint constants
import { UNITS } from '../../Endpoint/Endpoint';
// Import TitleBar component
import TitleBar from '../../TitleBar';

/**
 * Units component
 * Provides full CRUD functionality for unit management including:
 * - List view with pagination, search, and filtering
 * - Create, edit, view, and delete operations
 * - Bulk create functionality
 * - Export to CSV functionality
 */
const Units = () => {
  // State for units list
  const [units, setUnits] = useState([]);
  // State for loading status
  const [loading, setLoading] = useState(false);
  // State for pagination information
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    totalPages: 0,
    currentPage: 1
  });
  // State for search term
  const [searchTerm, setSearchTerm] = useState('');
  // State for filter options
  const [filters, setFilters] = useState({
    hasSymbol: '',
    sortBy: 'Id',
    sortOrder: 'DESC'
  });
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  // Form data state
  const [formData, setFormData] = useState({
    Name: '',
    Symbol: ''
  });
  // Bulk create text state
  const [bulkUnitsText, setBulkUnitsText] = useState('');
  // Form validation errors state
  const [formErrors, setFormErrors] = useState({});

  // Refs to prevent double-fetching on mount
  const isInitialMount = useRef(true);
  const isFiltersInitialMount = useRef(true);

  /**
   * Fetch units from API with pagination, search, and filters
   * @param {number} limit - Number of items per page
   * @param {number} offset - Offset for pagination
   * @param {string} search - Search term
   * @param {object} activeFilters - Filter options
   */
  const fetchUnits = async (
    limit = 10,
    offset = 0,
    search = '',
    activeFilters = filters
  ) => {
    setLoading(true);
    console.log(`📡 Fetching units: limit=${limit}, offset=${offset}, search="${search}"`);
    
    try {
      const response = await axiosInstance.get(
        UNITS.GET_ALL({
          limit,
          offset,
          search,
          ...activeFilters
        })
      );
      
      if (response.data) {
        setUnits(response.data.data || []);
        setPagination(response.data.pagination || {});
        console.log(`✅ Fetched ${response.data.data?.length || 0} units`);
      }
    } catch (error) {
      console.error('❌ Error fetching units:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch units');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch units ONCE on mount
  useEffect(() => {
    fetchUnits(pagination.limit, 0, searchTerm, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFiltersInitialMount.current) {
      isFiltersInitialMount.current = false;
      return;
    }

    fetchUnits(pagination.limit, 0, searchTerm, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ✅ Debounced search (but NOT on mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const delayDebounce = setTimeout(() => {
      fetchUnits(pagination.limit, 0, searchTerm, filters);
    }, 500);

    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  /**
   * Validate form data
   * @returns {boolean} True if form is valid
   */
  const validateForm = () => {
    const errors = {};
    
    if (!formData.Name.trim()) {
      errors.Name = 'Unit name is required';
    } else if (formData.Name.length > 50) {
      errors.Name = 'Unit name must not exceed 50 characters';
    }

    if (formData.Symbol && formData.Symbol.length > 10) {
      errors.Symbol = 'Symbol must not exceed 10 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle unit creation
   * @param {object} e - Event object
   */
  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post(UNITS.CREATE, formData);
      
      toast.success('Unit created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchUnits(pagination.limit, pagination.offset, searchTerm);
    } catch (error) {
      console.error('Error creating unit:', error);
      toast.error(error.response?.data?.message || 'Failed to create unit');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle unit update
   * @param {object} e - Event object
   */
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.put(UNITS.UPDATE(selectedUnit.Id), formData);
      
      toast.success('Unit updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchUnits(pagination.limit, pagination.offset, searchTerm);
    } catch (error) {
      console.error('Error updating unit:', error);
      toast.error(error.response?.data?.message || 'Failed to update unit');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle unit deletion
   */
  const handleDelete = async () => {
    setLoading(true);
    try {
      await axiosInstance.delete(UNITS.SOFT_DELETE(selectedUnit.Id));
      
      toast.success('Unit deleted successfully!');
      setShowDeleteModal(false);
      setSelectedUnit(null);
      fetchUnits(pagination.limit, pagination.offset, searchTerm);
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast.error(error.response?.data?.message || 'Failed to delete unit');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle bulk unit creation from text input
   * @param {object} e - Event object
   */
  const handleBulkCreate = async (e) => {
    e.preventDefault();
    
    if (!bulkUnitsText.trim()) {
      toast.error('Please enter units data');
      return;
    }

    // Parse bulk text (format: Name, Symbol per line)
    const lines = bulkUnitsText.trim().split('\n');
    const unitsArray = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        Name: parts[0] || '',
        Symbol: parts[1] || ''
      };
    }).filter(unit => unit.Name);

    if (unitsArray.length === 0) {
      toast.error('No valid units found');
      return;
    }

    if (unitsArray.length > 50) {
      toast.error('Cannot create more than 50 units at once');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post(UNITS.BULK_CREATE, { units: unitsArray });
      
      toast.success(`Created ${response.data.created} units successfully!`);
      if (response.data.failed > 0) {
        toast.error(`Failed to create ${response.data.failed} units`);
      }
      setShowBulkCreateModal(false);
      setBulkUnitsText('');
      fetchUnits(pagination.limit, pagination.offset, searchTerm);
    } catch (error) {
      console.error('Error bulk creating units:', error);
      toast.error(error.response?.data?.message || 'Failed to create units');
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (units.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['ID', 'Unit Name', 'Symbol'],
      ...units.map(unit => [
        unit.Id,
        unit.Name,
        unit.Symbol || ''
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `units-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Units exported successfully!');
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({ Name: '', Symbol: '' });
    setFormErrors({});
    setSelectedUnit(null);
  };

  // Open Edit Modal
  const openEditModal = (unit) => {
    setSelectedUnit(unit);
    setFormData({
      Name: unit.Name,
      Symbol: unit.Symbol || ''
    });
    setShowEditModal(true);
  };

  /**
   * Open delete modal with unit data
   * @param {object} unit - Unit object to delete
   */
  const openDeleteModal = (unit) => {
    setSelectedUnit(unit);
    setShowDeleteModal(true);
  };

  // Open View Modal
  const openViewModal = (unit) => {
    setSelectedUnit(unit);
    setShowViewModal(true);
  };

  /**
   * Handle pagination page change
   * @param {number} newPage - New page number
   */
  const handlePageChange = (newPage) => {
    const newOffset = (newPage - 1) * pagination.limit;
    fetchUnits(pagination.limit, newOffset, searchTerm);
  };

  /**
   * Handle items per page limit change
   * @param {number} newLimit - New limit value
   */
  const handleLimitChange = (newLimit) => {
    fetchUnits(newLimit, 0, searchTerm);
  };

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
              color: '#fff',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#EF4444',
              color: '#fff',
            },
          },
        }}
      />
      
      {/* Main container */}
      <section className="py-1 bg-blueGray-50 min-h-screen">
        <div className="w-full xl:w-10/12 px-4 mx-auto mt-6">
          {/* Header Card */}
          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
            <div className="rounded-t bg-white mb-0 px-6 py-6">
              <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <Square3Stack3DIcon className="h-8 w-8 text-pink-500" />
                  <div className="text-left">
                    <h6 className="text-blueGray-700 text-2xl font-bold">
                      Units Management
                    </h6>
                    <p className="text-sm text-blueGray-500">
                      Manage measurement units
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {pagination.total} Total
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => fetchUnits(pagination.limit, pagination.offset, searchTerm)}
                    className="bg-gray-500 text-white active:bg-gray-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 flex items-center gap-2"
                    disabled={loading}
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  
                  <button
                    onClick={handleExport}
                    className="bg-green-500 text-white active:bg-green-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 flex items-center gap-2"
                    disabled={units.length === 0}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Export CSV
                  </button>

                  <button
                    onClick={() => setShowBulkCreateModal(true)}
                    className="bg-purple-500 text-white active:bg-purple-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 flex items-center gap-2"
                  >
                    <DocumentPlusIcon className="h-4 w-4" />
                    Bulk Create
                  </button>
                  
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-pink-500 text-white active:bg-pink-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Unit
                  </button>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <select
                  value={filters.hasSymbol}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      hasSymbol: e.target.value
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="">All Symbols</option>
                  <option value="true">With Symbol</option>
                  <option value="false">Without Symbol</option>
                </select>

                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      sortBy: e.target.value
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="Id">ID</option>
                  <option value="Name">Unit Name</option>
                  <option value="CreatedAt">Date Added</option>
                </select>

                <select
                  value={filters.sortOrder}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      sortOrder: e.target.value
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="DESC">Descending</option>
                  <option value="ASC">Ascending</option>
                </select>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  placeholder="Search by unit name or symbol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="block w-full overflow-x-auto">
              <table className="items-center w-full bg-transparent border-collapse">
                <thead>
                  <tr>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      ID
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Unit Name
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Symbol
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                          <span className="ml-2 text-blueGray-500">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : units.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-blueGray-500">
                          <ExclamationTriangleIcon className="h-12 w-12 mb-2 text-blueGray-300" />
                          <p className="text-lg font-semibold">No units found</p>
                          <p className="text-sm">
                            {searchTerm ? 'Try adjusting your search' : 'Click "Add Unit" to create one'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    units.map((unit) => (
                      <tr key={unit.Id} className="hover:bg-blueGray-50 transition-colors">
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <span className="font-bold text-blueGray-600">{unit.Id}</span>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <span className="font-semibold text-blueGray-700">
                            {unit.Name}
                          </span>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          {unit.Symbol ? (
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded">
                              {unit.Symbol}
                            </span>
                          ) : (
                            <span className="italic text-blueGray-400">No symbol</span>
                          )}
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openViewModal(unit)}
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title="View Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openEditModal(unit)}
                              className="text-green-500 hover:text-green-700 transition-colors"
                              title="Edit Unit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(unit)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Delete Unit"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="px-6 py-4 border-t border-blueGray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-blueGray-600">Show:</label>
                    <select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(Number(e.target.value))}
                      className="border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring ease-linear transition-all duration-150"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                    <span className="text-sm text-blueGray-600">
                      Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevious}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    
                    {[...Array(pagination.totalPages)].map((_, index) => {
                      const page = index + 1;
                      if (
                        page === 1 ||
                        page === pagination.totalPages ||
                        (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                              page === pagination.currentPage
                                ? 'text-white bg-pink-500 shadow-md'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === pagination.currentPage - 2 ||
                        page === pagination.currentPage + 2
                      ) {
                        return <span key={page} className="px-2 text-gray-500">...</span>;
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNext}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-8 flex flex-col animate-fadeIn">
              <TitleBar title="Create New Unit" onClose={() => { setShowCreateModal(false); resetForm(); }} />
              
              <form onSubmit={handleCreate} className="p-6">
                <div className="mb-4">
                  <label className="block text-blueGray-600 text-sm font-bold mb-2">
                    Unit Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.Name}
                    onChange={(e) => {
                      setFormData({ ...formData, Name: e.target.value });
                      if (formErrors.Name) {
                        setFormErrors({ ...formErrors, Name: '' });
                      }
                    }}
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                      formErrors.Name ? 'ring-2 ring-red-500' : ''
                    }`}
                    placeholder="e.g., Kilogram"
                    maxLength="50"
                  />
                  {formErrors.Name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.Name}</p>
                  )}
                  <p className="text-blueGray-400 text-xs mt-1">
                    {formData.Name.length}/50 characters
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-blueGray-600 text-sm font-bold mb-2">
                    Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.Symbol}
                    onChange={(e) => {
                      setFormData({ ...formData, Symbol: e.target.value });
                      if (formErrors.Symbol) {
                        setFormErrors({ ...formErrors, Symbol: '' });
                      }
                    }}
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                      formErrors.Symbol ? 'ring-2 ring-red-500' : ''
                    }`}
                    placeholder="e.g., kg"
                    maxLength="10"
                  />
                  {formErrors.Symbol && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.Symbol}</p>
                  )}
                  <p className="text-blueGray-400 text-xs mt-1">
                    {formData.Symbol.length}/10 characters (Optional)
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-pink-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {loading ? 'Creating...' : 'Create Unit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-8 flex flex-col animate-fadeIn">
              <TitleBar title="Edit Unit" onClose={() => { setShowEditModal(false); resetForm(); }} />
              
              <form onSubmit={handleUpdate} className="p-6">
                <div className="mb-4">
                  <label className="block text-blueGray-600 text-sm font-bold mb-2">
                    Unit Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.Name}
                    onChange={(e) => {
                      setFormData({ ...formData, Name: e.target.value });
                      if (formErrors.Name) {
                        setFormErrors({ ...formErrors, Name: '' });
                      }
                    }}
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                      formErrors.Name ? 'ring-2 ring-red-500' : ''
                    }`}
                    placeholder="e.g., Kilogram"
                    maxLength="50"
                  />
                  {formErrors.Name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.Name}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-blueGray-600 text-sm font-bold mb-2">
                    Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.Symbol}
                    onChange={(e) => {
                      setFormData({ ...formData, Symbol: e.target.value });
                      if (formErrors.Symbol) {
                        setFormErrors({ ...formErrors, Symbol: '' });
                      }
                    }}
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                      formErrors.Symbol ? 'ring-2 ring-red-500' : ''
                    }`}
                    placeholder="e.g., kg"
                    maxLength="10"
                  />
                  {formErrors.Symbol && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.Symbol}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {loading ? 'Updating...' : 'Update Unit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedUnit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-8 flex flex-col animate-fadeIn">
              <TitleBar title="Unit Details" onClose={() => setShowViewModal(false)} />
              
              <div className="p-6 space-y-4">
                <div className="flex items-start">
                  <span className="inline-block w-32 text-blueGray-600 text-sm font-bold">ID:</span>
                  <span className="text-blueGray-700 font-semibold">{selectedUnit.Id}</span>
                </div>

                <div className="flex items-start">
                  <span className="inline-block w-32 text-blueGray-600 text-sm font-bold">Unit Name:</span>
                  <span className="text-blueGray-700 font-semibold">{selectedUnit.Name}</span>
                </div>

                <div className="flex items-start">
                  <span className="inline-block w-32 text-blueGray-600 text-sm font-bold">Symbol:</span>
                  {selectedUnit.Symbol ? (
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded">
                      {selectedUnit.Symbol}
                    </span>
                  ) : (
                    <span className="italic text-blueGray-400">No symbol</span>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      openEditModal(selectedUnit);
                    }}
                    className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 flex items-center gap-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUnit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-8 flex flex-col animate-fadeIn">
              <TitleBar title="Delete Unit" onClose={() => { setShowDeleteModal(false); setSelectedUnit(null); }} />
              <div className="p-6">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                </div>
                
                <h3 className="text-xl font-bold text-center text-blueGray-700 mb-2">
                  Delete Unit
                </h3>
                
                <p className="text-center text-blueGray-600 mb-6">
                  Are you sure you want to delete "<strong className="text-blueGray-800">{selectedUnit.Name}</strong>"? 
                  <br />
                  <span className="text-sm text-blueGray-500 mt-2 inline-block">
                    This action will mark it as deleted.
                  </span>
                </p>

                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedUnit(null);
                    }}
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="bg-red-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 animate-fadeIn">
              <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
                <div>
                  <h3 className="text-xl font-bold text-blueGray-700">Bulk Create Units</h3>
                  <p className="text-sm text-blueGray-500 mt-1">Create multiple units at once (max 50)</p>
                </div>
                <button
                  onClick={() => {
                    setShowBulkCreateModal(false);
                    setBulkUnitsText('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleBulkCreate}>
                <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                  <div className="mb-4">
                    <label className="block text-blueGray-600 text-sm font-bold mb-2">
                      Enter Units (One per line, format: Name, Symbol)
                    </label>
                    <textarea
                      value={bulkUnitsText}
                      onChange={(e) => setBulkUnitsText(e.target.value)}
                      className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full font-mono"
                      placeholder="Kilogram, kg&#10;Gram, g&#10;Liter, L&#10;Meter, m&#10;Piece, pcs"
                      rows="10"
                    />
                    <p className="text-blueGray-400 text-xs mt-2">
                      Format: Each line should contain unit name and symbol separated by comma.
                      Example: <code className="bg-gray-100 px-1">Kilogram, kg</code>
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkCreateModal(false);
                      setBulkUnitsText('');
                    }}
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {loading ? 'Creating...' : 'Create Units'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default Units;

