// src/Components/AdminSite/Company/Company.jsx
// Company management component with CRUD operations, filtering, search, and export functionality

import React, { useState, useEffect, useRef } from 'react';
// Import Heroicons for UI icons
import {
    PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
    ArrowPathIcon, ArrowDownTrayIcon, EyeIcon, XMarkIcon,
    BuildingOfficeIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
// Import toast notifications
import toast, { Toaster } from 'react-hot-toast';
// Import company service for API calls
import * as companyService from '../../../services/companyService';
// Import asset URL resolver utility
import { resolveAssetUrl } from '../../../utils/assetUrl';
import { compressImageFile, formatFileSize } from '../../../utils/imageCompression';
import TitleBar from '../../TitleBar';

/**
 * Company component
 * Provides full CRUD functionality for company management including:
 * - List view with pagination, search, and filtering
 * - Create, edit, view, and delete operations
 * - Export to CSV functionality
 * - Active/inactive status toggle
 */
const Company = () => {
    // State for companies list
    const [companies, setCompanies] = useState([]);
    // State for loading status
    const [loading, setLoading] = useState(false);
    // State for pagination information
    const [pagination, setPagination] = useState({
        total: 0, limit: 10, offset: 0, totalPages: 0, currentPage: 1,
        hasNext: false, hasPrevious: false
    });
    // State for search term
    const [searchTerm, setSearchTerm] = useState('');
    // State for filter options
    const [filters, setFilters] = useState({
        isActive: '',
        state: '',
        city: '',
        sortBy: 'CreatedAt',
        sortOrder: 'DESC'
    });

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);

    // Form data state
    const [formData, setFormData] = useState({
        CompanyName: '', BusinessType: '', GstNumber: '', Address: '',
        City: '', State: '', Country: 'India', PostalCode: '', Website: '',
        OwnerName: '', Email: '', Phone: '', logo: null, IsActive: true, Flag: false
    });

    // Logo preview state
    const [logoPreview, setLogoPreview] = useState(null);
    // Form validation errors state
    const [errors, setErrors] = useState({});

    // Refs to prevent double-fetching on mount
    const isInitialMount = useRef(true);
    const isFiltersInitialMount = useRef(true);

    /**
     * Fetch companies from API with pagination, search, and filters
     * @param {number} limit - Number of items per page
     * @param {number} offset - Offset for pagination
     * @param {string} search - Search term
     * @param {object} activeFilters - Filter options
     */
    const fetchCompanies = useRef(async (limit = 10, offset = 0, search = '', activeFilters = filters) => {
        setLoading(true);
        try {
            const data = await companyService.getCompanies({
                limit,
                offset,
                search,
                ...activeFilters
            });
            setCompanies(data.data || []);

            const total = data.pagination?.total || 0;
            const currentLimit = Number(data.pagination?.limit || limit);
            const currentOffset = data.pagination?.offset !== undefined
                ? Number(data.pagination.offset)
                : ((Number(data.pagination?.page || 1) - 1) * currentLimit);
            const totalPages = Math.ceil(total / currentLimit) || 1;
            const currentPage = Number(data.pagination?.page || (Math.floor(currentOffset / currentLimit) + 1));

            setPagination({
                total,
                limit: currentLimit,
                offset: currentOffset,
                totalPages,
                currentPage,
                hasNext: data.pagination?.hasNext || currentPage < totalPages,
                hasPrevious: data.pagination?.hasPrevious || currentPage > 1
            });
        } catch (error) {
            console.error('Error fetching companies:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch companies');
        } finally {
            setLoading(false);
        }
    }).current;

    useEffect(() => {
        fetchCompanies(10, 0, '', filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isFiltersInitialMount.current) {
            isFiltersInitialMount.current = false;
            return;
        }
        fetchCompanies(pagination.limit, 0, searchTerm, filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const delayDebounce = setTimeout(() => {
            fetchCompanies(pagination.limit, 0, searchTerm, filters);
        }, 500);

        return () => clearTimeout(delayDebounce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    /**
     * Reset form to initial state
     */
    const resetForm = () => {
        setFormData({
            CompanyName: '', BusinessType: '', GstNumber: '', Address: '',
            City: '', State: '', Country: 'India', PostalCode: '', Website: '',
            OwnerName: '', Email: '', Phone: '', logo: null, IsActive: true, Flag: false
        });
        setLogoPreview(null);
        setErrors({});
    };

    /**
     * Handle form input changes
     * @param {object} e - Event object
     */
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    /**
     * Handle logo file upload with validation
     * @param {object} e - Event object
     */
    const handleLogoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Only JPEG, PNG, and WEBP images allowed');
                return;
            }
            try {
                const compressedFile = await compressImageFile(file);
                setFormData(prev => ({ ...prev, logo: compressedFile }));
                const reader = new FileReader();
                reader.onloadend = () => setLogoPreview(reader.result);
                reader.readAsDataURL(compressedFile);
                if (compressedFile.size < file.size) {
                    toast.success(`Logo optimized from ${formatFileSize(file.size)} to ${formatFileSize(compressedFile.size)}`);
                }
            } catch (error) {
                e.target.value = '';
                toast.error(error.message || 'Unable to optimize logo');
            }
        }
    };

    /**
     * Validate form data
     * @returns {boolean} True if form is valid
     */
    const validateForm = () => {
        const newErrors = {};
        if (!formData.CompanyName.trim()) newErrors.CompanyName = 'Company name is required';
        if (!formData.Email.trim()) {
            newErrors.Email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
            newErrors.Email = 'Invalid email format';
        }
        if (formData.Phone && !/^[6-9]\d{9}$/.test(formData.Phone)) {
            newErrors.Phone = 'Invalid phone number';
        }
        if (formData.GstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.GstNumber.toUpperCase())) {
            newErrors.GstNumber = 'Invalid GST format';
        }
        if (formData.PostalCode && !/^\d{6}$/.test(formData.PostalCode)) {
            newErrors.PostalCode = 'Invalid postal code';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Open create modal with empty form
     */
    const openCreateModal = () => {
        resetForm();
        setModalMode('create');
        setSelectedCompany(null);
        setShowModal(true);
    };

    /**
     * Open edit modal with company data
     * @param {object} company - Company object to edit
     */
    const openEditModal = (company) => {
        setFormData({
            CompanyName: company.CompanyName || '', BusinessType: company.BusinessType || '',
            GstNumber: company.GstNumber || '', Address: company.Address || '',
            City: company.City || '', State: company.State || '',
            Country: company.Country || 'India', PostalCode: company.PostalCode || '',
            Website: company.Website || '', OwnerName: company.OwnerName || '',
            Email: company.Email || '', Phone: company.Phone || '',
            logo: null, IsActive: company.IsActive, Flag: company.Flag
        });
        // Use shared asset URL resolver for uploaded logos.
        if (company.LogoUrl) {
            setLogoPreview(resolveAssetUrl(company.LogoUrl));
        }
        setModalMode('edit');
        setSelectedCompany(company);
        setShowModal(true);
    };

    /**
     * Open view modal with company data (read-only)
     * @param {object} company - Company object to view
     */
    const openViewModal = (company) => {
        setFormData({
            CompanyName: company.CompanyName || '', BusinessType: company.BusinessType || '',
            GstNumber: company.GstNumber || '', Address: company.Address || '',
            City: company.City || '', State: company.State || '',
            Country: company.Country || 'India', PostalCode: company.PostalCode || '',
            Website: company.Website || '', OwnerName: company.OwnerName || '',
            Email: company.Email || '', Phone: company.Phone || '',
            logo: null, IsActive: company.IsActive, Flag: company.Flag
        });
        // Use shared asset URL resolver for uploaded logos.
        if (company.LogoUrl) {
            setLogoPreview(resolveAssetUrl(company.LogoUrl));
        }
        setModalMode('view');
        setSelectedCompany(company);
        setShowModal(true);
    };

    /**
     * Handle form submission for create or update
     * @param {object} e - Event object
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (modalMode === 'view') return;

        if (!validateForm()) {
            toast.error('Please fix validation errors');
            return;
        }

        setLoading(true);
        try {
            const submitData = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'logo' && formData.logo) {
                    submitData.append('logo', formData.logo);
                } else if (key !== 'logo') {
                    submitData.append(key, formData[key]);
                }
            });

            if (modalMode === 'create') {
                await companyService.createCompany(submitData);
                toast.success('Company created successfully!');
            } else if (modalMode === 'edit') {
                await companyService.updateCompany(selectedCompany.Id, submitData);
                toast.success('Company updated successfully!');
            }

            setShowModal(false);
            resetForm();
            fetchCompanies(pagination.limit, pagination.offset, searchTerm, filters);
        } catch (error) {
            console.error('Error saving company:', error);
            if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                error.response.data.errors.forEach(err => {
                    toast.error(`${err.field}: ${err.message}`);
                });
            } else {
                toast.error(error.response?.data?.message || 'Failed to save company');
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle company deletion
     */
    const handleDelete = async () => {
        if (!selectedCompany) return;
        setLoading(true);
        try {
            await companyService.deleteCompany(selectedCompany.Id);
            toast.success('Company deleted successfully!');
            setShowDeleteModal(false);
            setSelectedCompany(null);
            fetchCompanies(pagination.limit, pagination.offset, searchTerm, filters);
        } catch (error) {
            console.error('Error deleting company:', error);
            toast.error(error.response?.data?.message || 'Failed to delete company');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Toggle company active/inactive status
     * @param {object} company - Company object to toggle
     */
    const handleToggleActive = async (company) => {
        try {
            const response = await companyService.toggleActiveStatus(company.Id);
            toast.success(response.message);
            fetchCompanies(pagination.limit, pagination.offset, searchTerm, filters);
        } catch (error) {
            console.error('Error toggling active:', error);
            toast.error(error.response?.data?.message || 'Failed to toggle status');
        }
    };

    /**
     * Export companies to CSV file
     */
    const handleExport = () => {
        if (companies.length === 0) {
            toast.error('No data to export');
            return;
        }
        const csvContent = [
            ['ID', 'Company Name', 'Email', 'Phone', 'City', 'State', 'GST Number'],
            ...companies.map(c => [
                c.Id, c.CompanyName, c.Email, c.Phone || '', 
                c.City || '', c.State || '', c.GstNumber || ''
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `companies-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Companies exported successfully!');
    };

    /**
     * Handle pagination page change
     * @param {number} newPage - New page number
     */
    const handlePageChange = (newPage) => {
        const newOffset = (newPage - 1) * pagination.limit;
        fetchCompanies(pagination.limit, newOffset, searchTerm, filters);
    };

    /**
     * Handle items per page limit change
     * @param {number} newLimit - New limit value
     */
    const handleLimitChange = (newLimit) => {
        fetchCompanies(newLimit, 0, searchTerm, filters);
    };

    // Derived values for modal and filters
    const isViewMode = modalMode === 'view';
    const modalTitle = modalMode === 'create' ? 'Create New Company' :
                      modalMode === 'edit' ? 'Edit Company' : 'Company Details';
    // Extract unique states from companies for filter dropdown
    const availableStates = [...new Set(companies.map((company) => company.State).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
    // Extract unique cities based on selected state filter
    const availableCities = [...new Set(
        companies
            .filter((company) => !filters.state || company.State === filters.state)
            .map((company) => company.City)
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

  return (
    <>
      {/* Toast notification component */}
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            duration: 3000,
            style: { background: '#10B981', color: '#fff' }
          },
          error: {
            duration: 4000,
            style: { background: '#EF4444', color: '#fff' }
          }
        }}
      />

      {/* Main container */}
      <section className="py-1 bg-blueGray-50 min-h-screen">
        <div className="w-full xl:w-10/12 px-4 mx-auto mt-6">
          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
            {/* Header section with title and action buttons */}
            <div className="rounded-t bg-white mb-0 px-6 py-6">
              <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
                  <div className="text-left">
                    <h6 className="text-blueGray-700 text-2xl font-bold">
                      Companies Management
                    </h6>
                    <p className="text-sm text-blueGray-500">
                      Manage companies
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {pagination.total} Total
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() =>
                      fetchCompanies(
                        pagination.limit,
                        pagination.offset,
                        searchTerm,
                        filters
                      )
                    }
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2"
                    disabled={loading}
                  >
                    <ArrowPathIcon
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>

                  <button
                    onClick={handleExport}
                    className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2"
                    disabled={companies.length === 0}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Export
                  </button>

                  <button
                    onClick={openCreateModal}
                    className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Company
                  </button>
                </div>
              </div>
            </div>

            {/* Search and filter section */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                {/* Status filter dropdown */}
                <select
                  value={filters.isActive}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      isActive: e.target.value
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>

                {/* State filter dropdown */}
                <select
                  value={filters.state}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      state: e.target.value,
                      city: ''
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="">All States</option>
                  {availableStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>

                {/* City filter dropdown */}
                <select
                  value={filters.city}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      city: e.target.value
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="">All Cities</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>

                {/* Sort by dropdown */}
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
                  <option value="CreatedAt">Date Added</option>
                  <option value="CompanyName">Company Name</option>
                  <option value="City">City</option>
                  <option value="State">State</option>
                  <option value="Email">Email</option>
                </select>

                {/* Sort order dropdown */}
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

              {/* Search input field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                  placeholder="Search by name, email, city..."
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

            {/* Companies table */}
            <div className="block w-full overflow-x-auto">
              <table className="items-center w-full bg-transparent border-collapse">
                <thead>
                  <tr>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      ID
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Company
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Contact
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Location
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
                  {/* Loading state */}
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-blueGray-500">
                            Loading...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : companies.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8">
                        <BuildingOfficeIcon className="h-12 w-12 mx-auto mb-2 text-blueGray-300" />
                        <p className="text-lg font-semibold text-blueGray-500">
                          No companies found
                        </p>
                        <p className="text-sm text-blueGray-400">
                          {searchTerm
                            ? "Try adjusting your search"
                            : 'Click "Add Company" to create one'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    companies.map((company) => (
                      <tr
                        key={company.Id}
                        className="hover:bg-blueGray-50 transition-colors"
                      >
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <span className="font-bold text-blueGray-600">
                            {company.Id}
                          </span>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div className="flex items-center gap-3">
                            {company.LogoUrl ? (
                              <img
                                src={resolveAssetUrl(company.LogoUrl)}
                                alt={company.CompanyName}
                                className="h-10 w-10 rounded-full object-cover border-2 border-blueGray-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`h-10 w-10 rounded-full bg-blue-100 items-center justify-center ${company.LogoUrl ? 'hidden' : 'flex'}`}>
                              <BuildingOfficeIcon className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-blueGray-700">
                                {company.CompanyName}
                              </p>
                              {company.BusinessType && (
                                <p className="text-xs text-blueGray-500">
                                  {company.BusinessType}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <p className="text-blueGray-700">{company.Email}</p>
                          {company.Phone && (
                            <p className="text-blueGray-500">{company.Phone}</p>
                          )}
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          {company.City && company.State ? (
                            <p className="text-blueGray-700">
                              {company.City}, {company.State}
                            </p>
                          ) : (
                            <span className="italic text-blueGray-400">
                              Not specified
                            </span>
                          )}
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                          <button
                            onClick={() => handleToggleActive(company)}
                            className={`${
                              company.IsActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            } text-xs font-semibold px-2.5 py-1 rounded`}
                          >
                            {company.IsActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openViewModal(company)}
                              className="text-blue-500 hover:text-blue-700"
                              title="View"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openEditModal(company)}
                              className="text-green-500 hover:text-green-700"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCompany(company);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-500 hover:text-red-700"
                              title="Delete"
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

            {/* Pagination controls */}
            {pagination.total > 0 && (
              <div className="px-6 py-4 border-t border-blueGray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  {/* Items per page selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-blueGray-600">Show:</label>
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
                        pagination.offset + companies.length,
                        pagination.total
                      )}{" "}
                      of {pagination.total}
                    </span>
                  </div>

                  {/* Page navigation buttons */}
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

                    {/* Next page button */}
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

      {/* Company modal (create/edit/view) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl w-full max-w-4xl my-8">
              <TitleBar title={modalTitle} onClose={() => { setShowModal(false); resetForm(); }} />

              <form onSubmit={handleSubmit}>
                <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Logo Upload */}
                    <div className="col-span-2">
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Company Logo
                      </label>
                      <div className="flex items-center gap-4">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo"
                            className="h-20 w-20 rounded-lg object-cover border-2 border-blueGray-200"
                            onError={() => setLogoPreview(null)}
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-lg bg-blueGray-100 flex items-center justify-center">
                            <BuildingOfficeIcon className="h-10 w-10 text-blueGray-400" />
                          </div>
                        )}
                        {!isViewMode && (
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                            />
                            <p className="text-xs text-blueGray-400 mt-1">
                              Max 5MB, JPG/PNG/WEBP
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Company Name */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="CompanyName"
                        value={formData.CompanyName}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          errors.CompanyName ? "ring-2 ring-red-500" : ""
                        } ${isViewMode ? "bg-gray-100" : ""}`}
                        placeholder="ABC Pvt Ltd"
                      />
                      {errors.CompanyName && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.CompanyName}
                        </p>
                      )}
                    </div>

                    {/* Business Type */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Business Type
                      </label>
                      <input
                        type="text"
                        name="BusinessType"
                        value={formData.BusinessType}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? "bg-gray-100" : ""
                        }`}
                        placeholder="Manufacturing"
                />
              </div>

                    {/* Email */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Email <span className="text-red-500">*</span>
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
                  placeholder="company@example.com"
                />
                {errors.Email && (
                  <p className="text-red-500 text-xs mt-1">{errors.Email}</p>
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
                  placeholder="9876543210"
                  maxLength="10"
                />
                {errors.Phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.Phone}</p>
                )}
              </div>

              {/* GST Number */}
              <div>
                <label className="block text-blueGray-600 text-sm font-bold mb-2">
                  GST Number
                </label>
                <input
                  type="text"
                  name="GstNumber"
                  value={formData.GstNumber}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                    errors.GstNumber ? "ring-2 ring-red-500" : ""
                  } ${isViewMode ? "bg-gray-100" : ""}`}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength="15"
                />
                {errors.GstNumber && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.GstNumber}
                  </p>
                )}
              </div>

              {/* Owner Name */}
              <div>
                <label className="block text-blueGray-600 text-sm font-bold mb-2">
                  Owner Name
                </label>
                <input
                  type="text"
                  name="OwnerName"
                  value={formData.OwnerName}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                    isViewMode ? "bg-gray-100" : ""
                  }`}
                  placeholder="John Doe"
                />
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
                  placeholder="Mumbai"
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
                  placeholder="Maharashtra"
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
                  placeholder="India"
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
                    errors.PostalCode ? "ring-2 ring-red-500" : ""
                  } ${isViewMode ? "bg-gray-100" : ""}`}
                  placeholder="400001"
                  maxLength="6"
                />
                {errors.PostalCode && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.PostalCode}
                  </p>
                )}
              </div>

              {/* Website */}
              <div className="col-span-2">
                <label className="block text-blueGray-600 text-sm font-bold mb-2">
                  Website
                </label>
                <input
                  type="text"
                  name="Website"
                  value={formData.Website}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                    isViewMode ? "bg-gray-100" : ""
                  }`}
                  placeholder="https://www.example.com"
                />
              </div>

              {/* Status Checkboxes */}
              {!isViewMode && (
                <div className="col-span-2 flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="IsActive"
                      checked={formData.IsActive}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-blueGray-600">
                      Active
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="Flag"
                      checked={formData.Flag}
                      onChange={handleChange}
                      className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                    />
                    <span className="ml-2 text-sm text-blueGray-600">
                      Flag
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Modal footer buttons */}
          <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
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
                  ? "Create"
                  : "Update"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  </div>
)}

{/* Delete confirmation modal */}
{showDeleteModal && selectedCompany && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
      {/* Modal header */}
      <div className="flex justify-between items-center p-6 border-b">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <h3 className="text-xl font-bold text-blueGray-700">
            Delete Company
          </h3>
        </div>
        <button
          onClick={() => {
            setShowDeleteModal(false);
            setSelectedCompany(null);
          }}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
      {/* Modal body */}
      <div className="p-6">
        <p className="text-blueGray-600">
          Are you sure you want to delete "<strong>{selectedCompany?.CompanyName}</strong>"?
          This action cannot be undone.
        </p>
      </div>
      {/* Modal footer */}
      <div className="flex justify-end gap-3 p-6 border-t">
        <button
          onClick={() => {
            setShowDeleteModal(false);
            setSelectedCompany(null);
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

export default Company;


