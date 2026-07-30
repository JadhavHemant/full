import React, { useCallback, useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import toast from "react-hot-toast";

const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "users", label: "Users Management" },
  { key: "roles", label: "Roles & Permissions" },
  { key: "companies", label: "Companies" },
  { key: "products", label: "Products" },
  { key: "categories", label: "Product Categories" },
  { key: "units", label: "Units" },
  { key: "warehouses", label: "Warehouses" },
  { key: "stock", label: "Product Stock" },
  { key: "stockMovements", label: "Stock Movements" },
  { key: "suppliers", label: "Suppliers" },
  { key: "purchaseOrders", label: "Purchase Orders" },
  { key: "purchaseRequisitions", label: "Purchase Requisitions" },
  { key: "purchaseReturns", label: "Purchase Returns" },
  { key: "salesOrders", label: "Sales Orders" },
  { key: "salesQuotations", label: "Sales Quotations" },
  { key: "deliveryChallans", label: "Delivery Challans" },
  { key: "salesReturns", label: "Sales Returns" },
  { key: "customers", label: "Customers" },
  { key: "brands", label: "Brands" },
  { key: "bom", label: "BOM" },
  { key: "productionOrders", label: "Production Orders" },
  { key: "expenses", label: "Expenses" },
  { key: "approvals", label: "Approvals" },
  { key: "dataImportExport", label: "Data Import/Export" },
  { key: "racks", label: "Warehouse Racks" },
  { key: "bins", label: "Warehouse Bins" },
  { key: "accounts", label: "CRM Accounts" },
  { key: "contacts", label: "CRM Contacts" },
  { key: "leads", label: "CRM Leads" },
  { key: "opportunities", label: "CRM Opportunities" },
  { key: "presales", label: "CRM PreSales" },
  { key: "cases", label: "CRM Cases" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
  { key: "chat", label: "Chat" },
];

const ACTIONS = ["view", "create", "edit", "delete", "export", "import", "approve", "reject", "assign"];

const ACTION_LABELS = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  export: "Export",
  import: "Import",
  approve: "Approve",
  reject: "Reject",
  assign: "Assign",
};

const RoleAccess = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  const getDefaultPermissions = useCallback(() => {
    const defaults = {};
    MODULES.forEach((mod) => {
      defaults[mod.key] = {};
      ACTIONS.forEach((action) => {
        defaults[mod.key][action] = mod.key === "dashboard" || mod.key === "chat";
      });
    });
    return defaults;
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await axiosInstance.get(API.ROLES);
      const rolesData = response.data || [];
      setRoles(rolesData);

      // Load permissions for all roles
      const permsMap = {};
      for (const role of rolesData) {
        try {
          const permsRes = await axiosInstance.get(
            `${API.API_BASE_URL}/roles/${role.Id}/permissions`
          );
          permsMap[role.Id] = permsRes.data?.permissions || {};
        } catch {
          // If endpoint doesn't exist yet, initialize empty permissions
          permsMap[role.Id] = getDefaultPermissions();
        }
      }
      setPermissions(permsMap);

      if (rolesData.length > 0) {
        setSelectedRole(String(rolesData[0].Id));
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to load roles");
      if (roles.length > 0) {
        const defaults = {};
        roles.forEach((role) => {
          defaults[role.Id] = getDefaultPermissions();
        });
        setPermissions(defaults);
      }
    } finally {
      setLoading(false);
    }
  }, [getDefaultPermissions, roles]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);



  const handlePermissionChange = (roleId, moduleKey, action) => {
    setPermissions((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [moduleKey]: {
          ...(prev[roleId]?.[moduleKey] || {}),
          [action]: !(prev[roleId]?.[moduleKey]?.[action] || false),
        },
      },
    }));
  };

  const handleSelectAllModule = (roleId, moduleKey, value) => {
    setPermissions((prev) => {
      const updatedModule = {};
      ACTIONS.forEach((action) => {
        updatedModule[action] = value;
      });
      return {
        ...prev,
        [roleId]: {
          ...prev[roleId],
          [moduleKey]: updatedModule,
        },
      };
    });
  };

  const handleSelectAllRole = (roleId, value) => {
    setPermissions((prev) => {
      const updatedRole = {};
      MODULES.forEach((mod) => {
        updatedRole[mod.key] = {};
        ACTIONS.forEach((action) => {
          updatedRole[mod.key][action] = value;
        });
      });
      return {
        ...prev,
        [roleId]: updatedRole,
      };
    });
  };

  const savePermissions = async () => {
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }

    setSaving(true);
    try {
      const rolePermissions = permissions[selectedRole] || {};
      await axiosInstance.post(
        `${API.API_BASE_URL}/roles/${selectedRole}/permissions`,
        { permissions: rolePermissions }
      );
      toast.success("Permissions saved successfully");
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error(error.response?.data?.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-600">Loading role permissions...</div>
      </div>
    );
  }

  const selectedRoleData = roles.find((r) => String(r.Id) === selectedRole);
  const currentPermissions = permissions[selectedRole] || {};

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Role-Based Access Control</h2>
            <p className="text-sm text-slate-500">
              Configure module and action permissions for each role
            </p>
          </div>
          <button
            onClick={savePermissions}
            disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Permissions"}
          </button>
        </div>

        {/* Role selector */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">Select Role</label>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <button
                key={role.Id}
                onClick={() => setSelectedRole(String(role.Id))}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  selectedRole === String(role.Id)
                    ? "bg-blue-600 text-white"
                    : " text-slate-700 hover:bg-slate-200"
                }`}
              >
                {role.RoleName}
              </button>
            ))}
          </div>
        </div>

        {selectedRoleData && (
          <>
            {/* Select All for Role */}
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <span className="text-sm font-semibold text-slate-700">
                Role: <span className="text-blue-600">{selectedRoleData.RoleName}</span>
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => handleSelectAllRole(selectedRole, true)}
                  className="rounded border border-green-300 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                >
                  Select All
                </button>
                <button
                  onClick={() => handleSelectAllRole(selectedRole, false)}
                  className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Permissions table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                      Module
                    </th>
                    {ACTIONS.map((action) => (
                      <th
                        key={action}
                        className="px-3 py-3 text-center text-xs font-semibold uppercase text-slate-600"
                      >
                        {ACTION_LABELS[action]}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                      Select All
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODULES.map((mod) => {
                    const modulePerms = currentPermissions[mod.key] || {};
                    const allSelected = ACTIONS.every(
                      (action) => modulePerms[action]
                    );
                    const someSelected = ACTIONS.some(
                      (action) => modulePerms[action]
                    );

                    return (
                      <tr key={mod.key} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                          {mod.label}
                        </td>
                        {ACTIONS.map((action) => (
                          <td key={action} className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={modulePerms[action] || false}
                              onChange={() =>
                                handlePermissionChange(
                                  selectedRole,
                                  mod.key,
                                  action
                                )
                              }
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) {
                                el.indeterminate = someSelected && !allSelected;
                              }
                            }}
                            onChange={() =>
                              handleSelectAllModule(
                                selectedRole,
                                mod.key,
                                !allSelected
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={savePermissions}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </>
        )}

        {!selectedRoleData && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
            Please select a role from above to configure permissions.
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleAccess;