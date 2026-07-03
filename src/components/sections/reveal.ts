import type { Variants } from "framer-motion";

// Shared scroll-reveal grammar. `once: false` everywhere: sections
// animate out when you leave and back in when you return, in either
// direction.

export const EASE = [0.22, 1, 0.36, 1] as const;

export const viewport = { once: false, amount: 0.25, margin: "-8% 0px" };

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -48 },
  show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 48 },
  show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};
