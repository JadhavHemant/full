import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import toast from "react-hot-toast";
import { getSessionUser, isSuperAdminUser, SUPER_ADMIN_ROLE_ID, ADMIN_ROLE_ID, MANAGER_ROLE_ID } from "../../../utils/sessionUser";
import { compressImageFile, formatFileSize } from "../../../utils/imageCompression";

const initialForm = {
  name: "",
  email: "",
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

const RegisterUserPage = () => {
  const sessionUser = getSessionUser() || {};
  const sessionCompanyId = String(sessionUser.companyId || sessionUser.CompanyId || "");
  const canChooseCompany = isSuperAdminUser(sessionUser);
  const [form, setForm] = useState(initialForm);
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showRegisterAnother, setShowRegisterAnother] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [companiesRes, rolesRes, userTypesRes, usersRes] = await Promise.all([
          axiosInstance.get(API.COMPANIES.GET_ACTIVE),
          axiosInstance.get(API.ROLES),
          axiosInstance.get(API.USER_TYPES),
          axiosInstance.get(API.GETALLUSERS, { params: { page: 1, limit: 200 } }),
        ]);

        setCompanies(companiesRes.data?.data || []);
        setRoles(rolesRes.data || []);
        setUserTypes(userTypesRes.data || []);
        setUsers(usersRes.data?.users || []);

        if (!canChooseCompany && sessionCompanyId) {
          setForm((prev) => ({ ...prev, companyId: sessionCompanyId }));
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load register form data");
        toast.error(err.response?.data?.message || "Failed to load register form data");
      }
    };

    loadLookups();
  }, [canChooseCompany, sessionCompanyId]);

  const filteredRoles = useMemo(() => {
    const sessionRoleId = Number(sessionUser.roleId || sessionUser.RoleId || 0);
    if (sessionRoleId === SUPER_ADMIN_ROLE_ID) return roles; // superadmin sees all
    if (sessionRoleId === ADMIN_ROLE_ID) return roles.filter(r => [MANAGER_ROLE_ID, 4, 5].includes(Number(r.Id)));
    if (sessionRoleId === MANAGER_ROLE_ID) return roles.filter(r => [4, 5].includes(Number(r.Id)));
    return []; // employee and customer cannot create users
  }, [roles, sessionUser]);

  const managerOptions = useMemo(
    () =>
      users
        .filter((user) => {
          const selectedCompanyId = form.companyId || sessionCompanyId;
          if (!selectedCompanyId) return true;
          return String(user.companyId || user.CompanyId || "") === String(selectedCompanyId);
        })
        .map((user) => ({
          value: String(user.id),
          label: `${user.name} (${user.email})`,
        })),
    [form.companyId, sessionCompanyId, users]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "companyId" ? { reportingManagerId: "" } : {}),
    }));
    if (name === "email" && otpSentTo && value.trim().toLowerCase() !== otpSentTo) {
      setOtp("");
      setOtpSentTo("");
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setProfileImage(null);
      return;
    }

    try {
      const compressedFile = await compressImageFile(file);
      setProfileImage(compressedFile);
      if (compressedFile.size < file.size) {
        toast.success(`Image optimized from ${formatFileSize(file.size)} to ${formatFileSize(compressedFile.size)}`);
      }
    } catch (err) {
      setProfileImage(null);
      event.target.value = "";
      toast.error(err.message || "Unable to optimize image");
    }
  };

  const handleSendOtp = async () => {
    const email = form.email.trim().toLowerCase();
    if (!email) {
      setError("Please enter email before requesting OTP");
      toast.error("Please enter email before requesting OTP");
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      toast.error("Please enter a valid email address");
      return;
    }

    setSendingOtp(true);
    setError("");
    setMessage("");
    try {
      const response = await axiosInstance.post(API.CREATEUSER_SEND_OTP, {
        email,
        name: form.name,
      });
      setOtp("");
      setOtpSentTo(email);
      setMessage(response.data?.message || "OTP sent to email");
      toast.success(response.data?.message || "OTP sent to email");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send OTP");
      toast.error(err.response?.data?.message || "Unable to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setProfileImage(null);
    setOtp("");
    setOtpSentTo("");
    setMessage("");
    setError("");
    setShowRegisterAnother(false);
    // Reset the file input DOM element
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    setShowRegisterAnother(false);

    if (!otp.trim()) {
      setError("Please enter the email OTP to continue registration");
      toast.error("Please enter the email OTP to continue registration");
      setSaving(false);
      return;
    }

    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      data.append("otp", otp.trim());
      if (profileImage) {
        data.append("profileImage", profileImage);
      }

      await axiosInstance.post(API.CREATEUSER, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("User registered successfully");
      toast.success("User registered successfully");
      setShowRegisterAnother(true);
      // Reset the file input DOM element
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setProfileImage(null);
      setOtp("");
      setOtpSentTo("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to register user");
      toast.error(err.response?.data?.message || "Unable to register user");
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterAnother = () => {
    resetForm();
  };

  // Shared input / select style — full width, focus ring, placeholder colour
  const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";
  const selectCls = `${inputCls} disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer`;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Register User</h2>
          <p className="text-sm text-slate-500">Create a new user with full details.</p>
        </div>
        <Link
          to="/Admin/HR/Users"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          ← Back to Users
        </Link>
      </div>

      {/* Status banners */}
      {message && (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <span className="text-green-500 text-lg">✓</span> {message}
        </div>
      )}
      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          <span className="text-red-500 text-lg">✕</span> {error}
        </div>
      )}

      {/* Form card */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        {/* Card header */}
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-800">User Details</h3>
          <p className="text-xs text-slate-400 mt-0.5">Fields marked <span className="text-red-500">*</span> are required.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">

          {/* ── Section: Account Info ── */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Account Info</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Full Name <span className="text-red-500">*</span></span>
              <input
                name="name" value={form.name} onChange={handleChange}
                required placeholder="e.g. Priya Sharma"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Email Address <span className="text-red-500">*</span></span>
              <input
                type="email" name="email" value={form.email} onChange={handleChange}
                required placeholder="user@company.com"
                className={inputCls}
              />
            </label>

            {/* OTP row spans 2 columns */}
            <div className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">
                Email Verification OTP <span className="text-red-500">*</span>
                {otpSentTo && (
                  <span className="ml-2 text-xs font-normal text-green-600">— OTP sent to {otpSentTo}</span>
                )}
              </span>
              <div className="flex gap-2">
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  aria-label="Email verification OTP"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !form.email.trim()}
                  className="whitespace-nowrap rounded-xl border border-blue-400 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition"
                >
                  {sendingOtp ? "Sending…" : otpSentTo ? "Resend OTP" : "Send OTP"}
                </button>
              </div>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Password <span className="text-red-500">*</span></span>
              <input
                type="password" name="password" value={form.password} onChange={handleChange}
                required placeholder="Set a strong password"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Mobile Number <span className="text-red-500">*</span></span>
              <input
                name="mobileNumber" value={form.mobileNumber} onChange={handleChange}
                required placeholder="+91 98765 43210"
                className={inputCls}
              />
            </label>

          </div>

          {/* ── Section: Role & Access ── */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Role &amp; Access</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Company <span className="text-red-500">*</span></span>
              <select
                name="companyId" value={form.companyId} onChange={handleChange}
                required disabled={!canChooseCompany}
                className={selectCls}
              >
                <option value="">Select company</option>
                {companies
                  .filter((c) => canChooseCompany || String(c.Id) === sessionCompanyId)
                  .map((c) => (
                    <option key={c.Id} value={c.Id}>{c.CompanyName}</option>
                  ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Role <span className="text-red-500">*</span></span>
              <select name="roleId" value={form.roleId} onChange={handleChange} required className={selectCls}>
                <option value="">Select role</option>
                {filteredRoles.map((role) => (
                  <option key={role.Id} value={role.Id}>{role.RoleName}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Access Type</span>
              <select name="userTypeId" value={form.userTypeId} onChange={handleChange} className={selectCls}>
                <option value="">Select access type</option>
                {userTypes.map((ut) => (
                  <option key={ut.UserTypeId} value={ut.UserTypeId}>{ut.UserType}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Reporting Manager</span>
              <select name="reportingManagerId" value={form.reportingManagerId} onChange={handleChange} className={selectCls}>
                <option value="">Select manager</option>
                {managerOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Department</span>
              <input
                type="number" min="1" name="departmentId" value={form.departmentId} onChange={handleChange}
                placeholder="Department ID"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Designation</span>
              <input
                type="number" min="1" name="designationId" value={form.designationId} onChange={handleChange}
                placeholder="Designation ID"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Hierarchy Level</span>
              <input
                type="number" min="0" max="10" name="hierarchyLevel" value={form.hierarchyLevel} onChange={handleChange}
                placeholder="0"
                className={inputCls}
              />
            </label>

          </div>

          {/* ── Section: Address ── */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Address</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">

            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Street Address</span>
              <input
                name="address" value={form.address} onChange={handleChange}
                placeholder="123, MG Road, Bengaluru"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">City</span>
              <input name="city" value={form.city} onChange={handleChange} placeholder="City" className={inputCls} />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">State</span>
              <input name="state" value={form.state} onChange={handleChange} placeholder="State" className={inputCls} />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Country</span>
              <input name="country" value={form.country} onChange={handleChange} placeholder="Country" className={inputCls} />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Postal Code</span>
              <input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="PIN / ZIP" className={inputCls} />
            </label>

          </div>

          {/* ── Section: Profile Image ── */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Profile Image</p>
          <div className="mb-8">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Upload Photo</span>
              <input
                ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
              <span className="text-xs text-slate-400">JPEG, PNG or WebP — max 5 MB. Image will be compressed automatically.</span>
            </label>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            {showRegisterAnother && (
              <button
                type="button"
                onClick={handleRegisterAnother}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                + Register Another
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {saving && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {saving ? "Registering…" : "Register User"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default RegisterUserPage;