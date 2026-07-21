import React, { useState, useEffect, useRef } from 'react';
import {
    PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
    ArrowPathIcon, ArrowDownTrayIcon, EyeIcon, XMarkIcon,
    BuildingStorefrontIcon, ExclamationTriangleIcon, MapPinIcon
} from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';
import * as warehouseService from '../../../services/warehouseService.js';
import * as companyService from '../../../services/companyService.js';
import { usePortalAccess } from '../../../utils/portalAccess';
import TitleBar from '../../TitleBar';

const Warehouse = () => {
    const { canManageRestrictedActions } = usePortalAccess();
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        total: 0, limit: 10, offset: 0, totalPages: 0, currentPage: 1,
        hasNext: false, hasPrevious: false
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        companyId: '',
        isActive: '',
        city: '',
        state: '',
        sortBy: 'CreatedAt',
        sortOrder: 'DESC'
    });

    const [companies, setCompanies] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    const [formData, setFormData] = useState({
        Name: '',
        Location: '',
        Address: '',
        City: '',
        State: '',
        Country: 'India',
        PinCode: '',
        ContactPerson: '',
        ContactPhone: '',
        ContactEmail: '',
        ManagerId: '',
        CompanyId: '',
        Capacity: '',
        CapacityUnit: 'sqft',
        IsActive: true
    });
    const [errors, setErrors] = useState({});

    // ✅ Track initial mount to prevent double fetch
    const isInitialMount = useRef(true);
    const isFiltersInitialMount = useRef(true);

    // ✅ Fetch companies ONCE on mount
    useEffect(() => {
        console.log('🚀 Component mounted - Fetching companies');
        fetchCompanies();
    }, []);

    // ✅ Fetch warehouses ONCE on mount
    useEffect(() => {
        console.log('🚀 Initial warehouse fetch');
        fetchWarehouses(pagination.limit, 0, searchTerm);
    }, []);

    // ✅ Filters effect (but NOT on mount)
    useEffect(() => {
        if (isFiltersInitialMount.current) {
            isFiltersInitialMount.current = false;
            return; // Skip on first render
        }

        console.log('🔍 Filters changed:', filters);
        fetchWarehouses(pagination.limit, 0, searchTerm);
    }, [filters]);

    // ✅ Debounced search (but NOT on mount)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return; // Skip on first render
        }

        console.log('🔍 Search term changed:', searchTerm);
        const delayDebounce = setTimeout(() => {
            fetchWarehouses(pagination.limit, 0, searchTerm);
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    const fetchCompanies = async () => {
        try {
            const response = await companyService.getActiveCompanies();
            setCompanies(response.data || []);
            console.log('✅ Companies loaded');
        } catch (error) {
            console.error('❌ Error fetching companies:', error);
            toast.error('Failed to load companies');
        }
    };

    const fetchWarehouses = async (limit = 10, offset = 0, search = '') => {
        setLoading(true);
        console.log(`📡 Fetching warehouses: limit=${limit}, offset=${offset}, search="${search}"`);
        
        try {
            const data = await warehouseService.getWarehouses(limit, offset, search, filters);
            setWarehouses(data.data || []);

            if (data.pagination) {
                setPagination(data.pagination);
            }
            
            console.log(`✅ Fetched ${data.data?.length || 0} warehouses`);
        } catch (error) {
            console.error('❌ Error fetching warehouses:', error);
            toast.error(error.message || 'Failed to fetch warehouses');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            Name: '',
            Location: '',
            Address: '',
            City: '',
            State: '',
            Country: 'India',
            PinCode: '',
            ContactPerson: '',
            ContactPhone: '',
            ContactEmail: '',
            ManagerId: '',
            CompanyId: '',
            Capacity: '',
            CapacityUnit: 'sqft',
            IsActive: true
        });
        setErrors({});
    };

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

    const validateForm = () => {
        const newErrors = {};
        if (!formData.Name.trim()) newErrors.Name = 'Warehouse name is required';
        if (!formData.CompanyId) newErrors.CompanyId = 'Company is required';
        if (formData.ContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ContactEmail)) {
            newErrors.ContactEmail = 'Invalid email format';
        }
        if (formData.ContactPhone && !/^\d{10}$/.test(formData.ContactPhone.replace(/\D/g, ''))) {
            newErrors.ContactPhone = 'Phone must be 10 digits';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const openCreateModal = () => {
        resetForm();
        setModalMode('create');
        setSelectedWarehouse(null);
        setIsMinimized(false);
        setIsMaximized(false);
        setShowModal(true);
    };

    const openEditModal = (warehouse) => {
        setIsMinimized(false);
        setIsMaximized(false);
        setFormData({
            Name: warehouse.Name || '',
            Location: warehouse.Location || '',
            Address: warehouse.Address || '',
            City: warehouse.City || '',
            State: warehouse.State || '',
            Country: warehouse.Country || 'India',
            PinCode: warehouse.PinCode || '',
            ContactPerson: warehouse.ContactPerson || '',
            ContactPhone: warehouse.ContactPhone || '',
            ContactEmail: warehouse.ContactEmail || '',
            ManagerId: warehouse.ManagerId || '',
            CompanyId: warehouse.CompanyId || '',
            Capacity: warehouse.Capacity || '',
            CapacityUnit: warehouse.CapacityUnit || 'sqft',
            IsActive: warehouse.IsActive
        });
        setModalMode('edit');
        setSelectedWarehouse(warehouse);
        setShowModal(true);
    };

    const openViewModal = (warehouse) => {
        setIsMinimized(false);
        setIsMaximized(false);
        setFormData({
            Name: warehouse.Name || '',
            Location: warehouse.Location || '',
            Address: warehouse.Address || '',
            City: warehouse.City || '',
            State: warehouse.State || '',
            Country: warehouse.Country || 'India',
            PinCode: warehouse.PinCode || '',
            ContactPerson: warehouse.ContactPerson || '',
            ContactPhone: warehouse.ContactPhone || '',
            ContactEmail: warehouse.ContactEmail || '',
            ManagerId: warehouse.ManagerId || '',
            CompanyId: warehouse.CompanyId || '',
            Capacity: warehouse.Capacity || '',
            CapacityUnit: warehouse.CapacityUnit || 'sqft',
            IsActive: warehouse.IsActive
        });
        setModalMode('view');
        setSelectedWarehouse(warehouse);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (modalMode === 'view') return;

        if (!validateForm()) {
            toast.error('Please fix validation errors');
            return;
        }

        setLoading(true);
        try {
            if (modalMode === 'create') {
                await warehouseService.createWarehouse(formData);
                toast.success('Warehouse created successfully!');
            } else if (modalMode === 'edit') {
                await warehouseService.updateWarehouse(selectedWarehouse.Id, formData);
                toast.success('Warehouse updated successfully!');
            }

            setShowModal(false);
            resetForm();
            fetchWarehouses(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error saving warehouse:', error);
            toast.error(error.message || 'Failed to save warehouse');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedWarehouse) return;
        setLoading(true);
        try {
            await warehouseService.deleteWarehouse(selectedWarehouse.Id);
            toast.success('Warehouse deleted successfully!');
            setShowDeleteModal(false);
            setSelectedWarehouse(null);
            fetchWarehouses(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error deleting warehouse:', error);
            toast.error(error.message || 'Failed to delete warehouse');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (warehouse) => {
        try {
            const response = await warehouseService.toggleActiveStatus(warehouse.Id);
            toast.success(response.message);
            fetchWarehouses(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error toggling status:', error);
            toast.error(error.message || 'Failed to toggle status');
        }
    };

    const handleExport = () => {
        if (warehouses.length === 0) {
            toast.error('No data to export');
            return;
        }
        const csvContent = [
            ['ID', 'Code', 'Name', 'Location', 'City', 'State', 'Company', 'Manager', 'Status'],
            ...warehouses.map(w => [
                w.Id,
                w.WarehouseCode || '',
                w.Name,
                w.Location || '',
                w.City || '',
                w.State || '',
                w.CompanyName || '',
                w.ManagerName || '',
                w.IsActive ? 'Active' : 'Inactive'
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `warehouses-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Warehouses exported successfully!');
    };

    const handlePageChange = (newPage) => {
        const newOffset = (newPage - 1) * pagination.limit;
        fetchWarehouses(pagination.limit, newOffset, searchTerm);
    };

    const handleLimitChange = (newLimit) => {
        fetchWarehouses(newLimit, 0, searchTerm);
    };

    const isViewMode = modalMode === 'view';
    const modalTitle = modalMode === 'create' ? 'Create New Warehouse' : modalMode === 'edit' ? 'Edit Warehouse' : 'Warehouse Details';

    return (
        <>
            <Toaster position="top-right" toastOptions={{
                success: { duration: 3000, style: { background: '#10B981', color: '#fff' } },
                error: { duration: 4000, style: { background: '#EF4444', color: '#fff' } }
            }} />

            <section className="py-1 bg-blueGray-50 min-h-screen">
                <div className="w-full xl:w-11/12 px-4 mx-auto mt-6">
                    <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">

                        {/* Header */}
                        <div className="rounded-t bg-white mb-0 px-6 py-6">
                            <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <BuildingStorefrontIcon className="h-8 w-8 text-blue-500" />
                                    <div className="text-left">
                                        <h6 className="text-blueGray-700 text-2xl font-bold">Warehouse Management</h6>
                                        <p className="text-sm text-blueGray-500">Manage warehouses & locations</p>
                                    </div>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        {pagination.total} Total
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2 justify-center">
                                    <button onClick={() => fetchWarehouses(pagination.limit, pagination.offset, searchTerm)}
                                        className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                                        disabled={loading}>
                                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </button>

                                    {canManageRestrictedActions && (
                                        <button onClick={handleExport}
                                            className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                                            disabled={warehouses.length === 0}>
                                            <ArrowDownTrayIcon className="h-4 w-4" />
                                            Export
                                        </button>
                                    )}

                                    <button onClick={openCreateModal}
                                        className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition">
                                        <PlusIcon className="h-4 w-4" />
                                        Add Warehouse
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="px-6 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <select value={filters.companyId} onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                    <option value="">All Companies</option>
                                    {companies.map(c => (
                                        <option key={c.Id} value={c.Id}>{c.CompanyName}</option>
                                    ))}
                                </select>

                                <input type="text" placeholder="City"
                                    value={filters.city}
                                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring" />

                                <input type="text" placeholder="State"
                                    value={filters.state}
                                    onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring" />

                                <select value={filters.isActive} onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                    <option value="">All Status</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input type="text"
                                    className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                                    placeholder="Search by name, code, location, city..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)} />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3">
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
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Warehouse</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Code</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Location</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Company</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Manager</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Status</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8">
                                                <div className="flex justify-center items-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                                    <span className="ml-2 text-blueGray-500">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : warehouses.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8">
                                                <BuildingStorefrontIcon className="h-12 w-12 mx-auto mb-2 text-blueGray-300" />
                                                <p className="text-lg font-semibold text-blueGray-500">No warehouses found</p>
                                                <p className="text-sm text-blueGray-400">
                                                    {searchTerm ? 'Try adjusting your search' : 'Click "Add Warehouse" to create one'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        warehouses.map((warehouse) => (
                                            <tr key={warehouse.Id} className="hover:bg-blueGray-50 transition-colors">
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
                                                            <BuildingStorefrontIcon className="h-6 w-6 text-blue-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-blueGray-700">{warehouse.Name}</p>
                                                            {warehouse.City && (
                                                                <p className="text-xs text-blueGray-500 flex items-center gap-1">
                                                                    <MapPinIcon className="h-3 w-3" />
                                                                    {warehouse.City}, {warehouse.State}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <span className="font-mono text-blueGray-700">{warehouse.WarehouseCode}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <span className="text-blueGray-700">{warehouse.Location || '-'}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <span className="text-blueGray-700">{warehouse.CompanyName || '-'}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <span className="text-blueGray-700">{warehouse.ManagerName || 'Not Assigned'}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <button onClick={() => handleToggleActive(warehouse)}
                                                        className={`${warehouse.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs font-semibold px-2.5 py-1 rounded`}>
                                                        {warehouse.IsActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => openViewModal(warehouse)} className="text-blue-500 hover:text-blue-700" title="View">
                                                            <EyeIcon className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => openEditModal(warehouse)} className="text-green-500 hover:text-green-700" title="Edit">
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                        {canManageRestrictedActions && (
                                                            <button onClick={() => { setSelectedWarehouse(warehouse); setShowDeleteModal(true); }}
                                                                className="text-red-500 hover:text-red-700" title="Delete">
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

                        {/* Pagination */}
                        {pagination.total > 0 && (
                            <div className="px-6 py-4 border-t border-blueGray-200">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-blueGray-600">Show:</label>
                                        <select value={pagination.limit} onChange={(e) => handleLimitChange(Number(e.target.value))}
                                            className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                            <option value="5">5</option>
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                        </select>
                                        <span className="text-sm text-blueGray-600">
                                            Showing {pagination.offset + 1} to {Math.min(pagination.offset + warehouses.length, pagination.total)} of {pagination.total}
                                        </span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1}
                                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                            Previous
                                        </button>

                                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => {
                                            if (page === 1 || page === pagination.totalPages || (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)) {
                                                return (
                                                    <button key={page} onClick={() => handlePageChange(page)}
                                                        className={`px-3 py-2 text-sm font-medium rounded-md ${page === pagination.currentPage
                                                            ? 'text-white bg-blue-500 shadow-md' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}>
                                                        {page}
                                                    </button>
                                                );
                                            } else if (page === pagination.currentPage - 2 || page === pagination.currentPage + 2) {
                                                return <span key={page} className="px-2 text-gray-500">...</span>;
                                            }
                                            return null;
                                        })}

                                        <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages}
                                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
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
                        <div
                            className="flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl w-full max-w-4xl my-8 transition-all duration-200"
                            style={{
                                maxHeight: isMinimized ? '52px' : '85vh',
                                position: isMaximized ? 'fixed' : 'relative',
                                inset: isMaximized ? '0' : undefined,
                                margin: isMaximized ? '0' : undefined,
                                borderRadius: isMaximized ? '0' : undefined,
                                zIndex: isMaximized ? 100 : undefined,
                            }}
                        >
                            <TitleBar
                                title={modalTitle}
                                onClose={() => { setShowModal(false); resetForm(); }}
                                onMinimize={() => setIsMinimized(!isMinimized)}
                                onMaximize={() => setIsMaximized(!isMaximized)}
                                isMaximized={isMaximized}
                                isMinimized={isMinimized}
                            />

                            <form onSubmit={handleSubmit}>
                                <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* Warehouse Name */}
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Warehouse Name <span className="text-red-500">*</span>
                                            </label>
                                            <input type="text" name="Name" value={formData.Name} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.Name ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Enter warehouse name" />
                                            {errors.Name && <p className="text-red-500 text-xs mt-1">{errors.Name}</p>}
                                        </div>

                                        {/* Company */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Company <span className="text-red-500">*</span>
                                            </label>
                                            <select name="CompanyId" value={formData.CompanyId} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.CompanyId ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}>
                                                <option value="">Select Company</option>
                                                {companies.map(c => (
                                                    <option key={c.Id} value={c.Id}>{c.CompanyName}</option>
                                                ))}
                                            </select>
                                            {errors.CompanyId && <p className="text-red-500 text-xs mt-1">{errors.CompanyId}</p>}
                                        </div>

                                        {/* Location */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Location</label>
                                            <input type="text" name="Location" value={formData.Location} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="e.g., Zone A, Building 2" />
                                        </div>

                                        {/* Address */}
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Address</label>
                                            <textarea name="Address" value={formData.Address} onChange={handleChange} rows="2"
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Full address" />
                                        </div>

                                        {/* City */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">City</label>
                                            <input type="text" name="City" value={formData.City} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="City" />
                                        </div>

                                        {/* State */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">State</label>
                                            <input type="text" name="State" value={formData.State} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="State" />
                                        </div>

                                        {/* Country */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Country</label>
                                            <input type="text" name="Country" value={formData.Country} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Country" />
                                        </div>

                                        {/* Pin Code */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Pin Code</label>
                                            <input type="text" name="PinCode" value={formData.PinCode} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Pin Code" />
                                        </div>

                                        {/* Contact Person */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Contact Person</label>
                                            <input type="text" name="ContactPerson" value={formData.ContactPerson} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Contact person name" />
                                        </div>

                                        {/* Contact Phone */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Contact Phone</label>
                                            <input type="tel" name="ContactPhone" value={formData.ContactPhone} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.ContactPhone ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Contact phone" />
                                            {errors.ContactPhone && <p className="text-red-500 text-xs mt-1">{errors.ContactPhone}</p>}
                                        </div>

                                        {/* Contact Email */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Contact Email</label>
                                            <input type="email" name="ContactEmail" value={formData.ContactEmail} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.ContactEmail ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Contact email" />
                                            {errors.ContactEmail && <p className="text-red-500 text-xs mt-1">{errors.ContactEmail}</p>}
                                        </div>

                                        {/* Capacity */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Capacity</label>
                                            <input type="number" step="0.01" name="Capacity" value={formData.Capacity} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Capacity" />
                                        </div>

                                        {/* Capacity Unit */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Capacity Unit</label>
                                            <select name="CapacityUnit" value={formData.CapacityUnit} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}>
                                                <option value="sqft">Square Feet (sqft)</option>
                                                <option value="sqm">Square Meter (sqm)</option>
                                                <option value="cbm">Cubic Meter (cbm)</option>
                                                <option value="pallets">Pallets</option>
                                            </select>
                                        </div>

                                        {/* Active Status */}
                                        {!isViewMode && (
                                            <div className="col-span-2">
                                                <label className="flex items-center">
                                                    <input type="checkbox" name="IsActive" checked={formData.IsActive} onChange={handleChange}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                                                    <span className="ml-2 text-sm text-blueGray-600">Active</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
                                    {isViewMode && selectedWarehouse && (
                                        <button type="button" onClick={() => openEditModal(selectedWarehouse)}
                                            className="bg-emerald-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                            Edit
                                        </button>
                                    )}
                                    <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                                        className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                        {isViewMode ? 'Close' : 'Cancel'}
                                    </button>
                                    {!isViewMode && (
                                        <button type="submit" disabled={loading}
                                            className="bg-blue-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md disabled:opacity-50 flex items-center gap-2 transition">
                                            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                            {loading ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Update'}
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
                                <h3 className="text-xl font-bold text-blueGray-700">Delete Warehouse</h3>
                            </div>
                            <button onClick={() => { setShowDeleteModal(false); setSelectedWarehouse(null); }} className="text-gray-400 hover:text-gray-600 transition">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-blueGray-600">Are you sure you want to delete "{selectedWarehouse?.Name}"? This action cannot be undone.</p>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t">
                            <button onClick={() => { setShowDeleteModal(false); setSelectedWarehouse(null); }}
                                className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={loading}
                                className="bg-red-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition disabled:opacity-50 flex items-center gap-2">
                                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Warehouse;
