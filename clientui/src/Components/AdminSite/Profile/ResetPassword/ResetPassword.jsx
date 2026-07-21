import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as API from "../../../Endpoint/Endpoint";

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromURL = urlParams.get('token');
    const emailFromURL = urlParams.get('email');
    if (tokenFromURL) {
      setToken(tokenFromURL);
      setTimeout(() => {
        window.history.replaceState({}, document.title, "/reset-password");
      }, 100);
    }
    if (emailFromURL) {
      setEmail(emailFromURL);
    }
  }, []);

  const validatePassword = (password) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('Both password fields are required.');
      toast.error('Both password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      toast.error('Passwords do not match.');
      return;
    }
    if (!validatePassword(newPassword)) {
      setError('Password must be at least 8 characters long and include at least one letter and one number.');
      toast.error('Password must be at least 8 characters long and include at least one letter and one number.');
      return;
    }

    if (!token && (!email.trim() || !otp.trim())) {
      setError('Email and OTP are required.');
      toast.error('Email and OTP are required.');
      return;
    }

    try {
      await axios.post(API.RESET_PASSWORD, {
        token,
        email,
        otp,
        newPassword,
        confirmPassword
      });
      setSuccess('Password reset successful! Redirecting to login...');
      toast.success('Password reset successful! Redirecting to login...');
      setEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while resetting the password.');
      toast.error(err.response?.data?.message || 'Something went wrong while resetting the password.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '40px', fontFamily: 'sans-serif' }}>
      <h2>Reset Your Password</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <form onSubmit={handleSubmit}>
        {!token ? (
          <>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                style={{ width: '100%', padding: '10px' }}
                required
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="OTP"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  setError('');
                }}
                style={{ width: '100%', padding: '10px' }}
                required
              />
            </div>
          </>
        ) : null}
        <div style={{ marginBottom: '10px' }}>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError('');
            }}
            style={{ width: '100%', padding: '10px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError('');
            }}
            style={{ width: '100%', padding: '10px' }}
            required
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', cursor: 'pointer' }}>
          Reset Password
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
