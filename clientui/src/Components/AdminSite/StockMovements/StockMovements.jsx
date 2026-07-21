// import React, { useState, useEffect, useRef } from 'react';
// import {
//     PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
//     ArrowPathIcon, ArrowDownTrayIcon, EyeIcon, XMarkIcon,
//     ArrowTrendingUpIcon, ArrowTrendingDownIcon, AdjustmentsHorizontalIcon,
//     ArrowsRightLeftIcon, ExclamationTriangleIcon, CalendarIcon,
//     ChartBarIcon
// } from '@heroicons/react/24/outline';
// import toast, { Toaster } from 'react-hot-toast';
// import * as stockMovementService from '../../../services/stockMovementService';
// import * as productService from '../../../services/productService';
// import * as warehouseService from '../../../services/warehouseService';

// const StockMovements = () => {
//     const [movements, setMovements] = useState([]);
//     const [loading, setLoading] = useState(false);
//     const [pagination, setPagination] = useState({
//         total: 0, limit: 10, offset: 0, totalPages: 0, currentPage: 1,
//         hasNext: false, hasPrevious: false
//     });
//     const [searchTerm, setSearchTerm] = useState('');
//     const [filters, setFilters] = useState({
//         productId: '',
//         warehouseId: '',
//         changeType: '',
//         startDate: '',
//         endDate: '',
//         sortBy: 'CreatedAt',
//         sortOrder: 'DESC'
//     });

//     const [stats, setStats] = useState(null);
//     const [products, setProducts] = useState([]);
//     const [warehouses, setWarehouses] = useState([]);
//     const [showModal, setShowModal] = useState(false);
//     const [modalMode, setModalMode] = useState('create');
//     const [showDeleteModal, setShowDeleteModal] = useState(false);
//     const [selectedMovement, setSelectedMovement] = useState(null);

//     const [formData, setFormData] = useState({
//         ProductId: '',
//         WarehouseId: '',
//         ChangeType: 'IN',
//         Quantity: '',
//         Reason: '',
//         CreatedBy: 1 // Replace with actual user ID from auth
//     });

//     const [errors, setErrors] = useState({});

//     // Track initial mount to prevent double fetch
//     const isInitialMount = useRef(true);
//     const isFiltersInitialMount = useRef(true);

//     // Fetch dropdown data ONCE on mount
//     useEffect(() => {
//         console.log('🚀 Component mounted - Fetching dropdown data');
//         fetchDropdownData();
//         fetchStats();
//     }, []);

//     // Fetch movements ONCE on mount
//     useEffect(() => {
//         console.log('🚀 Initial movements fetch');
//         fetchMovements(pagination.limit, 0, searchTerm);
//     }, []);

//     // Filters effect (but NOT on mount)
//     useEffect(() => {
//         if (isFiltersInitialMount.current) {
//             isFiltersInitialMount.current = false;
//             return;
//         }

//         console.log('🔍 Filters changed:', filters);
//         fetchMovements(pagination.limit, 0, searchTerm);
//     }, [filters]);

//     // Debounced search (but NOT on mount)
//     useEffect(() => {
//         if (isInitialMount.current) {
//             isInitialMount.current = false;
//             return;
//         }

//         console.log('🔍 Search term changed:', searchTerm);
//         const delayDebounce = setTimeout(() => {
//             fetchMovements(pagination.limit, 0, searchTerm);
//         }, 500);

//         return () => clearTimeout(delayDebounce);
//     }, [searchTerm]);

//     const fetchDropdownData = async () => {
//         try {
//             const [productsData, warehousesData] = await Promise.all([
//                 productService.getProducts(1000, 0, '', { isActive: 'true' }),
//                 warehouseService.getWarehouses(1000, 0, '', { isActive: 'true' })
//             ]);
            
//             setProducts(productsData.data || []);
//             setWarehouses(warehousesData.data || []);
//             console.log('✅ Dropdown data loaded');
//         } catch (error) {
//             console.error('❌ Error fetching dropdown data:', error);
//             toast.error('Failed to load form data');
//         }
//     };

//     const fetchStats = async () => {
//         try {
//             const response = await stockMovementService.getStockMovementStats();
//             setStats(response.data);
//         } catch (error) {
//             console.error('Error fetching stats:', error);
//         }
//     };

//     const fetchMovements = async (limit = 10, offset = 0, search = '') => {
//         setLoading(true);
//         console.log(`📡 Fetching movements: limit=${limit}, offset=${offset}, search="${search}"`);
        
//         try {
//             const data = await stockMovementService.getAllStockMovements(limit, offset, search, filters);
//             setMovements(data.data || []);

//             if (data.pagination) {
//                 setPagination(data.pagination);
//             }
            
//             console.log(`✅ Fetched ${data.data?.length || 0} movements`);
//         } catch (error) {
//             console.error('❌ Error fetching movements:', error);
//             toast.error(error.response?.data?.message || 'Failed to fetch stock movements');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const resetForm = () => {
//         setFormData({
//             ProductId: '',
//             WarehouseId: '',
//             ChangeType: 'IN',
//             Quantity: '',
//             Reason: '',
//             CreatedBy: 1
//         });
//         setErrors({});
//     };

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({
//             ...prev,
//             [name]: value
//         }));
//         if (errors[name]) {
//             setErrors(prev => ({ ...prev, [name]: '' }));
//         }
//     };

//     const validateForm = () => {
//         const newErrors = {};
//         if (!formData.ProductId) newErrors.ProductId = 'Product is required';
//         if (!formData.WarehouseId) newErrors.WarehouseId = 'Warehouse is required';
//         if (!formData.ChangeType) newErrors.ChangeType = 'Change type is required';
//         if (formData.Quantity === '' || formData.Quantity <= 0) {
//             newErrors.Quantity = 'Valid quantity is required';
//         }
//         setErrors(newErrors);
//         return Object.keys(newErrors).length === 0;
//     };

//     const openCreateModal = () => {
//         resetForm();
//         setModalMode('create');
//         setSelectedMovement(null);
//         setShowModal(true);
//     };

//     const openEditModal = (movement) => {
//         setFormData({
//             ProductId: movement.ProductId || '',
//             WarehouseId: movement.WarehouseId || '',
//             ChangeType: movement.ChangeType || 'IN',
//             Quantity: movement.Quantity || '',
//             Reason: movement.Reason || '',
//             CreatedBy: movement.CreatedBy || 1
//         });
//         setModalMode('edit');
//         setSelectedMovement(movement);
//         setShowModal(true);
//     };

//     const openViewModal = (movement) => {
//         setFormData({
//             ProductId: movement.ProductId || '',
//             WarehouseId: movement.WarehouseId || '',
//             ChangeType: movement.ChangeType || 'IN',
//             Quantity: movement.Quantity || '',
//             Reason: movement.Reason || '',
//             CreatedBy: movement.CreatedBy || 1
//         });
//         setModalMode('view');
//         setSelectedMovement(movement);
//         setShowModal(true);
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (modalMode === 'view') return;

//         if (!validateForm()) {
//             toast.error('Please fix validation errors');
//             return;
//         }

//         setLoading(true);
//         try {
//             if (modalMode === 'create') {
//                 await stockMovementService.createStockMovement(formData);
//                 toast.success('Stock movement created successfully!');
//             } else if (modalMode === 'edit') {
//                 await stockMovementService.updateStockMovement(selectedMovement.Id, formData);
//                 toast.success('Stock movement updated successfully!');
//             }

//             setShowModal(false);
//             resetForm();
//             fetchMovements(pagination.limit, pagination.offset, searchTerm);
//             fetchStats();
//         } catch (error) {
//             console.error('Error saving movement:', error);
//             toast.error(error.response?.data?.message || 'Failed to save stock movement');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleDelete = async () => {
//         if (!selectedMovement) return;
//         setLoading(true);
//         try {
//             await stockMovementService.deleteStockMovement(selectedMovement.Id);
//             toast.success('Stock movement deleted successfully!');
//             setShowDeleteModal(false);
//             setSelectedMovement(null);
//             fetchMovements(pagination.limit, pagination.offset, searchTerm);
//             fetchStats();
//         } catch (error) {
//             console.error('Error deleting movement:', error);
//             toast.error(error.response?.data?.message || 'Failed to delete stock movement');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleExport = () => {
//         if (movements.length === 0) {
//             toast.error('No data to export');
//             return;
//         }

//         const csvContent = [
//             ['ID', 'Date', 'Product', 'Warehouse', 'Change Type', 'Quantity', 'Reason', 'Created By'],
//             ...movements.map(m => [
//                 m.Id,
//                 new Date(m.CreatedAt).toLocaleString(),
//                 m.ProductName || '',
//                 m.WarehouseName || '',
//                 m.ChangeType,
//                 m.Quantity,
//                 m.Reason || '',
//                 m.CreatedByName || ''
//             ])
//         ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

//         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//         const url = window.URL.createObjectURL(blob);
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         window.URL.revokeObjectURL(url);
//         toast.success('Stock movements exported successfully!');
//     };

//     const handlePageChange = (newPage) => {
//         const newOffset = (newPage - 1) * pagination.limit;
//         fetchMovements(pagination.limit, newOffset, searchTerm);
//     };

//     const handleLimitChange = (newLimit) => {
//         fetchMovements(newLimit, 0, searchTerm);
//     };

//     const getChangeTypeIcon = (type) => {
//         switch (type) {
//             case 'IN': return <ArrowTrendingUpIcon className="h-5 w-5" />;
//             case 'OUT': return <ArrowTrendingDownIcon className="h-5 w-5" />;
//             case 'ADJUSTMENT': return <AdjustmentsHorizontalIcon className="h-5 w-5" />;
//             case 'TRANSFER': return <ArrowsRightLeftIcon className="h-5 w-5" />;
//             default: return <ChartBarIcon className="h-5 w-5" />;
//         }
//     };

//     const getChangeTypeColor = (type) => {
//         switch (type) {
//             case 'IN': return 'bg-green-100 text-green-800';
//             case 'OUT': return 'bg-red-100 text-red-800';
//             case 'ADJUSTMENT': return 'bg-yellow-100 text-yellow-800';
//             case 'TRANSFER': return 'bg-blue-100 text-blue-800';
//             default: return 'bg-gray-100 text-gray-800';
//         }
//     };

//     const isViewMode = modalMode === 'view';
//     const modalTitle = modalMode === 'create' ? 'Record Stock Movement' : 
//                       modalMode === 'edit' ? 'Edit Stock Movement' : 'Movement Details';

//     return (
//         <>
//             <Toaster position="top-right" toastOptions={{
//                 success: { duration: 3000, style: { background: '#10B981', color: '#fff' } },
//                 error: { duration: 4000, style: { background: '#EF4444', color: '#fff' } }
//             }} />

//             <section className="py-1 bg-blueGray-50 min-h-screen">
//                 <div className="w-full xl:w-11/12 px-4 mx-auto mt-6">
                    
//                     {/* Statistics Cards */}
//                     {stats && (
//                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//                             <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
//                                 <div className="flex items-center justify-between">
//                                     <div>
//                                         <p className="text-sm text-blueGray-500 font-semibold">Total Movements</p>
//                                         <p className="text-3xl font-bold text-blueGray-700">{stats.totalMovements || 0}</p>
//                                     </div>
//                                     <ChartBarIcon className="h-12 w-12 text-blue-500 opacity-50" />
//                                 </div>
//                             </div>

//                             <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
//                                 <div className="flex items-center justify-between">
//                                     <div>
//                                         <p className="text-sm text-blueGray-500 font-semibold">Stock In</p>
//                                         <p className="text-3xl font-bold text-green-600">{stats.totalIn || 0}</p>
//                                         <p className="text-xs text-blueGray-400 mt-1">Qty: {stats.totalInQuantity || 0}</p>
//                                     </div>
//                                     <ArrowTrendingUpIcon className="h-12 w-12 text-green-500 opacity-50" />
//                                 </div>
//                             </div>

//                             <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
//                                 <div className="flex items-center justify-between">
//                                     <div>
//                                         <p className="text-sm text-blueGray-500 font-semibold">Stock Out</p>
//                                         <p className="text-3xl font-bold text-red-600">{stats.totalOut || 0}</p>
//                                         <p className="text-xs text-blueGray-400 mt-1">Qty: {stats.totalOutQuantity || 0}</p>
//                                     </div>
//                                     <ArrowTrendingDownIcon className="h-12 w-12 text-red-500 opacity-50" />
//                                 </div>
//                             </div>

//                             <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
//                                 <div className="flex items-center justify-between">
//                                     <div>
//                                         <p className="text-sm text-blueGray-500 font-semibold">Adjustments</p>
//                                         <p className="text-3xl font-bold text-yellow-600">{stats.totalAdjustments || 0}</p>
//                                         <p className="text-xs text-blueGray-400 mt-1">Transfers: {stats.totalTransfers || 0}</p>
//                                     </div>
//                                     <AdjustmentsHorizontalIcon className="h-12 w-12 text-yellow-500 opacity-50" />
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">

//                         {/* Header */}
//                         <div className="rounded-t bg-white mb-0 px-6 py-6">
//                             <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
//                                 <div className="flex items-center gap-3">
//                                     <ChartBarIcon className="h-8 w-8 text-blue-500" />
//                                     <div className="text-left">
//                                         <h6 className="text-blueGray-700 text-2xl font-bold">Stock Movements</h6>
//                                         <p className="text-sm text-blueGray-500">Track all inventory movements</p>
//                                     </div>
//                                     <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
//                                         {pagination.total} Total
//                                     </span>
//                                 </div>

//                                 <div className="flex flex-wrap gap-2 justify-center">
//                                     <button onClick={() => fetchMovements(pagination.limit, pagination.offset, searchTerm)}
//                                         className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
//                                         disabled={loading}>
//                                         <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
//                                         Refresh
//                                     </button>

//                                     <button onClick={handleExport}
//                                         className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
//                                         disabled={movements.length === 0}>
//                                         <ArrowDownTrayIcon className="h-4 w-4" />
//                                         Export
//                                     </button>

//                                     <button onClick={openCreateModal}
//                                         className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition">
//                                         <PlusIcon className="h-4 w-4" />
//                                         Record Movement
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Filters */}
//                         <div className="px-6 pb-4">
//                             <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
//                                 <select value={filters.productId} 
//                                     onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
//                                     className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
//                                     <option value="">All Products</option>
//                                     {products.map(p => (
//                                         <option key={p.Id} value={p.Id}>{p.ProductName}</option>
//                                     ))}
//                                 </select>

//                                 <select value={filters.warehouseId} 
//                                     onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
//                                     className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
//                                     <option value="">All Warehouses</option>
//                                     {warehouses.map(w => (
//                                         <option key={w.Id} value={w.Id}>{w.Name}</option>
//                                     ))}
//                                 </select>

//                                 <select value={filters.changeType} 
//                                     onChange={(e) => setFilters({ ...filters, changeType: e.target.value })}
//                                     className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
//                                     <option value="">All Types</option>
//                                     <option value="IN">Stock In</option>
//                                     <option value="OUT">Stock Out</option>
//                                     <option value="ADJUSTMENT">Adjustment</option>
//                                     <option value="TRANSFER">Transfer</option>
//                                 </select>

//                                 <input type="date" value={filters.startDate}
//                                     onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
//                                     className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
//                                     placeholder="Start Date" />

//                                 <input type="date" value={filters.endDate}
//                                     onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
//                                     className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
//                                     placeholder="End Date" />
//                             </div>

//                             {/* Search */}
//                             <div className="relative">
//                                 <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
//                                     <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
//                                 </div>
//                                 <input type="text"
//                                     className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
//                                     placeholder="Search by product, warehouse, reason..."
//                                     value={searchTerm}
//                                     onChange={(e) => setSearchTerm(e.target.value)} />
//                                 {searchTerm && (
//                                     <button onClick={() => setSearchTerm('')} 
//                                         className="absolute inset-y-0 right-0 flex items-center pr-3">
//                                         <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
//                                     </button>
//                                 )}
//                             </div>
//                         </div>

//                         {/* Table */}
//                         <div className="block w-full overflow-x-auto">
//                             <table className="items-center w-full bg-transparent border-collapse">
//                                 <thead>
//                                     <tr>
//                                         <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Date/Time</th>
//                                         <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Product</th>
//                                         <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Warehouse</th>
//                                         <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Type</th>
//                                         <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Quantity</th>
//                                         <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">Reason</th>
//                                         <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">Actions</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {loading ? (
//                                         <tr>
//                                             <td colSpan="7" className="text-center py-8">
//                                                 <div className="flex justify-center items-center">
//                                                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
//                                                     <span className="ml-2 text-blueGray-500">Loading...</span>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ) : movements.length === 0 ? (
//                                         <tr>
//                                             <td colSpan="7" className="text-center py-8">
//                                                 <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-blueGray-300" />
//                                                 <p className="text-lg font-semibold text-blueGray-500">No stock movements found</p>
//                                                 <p className="text-sm text-blueGray-400">
//                                                     {searchTerm ? 'Try adjusting your search' : 'Click "Record Movement" to create one'}
//                                                 </p>
//                                             </td>
//                                         </tr>
//                                     ) : (
//                                         movements.map((movement) => (
//                                             <tr key={movement.Id} className="hover:bg-blueGray-50 transition-colors">
//                                                 <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
//                                                     <div className="flex items-center gap-2">
//                                                         <CalendarIcon className="h-4 w-4 text-blueGray-400" />
//                                                         <div>
//                                                             <p className="font-semibold text-blueGray-700">
//                                                                 {new Date(movement.CreatedAt).toLocaleDateString()}
//                                                             </p>
//                                                             <p className="text-xs text-blueGray-500">
//                                                                 {new Date(movement.CreatedAt).toLocaleTimeString()}
//                                                             </p>
//                                                         </div>
//                                                     </div>
//                                                 </td>
//                                                 <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
//                                                     <div>
//                                                         <p className="font-semibold text-blueGray-700">{movement.ProductName}</p>
//                                                         <p className="text-xs text-blueGray-500">{movement.ProductCode}</p>
//                                                     </div>
//                                                 </td>
//                                                 <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
//                                                     <div>
//                                                         <p className="font-semibold text-blueGray-700">{movement.WarehouseName}</p>
//                                                         <p className="text-xs text-blueGray-500">{movement.Location || '-'}</p>
//                                                     </div>
//                                                 </td>
//                                                 <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
//                                                     <span className={`${getChangeTypeColor(movement.ChangeType)} text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1`}>
//                                                         {getChangeTypeIcon(movement.ChangeType)}
//                                                         {movement.ChangeType}
//                                                     </span>
//                                                 </td>
//                                                 <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
//                                                     <span className="font-bold text-blueGray-700 text-lg">{movement.Quantity}</span>
//                                                 </td>
//                                                 <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs p-4">
//                                                     <p className="text-blueGray-600 truncate max-w-xs" title={movement.Reason}>
//                                                         {movement.Reason || '-'}
//                                                     </p>
//                                                 </td>
//                                                 <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
//                                                     <div className="flex gap-2 justify-center">
//                                                         <button onClick={() => openViewModal(movement)} 
//                                                             className="text-blue-500 hover:text-blue-700" title="View">
//                                                             <EyeIcon className="h-5 w-5" />
//                                                         </button>
//                                                         <button onClick={() => openEditModal(movement)} 
//                                                             className="text-green-500 hover:text-green-700" title="Edit">
//                                                             <PencilIcon className="h-5 w-5" />
//                                                         </button>
//                                                         <button onClick={() => { setSelectedMovement(movement); setShowDeleteModal(true); }}
//                                                             className="text-red-500 hover:text-red-700" title="Delete">
//                                                             <TrashIcon className="h-5 w-5" />
//                                                         </button>
//                                                     </div>
//                                                 </td>
//                                             </tr>
//                                         ))
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Pagination */}
//                         {pagination.total > 0 && (
//                             <div className="px-6 py-4 border-t border-blueGray-200">
//                                 <div className="flex flex-col md:flex-row justify-between items-center gap-4">
//                                     <div className="flex items-center gap-2">
//                                         <label className="text-sm text-blueGray-600">Show:</label>
//                                         <select value={pagination.limit} 
//                                             onChange={(e) => handleLimitChange(Number(e.target.value))}
//                                             className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
//                                             <option value="5">5</option>
//                                             <option value="10">10</option>
//                                             <option value="25">25</option>
//                                             <option value="50">50</option>
//                                         </select>
//                                         <span className="text-sm text-blueGray-600">
//                                             Showing {pagination.offset + 1} to {Math.min(pagination.offset + movements.length, pagination.total)} of {pagination.total}
//                                         </span>
//                                     </div>

//                                     <div className="flex gap-2">
//                                         <button onClick={() => handlePageChange(pagination.currentPage - 1)} 
//                                             disabled={pagination.currentPage === 1}
//                                             className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
//                                             Previous
//                                         </button>

//                                         {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => {
//                                             if (page === 1 || page === pagination.totalPages || (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)) {
//                                                 return (
//                                                     <button key={page} onClick={() => handlePageChange(page)}
//                                                         className={`px-3 py-2 text-sm font-medium rounded-md ${page === pagination.currentPage
//                                                             ? 'text-white bg-blue-500 shadow-md' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}>
//                                                         {page}
//                                                     </button>
//                                                 );
//                                             } else if (page === pagination.currentPage - 2 || page === pagination.currentPage + 2) {
//                                                 return <span key={page} className="px-2 text-gray-500">...</span>;
//                                             }
//                                             return null;
//                                         })}

//                                         <button onClick={() => handlePageChange(pagination.currentPage + 1)} 
//                                             disabled={pagination.currentPage === pagination.totalPages}
//                                             className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
//                                             Next
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </section>

//             {/* Create/Edit/View Modal */}
//             {showModal && (
//                 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
//                     <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
//                         <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
//                             <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
//                                 <div className="flex items-center gap-2">
//                                     <ChartBarIcon className="h-6 w-6 text-blue-500" />
//                                     <h3 className="text-xl font-bold text-blueGray-700">{modalTitle}</h3>
//                                 </div>
//                                 <button onClick={() => { setShowModal(false); resetForm(); }} 
//                                     className="text-gray-400 hover:text-gray-600 transition">
//                                     <XMarkIcon className="h-6 w-6" />
//                                 </button>
//                             </div>

//                             <form onSubmit={handleSubmit}>
//                                 <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        
//                                         {/* Product */}
//                                         <div className="col-span-2">
//                                             <label className="block text-blueGray-600 text-sm font-bold mb-2">
//                                                 Product <span className="text-red-500">*</span>
//                                             </label>
//                                             <select name="ProductId" value={formData.ProductId} onChange={handleChange}
//                                                 disabled={isViewMode}
//                                                 className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.ProductId ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}>
//                                                 <option value="">Select Product</option>
//                                                 {products.map(p => (
//                                                     <option key={p.Id} value={p.Id}>{p.ProductName} - {p.ProductCode}</option>
//                                                 ))}
//                                             </select>
//                                             {errors.ProductId && <p className="text-red-500 text-xs mt-1">{errors.ProductId}</p>}
//                                         </div>

//                                         {/* Warehouse */}
//                                         <div className="col-span-2">
//                                             <label className="block text-blueGray-600 text-sm font-bold mb-2">
//                                                 Warehouse <span className="text-red-500">*</span>
//                                             </label>
//                                             <select name="WarehouseId" value={formData.WarehouseId} onChange={handleChange}
//                                                 disabled={isViewMode}
//                                                 className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.WarehouseId ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}>
//                                                 <option value="">Select Warehouse</option>
//                                                 {warehouses.map(w => (
//                                                     <option key={w.Id} value={w.Id}>{w.Name} - {w.WarehouseCode}</option>
//                                                 ))}
//                                             </select>
//                                             {errors.WarehouseId && <p className="text-red-500 text-xs mt-1">{errors.WarehouseId}</p>}
//                                         </div>

//                                         {/* Change Type */}
//                                         <div>
//                                             <label className="block text-blueGray-600 text-sm font-bold mb-2">
//                                                 Movement Type <span className="text-red-500">*</span>
//                                             </label>
//                                             <select name="ChangeType" value={formData.ChangeType} onChange={handleChange}
//                                                 disabled={isViewMode}
//                                                 className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.ChangeType ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}>
//                                                 <option value="IN">Stock In</option>
//                                                 <option value="OUT">Stock Out</option>
//                                                 <option value="ADJUSTMENT">Adjustment</option>
//                                                 <option value="TRANSFER">Transfer</option>
//                                             </select>
//                                             {errors.ChangeType && <p className="text-red-500 text-xs mt-1">{errors.ChangeType}</p>}
//                                         </div>

//                                         {/* Quantity */}
//                                         <div>
//                                             <label className="block text-blueGray-600 text-sm font-bold mb-2">
//                                                 Quantity <span className="text-red-500">*</span>
//                                             </label>
//                                             <input type="number" name="Quantity" value={formData.Quantity} onChange={handleChange}
//                                                 disabled={isViewMode} min="1"
//                                                 className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.Quantity ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}
//                                                 placeholder="Enter quantity" />
//                                             {errors.Quantity && <p className="text-red-500 text-xs mt-1">{errors.Quantity}</p>}
//                                         </div>

//                                         {/* Reason */}
//                                         <div className="col-span-2">
//                                             <label className="block text-blueGray-600 text-sm font-bold mb-2">Reason / Notes</label>
//                                             <textarea name="Reason" value={formData.Reason} onChange={handleChange} rows="3"
//                                                 disabled={isViewMode}
//                                                 className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
//                                                 placeholder="Enter reason for this movement" />
//                                         </div>

//                                         {/* Display Created Info in View Mode */}
//                                         {isViewMode && selectedMovement && (
//                                             <div className="col-span-2 bg-blueGray-50 p-4 rounded">
//                                                 <p className="text-sm text-blueGray-600">
//                                                     <strong>Created By:</strong> {selectedMovement.CreatedByName || 'N/A'}
//                                                 </p>
//                                                 <p className="text-sm text-blueGray-600 mt-1">
//                                                     <strong>Created At:</strong> {new Date(selectedMovement.CreatedAt).toLocaleString()}
//                                                 </p>
//                                             </div>
//                                         )}
//                                     </div>
//                                 </div>

//                                 <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
//                                     <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
//                                         className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
//                                         {isViewMode ? 'Close' : 'Cancel'}
//                                     </button>
//                                     {!isViewMode && (
//                                         <button type="submit" disabled={loading}
//                                             className="bg-blue-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md disabled:opacity-50 flex items-center gap-2 transition">
//                                             {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
//                                             {loading ? 'Saving...' : modalMode === 'create' ? 'Record' : 'Update'}
//                                         </button>
//                                     )}
//                                 </div>
//                             </form>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Delete Modal */}
//             {showDeleteModal && (
//                 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
//                     <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
//                         <div className="flex justify-between items-center p-6 border-b">
//                             <div className="flex items-center gap-2">
//                                 <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
//                                 <h3 className="text-xl font-bold text-blueGray-700">Delete Stock Movement</h3>
//                             </div>
//                             <button onClick={() => { setShowDeleteModal(false); setSelectedMovement(null); }} 
//                                 className="text-gray-400 hover:text-gray-600 transition">
//                                 <XMarkIcon className="h-6 w-6" />
//                             </button>
//                         </div>
//                         <div className="p-6">
//                             <p className="text-blueGray-600">
//                                 Are you sure you want to delete this stock movement record? This action cannot be undone.
//                             </p>
//                             {selectedMovement && (
//                                 <div className="mt-4 bg-blueGray-50 p-3 rounded">
//                                     <p className="text-sm"><strong>Product:</strong> {selectedMovement.ProductName}</p>
//                                     <p className="text-sm"><strong>Type:</strong> {selectedMovement.ChangeType}</p>
//                                     <p className="text-sm"><strong>Quantity:</strong> {selectedMovement.Quantity}</p>
//                                 </div>
//                             )}
//                         </div>
//                         <div className="flex justify-end gap-3 p-6 border-t">
//                             <button onClick={() => { setShowDeleteModal(false); setSelectedMovement(null); }}
//                                 className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition">
//                                 Cancel
//                             </button>
//                             <button onClick={handleDelete} disabled={loading}
//                                 className="bg-red-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition disabled:opacity-50 flex items-center gap-2">
//                                 {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
//                                 {loading ? 'Deleting...' : 'Delete'}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// export default StockMovements;


// src/Components/AdminSite/Inventory/StockMovements.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  AdjustmentsHorizontalIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';

import * as stockMovementService from '../../../services/stockMovementService';
import * as productService from '../../../services/productService';
import * as warehouseService from '../../../services/warehouseService';
import { getSessionUser } from '../../../utils/sessionUser';
import TitleBar from '../../TitleBar';

const StockMovements = () => {
  const sessionUser = getSessionUser() || {};
  const currentUserId = Number(sessionUser.id || sessionUser.userId) || null;
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    totalPages: 0,
    currentPage: 1,
    hasNext: false,
    hasPrevious: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    productId: '',
    warehouseId: '',
    changeType: '',
    startDate: '',
    endDate: '',
    sortBy: 'CreatedAt',
    sortOrder: 'DESC',
  });

  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);

  const [formData, setFormData] = useState({
    ProductId: '',
    WarehouseId: '',
    ChangeType: 'IN',
    Quantity: '',
    Reason: '',
    CreatedBy: currentUserId,
  });

  const [errors, setErrors] = useState({});

  const isInitialMount = useRef(true);
  const isFiltersInitialMount = useRef(true);

  // Load dropdowns + stats once
  useEffect(() => {
    fetchDropdownData();
    fetchStats();
  }, []);

  // Initial movements load
  useEffect(() => {
    fetchMovements(pagination.limit, 0, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filters change (skip first render)
  useEffect(() => {
    if (isFiltersInitialMount.current) {
      isFiltersInitialMount.current = false;
      return;
    }
    fetchMovements(pagination.limit, 0, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Debounced search (skip first render)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchMovements(pagination.limit, 0, searchTerm);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const fetchDropdownData = async () => {
    try {
      const [productsData, warehousesData] = await Promise.all([
        productService.getProducts(1000, 0, '', { isActive: 'true' }),
        warehouseService.getWarehouses(1000, 0, '', { isActive: 'true' }),
      ]);

      setProducts(productsData.data || []);
      setWarehouses(warehousesData.data || []);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      toast.error(
        error.response?.data?.message || 'Failed to load form data'
      );
    }
  };

  const fetchStats = async () => {
    try {
      const response = await stockMovementService.getStockMovementStats();
      setStats(response.data || null);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMovements = async (limit = 10, offset = 0, search = '') => {
    setLoading(true);
    try {
      const data = await stockMovementService.getAllStockMovements(
        limit,
        offset,
        search,
        filters
      );
      setMovements(data.data || []);

      if (data.pagination) {
        setPagination(data.pagination);
      } else {
        setPagination((prev) => ({
          ...prev,
          total: data.data?.length || 0,
          limit,
          offset,
          totalPages: 1,
          currentPage: 1,
          hasNext: false,
          hasPrevious: false,
        }));
      }
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error(
        error.response?.data?.message || 'Failed to fetch stock movements'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      ProductId: '',
      WarehouseId: '',
      ChangeType: 'IN',
      Quantity: '',
      Reason: '',
      CreatedBy: currentUserId,
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.ProductId) newErrors.ProductId = 'Product is required';
    if (!formData.WarehouseId) newErrors.WarehouseId = 'Warehouse is required';
    if (!formData.ChangeType) newErrors.ChangeType = 'Change type is required';

    if (formData.Quantity === '' || Number(formData.Quantity) <= 0) {
      newErrors.Quantity = 'Valid quantity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setSelectedMovement(null);
    setShowModal(true);
  };

  const openEditModal = (movement) => {
    setFormData({
      ProductId: movement.ProductId || '',
      WarehouseId: movement.WarehouseId || '',
      ChangeType: movement.ChangeType || 'IN',
      Quantity: movement.Quantity || '',
      Reason: movement.Reason || '',
      CreatedBy: movement.CreatedBy || currentUserId,
    });
    setModalMode('edit');
    setSelectedMovement(movement);
    setShowModal(true);
  };

  const openViewModal = (movement) => {
    setFormData({
      ProductId: movement.ProductId || '',
      WarehouseId: movement.WarehouseId || '',
      ChangeType: movement.ChangeType || 'IN',
      Quantity: movement.Quantity || '',
      Reason: movement.Reason || '',
      CreatedBy: movement.CreatedBy || currentUserId,
    });
    setModalMode('view');
    setSelectedMovement(movement);
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
        await stockMovementService.createStockMovement(formData);
        toast.success('Stock movement created successfully!');
      } else if (modalMode === 'edit' && selectedMovement) {
        await stockMovementService.updateStockMovement(
          selectedMovement.Id,
          formData
        );
        toast.success('Stock movement updated successfully!');
      }

      setShowModal(false);
      resetForm();
      await fetchMovements(pagination.limit, pagination.offset, searchTerm);
      await fetchStats();
    } catch (error) {
      console.error('Error saving movement:', error);
      toast.error(
        error.response?.data?.message || 'Failed to save stock movement'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMovement) return;
    setLoading(true);
    try {
      await stockMovementService.deleteStockMovement(selectedMovement.Id);
      toast.success('Stock movement deleted successfully!');
      setShowDeleteModal(false);
      setSelectedMovement(null);
      await fetchMovements(pagination.limit, pagination.offset, searchTerm);
      await fetchStats();
    } catch (error) {
      console.error('Error deleting movement:', error);
      toast.error(
        error.response?.data?.message || 'Failed to delete stock movement'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (movements.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['ID', 'Date', 'Product', 'Warehouse', 'Change Type', 'Quantity', 'Reason', 'Created By'],
      ...movements.map((m) => [
        m.Id,
        new Date(m.CreatedAt).toLocaleString(),
        m.ProductName || '',
        m.WarehouseName || '',
        m.ChangeType,
        m.Quantity,
        m.Reason || '',
        m.CreatedByName || '',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-movements-${new Date()
      .toISOString()
      .split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Stock movements exported successfully!');
  };

  const handlePageChange = (newPage) => {
    const newOffset = (newPage - 1) * pagination.limit;
    fetchMovements(pagination.limit, newOffset, searchTerm);
  };

  const handleLimitChange = (newLimit) => {
    fetchMovements(newLimit, 0, searchTerm);
  };

  const getChangeTypeIcon = (type) => {
    switch (type) {
      case 'IN':
        return <ArrowTrendingUpIcon className="h-5 w-5" />;
      case 'OUT':
        return <ArrowTrendingDownIcon className="h-5 w-5" />;
      case 'ADJUSTMENT':
        return <AdjustmentsHorizontalIcon className="h-5 w-5" />;
      case 'TRANSFER':
        return <ArrowsRightLeftIcon className="h-5 w-5" />;
      default:
        return <ChartBarIcon className="h-5 w-5" />;
    }
  };

  const getChangeTypeColor = (type) => {
    switch (type) {
      case 'IN':
        return 'bg-green-100 text-green-800';
      case 'OUT':
        return 'bg-red-100 text-red-800';
      case 'ADJUSTMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isViewMode = modalMode === 'view';
  const modalTitle =
    modalMode === 'create'
      ? 'Record Stock Movement'
      : modalMode === 'edit'
      ? 'Edit Stock Movement'
      : 'Movement Details';

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            duration: 3000,
            style: { background: '#10B981', color: '#fff' },
          },
          error: {
            duration: 4000,
            style: { background: '#EF4444', color: '#fff' },
          },
        }}
      />

      <section className="py-1 bg-blueGray-50 min-h-screen">
        <div className="w-full xl:w-11/12 px-4 mx-auto mt-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blueGray-500 font-semibold">
                      Total Movements
                    </p>
                    <p className="text-3xl font-bold text-blueGray-700">
                      {stats.totalMovements || 0}
                    </p>
                  </div>
                  <ChartBarIcon className="h-12 w-12 text-blue-500 opacity-50" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blueGray-500 font-semibold">
                      Stock In
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {stats.totalIn || 0}
                    </p>
                    <p className="text-xs text-blueGray-400 mt-1">
                      Qty: {stats.totalInQuantity || 0}
                    </p>
                  </div>
                  <ArrowTrendingUpIcon className="h-12 w-12 text-green-500 opacity-50" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blueGray-500 font-semibold">
                      Stock Out
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      {stats.totalOut || 0}
                    </p>
                    <p className="text-xs text-blueGray-400 mt-1">
                      Qty: {stats.totalOutQuantity || 0}
                    </p>
                  </div>
                  <ArrowTrendingDownIcon className="h-12 w-12 text-red-500 opacity-50" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blueGray-500 font-semibold">
                      Adjustments
                    </p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {stats.totalAdjustments || 0}
                    </p>
                    <p className="text-xs text-blueGray-400 mt-1">
                      Transfers: {stats.totalTransfers || 0}
                    </p>
                  </div>
                  <AdjustmentsHorizontalIcon className="h-12 w-12 text-yellow-500 opacity-50" />
                </div>
              </div>
            </div>
          )}

          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
            {/* Header */}
            <div className="rounded-t bg-white mb-0 px-6 py-6">
              <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="h-8 w-8 text-blue-500" />
                  <div className="text-left">
                    <h6 className="text-blueGray-700 text-2xl font-bold">
                      Stock Movements
                    </h6>
                    <p className="text-sm text-blueGray-500">
                      Track all inventory movements
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {pagination.total} Total
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() =>
                      fetchMovements(
                        pagination.limit,
                        pagination.offset,
                        searchTerm
                      )
                    }
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                    disabled={loading}
                  >
                    <ArrowPathIcon
                      className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                    />
                    Refresh
                  </button>

                  <button
                    onClick={handleExport}
                    className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                    disabled={movements.length === 0}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Export
                  </button>

                  <button
                    onClick={openCreateModal}
                    className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Record Movement
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <select
                  value={filters.productId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      productId: e.target.value,
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="">All Products</option>
                  {products.map((p) => (
                    <option key={p.Id} value={p.Id}>
                      {p.ProductName}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.warehouseId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      warehouseId: e.target.value,
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((w) => (
                    <option key={w.Id} value={w.Id}>
                      {w.Name}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.changeType}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      changeType: e.target.value,
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="">All Types</option>
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                  <option value="TRANSFER">Transfer</option>
                </select>

                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                  placeholder="Start Date"
                />

                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                  placeholder="End Date"
                />
              </div>

              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                  placeholder="Search by product, warehouse, reason..."
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
                      Date/Time
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Product
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Warehouse
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Type
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Quantity
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Reason
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
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8">
                        <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-blueGray-300" />
                        <p className="text-lg font-semibold text-blueGray-500">
                          No stock movements found
                        </p>
                        <p className="text-sm text-blueGray-400">
                          {searchTerm
                            ? 'Try adjusting your search'
                            : 'Click "Record Movement" to create one'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    movements.map((movement) => (
                      <tr
                        key={movement.Id}
                        className="hover:bg-blueGray-50 transition-colors"
                      >
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-blueGray-400" />
                            <div>
                              <p className="font-semibold text-blueGray-700">
                                {new Date(
                                  movement.CreatedAt
                                ).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-blueGray-500">
                                {new Date(
                                  movement.CreatedAt
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div>
                            <p className="font-semibold text-blueGray-700">
                              {movement.ProductName}
                            </p>
                            <p className="text-xs text-blueGray-500">
                              {movement.ProductCode}
                            </p>
                          </div>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div>
                            <p className="font-semibold text-blueGray-700">
                              {movement.WarehouseName}
                            </p>
                            <p className="text-xs text-blueGray-500">
                              {movement.Location || '-'}
                            </p>
                          </div>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                          <span
                            className={`${getChangeTypeColor(
                              movement.ChangeType
                            )} text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1`}
                          >
                            {getChangeTypeIcon(movement.ChangeType)}
                            {movement.ChangeType}
                          </span>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                          <span className="font-bold text-blueGray-700 text-lg">
                            {movement.Quantity}
                          </span>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs p-4">
                          <p
                            className="text-blueGray-600 truncate max-w-xs"
                            title={movement.Reason}
                          >
                            {movement.Reason || '-'}
                          </p>
                        </td>
                        <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openViewModal(movement)}
                              className="text-blue-500 hover:text-blue-700"
                              title="View"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openEditModal(movement)}
                              className="text-green-500 hover:text-green-700"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMovement(movement);
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

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="px-6 py-4 border-t border-blueGray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
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
                      Showing {pagination.offset + 1} to{' '}
                      {Math.min(
                        pagination.offset + movements.length,
                        pagination.total
                      )}{' '}
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
                                ? 'text-white bg-blue-500 shadow-md'
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
                        return (
                          <span
                            key={page}
                            className="px-2 text-gray-500"
                          >
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
              <TitleBar title={modalTitle} onClose={() => { setShowModal(false); resetForm(); }} />

              <form onSubmit={handleSubmit}>
                <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Product */}
                    <div className="col-span-2">
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="ProductId"
                        value={formData.ProductId}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          errors.ProductId ? 'ring-2 ring-red-500' : ''
                        } ${isViewMode ? 'bg-gray-100' : ''}`}
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.Id} value={p.Id}>
                            {p.ProductName} - {p.ProductCode}
                          </option>
                        ))}
                      </select>
                      {errors.ProductId && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.ProductId}
                        </p>
                      )}
                    </div>

                    {/* Warehouse */}
                    <div className="col-span-2">
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Warehouse <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="WarehouseId"
                        value={formData.WarehouseId}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          errors.WarehouseId ? 'ring-2 ring-red-500' : ''
                        } ${isViewMode ? 'bg-gray-100' : ''}`}
                      >
                        <option value="">Select Warehouse</option>
                        {warehouses.map((w) => (
                          <option key={w.Id} value={w.Id}>
                            {w.Name} - {w.WarehouseCode}
                          </option>
                        ))}
                      </select>
                      {errors.WarehouseId && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.WarehouseId}
                        </p>
                      )}
                    </div>

                    {/* Change Type */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Movement Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="ChangeType"
                        value={formData.ChangeType}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          errors.ChangeType ? 'ring-2 ring-red-500' : ''
                        } ${isViewMode ? 'bg-gray-100' : ''}`}
                      >
                        <option value="IN">Stock In</option>
                        <option value="OUT">Stock Out</option>
                        <option value="ADJUSTMENT">Adjustment</option>
                        <option value="TRANSFER">Transfer</option>
                      </select>
                      {errors.ChangeType && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.ChangeType}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="Quantity"
                        value={formData.Quantity}
                        onChange={handleChange}
                        disabled={isViewMode}
                        min="1"
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          errors.Quantity ? 'ring-2 ring-red-500' : ''
                        } ${isViewMode ? 'bg-gray-100' : ''}`}
                        placeholder="Enter quantity"
                      />
                      {errors.Quantity && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.Quantity}
                        </p>
                      )}
                    </div>

                    {/* Reason */}
                    <div className="col-span-2">
                      <label className="block text-blueGray-600 text-sm font-bold mb-2">
                        Reason / Notes
                      </label>
                      <textarea
                        name="Reason"
                        value={formData.Reason}
                        onChange={handleChange}
                        rows="3"
                        disabled={isViewMode}
                        className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                          isViewMode ? 'bg-gray-100' : ''
                        }`}
                        placeholder="Enter reason for this movement"
                      />
                    </div>

                    {/* View mode extra info */}
                    {isViewMode && selectedMovement && (
                      <div className="col-span-2 bg-blueGray-50 p-4 rounded">
                        <p className="text-sm text-blueGray-600">
                          <strong>Created By:</strong>{' '}
                          {selectedMovement.CreatedByName || 'N/A'}
                        </p>
                        <p className="text-sm text-blueGray-600 mt-1">
                          <strong>Created At:</strong>{' '}
                          {new Date(
                            selectedMovement.CreatedAt
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
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
                      {loading
                        ? 'Saving...'
                        : modalMode === 'create'
                        ? 'Record'
                        : 'Update'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <TitleBar title="Delete Stock Movement" onClose={() => { setShowDeleteModal(false); setSelectedMovement(null); }} />

            <div className="p-6">
              <p className="text-blueGray-600">
                Are you sure you want to delete this stock movement record? This
                action cannot be undone.
              </p>
              {selectedMovement && (
                <div className="mt-4 bg-blueGray-50 p-3 rounded">
                  <p className="text-sm">
                    <strong>Product:</strong> {selectedMovement.ProductName}
                  </p>
                  <p className="text-sm">
                    <strong>Type:</strong> {selectedMovement.ChangeType}
                  </p>
                  <p className="text-sm">
                    <strong>Quantity:</strong> {selectedMovement.Quantity}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedMovement(null);
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
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StockMovements;
