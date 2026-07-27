import React, { useEffect, useState } from "react";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import TitleBar from "../../../Components/TitleBar";

const TwoFASetupPage = () => {
  const [status, setStatus] = useState({ isEnabled: false });
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [password, setPassword] = useState("");

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/auth/2fa/status");
      setStatus(response.data || { isEnabled: false });
    } catch (error) {
      console.error("Failed to fetch 2FA status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSetup = async () => {
    try {
      const response = await axiosInstance.post("/auth/2fa/setup");
      setSetupData(response.data);
      toast.success("2FA setup initiated. Scan the QR code with your authenticator app.");
    } catch (error) {
      toast.error("Failed to setup 2FA");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyToken) return toast.error("Enter the verification code");

    try {
      await axiosInstance.post("/auth/2fa/verify", { token: verifyToken });
      toast.success("2FA enabled successfully!");
      setSetupData(null);
      setVerifyToken("");
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid verification code");
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    if (!password) return toast.error("Enter your password");

    try {
      await axiosInstance.post("/auth/2fa/disable", { password });
      toast.success("2FA disabled successfully");
      setPassword("");
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to disable 2FA");
    }
  };

  const handleGenerateBackupCodes = async () => {
    try {
      const response = await axiosInstance.post("/auth/2fa/backup-codes");
      setBackupCodes(response.data.backupCodes || []);
      setShowBackupCodes(true);
      toast.success("Backup codes generated. Save them securely.");
    } catch (error) {
      toast.error("Failed to generate backup codes");
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Toaster position="top-right" />
      <TitleBar title="Two-Factor Authentication (2FA)" onClose={() => window.history.back()} />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">2FA Status</h2>
                <p className="text-sm text-gray-500">Protect your account with two-factor authentication</p>
              </div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${status.isEnabled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {status.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {status.lastUsedAt && (
              <p className="text-xs text-gray-500">Last used: {new Date(status.lastUsedAt).toLocaleString()}</p>
            )}
          </div>

          {/* Setup Section */}
          {!status.isEnabled && !setupData && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enable Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enhance your account security by enabling 2FA. You'll need an authenticator app like Google Authenticator or Authy.
              </p>
              <button
                onClick={handleSetup}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                Setup 2FA
              </button>
            </div>
          )}

          {/* QR Code & Verify */}
          {setupData && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan QR Code</h3>
              <div className="flex flex-col items-center mb-6">
                {setupData.qrCode && (
                  <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48 border-2 border-gray-200 rounded-lg mb-3" />
                )}
                <p className="text-xs text-gray-500 mb-2">Or enter this key manually:</p>
                <code className="px-3 py-1 bg-gray-100 rounded text-sm font-mono">{setupData.secret}</code>
              </div>

              <form onSubmit={handleVerify} className="max-w-sm mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                <input
                  type="text"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="Enter 6-digit code from app"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest focus:ring-2 focus:ring-orange-500 mb-3"
                  maxLength={6}
                />
                <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition">
                  Verify & Enable
                </button>
              </form>
            </div>
          )}

          {/* Disable Section */}
          {status.isEnabled && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Disable 2FA</h3>
              <p className="text-sm text-gray-600 mb-4">Enter your password to disable two-factor authentication.</p>
              <form onSubmit={handleDisable} className="max-w-sm">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 mb-3"
                />
                <button type="submit" className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition">
                  Disable 2FA
                </button>
              </form>
            </div>
          )}

          {/* Backup Codes */}
          {status.isEnabled && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Backup Codes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Backup codes can be used to access your account if you lose access to your authenticator app.
              </p>
              <button
                onClick={handleGenerateBackupCodes}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Generate New Backup Codes
              </button>

              {showBackupCodes && backupCodes.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ Save these codes securely. They won't be shown again!</p>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, i) => (
                      <code key={i} className="px-2 py-1 bg-white border rounded text-sm font-mono text-center">{code}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TwoFASetupPage;