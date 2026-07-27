import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../Components/TitleBar";

const EmailLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [form, setForm] = useState({ to: "", template: "custom", subject: "", message: "", name: "", title: "" });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/email/logs?limit=50");
      setLogs(response.data?.data || []);
    } catch (error) {
      toast.error("Failed to fetch email logs");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axiosInstance.get("/email/templates");
      setTemplates(response.data || []);
    } catch (error) {
      console.error("Failed to fetch templates");
    }
  };

  useEffect(() => { fetchLogs(); fetchTemplates(); }, [fetchLogs]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.to) return toast.error("Recipient email is required");

    const payload = { to: form.to, template: form.template };

    if (form.template === "custom") {
      payload.subject = form.subject;
      payload.data = { name: form.name, title: form.title, message: form.message };
    } else {
      payload.data = { name: form.name, email: form.to };
    }

    try {
      await axiosInstance.post("/email/send", payload);
      toast.success("Email sent successfully");
      setShowComposeModal(false);
      setForm({ to: "", template: "custom", subject: "", message: "", name: "", title: "" });
      fetchLogs();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send email");
    }
  };

  const getStatusBadge = (status) => {
    const colors = { Sent: "bg-green-100 text-green-700", Failed: "bg-red-100 text-red-700", Pending: "bg-yellow-100 text-yellow-700" };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || "bg-gray-100 text-gray-700"}`}>{status}</span>;
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <TitleBar title="Email Communication" onClose={() => window.history.back()} />

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Email Logs</h2>
          <p className="text-sm text-gray-500">Send emails and view history</p>
        </div>
        <button
          onClick={() => setShowComposeModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          Compose Email
        </button>
      </div>

      {/* Templates Info */}
      {templates.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Available Templates</h3>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <span key={t.name} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200" title={t.description}>
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Email Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No emails sent yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{log.Recipient}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.Subject || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.Template}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(log.Status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.Provider}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.SentByName || "N/A"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(log.CreatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <TitleBar title="Compose Email" onClose={() => setShowComposeModal(false)} />
            <form onSubmit={handleSend} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input type="email" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="recipient@example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                <select value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {templates.map((t) => <option key={t.name} value={t.name}>{t.name} - {t.subject}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              {form.template === "custom" && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Email subject" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Email title" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Write your message here..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowComposeModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">Send Email</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailLogsPage;