import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { resolveAssetUrl } from "../../../utils/assetUrl";
import ClassicCorporateOrgChart from "./ClassicCorporateOrgChart";
import { compressImageFile, formatFileSize } from "../../../utils/imageCompression";
import Cookies from "js-cookie";
import { getSessionUser, isSuperAdminUser } from "../../../utils/sessionUser";
import TitleBar from "../../TitleBar";

const initialForm = {
  name: "",
  email: "",
  otp: "",
  password: "",
  mobileNumber: "",
  companyId: "",
  roleId: "",
  userTypeId: "",
  reportingManagerId: "",
  departmentId: "",
  designationId: "",
  hierarchyLevel: "0",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};

const fieldLabels = {
  companyId: "Company",
  roleId: "Role",
  userTypeId: "Access Type",
  otp: "Email Verification OTP",
  reportingManagerId: "Reporting Manager",
  departmentId: "Department Id",
  designationId: "Designation Id",
  hierarchyLevel: "Hierarchy Level",
  mobileNumber: "Mobile Number",
  postalCode: "Postal Code",
};

const buildTree = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    map.set(row.UserId, { ...row, children: [] });
  });

  const roots = [];
  rows.forEach((row) => {
    const node = map.get(row.UserId);
    if (row.ReportingManagerId && map.has(row.ReportingManagerId)) {
      map.get(row.ReportingManagerId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const toInitials = (value) => {
  const text = String(value || "").trim();
  if (!text) return "NA";
  const parts = text.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

const getHierarchyImage = (node) => {
  const candidate =
    node?.userImage ||
    node?.Image ||
    node?.image ||
    node?.ProfileImage ||
    node?.profileImage ||
    node?.Avatar ||
    node?.avatar ||
    null;

  return candidate ? resolveAssetUrl(candidate) : "";
};

const findNodeById = (nodes, targetId) => {
  for (const node of nodes) {
    if (Number(node.UserId) === Number(targetId)) {
      return node;
    }

    if (node.children?.length) {
      const found = findNodeById(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
};

const countDescendants = (node) => {
  if (!node?.children?.length) return 0;
  return node.children.reduce((total, child) => total + 1 + countDescendants(child), 0);
};

const HierarchyNode = ({
  node,
  depth = 0,
  expandedNodeIds,
  selectedHierarchyNodeId,
  onNodeClick,
}) => {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expandedNodeIds.has(node.UserId);
  const isSelected = selectedHierarchyNodeId === node.UserId;
  const avatarSrc = getHierarchyImage(node);

  return (
    <li className="mb-3" style={{ marginLeft: `${depth * 12}px` }}>
      <button
        type="button"
        onClick={() => onNodeClick(node)}
        className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-3 text-left text-sm shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${
          isSelected
            ? "border-cyan-300 bg-cyan-50"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-slate-100/40 opacity-80" />
        <div className="relative flex items-start gap-3">
          <span
            className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
              hasChildren
                ? "border-slate-300  text-slate-700 group-hover:border-cyan-300 group-hover:bg-cyan-100"
                : "border-transparent bg-transparent text-slate-400"
            }`}
          >
            {hasChildren ? (isExpanded ? "-" : "+") : "."}
          </span>
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={node.Name}
              className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover"
              onError={(event) => {
                event.target.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
              {toInitials(node.Name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-800">{node.Name}</p>
              <span className="rounded-full  px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Level {node.Level}
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">{node.Email || "No email"}</p>
            <p className="mt-1 text-[11px] text-slate-500">Record ID: {node.UserId}</p>
          </div>
        </div>
      </button>
      {hasChildren ? (
        <div
          className={`grid overflow-hidden transition-all duration-300 ease-out ${
            isExpanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <ul className="min-h-0 border-l border-slate-300 pl-3">
            {node.children.map((child) => (
              <HierarchyNode
                key={child.UserId}
                node={child}
                depth={depth + 1}
                expandedNodeIds={expandedNodeIds}
                selectedHierarchyNodeId={selectedHierarchyNodeId}
                onNodeClick={onNodeClick}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    companyId: "",
    roleId: "",
    userTypeId: "",
    isActive: "",
    sortBy: "UserId",
    sortOrder: "DESC",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [hierarchyRows, setHierarchyRows] = useState([]);
  const [hierarchyMode, setHierarchyMode] = useState("org");
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());
  const [selectedHierarchyNodeId, setSelectedHierarchyNodeId] = useState(null);
  const [selectedRecordSummary, setSelectedRecordSummary] = useState(null);
  const [selectedRecordSummaryLoading, setSelectedRecordSummaryLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [userImage, setUserImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [createOtpSending, setCreateOtpSending] = useState(false);
  const [createOtpSentTo, setCreateOtpSentTo] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    setLoggedInUser(getSessionUser());
  }, []);

  const isSuperAdmin = isSuperAdminUser(loggedInUser);
  // Get the logged-in user's company ID
  const loggedInCompanyId = loggedInUser?.companyId ? String(loggedInUser.companyId) : "";

  const fetchUsers = async () => {
    try {
      const params = { search, page, limit, ...filters };
      // If user has a company and is not super admin, auto-filter by their company
      if (loggedInCompanyId && !isSuperAdmin) {
        params.companyId = loggedInCompanyId;
        params.scope = "company";
      }
      const response = await axiosInstance.get(API.GETALLUSERS, { params });
      setUsers(response.data.users || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await axiosInstance.get(API.COMPANIES.GET_ACTIVE);
      setCompanies(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
      setCompanies([]);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get(API.ROLES);
      setRoles(response.data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setRoles([]);
    }
  };

  const fetchUserTypes = async () => {
    try {
      const response = await axiosInstance.get(API.USER_TYPES);
      setUserTypes(response.data || []);
    } catch (error) {
      console.error("Error fetching user types:", error);
      setUserTypes([]);
    }
  };

  const fetchHierarchy = async () => {
    setHierarchyLoading(true);
    try {
      const hierarchyUrl = hierarchyMode === "team" ? API.USERS_MY_TEAM : API.USERS_HIERARCHY;
      const response = await axiosInstance.get(hierarchyUrl);
      setHierarchyRows(response.data.hierarchy || []);
    } catch (error) {
      console.error("Error fetching hierarchy:", error);
      setHierarchyRows([]);
    } finally {
      setHierarchyLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, page, filters]);

  useEffect(() => {
    fetchCompanies();
    fetchRoles();
    fetchUserTypes();
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [hierarchyMode]);

  const hierarchyTree = useMemo(() => buildTree(hierarchyRows), [hierarchyRows]);

  useEffect(() => {
    if (!hierarchyTree.length) {
      setExpandedNodeIds(new Set());
      setSelectedHierarchyNodeId(null);
      return;
    }

    const firstRoot = hierarchyTree[0];
    setExpandedNodeIds(new Set([firstRoot.UserId]));
    setSelectedHierarchyNodeId(firstRoot.UserId);
  }, [hierarchyTree, hierarchyMode]);

  const handleHierarchyNodeClick = (node) => {
    setSelectedHierarchyNodeId(node.UserId);
    if (!node.children?.length) {
      return;
    }

    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.UserId)) {
        next.delete(node.UserId);
      } else {
        next.add(node.UserId);
      }
      return next;
    });
  };

  const handleFormFieldChange = (field, value) => {
    const normalizedValue = String(value || "").trim().toLowerCase();
    const shouldResetOtp = field === "email" && createOtpSentTo && normalizedValue !== createOtpSentTo;

    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (shouldResetOtp) {
        next.otp = "";
      }
      return next;
    });

    if (shouldResetOtp) {
      setCreateOtpSentTo("");
    }
  };

  const handleUserImageChange = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setUserImage(null);
      return;
    }

    try {
      const compressedFile = await compressImageFile(file);
      setUserImage(compressedFile);
      if (compressedFile.size < file.size) {
        toast.success(`Image optimized from ${formatFileSize(file.size)} to ${formatFileSize(compressedFile.size)}`);
      }
    } catch (error) {
      setUserImage(null);
      event.target.value = "";
      toast.error(error.message || "Unable to optimize image");
    }
  };

  const sendCreateUserOtp = async () => {
    const email = String(form.email || "").trim().toLowerCase();
    if (!email) {
      setStatusMessage("Please enter email before requesting OTP");
      toast.error("Please enter email before requesting OTP");
      return;
    }

    setCreateOtpSending(true);
    setStatusMessage("");

    try {
      const response = await axiosInstance.post(API.CREATEUSER_SEND_OTP, {
        email,
        name: form.name,
      });
      setCreateOtpSentTo(email);
      setForm((prev) => ({ ...prev, otp: "" }));
      setStatusMessage(response.data?.message || "OTP sent to email");
      toast.success(response.data?.message || "OTP sent to email");
    } catch (error) {
      setStatusMessage(error.response?.data?.message || "Unable to send OTP");
      toast.error(error.response?.data?.message || "Unable to send OTP");
    } finally {
      setCreateOtpSending(false);
    }
  };

  const openCreateModal = () => {
    setMode("create");
    setSelectedUserId(null);
    setForm(initialForm);
    setUserImage(null);
    setStatusMessage("");
    setCreateOtpSentTo("");
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setMode("edit");
    setSelectedUserId(user.id);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      mobileNumber: user.mobileNumber || "",
      companyId: user.companyId ? String(user.companyId) : "",
      roleId: user.roleId ? String(user.roleId) : "",
      userTypeId: user.userTypeId ? String(user.userTypeId) : "",
      reportingManagerId: user.reportingManagerId ? String(user.reportingManagerId) : "",
      departmentId: user.departmentId ? String(user.departmentId) : "",
      designationId: user.designationId ? String(user.designationId) : "",
      hierarchyLevel: user.hierarchyLevel != null ? String(user.hierarchyLevel) : "0",
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      country: user.country || "",
      postalCode: user.postalCode || "",
    });
    setUserImage(null);
    setStatusMessage("");
    setCreateOtpSentTo("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(initialForm);
    setUserImage(null);
    setStatusMessage("");
    setCreateOtpSentTo("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatusMessage("");

    if (mode === "create" && !String(form.otp || "").trim()) {
      setStatusMessage("Email verification OTP is required for new users");
      toast.error("Email verification OTP is required for new users");
      setSaving(false);
      return;
    }

    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (mode === "edit" && key === "password" && !value) return;
        if (mode === "edit" && key === "otp") return;
        data.append(key, value);
      });

      if (mode === "edit") {
        data.append("userId", selectedUserId);
      }

      if (userImage) {
        data.append(mode === "create" ? "userImage" : "image", userImage);
      }

      if (mode === "create") {
        await axiosInstance.post(API.CREATEUSER, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setStatusMessage("User created successfully");
        toast.success("User created successfully");
      } else {
        await axiosInstance.put(API.UPDATE_USER, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setStatusMessage("User updated successfully");
        toast.success("User updated successfully");
      }

      await fetchUsers();
      closeModal();
    } catch (error) {
      setStatusMessage(error.response?.data?.message || "Unable to save record");
      toast.error(error.response?.data?.message || "Unable to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUserIds([]);
      setSelectAll(false);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
      setSelectAll(true);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select users to delete");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${selectedUserIds.length} user(s)?`)) {
      return;
    }
    try {
      await Promise.all(
        selectedUserIds.map((id) =>
          axiosInstance.delete(`${API.API_BASE_URL}/users/delete/${id}`)
        )
      );
      toast.success(`${selectedUserIds.length} user(s) deleted successfully`);
      setSelectedUserIds([]);
      setSelectAll(false);
      await fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete users");
    }
  };

  const fields = [
    "name",
    "email",
    "otp",
    "password",
    "mobileNumber",
    "companyId",
    "roleId",
    "userTypeId",
    "reportingManagerId",
    "departmentId",
    "designationId",
    "hierarchyLevel",
    "address",
    "city",
    "state",
    "country",
    "postalCode",
  ];

  const getCompanyName = (companyId) => {
    if (!companyId) return "-";
    const company = companies.find((c) => String(c.Id) === String(companyId));
    return company?.CompanyName || companyId;
  };

  const getRoleName = (roleId) => {
    if (!roleId) return "-";
    const role = roles.find((item) => String(item.Id) === String(roleId));
    return role?.RoleName || roleId;
  };

  const getUserTypeName = (userTypeId) => {
    if (!userTypeId) return "-";
    const userType = userTypes.find((item) => String(item.UserTypeId) === String(userTypeId));
    return userType?.UserType || userTypeId;
  };

  // Filter manager options by the selected company in the form
  const managerOptions = useMemo(
    () =>
      users
        .filter((user) => {
          // If a company is selected in the form, only show managers from that company
          if (form.companyId) {
            return String(user.companyId) === String(form.companyId);
          }
          // If logged-in user has a company and is not super admin, filter by that company
          if (loggedInCompanyId && !isSuperAdmin) {
            return String(user.companyId) === loggedInCompanyId;
          }
          return true;
        })
        .map((user) => ({
          value: String(user.id),
          label: `${user.name} (${user.email})`,
        })),
    [users, form.companyId, loggedInCompanyId, isSuperAdmin]
  );

  const selectedHierarchyNode = useMemo(
    () => findNodeById(hierarchyTree, selectedHierarchyNodeId),
    [hierarchyTree, selectedHierarchyNodeId]
  );

  const selectedHierarchyUser = useMemo(() => {
    if (!selectedHierarchyNode) return null;
    return users.find((user) => Number(user.id) === Number(selectedHierarchyNode.UserId)) || null;
  }, [users, selectedHierarchyNode]);

  const selectedDirectReports = selectedHierarchyNode?.children?.length || 0;
  const selectedTotalReports = selectedHierarchyNode ? countDescendants(selectedHierarchyNode) : 0;

  useEffect(() => {
    if (!selectedHierarchyNodeId) {
      setSelectedRecordSummary(null);
      return;
    }

    let ignore = false;
    const fetchSelectedRecordSummary = async () => {
      setSelectedRecordSummaryLoading(true);
      try {
        const response = await axiosInstance.get(API.USERS_RECORD_SUMMARY(selectedHierarchyNodeId));
        if (!ignore) {
          setSelectedRecordSummary(response.data?.summary || null);
        }
      } catch (error) {
        if (!ignore) {
          setSelectedRecordSummary(null);
        }
        console.error("Error fetching selected user summary:", error);
      } finally {
        if (!ignore) {
          setSelectedRecordSummaryLoading(false);
        }
      }
    };

    fetchSelectedRecordSummary();

    return () => {
      ignore = true;
    };
  }, [selectedHierarchyNodeId]);

  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Users List</h2>
            <p className="text-sm text-slate-500">Create and update records from a single clean list page.</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/Admin/users/register"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Register Page
            </Link>
            <button
              onClick={openCreateModal}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Quick Create
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search by name, email, or mobile..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="mb-4 w-full max-w-md rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-6">
          <select
            value={filters.companyId}
            onChange={(event) => updateFilter("companyId", event.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.Id} value={company.Id}>
                {company.CompanyName}
              </option>
            ))}
          </select>

          <select
            value={filters.roleId}
            onChange={(event) => updateFilter("roleId", event.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.Id} value={role.Id}>
                {role.RoleName}
              </option>
            ))}
          </select>

          <select
            value={filters.userTypeId}
            onChange={(event) => updateFilter("userTypeId", event.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Access Types</option>
            {userTypes.map((userType) => (
              <option key={userType.UserTypeId} value={userType.UserTypeId}>
                {userType.UserType}
              </option>
            ))}
          </select>

          <select
            value={filters.isActive}
            onChange={(event) => updateFilter("isActive", event.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(event) => updateFilter("sortBy", event.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="UserId">Newest</option>
            <option value="Name">Name</option>
            <option value="Email">Email</option>
            <option value="CreatedAt">Created Date</option>
            <option value="HierarchyLevel">Hierarchy Level</option>
          </select>

          <select
            value={filters.sortOrder}
            onChange={(event) => updateFilter("sortOrder", event.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Mobile</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Access Type</th>
                <th className="px-4 py-3 text-left">Manager</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-200">
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.mobileNumber || "-"}</td>
                    <td className="px-4 py-3">{getCompanyName(user.companyId)}</td>
                    <td className="px-4 py-3">{getRoleName(user.roleId)}</td>
                    <td className="px-4 py-3">{getUserTypeName(user.userTypeId)}</td>
                    <td className="px-4 py-3">{user.reportingManagerName || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(user)}
                        className="rounded-lg border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[#d8cfbf] bg-[#ece8db] p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Organization Hierarchy</h3>
            <p className="text-xs text-slate-600">Corporate org chart with live user data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setHierarchyMode("org")}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                hierarchyMode === "org"
                  ? "bg-teal-700 text-white"
                  : "border border-[#7aa9a4] bg-[#f5efe4] text-[#285f63] hover:bg-[#eef4f3]"
              }`}
            >
              Full Org
            </button>
            <button
              onClick={() => setHierarchyMode("team")}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                hierarchyMode === "team"
                  ? "bg-teal-700 text-white"
                  : "border border-[#7aa9a4] bg-[#f5efe4] text-[#285f63] hover:bg-[#eef4f3]"
              }`}
            >
              My Team
            </button>
            <button
              onClick={fetchHierarchy}
              className="rounded-lg border border-[#7aa9a4] bg-white px-3 py-1.5 text-sm font-medium text-[#285f63] transition hover:bg-[#f4f9f8]"
            >
              Refresh
            </button>
          </div>
        </div>

        {hierarchyLoading ? (
          <div className="rounded-xl border border-[#d1c6b4] bg-[#f3eee3] px-4 py-8 text-center text-sm text-slate-600">
            Loading hierarchy...
          </div>
        ) : hierarchyRows.length ? (
          <ClassicCorporateOrgChart
            rows={hierarchyRows}
            getRoleName={getRoleName}
            selectedUserId={selectedHierarchyNodeId}
            onNodeClick={handleHierarchyNodeClick}
          />
        ) : (
          <div className="rounded-xl border border-[#d1c6b4] bg-[#f3eee3] px-4 py-8 text-center text-sm text-slate-600">
            No hierarchy data available.
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-lg max-h-[90vh]">
            <TitleBar title={mode === "create" ? "Create New User" : "Update User"} onClose={() => setIsModalOpen(false)} />
            <div className="overflow-y-auto p-5">
              <button onClick={closeModal} className="rounded border px-3 py-1 text-sm">
                Close
              </button>
            </div>

            {statusMessage ? (
              <p className="mb-3 rounded  px-3 py-2 text-sm text-slate-700">{statusMessage}</p>
            ) : null}

            <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map((field) => {
                if (mode === "edit" && field === "otp") {
                  return null;
                }

                return (
                  <label key={field} className="flex flex-col gap-1 text-sm">
                    <span className="capitalize text-slate-700">
                      {fieldLabels[field] || field}
                    </span>
                    {field === "otp" ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name={field}
                          value={form[field]}
                          onChange={(event) => handleFormFieldChange(field, event.target.value)}
                          placeholder="Enter 6 digit OTP"
                          className="w-full rounded border border-slate-300 px-3 py-2"
                        />
                        <button
                          type="button"
                          onClick={sendCreateUserOtp}
                          disabled={createOtpSending || !String(form.email || "").trim()}
                          className="whitespace-nowrap rounded border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                        >
                          {createOtpSending ? "Sending..." : createOtpSentTo ? "Resend OTP" : "Send OTP"}
                        </button>
                      </div>
                    ) : field === "companyId" ? (
                      <select
                        name={field}
                        value={form[field]}
                        onChange={(event) => handleFormFieldChange(field, event.target.value)}
                        required
                        className="rounded border border-slate-300 px-3 py-2"
                      >
                        <option value="">Select company</option>
                        {companies.map((company) => (
                          <option key={company.Id} value={company.Id}>
                            {company.CompanyName}
                          </option>
                        ))}
                      </select>
                    ) : field === "roleId" ? (
                      <select
                        name={field}
                        value={form[field]}
                        onChange={(event) => handleFormFieldChange(field, event.target.value)}
                        required
                        className="rounded border border-slate-300 px-3 py-2"
                      >
                        <option value="">Select role</option>
                        {roles.map((role) => (
                          <option key={role.Id} value={role.Id}>
                            {role.RoleName}
                          </option>
                        ))}
                      </select>
                    ) : field === "userTypeId" ? (
                      <select
                        name={field}
                        value={form[field]}
                        onChange={(event) => handleFormFieldChange(field, event.target.value)}
                        className="rounded border border-slate-300 px-3 py-2"
                      >
                        <option value="">Select access type</option>
                        {userTypes.map((userType) => (
                          <option key={userType.UserTypeId} value={userType.UserTypeId}>
                            {userType.UserType}
                          </option>
                        ))}
                      </select>
                    ) : field === "reportingManagerId" ? (
                      <select
                        name={field}
                        value={form[field]}
                        onChange={(event) => handleFormFieldChange(field, event.target.value)}
                        className="rounded border border-slate-300 px-3 py-2"
                      >
                        <option value="">Select manager</option>
                        {managerOptions.map((manager) => (
                          <option key={manager.value} value={manager.value}>
                            {manager.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field === "password" ? "password" : "text"}
                        name={field}
                        value={form[field]}
                        onChange={(event) => handleFormFieldChange(field, event.target.value)}
                        required={mode === "create" ? ["name", "email", "password", "mobileNumber"].includes(field) : false}
                        className="rounded border border-slate-300 px-3 py-2"
                      />
                    )}
                  </label>
                );
              })}

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-slate-700">Profile Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUserImageChange}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : mode === "create" ? "Create Record" : "Update Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UsersPage;
