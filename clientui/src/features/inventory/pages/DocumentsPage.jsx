import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../Components/TitleBar";

const DocumentsPage = () => {
<<<<<<< HEAD
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [uploadForm, setUploadForm] = useState({ category: "General", description: "" });
  const [shareForm, setShareForm] = useState({ userIds: "", accessType: "View" });
  const [file, setFile] = useState(null);

  const fetchDocuments = useCallback(async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/documents/entity/${entityType}/${entityId}`);
      setDocuments(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { if (entityType && entityId) fetchDocuments(); }, [fetchDocuments, entityType, entityId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Please select a file");
    if (!entityType || !entityId) return toast.error("Entity type and ID are required");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    formData.append("entityId", entityId);
    formData.append("category", uploadForm.category);
    formData.append("description", uploadForm.description);

    try {
      await axiosInstance.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded successfully");
      setShowUploadModal(false);
      setFile(null);
      setUploadForm({ category: "General", description: "" });
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload document");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await axiosInstance.delete(`/documents/${id}`);
      toast.success("Document deleted");
      fetchDocuments();
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!selectedDoc) return;
    const userIds = shareForm.userIds.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (userIds.length === 0) return toast.error("Enter at least one user ID");

    try {
      await axiosInstance.post(`/documents/${selectedDoc.Id}/share`, { userIds, accessType: shareForm.accessType });
      toast.success("Document shared successfully");
      setShowShareModal(false);
      setShareForm({ userIds: "", accessType: "View" });
    } catch (error) {
      toast.error("Failed to share document");
    }
  };

  const handleDownload = async (id, originalName) => {
    try {
      const response = await axiosInstance.get(`/documents/${id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const fetchVersions = async (doc) => {
    try {
      const response = await axiosInstance.get(`/documents/${doc.Id}/versions`);
      setVersions(response.data || []);
      setSelectedDoc(doc);
      setShowVersions(true);
    } catch (error) {
      toast.error("Failed to fetch versions");
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <TitleBar title="Document Management" onClose={() => window.history.back()} />

      {/* Entity Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select Entity Type</option>
              <option value="Lead">Lead</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Account">Account</option>
              <option value="Contact">Contact</option>
              <option value="Case">Case</option>
              <option value="Quote">Quote</option>
              <option value="Invoice">Invoice</option>
              <option value="Product">Product</option>
              <option value="PurchaseOrder">Purchase Order</option>
              <option value="SalesOrder">Sales Order</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity ID</label>
            <input
              type="number"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Enter entity ID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => { if (entityType && entityId) setShowUploadModal(true); else toast.error("Select entity type and ID"); }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Upload Document
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {entityType && entityId ? `Documents for ${entityType} #${entityId}` : "Select an entity to view documents"}
          </h2>
        </div>
        {!entityType || !entityId ? (
          <div className="p-8 text-center text-gray-500">Select an entity type and ID above to view documents</div>
        ) : loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No documents found for this entity</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Shared</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{doc.OriginalName}</div>
                      {doc.Description && <div className="text-xs text-gray-500">{doc.Description}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{doc.Category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{doc.MimeType}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{formatFileSize(doc.FileSize)}</td>
                    <td className="px-4 py-3 text-center">
                      {doc.IsShared ? (
                        <span className="text-green-600 text-sm">Yes</span>
                      ) : (
                        <span className="text-gray-400 text-sm">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleDownload(doc.Id, doc.OriginalName)} className="text-blue-600 hover:text-blue-800 text-sm">Download</button>
                        <button onClick={() => { setSelectedDoc(doc); setShowShareModal(true); }} className="text-green-600 hover:text-green-800 text-sm">Share</button>
                        <button onClick={() => fetchVersions(doc)} className="text-purple-600 hover:text-purple-800 text-sm">Versions</button>
                        <button onClick={() => handleDelete(doc.Id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <TitleBar title="Upload Document" onClose={() => { setShowUploadModal(false); setFile(null); }} />
            <form onSubmit={handleUpload} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option>General</option>
                  <option>Contract</option>
                  <option>Invoice</option>
                  <option>Report</option>
                  <option>Image</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowUploadModal(false); setFile(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <TitleBar title={`Share: ${selectedDoc.OriginalName}`} onClose={() => { setShowShareModal(false); setSelectedDoc(null); }} />
            <form onSubmit={handleShare} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">User IDs (comma-separated)</label>
                <input type="text" value={shareForm.userIds} onChange={(e) => setShareForm({ ...shareForm, userIds: e.target.value })} placeholder="e.g., 1, 2, 3" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Access Type</label>
                <select value={shareForm.accessType} onChange={(e) => setShareForm({ ...shareForm, accessType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="View">View Only</option>
                  <option value="Download">View & Download</option>
                  <option value="Edit">Edit</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowShareModal(false); setSelectedDoc(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">Share</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Versions Modal */}
      {showVersions && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <TitleBar title={`Versions: ${selectedDoc.OriginalName}`} onClose={() => { setShowVersions(false); setVersions([]); }} />
            <div className="p-6">
              {versions.length === 0 ? (
                <p className="text-gray-500 text-center">No version history available</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Version</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">By</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {versions.map((v) => (
                      <tr key={v.Id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium">v{v.VersionNumber}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{new Date(v.CreatedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{v.CreatedByName || "N/A"}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{v.ChangeNotes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
=======
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    isActive: true,
  });

  const [errors, setErrors] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/documents");
      setData(response.data?.data || response.data || []);
    } catch (error) {
      toast.error("Failed to fetch Documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name/Code is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }
    try {
      if (selectedItem) {
        await axiosInstance.put(apiEndpoint + "/" + selectedItem.Id, formData);
        toast.success("Documents updated successfully");
      } else {
        await axiosInstance.post("/documents", formData);
        toast.success("Documents created successfully");
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save Documents");
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
    if (!window.confirm("Are you sure you want to delete this item?")) return;
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
      <TitleBar title="Documents" />
      <Toaster />

      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search..."
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => { setSelectedItem(null); setFormData({ name: "", code: "", description: "", isActive: true }); setErrors({}); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add New
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.Id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{item.Name || item.Code}</td>
                  <td className="px-6 py-4">{item.Code}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.IsActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.IsActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 font-medium mr-3">Edit</button>
                    <button onClick={() => handleDelete(item.Id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">{selectedItem ? 'Edit' : 'Add'} Documents</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit}>
                {/* General Information Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">General Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name/Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Description</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>

                {/* Status Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Status</h3>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                        className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer - Sticky */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Save
              </button>
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

<<<<<<< HEAD
export default DocumentsPage;
=======
export default DocumentsPage;
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
