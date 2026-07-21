// src/Components/AdminSite/Products/Products.jsx
// Product management component with CRUD operations, filtering, search, and export functionality

import React, { useMemo, useState, useEffect, useRef } from 'react';
// Import Heroicons for UI icons
import {
    PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
    ArrowPathIcon, ArrowDownTrayIcon, EyeIcon, XMarkIcon,
    CubeIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
// Import toast notifications
import toast, { Toaster } from 'react-hot-toast';
// Import service modules for API calls
import * as productService from '../../../services/productService.js';
import * as categoryService from '../../../services/categoryService.js';
import * as companyService from '../../../services/companyService.js';
import * as unitService from '../../../services/unitService';
// Import utility functions
import { resolveAssetUrl } from '../../../utils/assetUrl';
import { usePortalAccess } from '../../../utils/portalAccess';
import { useTableColumnFilters } from '../utils/useTableColumnFilters.jsx';
import { compressImageFile, formatFileSize } from '../../../utils/imageCompression';
import TitleBar from '../../TitleBar';

/**
 * Products component
 * Provides full CRUD functionality for product management including:
 * - List view with pagination, search, and filtering
 * - Create, edit, view, and delete operations
 * - Export to CSV functionality
 * - Active/inactive status toggle
 * - Integration with category, company, and unit services
 */
const Products = () => {
    // Check if user has permission for restricted actions
    const { canManageRestrictedActions } = usePortalAccess();
    // State for products list
    const [products, setProducts] = useState([]);
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
        categoryId: '',
        companyId: '',
        isActive: '',
        lowStock: false,
        sortBy: 'CreatedAt',
        sortOrder: 'DESC'
    });

    // State for dropdown options
    const [companies, setCompanies] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    // Form data state
    const [formData, setFormData] = useState({
        ProductName: '', ProductCode: '', Description: '', CategoryId: '',
        UnitId: '', Price: '', Cost: '', StockQuantity: '', MinimumStock: '',
        MaximumStock: '', ReorderLevel: '', Barcode: '', SKU: '', HSNCode: '',
        TaxRate: '', Discount: '', CompanyId: '', IsActive: true,
        NotifyStockOut: true, NotifyStockReload: true, productImage: null
    });
    // Image preview state
    const [imagePreview, setImagePreview] = useState(null);
    // Form validation errors state
    const [errors, setErrors] = useState({});
    const productTableColumns = useMemo(
        () => [
            { key: 'ProductName', label: 'Product', accessor: (product) => product.ProductName },
            { key: 'ProductCode', label: 'Code', accessor: (product) => product.ProductCode },
            { key: 'CategoryName', label: 'Category', accessor: (product) => product.CategoryName || 'Uncategorized' },
            { key: 'Price', label: 'Price', accessor: (product) => product.Price, type: 'number' },
            { key: 'StockQuantity', label: 'Stock', accessor: (product) => product.StockQuantity, type: 'number' },
            {
                key: 'IsActive',
                label: 'Status',
                accessor: (product) => (product.IsActive ? 'Active' : 'Inactive'),
                type: 'select',
                match: 'exact',
                options: [
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' },
                ],
            },
        ],
        []
    );
    const { filteredRows: filteredProducts, renderColumnFilter } = useTableColumnFilters(products, productTableColumns);

    // ✅ Track initial mount to prevent double fetch
    // Refs to prevent double-fetching on mount
    const isInitialMount = useRef(true);
    const isFiltersInitialMount = useRef(true);

    // ✅ Fetch dropdown data ONCE on mount
    useEffect(() => {
        console.log('🚀 Component mounted - Fetching dropdown data');
        fetchDropdownData();
    }, []);

    /**
     * Fetch dropdown data for companies, categories, and units
     */
    const fetchDropdownData = async () => {
        try {
            const companiesData = await companyService.getActiveCompanies();
            setCompanies(companiesData.data || []);

            const categoriesData = await categoryService.getActiveCategories();
            setCategories(categoriesData.data || []);

            const unitsData = await unitService.getActiveUnits();
            setUnits(unitsData.data || []);
            
            console.log('✅ Dropdown data loaded');
        } catch (error) {
            console.error('❌ Error fetching dropdown data:', error);
            toast.error('Failed to load form data');
        }
    };

    /**
     * Fetch products from API with pagination, search, and filters
     * @param {number} limit - Number of items per page
     * @param {number} offset - Offset for pagination
     * @param {string} search - Search term
     */
    const fetchProducts = async (limit = 10, offset = 0, search = '') => {
        setLoading(true);
        console.log(`📡 Fetching products: limit=${limit}, offset=${offset}, search="${search}"`);
        
        try {
            const data = await productService.getProducts(limit, offset, search, filters);
            setProducts(data.data || []);

            const total = data.pagination?.total || 0;
            const currentLimit = data.pagination?.limit || limit;
            const currentOffset = data.pagination?.offset || offset;
            const totalPages = Math.ceil(total / currentLimit) || 1;
            const currentPage = Math.floor(currentOffset / currentLimit) + 1;

            setPagination({
                total, limit: currentLimit, offset: currentOffset,
                totalPages, currentPage,
                hasNext: data.pagination?.hasNext || (currentPage < totalPages),
                hasPrevious: data.pagination?.hasPrevious || (currentPage > 1)
            });
            
            console.log(`✅ Fetched ${data.data?.length || 0} products`);
        } catch (error) {
            console.error('❌ Error fetching products:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Fetch products ONCE on mount
    useEffect(() => {
        console.log('🚀 Initial product fetch');
        fetchProducts(pagination.limit, 0, searchTerm);
    }, []);

    // ✅ Filters effect (but NOT on mount)
    useEffect(() => {
        if (isFiltersInitialMount.current) {
            isFiltersInitialMount.current = false;
            return; // Skip on first render
        }

        console.log('🔍 Filters changed:', filters);
        fetchProducts(pagination.limit, 0, searchTerm);
    }, [filters]);

    // ✅ Debounced search (but NOT on mount)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return; // Skip on first render
        }

        console.log('🔍 Search term changed:', searchTerm);
        const delayDebounce = setTimeout(() => {
            fetchProducts(pagination.limit, 0, searchTerm);
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    /**
     * Reset form to initial state
     */
    const resetForm = () => {
        setFormData({
            ProductName: '', ProductCode: '', Description: '', CategoryId: '',
            UnitId: '', Price: '', Cost: '', StockQuantity: '', MinimumStock: '',
            MaximumStock: '', ReorderLevel: '', Barcode: '', SKU: '', HSNCode: '',
            TaxRate: '', Discount: '', CompanyId: '', IsActive: true,
            NotifyStockOut: true, NotifyStockReload: true, productImage: null
        });
        setImagePreview(null);
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
     * Handle product image file upload with validation
     * @param {object} e - Event object
     */
    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Only JPEG, PNG, and WEBP images allowed');
                return;
            }
            try {
                const compressedFile = await compressImageFile(file);
                setFormData(prev => ({ ...prev, productImage: compressedFile }));
                const reader = new FileReader();
                reader.onloadend = () => setImagePreview(reader.result);
                reader.readAsDataURL(compressedFile);
                if (compressedFile.size < file.size) {
                    toast.success(`Image optimized from ${formatFileSize(file.size)} to ${formatFileSize(compressedFile.size)}`);
                }
            } catch (error) {
                e.target.value = '';
                toast.error(error.message || 'Unable to optimize image');
            }
        }
    };

    /**
     * Validate form data
     * @returns {boolean} True if form is valid
     */
    const validateForm = () => {
        const newErrors = {};
        if (!formData.ProductName.trim()) newErrors.ProductName = 'Product name is required';
        if (!formData.ProductCode.trim()) newErrors.ProductCode = 'Product code is required';
        if (!formData.CompanyId) newErrors.CompanyId = 'Company is required';
        if (formData.Price && isNaN(formData.Price)) newErrors.Price = 'Invalid price';
        if (formData.Cost && isNaN(formData.Cost)) newErrors.Cost = 'Invalid cost';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Open create modal with empty form
     */
    const openCreateModal = () => {
        resetForm();
        setModalMode('create');
        setSelectedProduct(null);
        setIsMinimized(false);
        setIsMaximized(false);
        setShowModal(true);
    };

    /**
     * Open edit modal with product data
     * @param {object} product - Product object to edit
     */
    const openEditModal = (product) => {
        setIsMinimized(false);
        setIsMaximized(false);
        setFormData({
            ProductName: product.ProductName || '',
            ProductCode: product.ProductCode || '',
            Description: product.Description || '',
            CategoryId: product.CategoryId || '',
            UnitId: product.UnitId || '',
            Price: product.Price || '',
            Cost: product.Cost || '',
            StockQuantity: product.StockQuantity || '',
            MinimumStock: product.MinimumStock || '',
            MaximumStock: product.MaximumStock || '',
            ReorderLevel: product.ReorderLevel || '',
            Barcode: product.Barcode || '',
            SKU: product.SKU || '',
            HSNCode: product.HSNCode || '',
            TaxRate: product.TaxRate || '',
            Discount: product.Discount || '',
            CompanyId: product.CompanyId || '',
            IsActive: product.IsActive,
            NotifyStockOut: product.NotifyStockOut,
            NotifyStockReload: product.NotifyStockReload,
            productImage: null
        });
        if (product.ProductImage) {
            setImagePreview(resolveAssetUrl(product.ProductImage));
        }
        setModalMode('edit');
        setSelectedProduct(product);
        setShowModal(true);
    };

    /**
     * Open view modal with product data (read-only)
     * @param {object} product - Product object to view
     */
    const openViewModal = (product) => {
        setIsMinimized(false);
        setIsMaximized(false);
        setFormData({
            ProductName: product.ProductName || '',
            ProductCode: product.ProductCode || '',
            Description: product.Description || '',
            CategoryId: product.CategoryId || '',
            UnitId: product.UnitId || '',
            Price: product.Price || '',
            Cost: product.Cost || '',
            StockQuantity: product.StockQuantity || '',
            MinimumStock: product.MinimumStock || '',
            MaximumStock: product.MaximumStock || '',
            ReorderLevel: product.ReorderLevel || '',
            Barcode: product.Barcode || '',
            SKU: product.SKU || '',
            HSNCode: product.HSNCode || '',
            TaxRate: product.TaxRate || '',
            Discount: product.Discount || '',
            CompanyId: product.CompanyId || '',
            IsActive: product.IsActive,
            NotifyStockOut: product.NotifyStockOut,
            NotifyStockReload: product.NotifyStockReload,
            productImage: null
        });
        if (product.ProductImage) {
            setImagePreview(resolveAssetUrl(product.ProductImage));
        }
        setModalMode('view');
        setSelectedProduct(product);
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
                if (key === 'productImage' && formData.productImage) {
                    submitData.append('productImage', formData.productImage);
                } else if (key !== 'productImage' && formData[key] !== '') {
                    submitData.append(key, formData[key]);
                }
            });

            if (modalMode === 'create') {
                await productService.createProduct(submitData);
                toast.success('Product created successfully!');
            } else if (modalMode === 'edit') {
                await productService.updateProduct(selectedProduct.Id, submitData);
                toast.success('Product updated successfully!');
            }

            setShowModal(false);
            resetForm();
            fetchProducts(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error(error.response?.data?.message || 'Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle product deletion
     */
    const handleDelete = async () => {
        if (!selectedProduct) return;
        setLoading(true);
        try {
            await productService.deleteProduct(selectedProduct.Id);
            toast.success('Product deleted successfully!');
            setShowDeleteModal(false);
            setSelectedProduct(null);
            fetchProducts(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error(error.response?.data?.message || 'Failed to delete product');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Toggle product active/inactive status
     * @param {object} product - Product object to toggle
     */
    const handleToggleActive = async (product) => {
        try {
            const response = await productService.toggleActiveStatus(product.Id);
            toast.success(response.message);
            fetchProducts(pagination.limit, pagination.offset, searchTerm);
        } catch (error) {
            console.error('Error toggling active:', error);
            toast.error(error.response?.data?.message || 'Failed to toggle status');
        }
    };

    /**
     * Export products to CSV file
     */
    const handleExport = () => {
        if (products.length === 0) {
            toast.error('No data to export');
            return;
        }
        const csvContent = [
            ['ID', 'Product Name', 'Code', 'Category', 'Unit', 'Price', 'Stock', 'Status'],
            ...products.map(p => [
                p.Id, p.ProductName, p.ProductCode, p.CategoryName || '',
                p.UnitName || '', p.Price || 0, p.StockQuantity || 0,
                p.IsActive ? 'Active' : 'Inactive'
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Products exported successfully!');
    };

    /**
     * Handle pagination page change
     * @param {number} newPage - New page number
     */
    const handlePageChange = (newPage) => {
        const newOffset = (newPage - 1) * pagination.limit;
        fetchProducts(pagination.limit, newOffset, searchTerm);
    };

    const handleLimitChange = (newLimit) => {
        fetchProducts(newLimit, 0, searchTerm);
    };

    // Derived values for modal
    const isViewMode = modalMode === 'view';
    const modalTitle = modalMode === 'create' ? 'Create New Product' : modalMode === 'edit' ? 'Edit Product' : 'Product Details';

    return (
        <>
            <Toaster position="top-right" toastOptions={{
                success: { duration: 3000, style: { background: '#10B981', color: '#fff' } },
                error: { duration: 4000, style: { background: '#EF4444', color: '#fff' } }
            }} />

            {/* Main container */}
            <section className="py-1 bg-blueGray-50 min-h-screen">
                <div className="w-full xl:w-11/12 px-4 mx-auto mt-6">
                    <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">

                        {/* Header */}
                        <div className="rounded-t bg-white mb-0 px-6 py-6">
                            <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <CubeIcon className="h-8 w-8 text-blue-500" />
                                    <div className="text-left">
                                        <h6 className="text-blueGray-700 text-2xl font-bold">Products Management</h6>
                                        <p className="text-sm text-blueGray-500">Manage products & inventory</p>
                                    </div>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        {pagination.total} Total
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2 justify-center">
                                    <button onClick={() => fetchProducts(pagination.limit, pagination.offset, searchTerm)}
                                        className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                                        disabled={loading}>
                                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </button>

                                    {canManageRestrictedActions && (
                                        <button onClick={handleExport}
                                            className="bg-green-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                                            disabled={products.length === 0}>
                                            <ArrowDownTrayIcon className="h-4 w-4" />
                                            Export
                                        </button>
                                    )}

                                    <button onClick={openCreateModal}
                                        className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition">
                                        <PlusIcon className="h-4 w-4" />
                                        Add Product
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

                                <select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                                    className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring">
                                    <option value="">All Categories</option>
                                    {categories.map(c => (
                                        <option key={c.Id} value={c.Id}>{c.CategoryName}</option>
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
                                    placeholder="Search by name, code, barcode..."
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
                                        {productTableColumns.map((column) => (
                                            <th key={column.key} className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                                                <div>{column.label}</div>
                                                {renderColumnFilter(column)}
                                            </th>
                                        ))}
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
                                    ) : filteredProducts.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8">
                                                <CubeIcon className="h-12 w-12 mx-auto mb-2 text-blueGray-300" />
                                                <p className="text-lg font-semibold text-blueGray-500">No products found</p>
                                                <p className="text-sm text-blueGray-400">
                                                    {searchTerm ? 'Try adjusting your search' : 'Click "Add Product" to create one'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProducts.map((product) => (
                                            <tr key={product.Id} className="hover:bg-blueGray-50 transition-colors">
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div className="flex items-center gap-3">
                                                        {product.ProductImage ? (
                                                            <>
                                                                <img
                                                                    src={resolveAssetUrl(product.ProductImage)}
                                                                    alt={product.ProductName}
                                                                    className="h-10 w-10 rounded object-cover border-2 border-blueGray-200"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        if (e.target.nextElementSibling) {
                                                                            e.target.nextElementSibling.style.display = 'flex';
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="h-10 w-10 rounded bg-blue-100 items-center justify-center hidden">
                                                                    <CubeIcon className="h-6 w-6 text-blue-500" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
                                                                <CubeIcon className="h-6 w-6 text-blue-500" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-blueGray-700">{product.ProductName}</p>
                                                            {product.UnitName && <p className="text-xs text-blueGray-500">Unit: {product.UnitName}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <span className="font-mono text-blueGray-700">{product.ProductCode}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <span className="text-blueGray-700">{product.CategoryName || 'Uncategorized'}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-right">
                                                    <span className="font-semibold text-blueGray-700">₹{parseFloat(product.Price || 0).toFixed(2)}</span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <span className={`${product.StockQuantity <= product.ReorderLevel ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} text-xs font-semibold px-2.5 py-1 rounded`}>
                                                        {product.StockQuantity || 0}
                                                    </span>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center">
                                                    <button onClick={() => handleToggleActive(product)}
                                                        className={`${product.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs font-semibold px-2.5 py-1 rounded`}>
                                                        {product.IsActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => openViewModal(product)} className="text-blue-500 hover:text-blue-700" title="View">
                                                            <EyeIcon className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => openEditModal(product)} className="text-green-500 hover:text-green-700" title="Edit">
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                        {canManageRestrictedActions && (
                                                            <button onClick={() => { setSelectedProduct(product); setShowDeleteModal(true); }}
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
                                            Showing {pagination.offset + 1} to {Math.min(pagination.offset + filteredProducts.length, pagination.total)} of {pagination.total}
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

            {/* Modal */}
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
                                <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                        {/* Product Image */}
                                        <div className="col-span-3">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Product Image</label>
                                            <div className="flex items-center gap-4">
                                                {imagePreview ? (
                                                    <img
                                                        src={imagePreview}
                                                        alt="Product"
                                                        className="h-24 w-24 rounded-lg object-cover border-2 border-blueGray-200"
                                                        onError={() => setImagePreview(null)}
                                                    />
                                                ) : (
                                                    <div className="h-24 w-24 rounded-lg bg-blueGray-100 flex items-center justify-center">
                                                        <CubeIcon className="h-12 w-12 text-blueGray-400" />
                                                    </div>
                                                )}
                                                {!isViewMode && (
                                                    <div className="flex-1">
                                                        <input type="file" accept="image/*" onChange={handleImageChange}
                                                            className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full" />
                                                        <p className="text-xs text-blueGray-400 mt-1">Max 5MB, JPG/PNG/WEBP</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Product Name */}
                                        <div className="col-span-2">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Product Name <span className="text-red-500">*</span>
                                            </label>
                                            <input type="text" name="ProductName" value={formData.ProductName} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.ProductName ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Enter product name" />
                                            {errors.ProductName && <p className="text-red-500 text-xs mt-1">{errors.ProductName}</p>}
                                        </div>

                                        {/* Product Code */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">
                                                Product Code <span className="text-red-500">*</span>
                                            </label>
                                            <input type="text" name="ProductCode" value={formData.ProductCode} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.ProductCode ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="PRD001" />
                                            {errors.ProductCode && <p className="text-red-500 text-xs mt-1">{errors.ProductCode}</p>}
                                        </div>

                                        {/* Company Dropdown */}
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

                                        {/* Category Dropdown */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Category</label>
                                            <select name="CategoryId" value={formData.CategoryId} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}>
                                                <option value="">Select Category</option>
                                                {categories.map(c => (
                                                    <option key={c.Id} value={c.Id}>{c.CategoryName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Unit Dropdown */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Unit</label>
                                            <select name="UnitId" value={formData.UnitId} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}>
                                                <option value="">Select Unit</option>
                                                {units.map(u => (
                                                    <option key={u.Id} value={u.Id}>{u.Name} {u.Symbol && `(${u.Symbol})`}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Description */}
                                        <div className="col-span-3">
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Description</label>
                                            <textarea name="Description" value={formData.Description} onChange={handleChange} rows="2"
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="Product description" />
                                        </div>

                                        {/* Price */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Price (₹)</label>
                                            <input type="number" step="0.01" name="Price" value={formData.Price} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.Price ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="0.00" />
                                            {errors.Price && <p className="text-red-500 text-xs mt-1">{errors.Price}</p>}
                                        </div>

                                        {/* Cost */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Cost (₹)</label>
                                            <input type="number" step="0.01" name="Cost" value={formData.Cost} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${errors.Cost ? 'ring-2 ring-red-500' : ''} ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="0.00" />
                                            {errors.Cost && <p className="text-red-500 text-xs mt-1">{errors.Cost}</p>}
                                        </div>

                                        {/* Tax Rate */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Tax Rate (%)</label>
                                            <input type="number" step="0.01" name="TaxRate" value={formData.TaxRate} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="0.00" />
                                        </div>

                                        {/* Stock Quantity */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Stock Quantity</label>
                                            <input type="number" name="StockQuantity" value={formData.StockQuantity} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="0" />
                                        </div>

                                        {/* Minimum Stock */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Minimum Stock</label>
                                            <input type="number" name="MinimumStock" value={formData.MinimumStock} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="0" />
                                        </div>

                                        {/* Reorder Level */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Reorder Level</label>
                                            <input type="number" name="ReorderLevel" value={formData.ReorderLevel} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="0" />
                                        </div>

                                        {/* Barcode */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Barcode</label>
                                            <input type="text" name="Barcode" value={formData.Barcode} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="123456789" />
                                        </div>

                                        {/* SKU */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">SKU</label>
                                            <input type="text" name="SKU" value={formData.SKU} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="SKU-001" />
                                        </div>

                                        {/* HSN Code */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">HSN Code</label>
                                            <input type="text" name="HSNCode" value={formData.HSNCode} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="1234" />
                                        </div>

                                        {/* Discount */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Discount (%)</label>
                                            <input type="number" step="0.01" name="Discount" value={formData.Discount} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="0.00" />
                                        </div>

                                        {/* Maximum Stock */}
                                        <div>
                                            <label className="block text-blueGray-600 text-sm font-bold mb-2">Maximum Stock</label>
                                            <input type="number" name="MaximumStock" value={formData.MaximumStock} onChange={handleChange}
                                                disabled={isViewMode}
                                                className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${isViewMode ? 'bg-gray-100' : ''}`}
                                                placeholder="0" />
                                        </div>

                                        {/* Checkboxes */}
                                        {!isViewMode && (
                                            <div className="col-span-3 flex gap-6">
                                                <label className="flex items-center">
                                                    <input type="checkbox" name="IsActive" checked={formData.IsActive} onChange={handleChange}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                                                    <span className="ml-2 text-sm text-blueGray-600">Active</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input type="checkbox" name="NotifyStockOut" checked={formData.NotifyStockOut} onChange={handleChange}
                                                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500" />
                                                    <span className="ml-2 text-sm text-blueGray-600">Notify Stock Out</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input type="checkbox" name="NotifyStockReload" checked={formData.NotifyStockReload} onChange={handleChange}
                                                        className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500" />
                                                    <span className="ml-2 text-sm text-blueGray-600">Notify Stock Reload</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
                                    {isViewMode && selectedProduct && (
                                        <button type="button" onClick={() => openEditModal(selectedProduct)}
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
            {showDeleteModal && selectedProduct && canManageRestrictedActions && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <TitleBar title="Delete Product" onClose={() => { setShowDeleteModal(false); setSelectedProduct(null); }} />
                        <div className="p-6">
                            <p className="text-blueGray-600">Are you sure you want to delete "<strong>{selectedProduct?.ProductName}</strong>"? This action cannot be undone.</p>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t">
                            <button onClick={() => { setShowDeleteModal(false); setSelectedProduct(null); }}
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

export default Products;
