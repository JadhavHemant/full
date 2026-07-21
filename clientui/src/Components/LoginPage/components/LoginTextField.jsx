import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

export const FieldError = ({ children }) =>
  children ? <p className="mt-2 text-xs font-medium text-rose-500">{children}</p> : null;

const LoginTextField = ({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  placeholder,
  autoComplete,
  inputTheme,
  showPassword,
  onTogglePassword,
}) => {
  const isPassword = Boolean(onTogglePassword);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <motion.div
        className="relative"
        whileFocus={{ y: -1 }}
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={isPassword && showPassword ? "text" : type}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className={`h-12 w-full rounded-2xl border pl-12 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_14px_30px_rgba(15,23,42,0.08)] outline-none transition duration-200 focus:-translate-y-0.5 focus:ring-4 focus:ring-cyan-300/20 ${
            isPassword ? "pr-14" : "pr-4"
          } ${inputTheme}`}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
        />
        {isPassword && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-500 transition hover:bg-slate-500/10 hover:text-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <motion.span initial={false} animate={{ rotate: showPassword ? 180 : 0 }} transition={{ duration: 0.22 }}>
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </motion.span>
          </motion.button>
        )}
      </motion.div>
      <FieldError>{error}</FieldError>
    </div>
  );
};

export default LoginTextField;
