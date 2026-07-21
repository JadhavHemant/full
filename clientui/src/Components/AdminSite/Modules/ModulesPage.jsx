import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_BASE_URL } from "../../Endpoint/Endpoint";

const ModulesPage = () => {
  const [modules, setModules] = useState({});
  const [moduleDetails, setModuleDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/modules`);
      const data = response.data;
      setModules(data.modules || {});
      setModuleDetails(data.moduleDetails || []);
    } catch (error) {
      console.error("Failed to fetch modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (key) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Group icon by module type
  const getIcon = (key) => {
    const icons = {
      health: "🩺",
      users: "👥",
      token: "🔑",
      company: "🏢",
      usertypes: "👤",
      roles: "🛡️",
      auditLogs: "📋",
      inventory: "📦",
      crm: "🤝",
      reports: "📊",
      monitoring: "📈",
      system: "⚙️",
      chat: "💬",
      teamsChat: "👪",
      dashboard: "📉",
    };
    return icons[key] || "📄";
  };

  const getColor = (key) => {
    const colors = [
      "bg-blue-50 border-blue-200 text-blue-700",
      "bg-green-50 border-green-200 text-green-700",
      "bg-purple-50 border-purple-200 text-purple-700",
      "bg-orange-50 border-orange-200 text-orange-700",
      "bg-pink-50 border-pink-200 text-pink-700",
      "bg-teal-50 border-teal-200 text-teal-700",
      "bg-indigo-50 border-indigo-200 text-indigo-700",
      "bg-rose-50 border-rose-200 text-rose-700",
      "bg-cyan-50 border-cyan-200 text-cyan-700",
      "bg-amber-50 border-amber-200 text-amber-700",
    ];
    const index = key.length % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-500 text-lg">Loading modules...</div>
      </div>
    );
  }

  const topLevelKeys = Object.keys(modules);

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📚</span>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">System Modules</h2>
            <p className="text-sm text-slate-500">
              All available API modules in the ERP CRM system
              <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                {topLevelKeys.length} modules
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Module Details */}
      {moduleDetails.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Module Visibility Details</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {moduleDetails.map((mod, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <span className="text-xl mt-0.5">{getIcon(mod.key)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{mod.name || mod.key}</p>
                  <p className="text-xs text-slate-500 truncate">{mod.key}</p>
                  {mod.userTypes && (
                    <p className="text-xs text-blue-600 mt-1">
                      Access: {mod.userTypes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modules Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topLevelKeys.map((key) => {
          const value = modules[key];
          const isGroup = typeof value === "object" && !Array.isArray(value);
          const subKeys = isGroup ? Object.keys(value) : [];
          const isExpanded = expandedCategories[key] !== false;

          return (
            <div
              key={key}
              className={`rounded-2xl border shadow-sm overflow-hidden ${
                isGroup ? "bg-white" : getColor(key)
              }`}
            >
              {/* Header / Simple Module */}
              {!isGroup ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 hover:opacity-80 transition-opacity"
                >
                  <span className="text-2xl">{getIcon(key)}</span>
                  <div>
                    <h3 className="text-sm font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                    <p className="text-xs opacity-75 mt-0.5 font-mono truncate max-w-[200px]">{value}</p>
                  </div>
                </a>
              ) : (
                /* Group / Category Module */
                <div>
                  <button
                    onClick={() => toggleCategory(key)}
                    className="flex items-center justify-between w-full p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getIcon(key)}</span>
                      <div className="text-left">
                        <h3 className="text-sm font-semibold text-slate-800 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                        <p className="text-xs text-slate-500">{subKeys.length} sub-modules</p>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {subKeys.map((subKey) => {
                        const subValue = value[subKey];
                        const subColor = getColor(subKey);

                        return (
                          <a
                            key={subKey}
                            href={subValue}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 px-4 py-3 ${subColor} hover:opacity-80 transition-opacity`}
                          >
                            <span className="text-lg">{getIcon(subKey)}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium capitalize">
                                {subKey.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-xs opacity-70 font-mono truncate max-w-[200px]">{subValue}</p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="rounded-2xl bg-slate-800 p-4 text-sm text-slate-300 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span>📦 Total Categories: <strong className="text-white">{topLevelKeys.length}</strong></span>
          {topLevelKeys.map((key) => {
            const value = modules[key];
            if (typeof value === "object" && !Array.isArray(value)) {
              const count = Object.keys(value).length;
              return (
                <span key={key}>
                  {getIcon(key)} {key.charAt(0).toUpperCase() + key.slice(1)}: <strong className="text-white">{count}</strong>
                </span>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};

export default ModulesPage;