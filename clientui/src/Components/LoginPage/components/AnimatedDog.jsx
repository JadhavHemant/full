import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";

const AnimatedDog = ({ showPassword, passwordFocused, cursor }) => {
  const reduceMotion = useReducedMotion();
  const springX = useSpring(cursor.x, { stiffness: 80, damping: 18, mass: 0.35 });
  const springY = useSpring(cursor.y, { stiffness: 80, damping: 18, mass: 0.35 });
  const eyeX = useTransform(springX, [-1, 1], [-4, 4]);
  const eyeY = useTransform(springY, [-1, 1], [-2, 3]);
  const eyesAreOpen = showPassword;
  const browY = passwordFocused ? -2 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: [0, -3, 0], scale: 1 }}
      transition={
        reduceMotion
          ? { type: "spring", stiffness: 180, damping: 18 }
          : { opacity: { duration: 0.35 }, y: { duration: 3.8, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.35 } }
      }
      className="relative mx-auto mb-4 h-32 w-36 sm:h-36 sm:w-40"
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-x-4 bottom-0 h-24 rounded-[46%] bg-gradient-to-b from-amber-200 to-amber-400 shadow-[0_18px_45px_rgba(180,83,9,0.25)]"
        animate={{ y: passwordFocused ? -3 : 0 }}
      />
      <motion.div
        className="absolute left-1/2 top-2 h-24 w-28 -translate-x-1/2 rounded-[48%] bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300 shadow-xl"
        animate={{ rotate: passwordFocused ? -2 : 0 }}
      />
      <motion.div
        className="absolute left-2 top-7 h-12 w-8 rounded-full bg-amber-700"
        animate={{ rotate: passwordFocused ? [-20, -16, -20] : [-12, -9, -12], y: passwordFocused ? -2 : 0 }}
        transition={{ duration: 2.4, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-2 top-7 h-12 w-8 rounded-full bg-amber-700"
        animate={{ rotate: passwordFocused ? [20, 16, 20] : [12, 9, 12], y: passwordFocused ? -2 : 0 }}
        transition={{ duration: 2.4, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }}
      />
      <div className="absolute left-1/2 top-9 h-12 w-16 -translate-x-1/2 rounded-[50%] bg-white/75" />

      <motion.div
        className="absolute left-[46px] top-[52px] h-4 w-4 rounded-full bg-slate-950"
        style={{ x: eyesAreOpen ? eyeX : 0, y: eyesAreOpen ? eyeY : 0 }}
        animate={{ scaleY: eyesAreOpen && !reduceMotion ? [1, 0.12, 1] : eyesAreOpen ? 1 : 0.12 }}
        transition={{ scaleY: { duration: 4.5, repeat: eyesAreOpen && !reduceMotion ? Infinity : 0, repeatDelay: 2.2 } }}
      >
        {eyesAreOpen && <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-white" />}
      </motion.div>
      <motion.div
        className="absolute right-[46px] top-[52px] h-4 w-4 rounded-full bg-slate-950"
        style={{ x: eyesAreOpen ? eyeX : 0, y: eyesAreOpen ? eyeY : 0 }}
        animate={{ scaleY: eyesAreOpen && !reduceMotion ? [1, 0.12, 1] : eyesAreOpen ? 1 : 0.12 }}
        transition={{ scaleY: { duration: 4.7, repeat: eyesAreOpen && !reduceMotion ? Infinity : 0, repeatDelay: 2.6 } }}
      >
        {eyesAreOpen && <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-white" />}
      </motion.div>

      <motion.div
        className="absolute left-[42px] top-[45px] h-1 w-6 rounded-full bg-amber-800/70"
        animate={{ y: browY, rotate: passwordFocused ? -10 : 0, opacity: eyesAreOpen ? 1 : 0 }}
      />
      <motion.div
        className="absolute right-[42px] top-[45px] h-1 w-6 rounded-full bg-amber-800/70"
        animate={{ y: browY, rotate: passwordFocused ? 10 : 0, opacity: eyesAreOpen ? 1 : 0 }}
      />

      <div className="absolute left-1/2 top-[66px] h-4 w-5 -translate-x-1/2 rounded-full bg-slate-950" />
      <motion.div
        className="absolute left-1/2 top-[82px] h-3 w-8 -translate-x-1/2 rounded-b-full border-b-2 border-slate-950"
        animate={{ scaleX: passwordFocused ? 1.18 : 1, y: eyesAreOpen ? 0 : -2 }}
      />

      <motion.div
        className="absolute left-[30px] top-[47px] h-12 w-8 origin-bottom rounded-full bg-amber-500 shadow-lg"
        animate={{
          x: eyesAreOpen ? -12 : 18,
          y: eyesAreOpen ? 16 : -2,
          rotate: eyesAreOpen ? -28 : 22,
        }}
        transition={{ type: "spring", stiffness: 210, damping: 18 }}
      />
      <motion.div
        className="absolute right-[30px] top-[47px] h-12 w-8 origin-bottom rounded-full bg-amber-500 shadow-lg"
        animate={{
          x: eyesAreOpen ? 12 : -18,
          y: eyesAreOpen ? 16 : -2,
          rotate: eyesAreOpen ? 28 : -22,
        }}
        transition={{ type: "spring", stiffness: 210, damping: 18 }}
      />

      <motion.div
        className="absolute left-[29px] top-[47px] h-12 w-8 origin-bottom rounded-full bg-white/12"
        animate={{ opacity: eyesAreOpen ? 0.2 : 0.34 }}
      />
      <motion.div
        className="absolute right-[29px] top-[47px] h-12 w-8 origin-bottom rounded-full bg-white/12"
        animate={{ opacity: eyesAreOpen ? 0.2 : 0.34 }}
      />

      <motion.div
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-lg backdrop-blur"
        animate={{ opacity: passwordFocused ? 1 : 0, y: passwordFocused ? -7 : 0 }}
      >
        curious
      </motion.div>
    </motion.div>
  );
};

export default AnimatedDog;
