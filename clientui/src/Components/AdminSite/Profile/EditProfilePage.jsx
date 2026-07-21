import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import toast from "react-hot-toast";
import { resolveAssetUrl } from "../../../utils/assetUrl";
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

const EditProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await axiosInstance.get(API.PROFILE);
        const nextProfile = response.data?.profile || null;
        setProfile(nextProfile);
        if (nextProfile) {
          setForm({
            name: nextProfile.name || "",
            email: nextProfile.email || "",
            password: "",
            mobileNumber: nextProfile.mobileNumber || "",
            companyId: nextProfile.companyId ? String(nextProfile.companyId) : "",
            roleId: nextProfile.roleId ? String(nextProfile.roleId) : "",
            userTypeId: nextProfile.userTypeId ? String(nextProfile.userTypeId) : "",
            reportingManagerId: nextProfile.reportingManagerId ? String(nextProfile.reportingManagerId) : "",
            departmentId: nextProfile.departmentId ? String(nextProfile.departmentId) : "",
            designationId: nextProfile.designationId ? String(nextProfile.designationId) : "",
            hierarchyLevel: nextProfile.hierarchyLevel != null ? String(nextProfile.hierarchyLevel) : "0",
            address: nextProfile.address || "",
            city: nextProfile.city || "",
            state: nextProfile.state || "",
            country: nextProfile.country || "",
            postalCode: nextProfile.postalCode || "",
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
        toast.error(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setImageFile(null);
      return;
    }

    try {
      const compressedFile = await compressImageFile(file);
      setImageFile(compressedFile);
      if (compressedFile.size < file.size) {
        toast.success(`Image optimized from ${formatFileSize(file.size)} to ${formatFileSize(compressedFile.size)}`);
      }
    } catch (err) {
      setImageFile(null);
      event.target.value = "";
      toast.error(err.message || "Unable to optimize image");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!profile?.id) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const data = new FormData();
      data.append("userId", profile.id);

      Object.entries(form).forEach(([key, value]) => {
        if (key === "password" && !value) return;
        data.append(key, value);
      });

      if (imageFile) {
        data.append("image", imageFile);
      }

      await axiosInstance.put(API.UPDATE_USER, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Profile updated successfully");
      toast.success("Profile updated successfully");
      navigate(-1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading profile...</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Edit Profile</h2>
            <p className="text-sm text-slate-500">Update your account information and profile picture.</p>
          </div>
          <Link to={profile?.roleId === 1 ? "/Admin/profile" : "/user/profile"} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Back To Profile
          </Link>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p> : null}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[220px,1fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {profile?.image ? (
                <img
                  src={resolveAssetUrl(profile.image)}
                  alt={profile.name || "Profile"}
                  className="h-56 w-full object-cover"
                />
              ) : (
                <div className="flex h-56 items-center justify-center text-5xl font-bold text-slate-500">
                  {(profile?.name || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["name", "Name"],
              ["email", "Email"],
              ["password", "New Password"],
              ["mobileNumber", "Mobile Number"],
              ["address", "Address"],
              ["city", "City"],
              ["state", "State"],
              ["country", "Country"],
              ["postalCode", "Postal Code"],
            ].map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">{label}</span>
                <input
                  type={key === "password" ? "password" : key === "email" ? "email" : "text"}
                  name={key}
                  value={form[key]}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
            ))}

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};

export default EditProfilePage;
