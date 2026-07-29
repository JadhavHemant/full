import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../../Components/AdminSite/utils/axiosInstance";
import { WMS, WAREHOUSES } from "../../../../Components/Endpoint/Endpoint";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../../Components/TitleBar";
import { ClipboardDocumentListIcon, PlusIcon, ArrowPathIcon, EyeIcon } from "@heroicons/react/24/outline";

const STATUS_COLORS = {
  Pending:       "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Completed:     "bg-green-100 text-green-800",
  Cancelled:     "bg-red-100 text-red-800",
};

const EMPTY = { warehouseId:"", referenceType:"SalesOrder", referenceId:"", pickingType:"Single", priority:"Normal", notes:"" };

export default function PickingListsPage() {
  const [lists,      setLists]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [detail,     setDetail]     = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [statusFilter, setStatus]   = useState("");
  const [page, setPage]             = useState(1);
  const LIMIT = 20;

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: LIMIT, offset: (page-1)*LIMIT });
      if (statusFilter) q.append("status", statusFilter);
      const res = await axiosInstance.get(`${WMS.PICKING}?${q}`);
      setLists(res.data?.data || []);
    } catch { toast.error("Failed to load picking lists"); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const openCreate = async () => {
    try {
      const wh = await axiosInstance.get(`${WAREHOUSES.BASE}?isActive=true`);
      setWarehouses(wh.data?.data || []);
      setForm(EMPTY); setShowForm(true);
    } catch { toast.error("Failed to load warehouses"); }
  };

  const viewDetail = async (id) => {
    try {
      const res = await axiosInstance.get(WMS.PICKING_BY_ID(id));
      setDetail(res.data);
    } catch { toast.error("Failed to load detail"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await axiosInstance.post(WMS.PICKING, form);
      toast.success("Picking list created"); setShowForm(false); fetchLists();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this picking list?")) return;
    try { await axiosInstance.delete(WMS.PICKING_DELETE(id)); toast.success("Deleted"); fetchLists(); }
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
              <ClipboardDocumentListIcon style={{ width:"0.875rem", height:"0.875rem" }} /> WMS
            </p>
            <h1 className="ws-title">Picking Lists</h1>
            <p className="ws-subtitle">Manage pick tasks for outbound orders</p>
          </div>
          <div style={{ display:"flex", gap:"0.5rem", alignItems:"center", flexWrap:"wrap" }}>
            <select value={statusFilter} onChange={e=>{setStatus(e.target.value);setPage(1);}}
              style={{ fontSize:"0.875rem", padding:"0.375rem 0.625rem", border:"1px solid var(--color-border)", borderRadius:"0.375rem", background:"var(--color-bg)", color:"var(--color-text)" }}>
              <option value="">All Status</option>
              {["Pending","In Progress","Completed","Cancelled"].map(s=><option key={s}>{s}</option>)}
            </select>
            <button onClick={fetchLists} disabled={loading} className="ws-btn ws-btn-ghost">
              <ArrowPathIcon className={`h-4 w-4${loading?" animate-spin":""}`} /> Refresh
            </button>
            <button onClick={openCreate} className="ws-btn ws-btn-primary">
              <PlusIcon className="h-4 w-4" /> New List
            </button>
          </div>
        </div>

        <div className="ws-table-wrapper">
          <table className="ws-table">
            <thead><tr>
              <th>#</th><th>List #</th><th>Reference</th><th>Warehouse</th>
              <th>Type</th><th>Priority</th><th>Status</th><th style={{textAlign:"right"}}>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr className="ws-tr-state"><td colSpan="8">Loading…</td></tr>
              : lists.length===0 ? <tr className="ws-tr-state"><td colSpan="8">No picking lists found. Create one to get started.</td></tr>
              : lists.map((l,i)=>(
                <tr key={l.Id}>
                  <td className="ws-td-muted">{(page-1)*LIMIT+i+1}</td>
                  <td className="ws-td-primary">{l.ListNumber}</td>
                  <td className="ws-td-muted">{l.ReferenceType}{l.ReferenceId?` #${l.ReferenceId}`:""}</td>
                  <td className="ws-td-muted">{l.WarehouseName||"—"}</td>
                  <td className="ws-td-muted">{l.PickingType}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.Priority==="Urgent"?"bg-red-100 text-red-800":l.Priority==="High"?"bg-orange-100 text-orange-800":"bg-gray-100 text-gray-700"}`}>{l.Priority}</span></td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.Status]||"bg-gray-100 text-gray-700"}`}>{l.Status}</span></td>
                  <td className="ws-td-actions">
                    <div style={{ display:"flex", gap:"0.375rem", justifyContent:"flex-end" }}>
                      <button onClick={()=>viewDetail(l.Id)} className="ws-btn ws-btn-ghost" style={{height:"1.75rem",fontSize:"0.6875rem"}}>
                        <EyeIcon className="h-3.5 w-3.5" /> View
                      </button>
                      <button onClick={()=>del(l.Id)} className="ws-btn ws-btn-danger" style={{height:"1.75rem",fontSize:"0.6875rem"}}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div></div>

      {/* Create Modal */}
      {showForm && (
        <div className="ws-modal-overlay" onClick={()=>setShowForm(false)}>
          <div style={{padding:"1.5rem"}} onClick={e=>e.stopPropagation()}>
            <div className="ws-modal">
              <TitleBar title="Create Picking List" onClose={()=>setShowForm(false)} />
              <form onSubmit={handleSubmit}>
                <div className="ws-modal-body">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                    <div>
                      <label className="ws-field-label">Warehouse *</label>
                      <select className="ws-field-input" value={form.warehouseId} onChange={e=>fld("warehouseId",e.target.value)} required>
                        <option value="">Select Warehouse</option>
                        {warehouses.map(w=><option key={w.Id} value={w.Id}>{w.Name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Reference Type</label>
                      <select className="ws-field-input" value={form.referenceType} onChange={e=>fld("referenceType",e.target.value)}>
                        {["SalesOrder","Manual","Transfer"].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Reference ID</label>
                      <input type="text" className="ws-field-input" value={form.referenceId} onChange={e=>fld("referenceId",e.target.value)} placeholder="Order or transfer ID" />
                    </div>
                    <div>
                      <label className="ws-field-label">Picking Type</label>
                      <select className="ws-field-input" value={form.pickingType} onChange={e=>fld("pickingType",e.target.value)}>
                        {["Single","Batch","Zone","Wave"].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Priority</label>
                      <select className="ws-field-input" value={form.priority} onChange={e=>fld("priority",e.target.value)}>
                        {["Low","Normal","High","Urgent"].map(p=><option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label className="ws-field-label">Notes</label>
                      <textarea className="ws-field-input" rows={2} value={form.notes} onChange={e=>fld("notes",e.target.value)} style={{resize:"vertical"}} />
                    </div>
                  </div>
                </div>
                <div className="ws-modal-footer">
                  <button type="button" onClick={()=>setShowForm(false)} className="ws-btn ws-btn-ghost">Cancel</button>
                  <button type="submit" disabled={saving} className="ws-btn ws-btn-primary">{saving?"Creating…":"Create List"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="ws-modal-overlay" onClick={()=>setDetail(null)}>
          <div style={{padding:"1.5rem"}} onClick={e=>e.stopPropagation()}>
            <div className="ws-modal" style={{maxWidth:"48rem"}}>
              <TitleBar title={`Picking List — ${detail.ListNumber}`} onClose={()=>setDetail(null)} />
              <div className="ws-modal-body">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem",marginBottom:"1.5rem"}}>
                  {[["Warehouse",detail.WarehouseName],["Status",detail.Status],["Priority",detail.Priority],["Type",detail.PickingType],["Reference",`${detail.ReferenceType||""} ${detail.ReferenceId||""}`]].map(([k,v])=>(
                    <div key={k}><p style={{fontSize:"0.75rem",color:"var(--color-text-muted)",marginBottom:"0.25rem"}}>{k}</p><p style={{fontWeight:600,color:"var(--color-text)"}}>{v||"—"}</p></div>
                  ))}
                </div>
                <h3 style={{fontWeight:600,marginBottom:"0.75rem",color:"var(--color-text)"}}>Items</h3>
                {detail.Items?.length>0 ? (
                  <table className="ws-table">
                    <thead><tr><th>Product</th><th>SKU</th><th>Required Qty</th><th>Picked Qty</th><th>Status</th></tr></thead>
                    <tbody>
                      {detail.Items.map(item=>(
                        <tr key={item.Id}>
                          <td className="ws-td-primary">{item.ProductName}</td>
                          <td className="ws-td-muted">{item.SKU||"—"}</td>
                          <td className="ws-td-muted">{item.Quantity}</td>
                          <td className="ws-td-muted">{item.PickedQuantity??0}</td>
                          <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.Status]||"bg-gray-100 text-gray-700"}`}>{item.Status||"Pending"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p style={{color:"var(--color-text-muted)",fontSize:"0.875rem"}}>No items on this picking list.</p>}
              </div>
              <div className="ws-modal-footer">
                <button onClick={()=>setDetail(null)} className="ws-btn ws-btn-ghost">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
