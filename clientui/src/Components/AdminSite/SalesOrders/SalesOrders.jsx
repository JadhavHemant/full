// src/pages/SalesOrders/SalesOrders.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
    PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ArrowPathIcon,
    ArrowDownTrayIcon, EyeIcon, XMarkIcon, ExclamationTriangleIcon,
    ShoppingCartIcon, CheckCircleIcon, ClockIcon, TruckIcon, BanknotesIcon
} from '@heroicons/react/24/outline';
import { toast, Toaster } from 'react-hot-toast';
import salesOrderService from '../../../services/salesOrderService';
import { getAllCustomers } from '../../../services/customerService';
import { usePortalAccess } from '../../../utils/portalAccess';
import TitleBar from '../../TitleBar';

const SalesOrders = () => {
    const { canManageRestrictedActions } = usePortalAccess();
    const [salesOrders, setSalesOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [pagination, setPagination] = useState({
        total: 0,
        limit: 10,
        offset: 0,
        totalPages: 0,
        currentPage: 1
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        paymentStatus: '',
        priority: '',
        customerId: '',
        startDate: '',
        endDate: '',
        sortBy: 'OrderDate',
        sortOrder: 'DESC',
        includeDeleted: 'false'
    });
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [formData, setFormData] = useState({
        CustomerId: '',
        OrderDate: new Date().toISOString().split('T')[0],
        ExpectedDeliveryDate: '',
        Status: 'Draft',
        Priority: 'Normal',
        TotalAmount: 0,
        TaxAmount: 0,
        DiscountAmount: 0,
        PaidAmount: 0,
        PaymentMethod: '',
        ShippingAddress: '',
        BillingAddress: '',
        Notes: '',
        InternalNotes: ''
    });
    const [errors, setErrors] = useState({});
    const isInitialMount = useRef(true);
    const isFiltersInitialMount = useRef(true);

    useEffect(() => {
        fetchStats();
        fetchCustomers();
        fetchSalesOrders(pagination.limit, 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isFiltersInitialMount.current) {
            isFiltersInitialMount.current = false;
            return;
        }
        fetchSalesOrders(pagination.limit, 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const timer = setTimeout(() => {
            fetchSalesOrders(pagination.limit, 0);
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const fetchStats = async () => {
        try {
            const data = await salesOrderService.getSalesOrderStats();
            setStats(data.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const data = await getAllCustomers({ limit: 1000, offset: 0, isActive: 'true' });
            setCustomers(data.data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchSalesOrders = async (limit = 10, offset = 0) => {
        setLoading(true);
        try {
            const data = await salesOrderService.getAllSalesOrders({
                limit,
                offset,
                search: searchTerm,
                ...filters
            });

            setSalesOrders(data.data || []);

            if (data.pagination) {
                setPagination({
                    ...data.pagination,
                    totalPages: Math.ceil(data.pagination.total / data.pagination.limit) || 1,
                    currentPage: Math.floor(data.pagination.offset / data.pagination.limit) + 1
                });
            }
        } catch (error) {
            console.error('Error fetching sales orders:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch sales orders');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            CustomerId: '',
            OrderDate: new Date().toISOString().split('T')[0],
            ExpectedDeliveryDate: '',
            Status: 'Draft',
            Priority: 'Normal',
            TotalAmount: 0,
            TaxAmount: 0,
            DiscountAmount: 0,
            PaidAmount: 0,
            PaymentMethod: '',
            ShippingAddress: '',
            BillingAddress: '',
            Notes: '',
            InternalNotes: ''
        });
        setErrors({});
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.CustomerId) {
            newErrors.CustomerId = 'Customer is required';
        }
        
        if (!formData.OrderDate) {
            newErrors.OrderDate = 'Order date is required';
        }

        if (formData.ExpectedDeliveryDate && formData.OrderDate) {
            if (new Date(formData.ExpectedDeliveryDate) < new Date(formData.OrderDate)) {
                newErrors.ExpectedDeliveryDate = 'Expected delivery date cannot be before order date';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const openCreateModal = () => {
        resetForm();
        setModalMode('create');
        setSelectedOrder(null);
        setShowModal(true);
    };

    const openEditModal = (order) => {
        setFormData({
            CustomerId: order.CustomerId || '',
            OrderDate: order.OrderDate ? order.OrderDate.split('T')[0] : '',
            ExpectedDeliveryDate: order.ExpectedDeliveryDate ? order.ExpectedDeliveryDate.split('T')[0] : '',
            Status: order.Status || 'Draft',
            Priority: order.Priority || 'Normal',
            TotalAmount: order.TotalAmount || 0,
            TaxAmount: order.TaxAmount || 0,
            DiscountAmount: order.DiscountAmount || 0,
            PaidAmount: order.PaidAmount || 0,
            PaymentMethod: order.PaymentMethod || '',
            ShippingAddress: order.ShippingAddress || '',
            BillingAddress: order.BillingAddress || '',
            Notes: order.Notes || '',
            InternalNotes: order.InternalNotes || ''
        });
        setModalMode('edit');
        setSelectedOrder(order);
        setShowModal(true);
    };

    const openViewModal = (order) => {
        setFormData({
            CustomerId: order.CustomerId || '',
            OrderDate: order.OrderDate ? order.OrderDate.split('T')[0] : '',
            ExpectedDeliveryDate: order.ExpectedDeliveryDate ? order.ExpectedDeliveryDate.split('T')[0] : '',
            Status: order.Status || 'Draft',
            Priority: order.Priority || 'Normal',
            TotalAmount: order.TotalAmount || 0,
            TaxAmount: order.TaxAmount || 0,
            DiscountAmount: order.DiscountAmount || 0,
            PaidAmount: order.PaidAmount || 0,
            PaymentMethod: order.PaymentMethod || '',
            ShippingAddress: order.ShippingAddress || '',
            BillingAddress: order.BillingAddress || '',
            Notes: order.Notes || '',
            InternalNotes: order.InternalNotes || ''
        });
        setModalMode('view');
        setSelectedOrder(order);
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
                await salesOrderService.createSalesOrder(formData);
                toast.success('Sales order created successfully!');
            } else if (modalMode === 'edit' && selectedOrder) {
                await salesOrderService.updateSalesOrder(selectedOrder.Id, formData);
                toast.success('Sales order updated successfully!');
            }

            setShowModal(false);
            resetForm();
            await fetchSalesOrders(pagination.limit, pagination.offset);
            await fetchStats();
        } catch (error) {
            console.error('Error saving sales order:', error);
            toast.error(error.response?.data?.message || 'Failed to save sales order');
        } finally {
            setLoading(false);
        }
    };

    // const handleUpdateStatus = async (order, newStatus) => {
    //     try {
    //         await salesOrderService.updateStatus(order.Id, newStatus);
    //         toast.success(`Status updated to ${newStatus}`);
    //         await fetchSalesOrders(pagination.limit, pagination.offset);
    //         await fetchStats();
    //     } catch (error) {
    //         console.error('Error updating status:', error);
    //         toast.error(error.response?.data?.message || 'Failed to update status');
    //     }
    // };

    const handleDelete = async () => {
        if (!selectedOrder) return;
        setLoading(true);
        try {
            await salesOrderService.softDeleteSalesOrder(selectedOrder.Id);
            toast.success('Sales order cancelled successfully!');
            setShowDeleteModal(false);
            setSelectedOrder(null);
            await fetchSalesOrders(pagination.limit, pagination.offset);
            await fetchStats();
        } catch (error) {
            console.error('Error deleting sales order:', error);
            toast.error(error.response?.data?.message || 'Failed to cancel sales order');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (salesOrders.length === 0) {
            toast.error('No data to export');
            return;
        }

        const csvContent = [
            'SO Number,Customer,Order Date,Status,Priority,Total Amount,Paid,Balance,Payment Status',
            ...salesOrders.map(so => [
                so.SONumber || '',
                `"${so.CustomerName || ''}"`,
                so.OrderDate || '',
                so.Status || '',
                so.Priority || '',
                so.NetAmount || 0,
                so.PaidAmount || 0,
                so.BalanceAmount || 0,
                so.PaymentStatus || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sales-orders-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Sales orders exported successfully!');
    };

    const handlePageChange = (newPage) => {
        const newOffset = (newPage - 1) * pagination.limit;
        fetchSalesOrders(pagination.limit, newOffset);
    };

    const handleLimitChange = (newLimit) => {
        fetchSalesOrders(newLimit, 0);
    };

    const getStatusBadge = (status) => {
        const badges = {
            'Draft': 'bg-gray-100 text-gray-800',
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Confirmed': 'bg-blue-100 text-blue-800',
            'Processing': 'bg-purple-100 text-purple-800',
            'Shipped': 'bg-indigo-100 text-indigo-800',
            'Delivered': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800',
            'Returned': 'bg-orange-100 text-orange-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getPriorityBadge = (priority) => {
        const badges = {
            'Low': 'bg-blue-100 text-blue-800',
            'Normal': 'bg-green-100 text-green-800',
            'High': 'bg-orange-100 text-orange-800',
            'Urgent': 'bg-red-100 text-red-800'
        };
        return badges[priority] || 'bg-gray-100 text-gray-800';
    };

    const getPaymentStatusBadge = (status) => {
        const badges = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Partial': 'bg-orange-100 text-orange-800',
            'Paid': 'bg-green-100 text-green-800',
            'Overdue': 'bg-red-100 text-red-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const isViewMode = modalMode === 'view';
    const modalTitle = modalMode === 'create' ? 'Create Sales Order' :
                       modalMode === 'edit' ? 'Edit Sales Order' : 'Sales Order Details';

    return (
        <>
            <Toaster position="top-right" toastOptions={{
                success: { duration: 3000, style: { background: '#10B981', color: '#fff' } },
                error: { duration: 4000, style: { background: '#EF4444', color: '#fff' } }
            }} />

            <section className="py-1 bg-blueGray-50 min-h-screen">
                <div className="w-full xl:w-11/12 px-4 mx-auto mt-6">
                    {/* Stats Cards */}
                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-blueGray-500 font-semibold">Total Orders</p>
                                        <p className="text-3xl font-bold text-blueGray-700">{stats.total_orders}</p>
                                    </div>
                                    <ShoppingCartIcon className="h-12 w-12 text-blue-500 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-blueGray-500 font-semibold">Delivered</p>
                                        <p className="text-3xl font-bold text-green-600">{stats.delivered_orders}</p>
                                    </div>
                                    <CheckCircleIcon className="h-12 w-12 text-green-500 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-blueGray-500 font-semibold">Total Revenue</p>
                                        <p className="text-2xl font-bold text-purple-600">
                                            ₹{Number(stats.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <BanknotesIcon className="h-12 w-12 text-purple-500 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-blueGray-500 font-semibold">Outstanding</p>
                                        <p className="text-2xl font-bold text-red-600">
                                            ₹{Number(stats.total_outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <ClockIcon className="h-12 w-12 text-red-500 opacity-50" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
                        {/* Header */}
                        <div className="rounded-t bg-white mb-0 px-6 py-6">
                            <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <ShoppingCartIcon className="h-8 w-8 text-blue-500" />
                                    <div className="text-left">
                                        <h6 className="text-blueGray-700 text-2xl font-bold">Sales Orders</h6>
                                        <p className="text-sm text-blueGray-500">Manage sales orders and invoices</p>
                                    </div>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        {pagination.total} Total
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <button
                                        onClick={() => fetchSalesOrders(pagination.limit, pagination.offset)}
                                        className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                                        disabled={loading}
                                    >
                                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </button>
                                    {canManageRestrictedActions && (
                                        <button
                                            onClick={handleExport}
                                            className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                                            disabled={salesOrders.length === 0}
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
                                        Create Order
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="px-6 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                                >
                                    <option value="">All Status</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Processing">Processing</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>

                                <select
                                    value={filters.paymentStatus}
                                    onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                                >
                                    <option value="">All Payments</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Overdue">Overdue</option>
                                </select>

                                <select
                                    value={filters.priority}
                                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                                >
                                    <option value="">All Priorities</option>
                                    <option value="Low">Low</option>
                                    <option value="Normal">Normal</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>

                                <select
                                    value={filters.customerId}
                                    onChange={(e) => setFilters(prev => ({ ...prev, customerId: e.target.value }))}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                                >
                                    <option value="">All Customers</option>
                                    {customers.map(customer => (
                                        <option key={customer.Id} value={customer.Id}>{customer.Name}</option>
                                    ))}
                                </select>

                                <select
                                    value={filters.sortBy}
                                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                                >
                                    <option value="OrderDate">Order Date</option>
                                    <option value="SONumber">SO Number</option>
                                    <option value="TotalAmount">Amount</option>
                                    <option value="Status">Status</option>
                                </select>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                                    placeholder="Search by SO number, customer name..."
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
                                            Order Details
                                        </th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                                            Customer
                                        </th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                                            Status
                                        </th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                                            Priority
                                        </th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-right bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                                            Amount
                                        </th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                                            Payment
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
                                                    <span className="ml-2 text-blueGray-500">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : salesOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8">
                                                <ShoppingCartIcon className="h-12 w-12 mx-auto mb-2 text-blueGray-300" />
                                                <p className="text-lg font-semibold text-blueGray-500">No sales orders found</p>
                                                <p className="text-sm text-blueGray-400">Click "Create Order" to add your first sales order</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        salesOrders.map(order => (
                                            <tr key={order.Id} className="hover:bg-blueGray-50 transition-colors">
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div>
                                                        <p className="font-semibold text-blueGray-700">{order.SONumber}</p>
                                                        <p className="text-xs text-blueGray-500">{order.OrderDate ? new Date(order.OrderDate).toLocaleDateString() : '-'}</p>
                                                    </div>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div>
                                                        <p className="text-blueGray-600 font-medium">{order.CustomerName || '-'}</p>
                                                        <p className="text-xs text-blueGray-500">{order.CustomerPhone || '-'}</p>
                                                    </div>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.Status)}`}>
                                                        {order.Status}
                                                    </span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(order.Priority)}`}>
                                                        {order.Priority}
                                                    </span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-right">
                                                    <div>
                                                        <p className="font-bold text-blueGray-700">
                                                            ₹{Number(order.NetAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </p>
                                                        {order.BalanceAmount > 0 && (
                                                            <p className="text-xs text-red-600">
                                                                Balance: ₹{Number(order.BalanceAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusBadge(order.PaymentStatus)}`}>
                                                        {order.PaymentStatus}
                                                    </span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => openViewModal(order)} className="text-blue-500 hover:text-blue-700" title="View">
                                                            <EyeIcon className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => openEditModal(order)} className="text-green-500 hover:text-green-700" title="Edit">
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                        {canManageRestrictedActions && (
                                                            <button onClick={() => { setSelectedOrder(order); setShowDeleteModal(true); }} className="text-red-500 hover:text-red-700" title="Cancel">
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
                                        <label className="text-sm text-blueGray-600">Show</label>
                                        <select
                                            value={pagination.limit}
                                            onChange={(e) => handleLimitChange(Number(e.target.value))}
                                            className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                                        >
                                            <option value="5">5</option>
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                        </select>
                                        <span className="text-sm text-blueGray-600">
                                            Showing {pagination.offset + 1} to {Math.min(pagination.offset + salesOrders.length, pagination.total)} of {pagination.total}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                                            disabled={pagination.currentPage === 1}
                                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => {
                                            if (page === 1 || page === pagination.totalPages || (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)) {
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => handlePageChange(page)}
                                                        className={`px-3 py-2 text-sm font-medium rounded-md ${page === pagination.currentPage ? 'text-white bg-blue-500 shadow-md' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            } else if (page === pagination.currentPage - 2 || page === pagination.currentPage + 2) {
                                                return <span key={page} className="px-2 text-gray-500">...</span>;
                                            }
                                            return null;
                                        })}
                                        <button
                                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                                            disabled={pagination.currentPage === pagination.totalPages}
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
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
                            {/* Modal Header with TitleBar */}
                            <TitleBar title={modalTitle} onClose={() => { setShowModal(false); resetForm(); }} />

                            {/* Modal Body */}
                            <form onSubmit={handleSubmit}>
                                <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Customer */}
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Customer <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="CustomerId"
                                                value={formData.CustomerId}
                                                onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    errors.CustomerId ? 'ring-2 ring-red-500' : ''
                                                } ${isViewMode ? 'bg-gray-100' : ''}`}
                                            >
                                                <option value="">Select Customer</option>
                                                {customers.map(customer => (
                                                    <option key={customer.Id} value={customer.Id}>
                                                        {customer.Name} - {customer.Phone}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.CustomerId && (
                                                <p className="text-red-500 text-xs mt-1">{errors.CustomerId}</p>
                                            )}
                                        </div>

                                        {/* Order Date */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Order Date <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                name="OrderDate"
                                                value={formData.OrderDate}
                                                onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    errors.OrderDate ? 'ring-2 ring-red-500' : ''
                                                } ${isViewMode ? 'bg-gray-100' : ''}`}
                                            />
                                            {errors.OrderDate && (
                                                <p className="text-red-500 text-xs mt-1">{errors.OrderDate}</p>
                                            )}
                                        </div>

                                        {/* Expected Delivery Date */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Expected Delivery
                                            </label>
                                            <input
                                                type="date"
                                                name="ExpectedDeliveryDate"
                                                value={formData.ExpectedDeliveryDate}
                                                onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    errors.ExpectedDeliveryDate ? 'ring-2 ring-red-500' : ''
                                                } ${isViewMode ? 'bg-gray-100' : ''}`}
                                            />
                                            {errors.ExpectedDeliveryDate && (
                                                <p className="text-red-500 text-xs mt-1">{errors.ExpectedDeliveryDate}</p>
                                            )}
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Status
                                            </label>
                                            <select
                                                name="Status"
                                                value={formData.Status}
                                                onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                            >
                                                <option value="Draft">Draft</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Confirmed">Confirmed</option>
                                                <option value="Processing">Processing</option>
                                                <option value="Shipped">Shipped</option>
                                                <option value="Delivered">Delivered</option>
                                                <option value="Cancelled">Cancelled</option>
                                                <option value="Returned">Returned</option>
                                            </select>
                                        </div>

                                        {/* Priority */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Priority
                                            </label>
                                            <select
                                                name="Priority"
                                                value={formData.Priority}
                                                onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                            >
                                                <option value="Low">Low</option>
                                                <option value="Normal">Normal</option>
                                                <option value="High">High</option>
                                                <option value="Urgent">Urgent</option>
                                            </select>
                                        </div>

                                        {/* Total Amount */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Total Amount
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="TotalAmount"
                                                value={formData.TotalAmount}
                                                onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                                placeholder="0.00"
                                            />
                                        </div>

                                        {/* Tax Amount */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Tax Amount
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="TaxAmount"
                                                value={formData.TaxAmount}
                                                onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                                placeholder="0.00"
                                            />
                                        </div>

                                        {/* Discount Amount */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Discount Amount
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="DiscountAmount"
                                                value={formData.DiscountAmount}
                                                onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                                placeholder="0.00"
                                            />
                                        </div>

                                        {/* Paid Amount */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Paid Amount
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="PaidAmount"
                                                value={formData.PaidAmount}
                                                onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                                placeholder="0.00"
                                            />
                                        </div>

                                        {/* Payment Method */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Payment Method
                                            </label>
                                            <select
                                                name="PaymentMethod"
                                                value={formData.PaymentMethod}
                                                onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                            >
                                                <option value="">Select Method</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Credit Card">Credit Card</option>
                                                <option value="Debit Card">Debit Card</option>
                                                <option value="UPI">UPI</option>
                                                <option value="Net Banking">Net Banking</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                            </select>
                                        </div>

                                        {/* Shipping Address */}
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Shipping Address
                                            </label>
                                            <textarea
                                                name="ShippingAddress"
                                                value={formData.ShippingAddress}
                                                onChange={handleChange}
                                                rows="2"
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                                placeholder="Enter shipping address..."
                                            />
                                        </div>

                                        {/* Billing Address */}
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Billing Address
                                            </label>
                                            <textarea
                                                name="BillingAddress"
                                                value={formData.BillingAddress}
                                                onChange={handleChange}
                                                rows="2"
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                                placeholder="Enter billing address..."
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
                                                rows="2"
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                                placeholder="Customer-facing notes..."
                                            />
                                        </div>

                                        {/* Internal Notes */}
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Internal Notes
                                            </label>
                                            <textarea
                                                name="InternalNotes"
                                                value={formData.InternalNotes}
                                                onChange={handleChange}
                                                rows="2"
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                                                    isViewMode ? 'bg-gray-100' : ''
                                                }`}
                                                placeholder="Internal notes (not visible to customer)..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
                                    {isViewMode && selectedOrder && (
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(selectedOrder)}
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
                                        {isViewMode ? 'Close' : 'Cancel'}
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
                                            {loading ? 'Saving...' : modalMode === 'create' ? 'Create Order' : 'Update Order'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && canManageRestrictedActions && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-6 border-b">
                            <div className="flex items-center gap-2">
                                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                                <h3 className="text-xl font-bold text-blueGray-700">Cancel Sales Order</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedOrder(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-blueGray-600">
                                Are you sure you want to cancel sales order <strong>{selectedOrder?.SONumber}</strong>? 
                                This will mark the order as cancelled.
                            </p>
                            {selectedOrder && (
                                <div className="mt-4 bg-blueGray-50 p-3 rounded">
                                    <p className="text-sm"><strong>Customer:</strong> {selectedOrder.CustomerName}</p>
                                    <p className="text-sm"><strong>Amount:</strong> ₹{Number(selectedOrder.NetAmount || 0).toLocaleString()}</p>
                                    <p className="text-sm"><strong>Status:</strong> {selectedOrder.Status}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedOrder(null);
                                }}
                                className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition"
                            >
                                No, Keep It
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="bg-red-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                )}
                                {loading ? 'Cancelling...' : 'Yes, Cancel Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SalesOrders;
