import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import toast from "react-hot-toast";
import { getSessionUser, isSuperAdminUser } from "../../../utils/sessionUser";
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
    if (sessionRoleId === 1) return roles; // superadmin sees all
    if (sessionRoleId === 2) return roles.filter(r => [3, 4, 5].includes(Number(r.Id)));
    if (sessionRoleId === 3) return roles.filter(r => [4, 5].includes(Number(r.Id)));
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

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Register User</h2>
            <p className="text-sm text-slate-500">Create a new user from a full-page admin form.</p>
          </div>
          <Link to="/Admin/users" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Back To Users
          </Link>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        {message ? <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Name</span>
            <input name="name" value={form.name} onChange={handleChange} required className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input type="email" name="email" value={form.email} onChange={handleChange} required className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Email Verification OTP</span>
            <div className="flex gap-2">
              <input
                name="otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="Enter 6 digit OTP"
                aria-label="Email verification OTP"
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || !form.email.trim()}
                className="whitespace-nowrap rounded-xl border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
              >
                {sendingOtp ? "Sending..." : otpSentTo ? "Resend OTP" : "Send OTP"}
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Password</span>
            <input type="password" name="password" value={form.password} onChange={handleChange} required className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Mobile Number</span>
            <input name="mobileNumber" value={form.mobileNumber} onChange={handleChange} required className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Company</span>
            <select name="companyId" value={form.companyId} onChange={handleChange} required disabled={!canChooseCompany} className="rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100">
              <option value="">Select company</option>
              {companies
                .filter((company) => canChooseCompany || String(company.Id) === sessionCompanyId)
                .map((company) => (
                  <option key={company.Id} value={company.Id}>{company.CompanyName}</option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Role</span>
            <select name="roleId" value={form.roleId} onChange={handleChange} required className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Select role</option>
              {filteredRoles.map((role) => (
                <option key={role.Id} value={role.Id}>{role.RoleName}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Access Type</span>
            <select name="userTypeId" value={form.userTypeId} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Select access type</option>
              {userTypes.map((userType) => (
                <option key={userType.UserTypeId} value={userType.UserTypeId}>{userType.UserType}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Reporting Manager</span>
            <select name="reportingManagerId" value={form.reportingManagerId} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Select manager</option>
              {managerOptions.map((manager) => (
                <option key={manager.value} value={manager.value}>{manager.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Department</span>
            <input type="number" min="1" name="departmentId" value={form.departmentId} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Designation</span>
            <input type="number" min="1" name="designationId" value={form.designationId} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Hierarchy Level</span>
            <input type="number" min="0" max="10" name="hierarchyLevel" value={form.hierarchyLevel} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Address</span>
            <input name="address" value={form.address} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">City</span>
            <input name="city" value={form.city} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">State</span>
            <input name="state" value={form.state} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Country</span>
            <input name="country" value={form.country} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Postal Code</span>
            <input name="postalCode" value={form.postalCode} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Profile Image</span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <div className="md:col-span-2 flex items-center justify-end gap-3">
            {showRegisterAnother && (
              <button
                type="button"
                onClick={handleRegisterAnother}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Register Another
              </button>
            )}
            <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Registering..." : "Register User"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default RegisterUserPage;