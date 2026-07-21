import React, { useState, useEffect, useRef } from 'react';
import {
    PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
    ArrowPathIcon, ArrowDownTrayIcon, EyeIcon, XMarkIcon,
    CubeIcon, ExclamationTriangleIcon, ArrowsRightLeftIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';
import * as productStockService from '../../../services/productStockService';
import * as productService from '../../../services/productService';
import * as warehouseService from '../../../services/warehouseService';

const ProductStock = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        total: 0, limit: 10, offset: 0, totalPages: 0, currentPage: 1,
        hasNext: false, hasPrevious: false
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        productId: '',
        warehouseId: '',
        isActive: '',
        lowStock: false,
        sortBy: 'CreatedAt',
        sortOrder: 'DESC'
    });

    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);

    const [formData, setFormData] = useState({
        ProductId: '',
        WarehouseId: '',
        Quantity: '',
        ReservedQuantity: '',
        MinimumStock: '',
        MaximumStock: '',
        ReorderLevel: '',
        IsActive: true
    });

    const [adjustData, setAdjustData] = useState({
        adjustment: '',
        reason: ''
    });

    const [transferData, setTransferData] = useState({
        ProductId: '',
        FromWarehouseId: '',
        ToWarehouseId: '',
        Quantity: ''
    });

    const [errors, setErrors] = useState({});

    // ✅ Track initial mount to prevent double fetch
    const isInitialMount = useRef(true);
    const isFiltersInitialMount = useRef(true);

    // ✅ Fetch dropdown data ONCE on mount
    useEffect(() => {
        console.log('🚀 Component mounted - Fetching dropdown data');
        fetchDropdownData();
    }, []);

    // ✅ Fetch stocks ONCE on mount
    useEffect(() => {
        console.log('🚀 Initial stocks fetch');
        fetchStocks(pagination.limit, 0, searchTerm);
    }, []);

    // ✅ Filters effect (but NOT on mount)
    useEffect(() => {
        if (isFiltersInitialMount.current) {
            isFiltersInitialMount.current = false;
            return; // Skip on first render
        }

        console.log('🔍 Filters changed:', filters);
        fetchStocks(pagination.limit, 0, searchTerm);
    }, [filters]);

    // ✅ Debounced search (but NOT on mount)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return; // Skip on first render
        }

        console.log('🔍 Search term changed:', searchTerm);
        const delayDebounce = setTimeout(() => {
            fetchStocks(pagination.limit, 0, searchTerm);
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    // ✅ FIXED: Use correct API call with proper parameters
    const fetchDropdownData = async () => {
        try {
            // Fetch ALL products and warehouses (not just active ones)
            const [productsData, warehousesData] = await Promise.all([
                productService.getProducts(1000, 0, '', { isActive: 'true' }), // Get active products
                warehouseService.getWarehouses(1000, 0, '', { isActive: 'true' }) // Get active warehouses
            ]);
            
            setProducts(productsData.data || []);
            setWarehouses(warehousesData.data || []);
            console.log('✅ Dropdown data loaded');
        } catch (error) {
            console.error('❌ Error fetching dropdown data:', error);
            toast.error('Failed to load form data');
        }
    };

    const fetchStocks = async (limit = 10, offset = 0, search = '') => {
        setLoading(true);
        console.log(`📡 Fetching stocks: limit=${limit}, offset=${offset}, search="${search}"`);
        
        try {
            const data = await productStockService.getAllProductStocks(limit, offset, search, filters);
            setStocks(data.data || []);

            if (data.pagination) {
                setPagination(data.pagination);
            }
            
            console.log(`✅ Fetched ${data.data?.length || 0} stocks`);
        } catch (error) {
            console.error('❌ Error fetching stocks:', error);
            toast.error(error.message || 'Failed to fetch stocks');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            ProductId: '',
            WarehouseId: '',
            Quantity: '',
            ReservedQuantity: '',
            MinimumStock: '',
            MaximumStock: '',
            ReorderLevel: '',
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
        if (!formData.ProductId) newErrors.ProductId = 'Product is required';
        if (!formData.WarehouseId) newErrors.WarehouseId = 'Warehouse is required';
        if (formData.Quantity === '' || formData.Quantity < 0) newErrors.Quantity = 'Valid quantity is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const openCreateModal = () => {
        resetForm();
        setModalMode('create');
        setSelectedStock(null);
        setShowModal(true);
    };

    const openEditModal = (stock) => {
        setFormData({
            ProductId: stock.ProductId || '',
            WarehouseId: stock.WarehouseId || '',
            Quantity: stock.Quantity || '',
            ReservedQuantity: stock.ReservedQuantity || '',
            MinimumStock: stock.MinimumStock || '',
            MaximumStock: stock.MaximumStock || '',
            ReorderLevel: stock.ReorderLevel || '',
            IsActive: stock.IsActive
        });
        setModalMode('edit');
        setSelectedStock(stock);
        setShowModal(true);
    };

    const openViewModal = (stock) => {
        setFormData({
            ProductId: stock.ProductId || '',
            WarehouseId: stock.WarehouseId || '',
            Quantity: stock.Quantity || '',
            ReservedQuantity: stock.ReservedQuantity || '',
            MinimumStock: stock.MinimumStock || '',
            MaximumStock: stock.MaximumStock || '',
            ReorderLevel: stock.ReorderLevel || '',
            IsActive: stock.IsActive
        });
        setModalMode('view');
        setSelectedStock(stock);
        setShowModal(true);
    };

    const openAdjustModal = (stock) => {
        setSelectedStock(stock);
        setAdjustData({ adjustment: '', reason: '' });
        setShowAdjustModal(true);
    };

    const openTransferModal = () => {
        setTransferData({
            ProductId: '',
            FromWarehouseId: '',
            ToWarehouseId: '',
            Quantity: ''
        });
        setShowTransferModal(true);
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
            const cleanedData = {
                ...formData,
                Quantity: parseInt(formData.Quantity) || 0,
                ReservedQuantity: parseInt(formData.ReservedQuantity) || 0,
                MinimumStock: parseInt(formData.MinimumStock) || 0,
                MaximumStock: formData.MaximumStock ? parseInt(formData.MaximumStock) : null,
                ReorderLevel: parseInt(formData.ReorderLevel) || 0
            };

            if (modalMode === 'create') {
                await productStockService.createProductStock(cleanedData);
                toast.success('Product stock created successfully!');
            } else if (modalMode === 'edit') {
                await productStockService.updateProductStock(selectedStock.Id, cleanedData);
                toast.success('Product stock updated successfully!');
            }

            setShowModal(false);
            resetForm();
            fetchStocks(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error saving stock:', error);
            toast.error(error.message || 'Failed to save stock');
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustStock = async (e) => {
        e.preventDefault();
        
        if (!adjustData.adjustment || isNaN(adjustData.adjustment)) {
            toast.error('Please enter a valid adjustment value');
            return;
        }

        setLoading(true);
        try {
            await productStockService.adjustStockQuantity(
                selectedStock.Id, 
                parseInt(adjustData.adjustment), 
                adjustData.reason
            );
            toast.success('Stock adjusted successfully!');
            setShowAdjustModal(false);
            fetchStocks(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error adjusting stock:', error);
            toast.error(error.message || 'Failed to adjust stock');
        } finally {
            setLoading(false);
        }
    };

    const handleTransferStock = async (e) => {
        e.preventDefault();

        if (!transferData.ProductId || !transferData.FromWarehouseId || 
            !transferData.ToWarehouseId || !transferData.Quantity) {
            toast.error('Please fill all required fields');
            return;
        }

        if (transferData.FromWarehouseId === transferData.ToWarehouseId) {
            toast.error('Source and destination warehouses must be different');
            return;
        }

        setLoading(true);
        try {
            await productStockService.transferStock({
                ...transferData,
                Quantity: parseInt(transferData.Quantity)
            });
            toast.success('Stock transferred successfully!');
            setShowTransferModal(false);
            fetchStocks(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error transferring stock:', error);
            toast.error(error.message || 'Failed to transfer stock');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedStock) return;
        setLoading(true);
        try {
            await productStockService.deleteProductStock(selectedStock.Id);
            toast.success('Product stock deleted successfully!');
            setShowDeleteModal(false);
            setSelectedStock(null);
            fetchStocks(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error deleting stock:', error);
            toast.error(error.message || 'Failed to delete stock');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (stocks.length === 0) {
            toast.error('No data to export');
            return;
        }
        const csvContent = [
            ['ID', 'Product', 'Warehouse', 'Quantity', 'Reserved', 'Available', 'Min Stock', 'Reorder Level', 'Status'],
            ...stocks.map(s => [
                s.Id,
                s.ProductName || '',
                s.WarehouseName || '',
                s.Quantity || 0,
                s.ReservedQuantity || 0,
                s.AvailableQuantity || 0,
                s.MinimumStock || 0,
                s.ReorderLevel || 0,
                s.IsActive ? 'Active' : 'Inactive'
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `product-stocks-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Stocks exported successfully!');
    };

    const handlePageChange = (newPage) => {
        const newOffset = (newPage - 1) * pagination.limit;
        fetchStocks(pagination.limit, newOffset, searchTerm);
    };

    const handleLimitChange = (newLimit) => {
        fetchStocks(newLimit, 0, searchTerm);
    };

    const getStockStatusColor = (stock) => {
        if (stock.Quantity <= stock.ReorderLevel) return 'bg-red-100 text-red-800';
        if (stock.Quantity <= stock.MinimumStock) return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    };

    const isViewMode = modalMode === 'view';
    const modalTitle = modalMode === 'create' ? 'Add Product Stock' : 
                      modalMode === 'edit' ? 'Edit Product Stock' : 'Stock Details';


    return (
        <>
            <Toaster position="top-right" />

            <section className="py-1 bg-blueGray-50 min-h-screen">
                <div className="w-full xl:w-11/12 px-4 mx-auto mt-6">
                    <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">

                        {/* Header */}
                        <div className="rounded-t bg-white mb-0 px-6 py-6">
                            <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <ChartBarIcon className="h-8 w-8 text-blue-500" />
                                    <div className="text-left">
                                        <h6 className="text-blueGray-700 text-2xl font-bold">Product Stock Management</h6>
                                        <p className="text-sm text-blueGray-500">Manage inventory across warehouses</p>
                                    </div>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        {pagination.total} Total
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2 justify-center">
                                    <button onClick={() => fetchStocks(pagination.limit, pagination.offset, searchTerm)}
                                        className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                                        disabled={loading}>
                                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </button>

                                    <button onClick={openTransferModal}
                                        className="bg-purple-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition">
                                        <ArrowsRightLeftIcon className="h-4 w-4" />
                                        Transfer
                                    </button>

                                    <button onClick={handleExport}
                                        className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                                        disabled={stocks.length === 0}>
                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                        Export
                                    </button>

                                    <button onClick={openCreateModal}
                                        className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition">
                                        <PlusIcon className="h-4 w-4" />
                                        Add Stock
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="px-6 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <select value={filters.productId} onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                    <option value="">All Products</option>
                                    {products.map(p => (
                                        <option key={p.Id} value={p.Id}>{p.ProductName}</option>
                                    ))}
                                </select>

                                <select value={filters.warehouseId} onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                    <option value="">All Warehouses</option>
                                    {warehouses.map(w => (
                                        <option key={w.Id} value={w.Id}>{w.Name}</option>
                                    ))}
                                </select>

                                <select value={filters.isActive} onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                    <option value="">All Status</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>

                                <label className="flex items-center px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow">
                                    <input type="checkbox" checked={filters.lowStock}
                                        onChange={(e) => setFilters({ ...filters, lowStock: e.target.checked })}
                                        className="mr-2" />
                                    Low Stock Only
                                </label>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input type="text"
                                    className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                                    placeholder="Search by product, warehouse..."
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
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Product</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Warehouse</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Quantity</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Reserved</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Available</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Reorder</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Status</th>
                                        <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8">
                                                <div className="flex justify-center items-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                                    <span className="ml-2 text-blueGray-500">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : stocks.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8">
                                                <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-blueGray-300" />
                                                <p className="text-lg font-semibold text-blueGray-500">No stock records found</p>
                                                <p className="text-sm text-blueGray-400">
                                                    {searchTerm ? 'Try adjusting your search' : 'Click "Add Stock" to create one'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        stocks.map((stock) => (
                                            <tr key={stock.Id} className="hover:bg-blueGray-50 transition-colors">
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
                                                            <CubeIcon className="h-6 w-6 text-blue-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-blueGray-700">{stock.ProductName}</p>
                                                            <p className="text-xs text-blueGray-500">{stock.ProductCode}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div>
                                                        <p className="font-semibold text-blueGray-700">{stock.WarehouseName}</p>
                                                        <p className="text-xs text-blueGray-500">{stock.Location || '-'}</p>
                                                    </div>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <span className={`${getStockStatusColor(stock)} text-xs font-semibold px-3 py-1 rounded`}>
                                                        {stock.Quantity || 0}
                                                    </span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <span className="text-blueGray-700">{stock.ReservedQuantity || 0}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <span className="font-semibold text-green-600">{stock.AvailableQuantity || 0}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <span className="text-blueGray-700">{stock.ReorderLevel || 0}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <span className={`${stock.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs font-semibold px-2.5 py-1 rounded`}>
                                                        {stock.IsActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => openViewModal(stock)} className="text-blue-500 hover:text-blue-700" title="View">
                                                            <EyeIcon className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => openAdjustModal(stock)} className="text-purple-500 hover:text-purple-700" title="Adjust">
                                                            <ArrowsRightLeftIcon className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => openEditModal(stock)} className="text-green-500 hover:text-green-700" title="Edit">
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => { setSelectedStock(stock); setShowDeleteModal(true); }}
                                                            className="text-red-500 hover:text-red-700" title="Delete">
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
                                        <select value={pagination.limit} onChange={(e) => handleLimitChange(Number(e.target.value))}
                                            className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                            <option value="5">5</option>
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                        </select>
                                        <span className="text-sm text-blueGray-600">
                                            Showing {pagination.offset + 1} to {Math.min(pagination.offset + stocks.length, pagination.total)} of {pagination.total}
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

            {/* CREATE/EDIT/VIEW MODAL - Continue in next part due to length */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
                    <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
                            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
                                <div className="flex items-center gap-2">
                                    <ChartBarIcon className="h-6 w-6 text-blue-500" />
                                    <h3 className="text-xl font-bold text-blueGray-700">{modalTitle}</h3>
                                </div>
                                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 transition">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Product <span className="text-red-500">*</span>
                                            </label>
                                            <select name="ProductId" value={formData.ProductId} onChange={handleChange}
                                                disabled={isViewMode || modalMode === 'edit'}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.ProductId ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}>
                                                <option value="">Select Product</option>
                                                {products.map(p => (
                                                    <option key={p.Id} value={p.Id}>{p.ProductName} - {p.ProductCode}</option>
                                                ))}
                                            </select>
                                            {errors.ProductId && <p className="text-red-500 text-xs mt-1">{errors.ProductId}</p>}
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Warehouse <span className="text-red-500">*</span>
                                            </label>
                                            <select name="WarehouseId" value={formData.WarehouseId} onChange={handleChange}
                                                disabled={isViewMode || modalMode === 'edit'}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.WarehouseId ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}>
                                                <option value="">Select Warehouse</option>
                                                {warehouses.map(w => (
                                                    <option key={w.Id} value={w.Id}>{w.Name} - {w.WarehouseCode}</option>
                                                ))}
                                            </select>
                                            {errors.WarehouseId && <p className="text-red-500 text-xs mt-1">{errors.WarehouseId}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Quantity <span className="text-red-500">*</span>
                                            </label>
                                            <input type="number" name="Quantity" value={formData.Quantity} onChange={handleChange}
                                                disabled={isViewMode} min="0"
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.Quantity ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Enter quantity" />
                                            {errors.Quantity && <p className="text-red-500 text-xs mt-1">{errors.Quantity}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Reserved Quantity</label>
                                            <input type="number" name="ReservedQuantity" value={formData.ReservedQuantity} onChange={handleChange}
                                                disabled={isViewMode} min="0"
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Reserved quantity" />
                                        </div>

                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Minimum Stock</label>
                                            <input type="number" name="MinimumStock" value={formData.MinimumStock} onChange={handleChange}
                                                disabled={isViewMode} min="0"
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Minimum stock" />
                                        </div>

                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Maximum Stock</label>
                                            <input type="number" name="MaximumStock" value={formData.MaximumStock} onChange={handleChange}
                                                disabled={isViewMode} min="0"
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Maximum stock" />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Reorder Level</label>
                                            <input type="number" name="ReorderLevel" value={formData.ReorderLevel} onChange={handleChange}
                                                disabled={isViewMode} min="0"
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Reorder level" />
                                        </div>

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

            {/* ADJUST MODAL */}
            {showAdjustModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-6 border-b">
                            <div className="flex items-center gap-2">
                                <ArrowsRightLeftIcon className="h-6 w-6 text-purple-500" />
                                <h3 className="text-xl font-bold text-blueGray-700">Adjust Stock</h3>
                            </div>
                            <button onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAdjustStock}>
                            <div className="p-6">
                                <div className="mb-4">
                                    <p className="text-sm text-blueGray-600 mb-2">Current Stock: <span className="font-bold">{selectedStock?.Quantity || 0}</span></p>
                                    <p className="text-sm text-blueGray-600">Available: <span className="font-bold text-green-600">{selectedStock?.AvailableQuantity || 0}</span></p>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                        Adjustment <span className="text-red-500">*</span>
                                    </label>
                                    <input type="number" value={adjustData.adjustment}
                                        onChange={(e) => setAdjustData({ ...adjustData, adjustment: e.target.value })}
                                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                                        placeholder="Enter +ve to add, -ve to remove" />
                                    <p className="text-xs text-blueGray-400 mt-1">Use positive numbers to add stock, negative to remove</p>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-blueGray-600 text-sm font-bold mb-2">Reason</label>
                                    <textarea value={adjustData.reason}
                                        onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                                        rows="3"
                                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                                        placeholder="Reason for adjustment (optional)" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 p-6 border-t">
                                <button type="button" onClick={() => setShowAdjustModal(false)}
                                    className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                    Cancel
                                </button>
                                <button type="submit"
                                    className="bg-purple-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                    Adjust Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TRANSFER MODAL */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-6 border-b">
                            <div className="flex items-center gap-2">
                                <ArrowsRightLeftIcon className="h-6 w-6 text-purple-500" />
                                <h3 className="text-xl font-bold text-blueGray-700">Transfer Stock</h3>
                            </div>
                            <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleTransferStock}>
                            <div className="p-6">
                                <div className="mb-4">
                                    <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                        Product <span className="text-red-500">*</span>
                                    </label>
                                    <select value={transferData.ProductId}
                                        onChange={(e) => setTransferData({ ...transferData, ProductId: e.target.value })}
                                        className="border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full">
                                        <option value="">Select Product</option>
                                        {products.map(p => (
                                            <option key={p.Id} value={p.Id}>{p.ProductName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                        From Warehouse <span className="text-red-500">*</span>
                                    </label>
                                    <select value={transferData.FromWarehouseId}
                                        onChange={(e) => setTransferData({ ...transferData, FromWarehouseId: e.target.value })}
                                        className="border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full">
                                        <option value="">Select Source Warehouse</option>
                                        {warehouses.map(w => (
                                            <option key={w.Id} value={w.Id}>{w.Name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                        To Warehouse <span className="text-red-500">*</span>
                                    </label>
                                    <select value={transferData.ToWarehouseId}
                                        onChange={(e) => setTransferData({ ...transferData, ToWarehouseId: e.target.value })}
                                        className="border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full">
                                        <option value="">Select Destination Warehouse</option>
                                        {warehouses.map(w => (
                                            <option key={w.Id} value={w.Id}>{w.Name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input type="number" value={transferData.Quantity}
                                        onChange={(e) => setTransferData({ ...transferData, Quantity: e.target.value })}
                                        min="1"
                                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                                        placeholder="Quantity to transfer" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 p-6 border-t">
                                <button type="button" onClick={() => setShowTransferModal(false)}
                                    className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                    Cancel
                                </button>
                                <button type="submit"
                                    className="bg-purple-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                    Transfer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-6 border-b">
                            <div className="flex items-center gap-2">
                                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                                <h3 className="text-xl font-bold text-blueGray-700">Delete Stock Record</h3>
                            </div>
                            <button onClick={() => { setShowDeleteModal(false); setSelectedStock(null); }} className="text-gray-400 hover:text-gray-600 transition">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-blueGray-600">Are you sure you want to delete this stock record? This action cannot be undone.</p>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t">
                            <button onClick={() => { setShowDeleteModal(false); setSelectedStock(null); }}
                                className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                Cancel
                            </button>
                            <button onClick={handleDelete}
                                className="bg-red-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductStock;
