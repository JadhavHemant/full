import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../../Components/AdminSite/utils/axiosInstance";
import { WMS, WAREHOUSES, PRODUCTS } from "../../../../Components/Endpoint/Endpoint";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../../Components/TitleBar";
import { ArchiveBoxIcon, PlusIcon, ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

const STATUS_COLORS = {
  Pending:    "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Completed:  "bg-green-100 text-green-800",
  Cancelled:  "bg-red-100 text-red-800",
};

const EMPTY_FORM = {
  productId: "", warehouseId: "", toBinId: "",
  quantity: "", priority: "Normal", notes: "",
};

export default function PutawayPage() {
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts]   = useState([]);
  const [statusFilter, setStatus] = useState("");
  const [page, setPage]           = useState(1);
  const limit = 20;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, offset: (page - 1) * limit });
      if (statusFilter) params.append("status", statusFilter);
      const res = await axiosInstance.get(`${WMS.PUTAWAY}?${params}`);
      setTasks(res.data?.data || []);
    } catch { toast.error("Failed to load putaway tasks"); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const openCreate = async () => {
    try {
      const [whRes, prRes] = await Promise.all([
        axiosInstance.get(`${WAREHOUSES.BASE}?isActive=true`),
        axiosInstance.get(PRODUCTS.GET_ALL(100, 0)),
      ]);
      setWarehouses(whRes.data?.data || []);
      setProducts(prRes.data?.data || []);
      setForm(EMPTY_FORM);
      setShowForm(true);
    } catch { toast.error("Failed to load lookup data"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await axiosInstance.post(WMS.PUTAWAY, form);
      toast.success("Putaway task created");
      setShowForm(false); fetchTasks();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to create task"); }
    finally { setSaving(false); }
  };

  const complete = async (id) => {
    try {
      await axiosInstance.put(WMS.PUTAWAY_COMPLETE(id), { putawayQuantity: null });
      toast.success("Task marked as completed");
      fetchTasks();
    } catch { toast.error("Failed to complete task"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await axiosInstance.delete(WMS.PUTAWAY_DELETE(id));
      toast.success("Task deleted"); fetchTasks();
    } catch { toast.error("Failed to delete"); }
  };

  const fld = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <>
      <Toaster position="top-right" />
      <div className="ws-page">
        <div className="ws-card">
          {/* Header */}
          <div className="ws-header">
            <div>
              <p className="section-label" style={{ color: "var(--color-accent)", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <ArchiveBoxIcon style={{ width: "0.875rem", height: "0.875rem" }} /> WMS
              </p>
              <h1 className="ws-title">Putaway Tasks</h1>
              <p className="ws-subtitle">Direct incoming stock to the correct bin locations</p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ fontSize: "0.875rem", padding: "0.375rem 0.625rem", border: "1px solid var(--color-border)", borderRadius: "0.375rem", background: "var(--color-bg)", color: "var(--color-text)" }}>
                <option value="">All Status</option>
                {["Pending","In Progress","Completed","Cancelled"].map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={fetchTasks} disabled={loading} className="ws-btn ws-btn-ghost">
                <ArrowPathIcon className={`h-4 w-4${loading ? " animate-spin" : ""}`} /> Refresh
              </button>
              <button onClick={openCreate} className="ws-btn ws-btn-primary">
                <PlusIcon className="h-4 w-4" /> New Task
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="ws-table-wrapper">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Task Number</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Quantity</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="ws-tr-state"><td colSpan="9">Loading…</td></tr>
                ) : tasks.length === 0 ? (
                  <tr className="ws-tr-state"><td colSpan="9">No putaway tasks found. Create one to get started.</td></tr>
                ) : tasks.map((t, i) => (
                  <tr key={t.Id}>
                    <td className="ws-td-muted">{(page - 1) * limit + i + 1}</td>
                    <td className="ws-td-primary">{t.TaskNumber}</td>
                    <td className="ws-td-muted">{t.ProductName || t.ProductId}</td>
                    <td className="ws-td-muted">{t.WarehouseName || t.WarehouseId}</td>
                    <td className="ws-td-muted">{t.Quantity}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.Priority === "Urgent" ? "bg-red-100 text-red-800" : t.Priority === "High" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-700"}`}>
                        {t.Priority}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.Status] || "bg-gray-100 text-gray-700"}`}>
                        {t.Status}
                      </span>
                    </td>
                    <td className="ws-td-muted">{t.ReferenceType}{t.ReferenceId ? ` #${t.ReferenceId}` : ""}</td>
                    <td className="ws-td-actions">
                      <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                        {t.Status === "Pending" && (
                          <button onClick={() => complete(t.Id)} className="ws-btn ws-btn-success" style={{ height: "1.75rem", fontSize: "0.6875rem" }}>
                            <CheckCircleIcon className="h-3.5 w-3.5" /> Complete
                          </button>
                        )}
                        <button onClick={() => del(t.Id)} className="ws-btn ws-btn-danger" style={{ height: "1.75rem", fontSize: "0.6875rem" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="ws-modal-overlay" onClick={() => setShowForm(false)}>
          <div style={{ padding: "1.5rem" }} onClick={e => e.stopPropagation()}>
            <div className="ws-modal">
              <TitleBar title="Create Putaway Task" onClose={() => setShowForm(false)} />
              <form onSubmit={handleSubmit}>
                <div className="ws-modal-body">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label className="ws-field-label">Product *</label>
                      <select className="ws-field-input" value={form.productId} onChange={e => fld("productId", e.target.value)} required>
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p.Id} value={p.Id}>{p.ProductName || p.Name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Warehouse *</label>
                      <select className="ws-field-input" value={form.warehouseId} onChange={e => fld("warehouseId", e.target.value)} required>
                        <option value="">Select Warehouse</option>
                        {warehouses.map(w => <option key={w.Id} value={w.Id}>{w.Name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Quantity *</label>
                      <input type="number" min="1" className="ws-field-input" value={form.quantity} onChange={e => fld("quantity", e.target.value)} required />
                    </div>
                    <div>
                      <label className="ws-field-label">Priority</label>
                      <select className="ws-field-input" value={form.priority} onChange={e => fld("priority", e.target.value)}>
                        {["Low","Normal","High","Urgent"].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Target Bin (optional)</label>
                      <input type="text" className="ws-field-input" value={form.toBinId} onChange={e => fld("toBinId", e.target.value)} placeholder="Bin ID or location" />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label className="ws-field-label">Notes</label>
                      <textarea className="ws-field-input" rows={2} value={form.notes} onChange={e => fld("notes", e.target.value)} style={{ resize: "vertical" }} />
                    </div>
                  </div>
                </div>
                <div className="ws-modal-footer">
                  <button type="button" onClick={() => setShowForm(false)} className="ws-btn ws-btn-ghost">Cancel</button>
                  <button type="submit" disabled={saving} className="ws-btn ws-btn-primary">{saving ? "Creating…" : "Create Task"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../../Components/AdminSite/utils/axiosInstance";
import { WMS, WAREHOUSES, PRODUCTS } from "../../../../Components/Endpoint/Endpoint";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../../Components/TitleBar";
import { ArchiveBoxIcon, PlusIcon, ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

const STATUS_COLORS = {
  Pending:       "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Completed:     "bg-green-100 text-green-800",
  Cancelled:     "bg-red-100 text-red-800",
};

const EMPTY = { productId:"", warehouseId:"", toBinId:"", quantity:"", priority:"Normal", notes:"" };

export default function PutawayPage() {
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [products,   setProducts]   = useState([]);
  const [statusFilter, setStatus]   = useState("");
  const [page, setPage]             = useState(1);
  const LIMIT = 20;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: LIMIT, offset: (page-1)*LIMIT });
      if (statusFilter) q.append("status", statusFilter);
      const res = await axiosInstance.get(`${WMS.PUTAWAY}?${q}`);
      setTasks(res.data?.data || []);
    } catch { toast.error("Failed to load putaway tasks"); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const openCreate = async () => {
    try {
      const [wh, pr] = await Promise.all([
        axiosInstance.get(`${WAREHOUSES.BASE}?isActive=true`),
        axiosInstance.get(PRODUCTS.GET_ALL(100, 0)),
      ]);
      setWarehouses(wh.data?.data || []);
      setProducts(pr.data?.data || []);
      setForm(EMPTY); setShowForm(true);
    } catch { toast.error("Failed to load lookup data"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await axiosInstance.post(WMS.PUTAWAY, form);
      toast.success("Putaway task created"); setShowForm(false); fetchTasks();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const complete = async (id) => {
    try { await axiosInstance.put(WMS.PUTAWAY_COMPLETE(id), {}); toast.success("Completed"); fetchTasks(); }
    catch { toast.error("Failed to complete"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try { await axiosInstance.delete(WMS.PUTAWAY_DELETE(id)); toast.success("Deleted"); fetchTasks(); }
    catch { toast.error("Failed to delete"); }
  };

  const fld = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <>
      <Toaster position="top-right" />
      <div className="ws-page"><div className="ws-card">
        <div className="ws-header">
          <div>
            <p className="section-label" style={{ color:"var(--color-accent)", display:"flex", alignItems:"center", gap:"0.375rem" }}>
              <ArchiveBoxIcon style={{ width:"0.875rem", height:"0.875rem" }} /> WMS
            </p>
            <h1 className="ws-title">Putaway Tasks</h1>
            <p className="ws-subtitle">Direct incoming stock to correct bin locations</p>
          </div>
          <div style={{ display:"flex", gap:"0.5rem", alignItems:"center", flexWrap:"wrap" }}>
            <select value={statusFilter} onChange={e=>{setStatus(e.target.value);setPage(1);}}
              style={{ fontSize:"0.875rem", padding:"0.375rem 0.625rem", border:"1px solid var(--color-border)", borderRadius:"0.375rem", background:"var(--color-bg)", color:"var(--color-text)" }}>
              <option value="">All Status</option>
              {["Pending","In Progress","Completed","Cancelled"].map(s=><option key={s}>{s}</option>)}
            </select>
            <button onClick={fetchTasks} disabled={loading} className="ws-btn ws-btn-ghost">
              <ArrowPathIcon className={`h-4 w-4${loading?" animate-spin":""}`} /> Refresh
            </button>
            <button onClick={openCreate} className="ws-btn ws-btn-primary">
              <PlusIcon className="h-4 w-4" /> New Task
            </button>
          </div>
        </div>

        <div className="ws-table-wrapper">
          <table className="ws-table">
            <thead><tr>
              <th>#</th><th>Task #</th><th>Product</th><th>Warehouse</th>
              <th>Qty</th><th>Priority</th><th>Status</th><th style={{textAlign:"right"}}>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr className="ws-tr-state"><td colSpan="8">Loading…</td></tr>
              : tasks.length===0 ? <tr className="ws-tr-state"><td colSpan="8">No tasks found. Create one to get started.</td></tr>
              : tasks.map((t,i)=>(
                <tr key={t.Id}>
                  <td className="ws-td-muted">{(page-1)*LIMIT+i+1}</td>
                  <td className="ws-td-primary">{t.TaskNumber}</td>
                  <td className="ws-td-muted">{t.ProductName||t.ProductId}</td>
                  <td className="ws-td-muted">{t.WarehouseName||"—"}</td>
                  <td className="ws-td-muted">{t.Quantity}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.Priority==="Urgent"?"bg-red-100 text-red-800":t.Priority==="High"?"bg-orange-100 text-orange-800":"bg-gray-100 text-gray-700"}`}>{t.Priority}</span></td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.Status]||"bg-gray-100 text-gray-700"}`}>{t.Status}</span></td>
                  <td className="ws-td-actions">
                    <div style={{ display:"flex", gap:"0.375rem", justifyContent:"flex-end" }}>
                      {t.Status==="Pending" && (
                        <button onClick={()=>complete(t.Id)} className="ws-btn ws-btn-success" style={{height:"1.75rem",fontSize:"0.6875rem"}}>
                          <CheckCircleIcon className="h-3.5 w-3.5" /> Complete
                        </button>
                      )}
                      <button onClick={()=>del(t.Id)} className="ws-btn ws-btn-danger" style={{height:"1.75rem",fontSize:"0.6875rem"}}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div></div>

      {showForm && (
        <div className="ws-modal-overlay" onClick={()=>setShowForm(false)}>
          <div style={{padding:"1.5rem"}} onClick={e=>e.stopPropagation()}>
            <div className="ws-modal">
              <TitleBar title="Create Putaway Task" onClose={()=>setShowForm(false)} />
              <form onSubmit={handleSubmit}>
                <div className="ws-modal-body">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                    <div>
                      <label className="ws-field-label">Product *</label>
                      <select className="ws-field-input" value={form.productId} onChange={e=>fld("productId",e.target.value)} required>
                        <option value="">Select Product</option>
                        {products.map(p=><option key={p.Id} value={p.Id}>{p.ProductName||p.Name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Warehouse *</label>
                      <select className="ws-field-input" value={form.warehouseId} onChange={e=>fld("warehouseId",e.target.value)} required>
                        <option value="">Select Warehouse</option>
                        {warehouses.map(w=><option key={w.Id} value={w.Id}>{w.Name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Quantity *</label>
                      <input type="number" min="1" className="ws-field-input" value={form.quantity} onChange={e=>fld("quantity",e.target.value)} required />
                    </div>
                    <div>
                      <label className="ws-field-label">Priority</label>
                      <select className="ws-field-input" value={form.priority} onChange={e=>fld("priority",e.target.value)}>
                        {["Low","Normal","High","Urgent"].map(p=><option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Target Bin</label>
                      <input type="text" className="ws-field-input" value={form.toBinId} onChange={e=>fld("toBinId",e.target.value)} placeholder="Bin ID or location" />
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label className="ws-field-label">Notes</label>
                      <textarea className="ws-field-input" rows={2} value={form.notes} onChange={e=>fld("notes",e.target.value)} style={{resize:"vertical"}} />
                    </div>
                  </div>
                </div>
                <div className="ws-modal-footer">
                  <button type="button" onClick={()=>setShowForm(false)} className="ws-btn ws-btn-ghost">Cancel</button>
                  <button type="submit" disabled={saving} className="ws-btn ws-btn-primary">{saving?"Creating…":"Create Task"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
