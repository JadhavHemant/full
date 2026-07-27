import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  Check,
  Github,
  Loader2,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import * as API from "../Endpoint/Endpoint";
import { setAccessTokenWithExpiry } from "../AdminSite/utils/tokenUtils";
import { getDefaultPortalPath } from "../../utils/sessionUser";
import AnimatedDog from "./components/AnimatedDog";
import FloatingBackground from "./components/FloatingBackground";
import LoginTextField from "./components/LoginTextField";
import SocialLoginButton from "./components/SocialLoginButton";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const socialProviders = [
  { name: "Google", mark: "G" },
  { name: "GitHub", icon: Github },
  { name: "Microsoft", mark: "M" },
];

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return (localStorage.getItem('erp-theme') || 'light') === 'dark';
  });

  // Sync dark mode with global theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('erp-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const smoothCursorX = useSpring(cursorX, { stiffness: 90, damping: 20, mass: 0.35 });
  const smoothCursorY = useSpring(cursorY, { stiffness: 90, damping: 20, mass: 0.35 });
  const cardRotateY = useTransform(smoothCursorX, [-1, 1], [-7, 7]);
  const cardRotateX = useTransform(smoothCursorY, [-1, 1], [7, -7]);
  const lightX = useTransform(smoothCursorX, [-1, 1], ["18%", "82%"]);
  const lightY = useTransform(smoothCursorY, [-1, 1], ["12%", "88%"]);
  const spotlightBackground = useTransform(
    [lightX, lightY],
    ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.34), transparent 34%)`
  );

  const validation = useMemo(
    () => ({
      email: !email ? "Email is required." : emailPattern.test(email) ? "" : "Enter a valid email address.",
      password: !password ? "Password is required." : "",
    }),
    [email, password]
  );

  useEffect(() => {
    const token = Cookies.get("accessToken");
    const user = Cookies.get("user");

    if (token && user) {
      navigate(getDefaultPortalPath(), { replace: true });
    }
  }, [navigate]);

  const updateCursor = (event) => {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    cursorX.set((event.clientX / width) * 2 - 1);
    cursorY.set((event.clientY / height) * 2 - 1);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setError("");

    if (validation.email || validation.password) {
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔐 Attempting login...');
      const response = await axios.post(API.LOGIN_USER, { email, password });
      const { accessToken, refreshToken, user } = response.data;

      if (!accessToken) {
        throw new Error('No access token in login response');
      }

      console.log('✅ Login successful, setting tokens...');
      const tokenSet = setAccessTokenWithExpiry(accessToken);
      
      if (!tokenSet) {
        throw new Error('Failed to set access token');
      }

      Cookies.set("refreshToken", refreshToken, {
        expires: rememberMe ? 14 : 7,
        path: "/",
        sameSite: "Lax",
      });
      Cookies.set("user", JSON.stringify(user), {
        expires: rememberMe ? 7 : 1,
        path: "/",
        sameSite: "Lax",
      });

      console.log('🎯 Navigating to portal...');
      navigate(getDefaultPortalPath(user), { replace: true });
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(err.response?.data?.message || "Login failed. Check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const shellTheme = darkMode
    ? "from-slate-950 via-indigo-950 to-slate-900 text-white"
    : "from-sky-50 via-white to-emerald-50 text-slate-950";
  const panelTheme = darkMode
    ? "border-white/10 bg-slate-950/55 shadow-black/40"
    : "border-white/70 bg-white/55 shadow-slate-900/12";
  const inputTheme = darkMode
    ? "border-white/10 bg-white/8 text-white placeholder:text-slate-400 focus:border-cyan-300/70 focus:bg-white/12"
    : "border-slate-200/80 bg-white/80 text-slate-950 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white";

  return (
    <main
      onMouseMove={updateCursor}
      className={`relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br px-4 py-8 transition-colors duration-500 sm:px-6 lg:px-8 ${shellTheme}`}
    >
      <FloatingBackground />

      <motion.div
        className="absolute left-[8%] top-[16%] hidden rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] shadow-2xl backdrop-blur-xl lg:block"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        Secure access
      </motion.div>
      <motion.div
        className="absolute bottom-[14%] right-[8%] hidden rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] shadow-2xl backdrop-blur-xl lg:block"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        Real-time workspace
      </motion.div>

      <div className="w-full max-w-[28rem] [perspective:1400px]">
        <motion.section
          initial={{ opacity: 0, y: 34, scale: 0.95, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          style={{ rotateX: cardRotateX, rotateY: cardRotateY, transformStyle: "preserve-3d" }}
          className={`relative w-full rounded-[2rem] border p-5 shadow-[0_38px_90px_rgba(15,23,42,0.26),0_10px_28px_rgba(14,165,233,0.12),inset_0_1px_0_rgba(255,255,255,0.56)] backdrop-blur-2xl transition-colors duration-500 sm:p-7 ${panelTheme}`}
        >
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-70"
          style={{
            background: spotlightBackground,
          }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.42),transparent_28%,transparent_72%,rgba(255,255,255,0.14))]" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="relative mb-5 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Shivani.ERP
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setDarkMode((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/15 text-current shadow-lg backdrop-blur transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </motion.button>
        </div>

        <AnimatedDog showPassword={showPassword} passwordFocused={passwordFocused} cursor={{ x: cursorX, y: cursorY }} />

        <div className="relative mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">Welcome back</h1>
          <p className={`mt-2 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
            Sign in to manage operations, sales, stock, and customer workspaces.
          </p>
        </div>

        <form onSubmit={handleLogin} className="relative space-y-4" noValidate>
          <LoginTextField
            id="email"
            label="Email address"
            icon={Mail}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setTouched((value) => ({ ...value, email: true }))}
            inputTheme={inputTheme}
            placeholder="you@company.com"
            error={touched.email && validation.email}
          />

          <LoginTextField
            id="password"
            label="Password"
            icon={LockKeyhole}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => {
              setPasswordFocused(false);
              setTouched((value) => ({ ...value, password: true }));
            }}
            inputTheme={inputTheme}
            placeholder="Enter your password"
            error={touched.password && validation.password}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
          />

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex cursor-pointer items-center gap-2 font-medium">
              <span className="relative grid h-5 w-5 place-items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300/80 bg-white/70 transition checked:border-cyan-400 checked:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
                <Check className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition peer-checked:opacity-100" />
              </span>
              Remember me
            </label>
            <Link to="/forgot-password" className="font-semibold text-cyan-500 transition hover:text-cyan-400 hover:underline">
              Forgot password?
            </Link>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-500"
              role="alert"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={!isLoading ? { y: -2, scale: 1.01 } : undefined}
            whileTap={!isLoading ? { scale: 0.98 } : undefined}
            className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-5 text-sm font-bold text-white shadow-xl shadow-blue-500/25 transition focus:outline-none focus:ring-4 focus:ring-cyan-300/35 disabled:cursor-not-allowed disabled:opacity-80"
          >
            <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
            {isLoading ? (
              <span className="relative inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in
              </span>
            ) : (
              <span className="relative inline-flex items-center gap-2">
                Login securely
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            )}
          </motion.button>
        </form>

        <div className="relative my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-current/10" />
          <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            or continue with
          </span>
          <div className="h-px flex-1 bg-current/10" />
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {socialProviders.map((provider) => (
            <SocialLoginButton key={provider.name} provider={provider} darkMode={darkMode} />
          ))}
        </div>

        <p className={`relative mt-6 text-center text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
          New to the platform?{" "}
          <Link to="/Admin/HR/Users/Register" className="font-bold text-cyan-500 transition hover:text-cyan-400 hover:underline">
            Create account
          </Link>
        </p>

        <div className={`relative mt-5 flex items-center justify-center gap-2 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Protected session with secure token storage
        </div>
        </motion.section>
      </div>
    </main>
  );
};

export default LoginPage;
