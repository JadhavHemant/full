import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../../Components/AdminSite/utils/axiosInstance";
import { WMS, WAREHOUSES } from "../../../../Components/Endpoint/Endpoint";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../../Components/TitleBar";
import { ClipboardDocumentCheckIcon, PlusIcon, ArrowPathIcon, EyeIcon } from "@heroicons/react/24/outline";

const STATUS_COLORS = {
  Planned:       "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-100 text-blue-800",
  Completed:     "bg-green-100 text-green-800",
  Cancelled:     "bg-red-100 text-red-800",
};

const EMPTY = { warehouseId:"", countType:"ABC", scheduledDate:"", notes:"" };

export default function CycleCountPage() {
  const [counts,     setCounts]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [detail,     setDetail]     = useState(null);
  const [countInputs,setCountInputs]= useState({});
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [statusFilter, setStatus]   = useState("");
  const [page, setPage]             = useState(1);
  const LIMIT = 20;

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: LIMIT, offset: (page-1)*LIMIT });
      if (statusFilter) q.append("status", statusFilter);
      const res = await axiosInstance.get(`${WMS.CYCLE_COUNT}?${q}`);
      setCounts(res.data?.data || []);
    } catch { toast.error("Failed to load cycle counts"); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const openCreate = async () => {
    try {
      const wh = await axiosInstance.get(`${WAREHOUSES.BASE}?isActive=true`);
      setWarehouses(wh.data?.data || []);
      setForm(EMPTY); setShowForm(true);
    } catch { toast.error("Failed to load warehouses"); }
  };

  const viewDetail = async (id) => {
    try {
      const res = await axiosInstance.get(WMS.CYCLE_BY_ID(id));
      setDetail(res.data);
      const inputs = {};
      (res.data.Items||[]).forEach(item => { inputs[item.Id] = item.CountedQuantity ?? ""; });
      setCountInputs(inputs);
    } catch { toast.error("Failed to load detail"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await axiosInstance.post(WMS.CYCLE_COUNT, form);
      toast.success("Cycle count created — items auto-populated from current stock");
      setShowForm(false); fetchCounts();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const submitCounts = async () => {
    if (!detail) return; setSaving(true);
    const items = Object.entries(countInputs).map(([id, qty]) => ({
      cycleCountItemId: parseInt(id), countedQuantity: parseFloat(qty) || 0,
    }));
    try {
      await axiosInstance.post(WMS.CYCLE_RECORD(detail.Id), { items });
      toast.success("Count results recorded");
      viewDetail(detail.Id); fetchCounts();
    } catch { toast.error("Failed to record counts"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this cycle count?")) return;
    try { await axiosInstance.delete(WMS.CYCLE_DELETE(id)); toast.success("Deleted"); fetchCounts(); }
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
              <ClipboardDocumentCheckIcon style={{ width:"0.875rem", height:"0.875rem" }} /> WMS
            </p>
            <h1 className="ws-title">Cycle Count</h1>
            <p className="ws-subtitle">Periodic stock verification and variance tracking</p>
          </div>
          <div style={{ display:"flex", gap:"0.5rem", alignItems:"center", flexWrap:"wrap" }}>
            <select value={statusFilter} onChange={e=>{setStatus(e.target.value);setPage(1);}}
              style={{ fontSize:"0.875rem", padding:"0.375rem 0.625rem", border:"1px solid var(--color-border)", borderRadius:"0.375rem", background:"var(--color-bg)", color:"var(--color-text)" }}>
              <option value="">All Status</option>
              {["Planned","In Progress","Completed","Cancelled"].map(s=><option key={s}>{s}</option>)}
            </select>
            <button onClick={fetchCounts} disabled={loading} className="ws-btn ws-btn-ghost">
              <ArrowPathIcon className={`h-4 w-4${loading?" animate-spin":""}`} /> Refresh
            </button>
            <button onClick={openCreate} className="ws-btn ws-btn-primary">
              <PlusIcon className="h-4 w-4" /> New Count
            </button>
          </div>
        </div>

        <div className="ws-table-wrapper">
          <table className="ws-table">
            <thead><tr>
              <th>#</th><th>Count #</th><th>Warehouse</th><th>Type</th>
              <th>Scheduled</th><th>Total Items</th><th>Counted</th><th>Variances</th><th>Status</th>
              <th style={{textAlign:"right"}}>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr className="ws-tr-state"><td colSpan="10">Loading…</td></tr>
              : counts.length===0 ? <tr className="ws-tr-state"><td colSpan="10">No cycle counts found. Create one to get started.</td></tr>
              : counts.map((c,i)=>(
                <tr key={c.Id}>
                  <td className="ws-td-muted">{(page-1)*LIMIT+i+1}</td>
                  <td className="ws-td-primary">{c.CountNumber}</td>
                  <td className="ws-td-muted">{c.WarehouseName||"—"}</td>
                  <td className="ws-td-muted">{c.CountType}</td>
                  <td className="ws-td-muted">{c.ScheduledDate ? new Date(c.ScheduledDate).toLocaleDateString() : "—"}</td>
                  <td className="ws-td-muted">{c.TotalItems||0}</td>
                  <td className="ws-td-muted">{c.CountedItems||0}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(c.VarianceItems||0)>0?"bg-orange-100 text-orange-800":"bg-green-100 text-green-800"}`}>{c.VarianceItems||0}</span></td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.Status]||"bg-gray-100 text-gray-700"}`}>{c.Status}</span></td>
                  <td className="ws-td-actions">
                    <div style={{ display:"flex", gap:"0.375rem", justifyContent:"flex-end" }}>
                      <button onClick={()=>viewDetail(c.Id)} className="ws-btn ws-btn-ghost" style={{height:"1.75rem",fontSize:"0.6875rem"}}>
                        <EyeIcon className="h-3.5 w-3.5" /> Count
                      </button>
                      <button onClick={()=>del(c.Id)} className="ws-btn ws-btn-danger" style={{height:"1.75rem",fontSize:"0.6875rem"}}>Delete</button>
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
            <div className="ws-modal" style={{maxWidth:"32rem"}}>
              <TitleBar title="New Cycle Count" onClose={()=>setShowForm(false)} />
              <form onSubmit={handleSubmit}>
                <div className="ws-modal-body">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                    <div style={{gridColumn:"1/-1"}}>
                      <label className="ws-field-label">Warehouse *</label>
                      <select className="ws-field-input" value={form.warehouseId} onChange={e=>fld("warehouseId",e.target.value)} required>
                        <option value="">Select Warehouse</option>
                        {warehouses.map(w=><option key={w.Id} value={w.Id}>{w.Name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Count Type</label>
                      <select className="ws-field-input" value={form.countType} onChange={e=>fld("countType",e.target.value)}>
                        {["ABC","Full","Random","Location"].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ws-field-label">Scheduled Date</label>
                      <input type="date" className="ws-field-input" value={form.scheduledDate} onChange={e=>fld("scheduledDate",e.target.value)} />
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label className="ws-field-label">Notes</label>
                      <textarea className="ws-field-input" rows={2} value={form.notes} onChange={e=>fld("notes",e.target.value)} style={{resize:"vertical"}} />
                    </div>
                  </div>
                  <p style={{marginTop:"0.75rem",fontSize:"0.8rem",color:"var(--color-text-muted)"}}>
                    Items will be auto-populated from current stock in the selected warehouse.
                  </p>
                </div>
                <div className="ws-modal-footer">
                  <button type="button" onClick={()=>setShowForm(false)} className="ws-btn ws-btn-ghost">Cancel</button>
                  <button type="submit" disabled={saving} className="ws-btn ws-btn-primary">{saving?"Creating…":"Create Count"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Count Entry Modal */}
      {detail && (
        <div className="ws-modal-overlay" onClick={()=>setDetail(null)}>
          <div style={{padding:"1.5rem"}} onClick={e=>e.stopPropagation()}>
            <div className="ws-modal" style={{maxWidth:"56rem"}}>
              <TitleBar title={`Enter Count — ${detail.CountNumber}`} onClose={()=>setDetail(null)} />
              <div className="ws-modal-body">
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"1.5rem",padding:"1rem",background:"var(--color-bg-alt, #f9fafb)",borderRadius:"0.5rem"}}>
                  {[["Warehouse",detail.WarehouseName],["Status",detail.Status],["Total Items",detail.TotalItems||0],["Counted",detail.CountedItems||0],["Variances",detail.VarianceItems||0]].map(([k,v])=>(
                    <div key={k}><p style={{fontSize:"0.75rem",color:"var(--color-text-muted)",marginBottom:"0.25rem"}}>{k}</p><p style={{fontWeight:600,color:"var(--color-text)"}}>{v}</p></div>
                  ))}
                </div>

                {detail.Items?.length>0 ? (
                  <div style={{maxHeight:"26rem",overflowY:"auto"}}>
                    <table className="ws-table">
                      <thead><tr><th>Product</th><th>SKU</th><th>Expected Qty</th><th>Counted Qty</th><th>Variance</th><th>Status</th></tr></thead>
                      <tbody>
                        {detail.Items.map(item=>{
                          const counted = parseFloat(countInputs[item.Id]) || 0;
                          const variance = counted - (item.ExpectedQuantity||0);
                          return (
                            <tr key={item.Id}>
                              <td className="ws-td-primary">{item.ProductName}</td>
                              <td className="ws-td-muted">{item.SKU||"—"}</td>
                              <td className="ws-td-muted">{item.ExpectedQuantity}</td>
                              <td>
                                <input type="number" min="0" step="0.001"
                                  value={countInputs[item.Id]??""} disabled={item.Status==="Counted"}
                                  onChange={e=>setCountInputs(p=>({...p,[item.Id]:e.target.value}))}
                                  style={{width:"6rem",padding:"0.25rem 0.5rem",border:"1px solid var(--color-border)",borderRadius:"0.375rem",background:"var(--color-bg)",color:"var(--color-text)"}} />
                              </td>
                              <td>
                                {item.Status==="Counted" ? (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.Variance>0?"bg-orange-100 text-orange-800":item.Variance<0?"bg-red-100 text-red-800":"bg-green-100 text-green-800"}`}>
                                    {item.Variance>0?"+":""}{item.Variance}
                                  </span>
                                ) : countInputs[item.Id]!=="" ? (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variance>0?"bg-orange-100 text-orange-800":variance<0?"bg-red-100 text-red-800":"bg-green-100 text-green-800"}`}>
                                    {variance>0?"+":""}{variance.toFixed(2)}
                                  </span>
                                ) : "—"}
                              </td>
                              <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.Status==="Counted"?"bg-green-100 text-green-800":"bg-gray-100 text-gray-700"}`}>{item.Status||"Pending"}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={{color:"var(--color-text-muted)",fontSize:"0.875rem"}}>No items in this count.</p>}
              </div>
              <div className="ws-modal-footer">
                <button onClick={()=>setDetail(null)} className="ws-btn ws-btn-ghost">Close</button>
                {detail.Status!=="Completed" && detail.Items?.length>0 && (
                  <button onClick={submitCounts} disabled={saving} className="ws-btn ws-btn-primary">
                    {saving?"Saving…":"Save Count Results"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
