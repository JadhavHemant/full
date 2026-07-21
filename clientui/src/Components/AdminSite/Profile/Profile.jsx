import React, { useEffect, useState } from 'react';
import * as API from "../../Endpoint/Endpoint";
import axiosInstance from '../utils/axiosInstance';
import { resolveAssetUrl } from "../../../utils/assetUrl";
import { Link } from "react-router-dom";
import { getSessionUser } from "../../../utils/sessionUser";

const Profile = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const sessionUser = getSessionUser();
  const basePath = Number(sessionUser?.roleId) === 1 ? "/Admin" : "/user";

  const getData = () => {
    axiosInstance.get(API.PROFILE)
      .then((res) => setData(res.data))
      .catch((err) => {
        const message = err.response?.data?.message || "Failed to fetch profile.";
        setError(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getData();
  }, []);

  if (loading) return <h1 className="text-center text-xl font-semibold">Loading...</h1>;

  if (error) {
    return (
      <div className="text-center mt-5">
        <p className="text-red-500">{error}</p>
        <button onClick={getData} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-6 p-4">
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">My Profile</h2>
            <p className="text-sm text-slate-500">View your profile details and open profile settings.</p>
          </div>
          <div className="flex gap-2">
            <Link to={`${basePath}/settings`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Settings
            </Link>
            <Link to={`${basePath}/settings/profile`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-md grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex justify-center">
          {data?.profile?.image ? (
            <img src={resolveAssetUrl(data.profile.image)} alt="User" className="w-40 h-40 rounded-full object-cover border" />
          ) : (
            <p>No profile image available.</p>
          )}
        </div>

        <div className="space-y-2 text-gray-700">
          <div><strong>Name:</strong> {data?.profile?.name || 'N/A'}</div>
          <div><strong>Email:</strong> {data?.profile?.email || 'N/A'}</div>
          <div><strong>Mobile:</strong> {data?.profile?.mobileNumber || 'N/A'}</div>
          <div><strong>Address:</strong> {data?.profile?.address || 'N/A'}</div>
          <div><strong>City:</strong> {data?.profile?.city || 'N/A'}</div>
          <div><strong>State:</strong> {data?.profile?.state || 'N/A'}</div>
          <div><strong>Country:</strong> {data?.profile?.country || 'N/A'}</div>
          <div><strong>Postal Code:</strong> {data?.profile?.postalCode || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

