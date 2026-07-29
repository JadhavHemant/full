import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";

const empty = { entryDate: "", description: "", lines: [{ accountId: "", debit: "", credit: "", description: "" }, { accountId: "", debit: "", credit: "", description: "" }] };

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jRes, aRes] = await Promise.all([
        axiosInstance.get("/accounts/journal", { params: { page, limit: 20 } }),
        axiosInstance.get("/accounts/chart", { params: { limit: 200 } }),
      ]);
      setEntries(jRes.data?.data || []);
      setAccounts(aRes.data?.data || []);
    } catch { toast.error("Failed to load journal entries"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { accountId: "", debit: "", credit: "", description: "" }] }));
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i, field, value) => setForm(f => { const l = [...f.lines]; l[i] = { ...l[i], [field]: value }; return { ...f, lines: l }; });

  const totalDebit  = form.lines.reduce((s, l) => s + Number(l.debit  || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!balanced) return toast.error("Debits and Credits must balance");
    try {
      await axiosInstance.post("/accounts/journal", { ...form, lines: form.lines.map(l => ({ ...l, debit: Number(l.debit || 0), credit: Number(l.credit || 0) })) });
      toast.success("Journal entry created");
      setShowModal(false);
      setForm(empty);
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to create entry"); }
  };

  const postEntry = async (id) => {
    try {
      await axiosInstance.post(`/accounts/journal/${id}/post`);
      toast.success("Entry posted");
      load();
    } catch { toast.error("Failed to post entry"); }
  };

  const filtered = entries.filter(e => e.EntryNumber?.toLowerCase().includes(search.toLowerCase()) || e.Description?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-4">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-sm text-gray-500">Double-entry bookkeeping records</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + New Entry
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries…" className="w-64 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin h-10 w-10 rounded-full border-b-2 border-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
              <tr>
                {["Entry No.", "Date", "Description", "Debit", "Credit", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No entries found</td></tr>}
              {filtered.map(e => (
                <tr key={e.Id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{e.EntryNumber}</td>
                  <td className="px-4 py-3">{e.EntryDate ? new Date(e.EntryDate).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{e.Description || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">₹{Number(e.TotalDebit || 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-medium">₹{Number(e.TotalCredit || 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${e.IsPosted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {e.IsPosted ? "Posted" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!e.IsPosted && (
                      <button onClick={() => postEntry(e.Id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Post</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50 text-sm">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <span className="text-gray-500">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded">Next</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">New Journal Entry</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date *</label>
                  <input type="date" required value={form.entryDate} onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Narration</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Description…" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Lines</span>
                  <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add Line</button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Account</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Credit</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.lines.map((line, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">
                            <select value={line.accountId} onChange={e => updateLine(i, "accountId", e.target.value)} required className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500">
                              <option value="">Select…</option>
                              {accounts.map(a => <option key={a.Id} value={a.Id}>{a.AccountCode} — {a.AccountName}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 w-28">
                            <input type="number" min="0" step="0.01" value={line.debit} onChange={e => updateLine(i, "debit", e.target.value)} className="w-full border rounded px-2 py-1 text-xs text-right focus:ring-1 focus:ring-blue-500" placeholder="0.00" />
                          </td>
                          <td className="px-3 py-2 w-28">
                            <input type="number" min="0" step="0.01" value={line.credit} onChange={e => updateLine(i, "credit", e.target.value)} className="w-full border rounded px-2 py-1 text-xs text-right focus:ring-1 focus:ring-blue-500" placeholder="0.00" />
                          </td>
                          <td className="px-3 py-2">
                            <input value={line.description} onChange={e => updateLine(i, "description", e.target.value)} className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500" placeholder="Note…" />
                          </td>
                          <td className="px-2 py-2">
                            {form.lines.length > 2 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 text-xs font-semibold">
                      <tr>
                        <td className="px-3 py-2 text-gray-600">Total</td>
                        <td className={`px-3 py-2 text-right ${!balanced && totalDebit > 0 ? "text-red-600" : "text-gray-800"}`}>₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className={`px-3 py-2 text-right ${!balanced && totalCredit > 0 ? "text-red-600" : "text-gray-800"}`}>₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td colSpan={2} className={`px-3 py-2 ${balanced ? "text-green-600" : "text-red-600"}`}>{balanced ? "✓ Balanced" : `⚠ Diff: ₹${Math.abs(totalDebit - totalCredit).toFixed(2)}`}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </form>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-100">Cancel</button>
              <button type="submit" onClick={handleSubmit} disabled={!balanced} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Save Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
