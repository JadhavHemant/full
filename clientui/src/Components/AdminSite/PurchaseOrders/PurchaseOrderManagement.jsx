import React, { useState, useEffect, useRef } from 'react';
import {
    PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
    ArrowPathIcon, ArrowDownTrayIcon, EyeIcon, XMarkIcon,
    ShoppingCartIcon, ExclamationTriangleIcon, CheckCircleIcon,
    ClockIcon, DocumentTextIcon
} from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';
import { purchaseOrderService } from '../../../services/purchaseOrderService';
import { supplierService } from '../../../services/supplierService';
import * as companyService from '../../../services/companyService';
import { usePortalAccess } from '../../../utils/portalAccess';
import TitleBar from '../../TitleBar';

const PurchaseOrderManagement = () => {
    const { canManageRestrictedActions } = usePortalAccess();
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        total: 0, limit: 10, offset: 0, totalPages: 0, currentPage: 1,
        hasNext: false, hasPrevious: false
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        supplierId: '',
        companyId: '',
        sortBy: 'OrderDate',
        sortOrder: 'DESC',
        startDate: '',
        endDate: ''
    });

    const [suppliers, setSuppliers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [newStatus, setNewStatus] = useState('');

    const [formData, setFormData] = useState({
        SupplierId: '',
        OrderDate: new Date().toISOString().split('T')[0],
        ExpectedDeliveryDate: '',
        ReceivedDate: '',
        Status: 'Draft',
        TotalAmount: '',
        Notes: '',
        CompanyId: ''
    });
    const [errors, setErrors] = useState({});

    const isInitialMount = useRef(true);
    const isFiltersInitialMount = useRef(true);

    const statusColors = {
        Draft: 'bg-gray-100 text-gray-800',
        Pending: 'bg-yellow-100 text-yellow-800',
        Approved: 'bg-blue-100 text-blue-800',
        Sent: 'bg-purple-100 text-purple-800',
        Received: 'bg-green-100 text-green-800',
        Cancelled: 'bg-red-100 text-red-800'
    };

    const statusOptions = ['Draft', 'Pending', 'Approved', 'Sent', 'Received', 'Cancelled'];

    // Fetch initial data
    useEffect(() => {
        console.log('🚀 Component mounted - Fetching initial data');
        fetchSuppliers();
        fetchCompanies();
        fetchPurchaseOrders(pagination.limit, 0, searchTerm);
    }, []);

    // Filters effect
    useEffect(() => {
        if (isFiltersInitialMount.current) {
            isFiltersInitialMount.current = false;
            return;
        }
        console.log('🔍 Filters changed:', filters);
        fetchPurchaseOrders(pagination.limit, 0, searchTerm);
    }, [filters]);

    // Debounced search
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        console.log('🔍 Search term changed:', searchTerm);
        const delayDebounce = setTimeout(() => {
            fetchPurchaseOrders(pagination.limit, 0, searchTerm);
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    const fetchSuppliers = async () => {
        try {
            const response = await supplierService.getActiveSuppliers();
            setSuppliers(response.data || []);
        } catch (error) {
            console.error('❌ Error fetching suppliers:', error);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await companyService.getActiveCompanies();
            setCompanies(response.data || []);
        } catch (error) {
            console.error('❌ Error fetching companies:', error);
        }
    };

    const fetchPurchaseOrders = async (limit = 10, offset = 0, search = '') => {
        setLoading(true);
        console.log(`📡 Fetching purchase orders: limit=${limit}, offset=${offset}, search="${search}"`);
        
        try {
            const response = await purchaseOrderService.getAllPurchaseOrders({
                limit,
                offset,
                search,
                ...filters
            });
            
            setPurchaseOrders(response.data || []);
            
            if (response.pagination) {
                const totalPages = Math.ceil(response.pagination.total / response.pagination.limit);
                const currentPage = Math.floor(response.pagination.offset / response.pagination.limit) + 1;
                setPagination({
                    ...response.pagination,
                    totalPages,
                    currentPage,
                    hasNext: currentPage < totalPages,
                    hasPrevious: currentPage > 1
                });
            }
            
            console.log(`✅ Fetched ${response.data?.length || 0} purchase orders`);
        } catch (error) {
            console.error('❌ Error fetching purchase orders:', error);
            toast.error(error.message || 'Failed to fetch purchase orders');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            SupplierId: '',
            OrderDate: new Date().toISOString().split('T')[0],
            ExpectedDeliveryDate: '',
            ReceivedDate: '',
            Status: 'Draft',
            TotalAmount: '',
            Notes: '',
            CompanyId: ''
        });
        setErrors({});
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.SupplierId) newErrors.SupplierId = 'Supplier is required';
        if (!formData.OrderDate) newErrors.OrderDate = 'Order date is required';
        if (formData.TotalAmount && (isNaN(formData.TotalAmount) || formData.TotalAmount < 0)) {
            newErrors.TotalAmount = 'Total amount must be a positive number';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const openCreateModal = () => {
        resetForm();
        setModalMode('create');
        setSelectedPO(null);
        setShowModal(true);
    };

    const openEditModal = (po) => {
        setFormData({
            SupplierId: po.SupplierId || '',
            OrderDate: po.OrderDate ? new Date(po.OrderDate).toISOString().split('T')[0] : '',
            ExpectedDeliveryDate: po.ExpectedDeliveryDate ? new Date(po.ExpectedDeliveryDate).toISOString().split('T')[0] : '',
            ReceivedDate: po.ReceivedDate ? new Date(po.ReceivedDate).toISOString().split('T')[0] : '',
            Status: po.Status || 'Draft',
            TotalAmount: po.TotalAmount || '',
            Notes: po.Notes || '',
            CompanyId: po.CompanyId || ''
        });
        setModalMode('edit');
        setSelectedPO(po);
        setShowModal(true);
    };

    const openViewModal = (po) => {
        setFormData({
            SupplierId: po.SupplierId || '',
            OrderDate: po.OrderDate ? new Date(po.OrderDate).toISOString().split('T')[0] : '',
            ExpectedDeliveryDate: po.ExpectedDeliveryDate ? new Date(po.ExpectedDeliveryDate).toISOString().split('T')[0] : '',
            ReceivedDate: po.ReceivedDate ? new Date(po.ReceivedDate).toISOString().split('T')[0] : '',
            Status: po.Status || 'Draft',
            TotalAmount: po.TotalAmount || '',
            Notes: po.Notes || '',
            CompanyId: po.CompanyId || ''
        });
        setModalMode('view');
        setSelectedPO(po);
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
                await purchaseOrderService.createPurchaseOrder(formData);
                toast.success('Purchase order created successfully!');
            } else if (modalMode === 'edit') {
                await purchaseOrderService.updatePurchaseOrder(selectedPO.Id, formData);
                toast.success('Purchase order updated successfully!');
            }

            setShowModal(false);
            resetForm();
            fetchPurchaseOrders(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error saving purchase order:', error);
            toast.error(error.message || 'Failed to save purchase order');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async () => {
        if (!selectedPO || !newStatus) return;
        setLoading(true);
        try {
            await purchaseOrderService.updatePurchaseOrderStatus(selectedPO.Id, newStatus);
            toast.success(`Status updated to ${newStatus}`);
            setShowStatusModal(false);
            setSelectedPO(null);
            setNewStatus('');
            fetchPurchaseOrders(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error(error.message || 'Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPO) return;
        setLoading(true);
        try {
            await purchaseOrderService.softDeletePurchaseOrder(selectedPO.Id);
            toast.success('Purchase order cancelled successfully!');
            setShowDeleteModal(false);
            setSelectedPO(null);
            fetchPurchaseOrders(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error cancelling purchase order:', error);
            toast.error(error.message || 'Failed to cancel purchase order');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (purchaseOrders.length === 0) {
            toast.error('No data to export');
            return;
        }
        const csvContent = [
            ['PO Number', 'Supplier', 'Order Date', 'Status', 'Total Amount', 'Company'],
            ...purchaseOrders.map(po => [
                po.PONumber || '',
                po.SupplierName || '',
                po.OrderDate ? new Date(po.OrderDate).toLocaleDateString() : '',
                po.Status || '',
                po.TotalAmount || '0',
                po.CompanyName || ''
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Purchase orders exported successfully!');
    };

    const handlePageChange = (newPage) => {
        const newOffset = (newPage - 1) * pagination.limit;
        fetchPurchaseOrders(pagination.limit, newOffset, searchTerm);
    };

    const handleLimitChange = (newLimit) => {
        fetchPurchaseOrders(newLimit, 0, searchTerm);
    };

    const isViewMode = modalMode === 'view';
    const modalTitle = modalMode === 'create' ? 'Create Purchase Order' : modalMode === 'edit' ? 'Edit Purchase Order' : 'Purchase Order Details';

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
                                    <ShoppingCartIcon className="h-8 w-8 text-blue-500" />
                                    <div className="text-left">
                                        <h6 className="text-blueGray-700 text-2xl font-bold">Purchase Order Management</h6>
                                        <p className="text-sm text-blueGray-500">Manage purchase orders & procurement</p>
                                    </div>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        {pagination.total} Total
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2 justify-center">
                                    <button onClick={() => fetchPurchaseOrders(pagination.limit, pagination.offset, searchTerm)}
                                        className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                                        disabled={loading}>
                                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </button>

                                    {canManageRestrictedActions && (
                                        <button onClick={handleExport}
                                            className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                                            disabled={purchaseOrders.length === 0}>
                                            <ArrowDownTrayIcon className="h-4 w-4" />
                                            Export
                                        </button>
                                    )}

                                    <button onClick={openCreateModal}
                                        className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition">
                                        <PlusIcon className="h-4 w-4" />
                                        Create PO
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="px-6 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                    <option value="">All Status</option>
                                    {statusOptions.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>

                                <select value={filters.supplierId} onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                    <option value="">All Suppliers</option>
                                    {suppliers.map(s => (
                                        <option key={s.Id} value={s.Id}>{s.Name}</option>
                                    ))}
                                </select>

                                <select value={filters.companyId} onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                    <option value="">All Companies</option>
                                    {companies.map(c => (
                                        <option key={c.Id} value={c.Id}>{c.CompanyName}</option>
                                    ))}
                                </select>

                                <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                    <option value="OrderDate">Sort by Order Date</option>
                                    <option value="PONumber">Sort by PO Number</option>
                                    <option value="Status">Sort by Status</option>
                                    <option value="TotalAmount">Sort by Amount</option>
                                </select>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input type="text"
                                    className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                                    placeholder="Search by PO number, supplier, notes..."
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
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">PO Number</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Supplier</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Order Date</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Total Amount</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Status</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-8">
                                                <div className="flex justify-center items-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                                    <span className="ml-2 text-blueGray-500">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : purchaseOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-8">
                                                <ShoppingCartIcon className="h-12 w-12 mx-auto mb-2 text-blueGray-300" />
                                                <p className="text-lg font-semibold text-blueGray-500">No purchase orders found</p>
                                                <p className="text-sm text-blueGray-400">
                                                    {searchTerm ? 'Try adjusting your search' : 'Click "Create PO" to create one'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        purchaseOrders.map((po) => (
                                            <tr key={po.Id} className="hover:bg-blueGray-50 transition-colors">
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
                                                            <DocumentTextIcon className="h-6 w-6 text-blue-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-blueGray-700">{po.PONumber}</p>
                                                            <p className="text-xs text-blueGray-500">{po.CompanyName || '-'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <span className="text-blueGray-700">{po.SupplierName || '-'}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <span className="text-blueGray-700">
                                                        {po.OrderDate ? new Date(po.OrderDate).toLocaleDateString() : '-'}
                                                    </span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <span className="font-semibold text-blueGray-700">
                                                        ₹{parseFloat(po.TotalAmount || 0).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPO(po);
                                                            setNewStatus(po.Status);
                                                            setShowStatusModal(true);
                                                        }}
                                                        className={`${statusColors[po.Status] || 'bg-gray-100 text-gray-800'} text-xs font-semibold px-2.5 py-1 rounded hover:opacity-80 transition`}
                                                    >
                                                        {po.Status}
                                                    </button>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => openViewModal(po)} className="text-blue-500 hover:text-blue-700" title="View">
                                                            <EyeIcon className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => openEditModal(po)} className="text-green-500 hover:text-green-700" title="Edit">
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                        {canManageRestrictedActions && (
                                                            <button onClick={() => { setSelectedPO(po); setShowDeleteModal(true); }}
                                                                className="text-red-500 hover:text-red-700" title="Cancel">
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
                                            Showing {pagination.offset + 1} to {Math.min(pagination.offset + purchaseOrders.length, pagination.total)} of {pagination.total}
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
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
                            <TitleBar title={modalTitle} onClose={() => { setShowModal(false); resetForm(); }} />

                            <form onSubmit={handleSubmit}>
                                <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* Supplier */}
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Supplier <span className="text-red-500">*</span>
                                            </label>
                                            <select name="SupplierId" value={formData.SupplierId} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.SupplierId ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}>
                                                <option value="">Select Supplier</option>
                                                {suppliers.map(s => (
                                                    <option key={s.Id} value={s.Id}>{s.Name}</option>
                                                ))}
                                            </select>
                                            {errors.SupplierId && <p className="text-red-500 text-xs mt-1">{errors.SupplierId}</p>}
                                        </div>

                                        {/* Company */}
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Company</label>
                                            <select name="CompanyId" value={formData.CompanyId} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}>
                                                <option value="">Select Company</option>
                                                {companies.map(c => (
                                                    <option key={c.Id} value={c.Id}>{c.CompanyName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Order Date */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Order Date <span className="text-red-500">*</span>
                                            </label>
                                            <input type="date" name="OrderDate" value={formData.OrderDate} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.OrderDate ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`} />
                                            {errors.OrderDate && <p className="text-red-500 text-xs mt-1">{errors.OrderDate}</p>}
                                        </div>

                                        {/* Expected Delivery Date */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Expected Delivery</label>
                                            <input type="date" name="ExpectedDeliveryDate" value={formData.ExpectedDeliveryDate} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`} />
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Status</label>
                                            <select name="Status" value={formData.Status} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}>
                                                {statusOptions.map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Total Amount */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Total Amount</label>
                                            <input type="number" step="0.01" name="TotalAmount" value={formData.TotalAmount} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.TotalAmount ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="0.00" />
                                            {errors.TotalAmount && <p className="text-red-500 text-xs mt-1">{errors.TotalAmount}</p>}
                                        </div>

                                        {/* Notes */}
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Notes</label>
                                            <textarea name="Notes" value={formData.Notes} onChange={handleChange} rows="3"
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Additional notes..." />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
                                    {isViewMode && selectedPO && (
                                        <button type="button" onClick={() => openEditModal(selectedPO)}
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

            {/* Status Change Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-6 border-b">
                            <div className="flex items-center gap-2">
                                <ClockIcon className="h-6 w-6 text-blue-500" />
                                <h3 className="text-xl font-bold text-blueGray-700">Change Status</h3>
                            </div>
                            <button onClick={() => { setShowStatusModal(false); setSelectedPO(null); setNewStatus(''); }} className="text-gray-400 hover:text-gray-600 transition">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-blueGray-600 mb-4">Select new status for PO: <strong>{selectedPO?.PONumber}</strong></p>
                            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                                className="border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full">
                                {statusOptions.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t">
                            <button onClick={() => { setShowStatusModal(false); setSelectedPO(null); setNewStatus(''); }}
                                className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                Cancel
                            </button>
                            <button onClick={handleStatusChange} disabled={loading || !newStatus}
                                className="bg-blue-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition disabled:opacity-50 flex items-center gap-2">
                                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                {loading ? 'Updating...' : 'Update Status'}
                            </button>
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
                                <h3 className="text-xl font-bold text-blueGray-700">Cancel Purchase Order</h3>
                            </div>
                            <button onClick={() => { setShowDeleteModal(false); setSelectedPO(null); }} className="text-gray-400 hover:text-gray-600 transition">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-blueGray-600">Are you sure you want to cancel purchase order <strong>{selectedPO?.PONumber}</strong>? This will set the status to "Cancelled".</p>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t">
                            <button onClick={() => { setShowDeleteModal(false); setSelectedPO(null); }}
                                className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                No, Keep It
                            </button>
                            <button onClick={handleDelete} disabled={loading}
                                className="bg-red-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition disabled:opacity-50 flex items-center gap-2">
                                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                {loading ? 'Cancelling...' : 'Yes, Cancel PO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PurchaseOrderManagement;
