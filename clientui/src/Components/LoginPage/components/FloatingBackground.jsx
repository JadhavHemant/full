import { motion, useReducedMotion } from "framer-motion";

const particles = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  size: 3 + (index % 5),
  left: `${(index * 37) % 100}%`,
  top: `${(index * 19) % 100}%`,
  delay: (index % 7) * 0.35,
  duration: 7 + (index % 6),
}));

const lightRibbons = [
  {
    className:
      "left-[-12rem] top-[-6rem] h-[26rem] w-[44rem] rotate-[-18deg] bg-[linear-gradient(90deg,rgba(34,211,238,0),rgba(34,211,238,0.28),rgba(168,85,247,0.16),rgba(34,211,238,0))]",
    animate: { x: [0, 48, -22, 0], y: [0, 28, 8, 0], rotate: [-18, -14, -21, -18] },
    duration: 16,
  },
  {
    className:
      "right-[-18rem] top-1/4 h-[30rem] w-[52rem] rotate-[22deg] bg-[linear-gradient(90deg,rgba(52,211,153,0),rgba(52,211,153,0.22),rgba(59,130,246,0.18),rgba(52,211,153,0))]",
    animate: { x: [0, -46, 26, 0], y: [0, 36, -20, 0], rotate: [22, 18, 25, 22] },
    duration: 18,
  },
  {
    className:
      "bottom-[-14rem] left-[8%] h-[28rem] w-[56rem] rotate-[-8deg] bg-[linear-gradient(90deg,rgba(244,114,182,0),rgba(244,114,182,0.18),rgba(14,165,233,0.16),rgba(244,114,182,0))]",
    animate: { x: [0, 36, -34, 0], y: [0, -28, -8, 0], rotate: [-8, -4, -12, -8] },
    duration: 20,
  },
];

const FloatingBackground = () => {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.38),transparent_32%),linear-gradient(115deg,rgba(14,165,233,0.12),transparent_36%,rgba(16,185,129,0.13)_68%,rgba(168,85,247,0.12))]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(15,23,42,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.28)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.22)_48%,transparent)]" />

        {lightRibbons.map((ribbon) => (
          <motion.div
            key={ribbon.className}
            className={`absolute rounded-[34%] blur-3xl ${ribbon.className}`}
            animate={reduceMotion ? undefined : ribbon.animate}
            transition={{ duration: ribbon.duration, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <motion.div
          className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-[22%] border border-white/20 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-[2px]"
          animate={reduceMotion ? undefined : { rotate: [0, 4, -3, 0], scale: [1, 1.02, 0.99, 1] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute -z-10 rounded-full bg-white/55 shadow-[0_0_20px_rgba(255,255,255,0.55)]"
          style={{
            height: particle.size,
            width: particle.size,
            left: particle.left,
            top: particle.top,
          }}
          animate={reduceMotion ? undefined : { opacity: [0.16, 0.72, 0.16], y: [0, -28, 0] }}
          transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
};

export default FloatingBackground;
