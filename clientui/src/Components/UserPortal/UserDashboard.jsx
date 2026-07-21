import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../AdminSite/utils/axiosInstance";
import * as API from "../Endpoint/Endpoint";
import { getSessionUser } from "../../utils/sessionUser";

const UserDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useMemo(() => getSessionUser(), []);

  useEffect(() => {
    const run = async () => {
      try {
        const [profileRes, teamRes] = await Promise.all([
          axiosInstance.get(API.PROFILE),
          axiosInstance.get(API.USERS_MY_TEAM),
        ]);

        setProfile(profileRes.data?.profile || null);
        setTeam(teamRes.data?.hierarchy || []);
      } catch (error) {
        console.error("Failed to load user portal data", error);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const directReports = team.filter(
    (member) => Number(member.ReportingManagerId) === Number(profile?.id || user?.id)
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-600">
          This user portal is separate from the admin system and shows only personal and team-level information.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">My Role</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{profile?.roleId || user?.roleId || "-"}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">My Company</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{profile?.companyId || user?.companyId || "-"}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Direct Reports</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{directReports.length}</p>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">My Team Snapshot</h3>
          {loading ? <span className="text-sm text-slate-500">Loading...</span> : null}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Manager</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {team.length ? (
                team.slice(0, 20).map((member) => (
                  <tr key={member.UserId}>
                    <td className="px-4 py-3 text-sm text-slate-800">{member.Name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{member.Email}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{member.Level}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{member.ReportingManagerId || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                    No team data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default UserDashboard;
