/**
 * Script to create all missing frontend pages
 */

const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'clientui', 'src', 'features', 'inventory', 'pages');

// Template for creating consistent pages
const createPageTemplate = (pageName, title, apiEndpoint) => {
  const content = `import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../Components/TitleBar";

const ${pageName} = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    isActive: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("${apiEndpoint}");
      setData(response.data?.data || response.data || []);
    } catch (error) {
      toast.error("Failed to fetch ${title}");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axiosInstance.put(apiEndpoint + "/" + selectedItem.Id, formData);
        toast.success("${title} updated successfully");
      } else {
        await axiosInstance.post("${apiEndpoint}", formData);
        toast.success("${title} created successfully");
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save ${title}");
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.Name || item.Code || "",
      code: item.Code || "",
      description: item.Description || "",
      isActive: item.IsActive !== false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axiosInstance.delete(apiEndpoint + "/" + id);
      toast.success("Deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const filteredData = data.filter(item =>
    item.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.Code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <TitleBar title="${title}" />
      <Toaster />

      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search..."
          className="px-4 py-2 border rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => { setSelectedItem(null); setFormData({ name: "", code: "", description: "", isActive: true }); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add New
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.Id}>
                  <td className="px-6 py-4">{item.Name || item.Code}</td>
                  <td className="px-6 py-4">{item.Code}</td>
                  <td className="px-6 py-4">
                    <span className={"px-2 py-1 rounded " + (item.IsActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                      {item.IsActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                    <button onClick={() => handleDelete(item.Id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">{selectedItem ? 'Edit' : 'Add'} ${title}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Name/Code</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  className="w-full px-3 py-2 border rounded"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="mr-2"
                  />
                  Active
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ${pageName};
`;

  return content;
};

const pages = [
  { name: 'FinancialYearPage', title: 'Financial Year', api: '/financial-years' },
  { name: 'DocumentsPage', title: 'Documents', api: '/documents' },
  { name: 'RFQsPage', title: 'RFQs', api: '/rfqs' },
  { name: 'PriceListsPage', title: 'Price Lists', api: '/price-lists' },
  { name: 'HSNCodesPage', title: 'HSN/SAC Codes', api: '/hsn-codes' },
  { name: 'InvoiceMatchingPage', title: 'Invoice Matching', api: '/invoice-matching' },
  { name: 'CurrenciesPage', title: 'Currencies', api: '/currencies' },
  { name: 'ChartOfAccountsPage', title: 'Chart of Accounts', api: '/accounts/chart' },
];

// Additional report pages
const reportPages = [
  { name: 'StockAgingReportPage', title: 'Stock Aging Report', api: '/reports/stock-aging' },
  { name: 'ABCAnalysisPage', title: 'ABC Analysis', api: '/reports/abc-analysis' },
  { name: 'VendorPerformancePage', title: 'Vendor Performance', api: '/reports/vendor-performance' },
];

// Create main pages directory
const mainPagesDir = path.join(pagesDir);
if (!fs.existsSync(mainPagesDir)) {
  fs.mkdirSync(mainPagesDir, { recursive: true });
}

// Create all pages
pages.forEach(page => {
  const filePath = path.join(mainPagesDir, page.name + '.jsx');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, createPageTemplate(page.name, page.title, page.api));
    console.log('✅ Created ' + page.name + '.jsx');
  } else {
    console.log('⚠️  ' + page.name + '.jsx already exists');
  }
});

// Create report pages in a subdirectory
const reportsDir = path.join(pagesDir, '..', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

reportPages.forEach(page => {
  const filePath = path.join(reportsDir, page.name + '.jsx');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, createPageTemplate(page.name, page.title, page.api));
    console.log('✅ Created reports/' + page.name + '.jsx');
  } else {
    console.log('⚠️  reports/' + page.name + '.jsx already exists');
  }
});

console.log('\n🎉 Created ' + (pages.length + reportPages.length) + ' frontend pages!');