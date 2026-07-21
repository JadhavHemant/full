import { motion } from "framer-motion";

const SocialLoginButton = ({ provider, darkMode }) => {
  const Icon = provider.icon;

  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, scale: 1.025 }}
      whileTap={{ y: 1, scale: 0.97 }}
      className={`group relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-2xl border text-sm font-semibold shadow-[0_14px_32px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
        darkMode ? "border-white/10 bg-white/8 hover:bg-white/14" : "border-white/70 bg-white/70 hover:bg-white"
      }`}
      aria-label={`Continue with ${provider.name}`}
    >
      <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
      {Icon ? <Icon className="h-5 w-5" /> : <span className="text-base font-black">{provider.mark}</span>}
      <span className="hidden sm:inline">{provider.name}</span>
    </motion.button>
  );
};

export default SocialLoginButton;
