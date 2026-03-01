"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function ForestScene() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 250]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1a0f] via-[#0f2614] to-[#132e18]" />

      {/* Layer 1: Distant mountains — slowest parallax */}
      <motion.div style={{ y: y1 }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 400"
          className="absolute bottom-0 w-full h-[50%] min-h-[200px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <motion.path
            d="M0 400 L0 280 Q120 200 240 260 Q360 180 480 240 Q600 160 720 220 Q840 140 960 200 Q1080 160 1200 230 Q1320 190 1440 250 L1440 400 Z"
            fill="#0f2a12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
          />
        </svg>
      </motion.div>

      {/* Layer 2: Mid-ground tree line — medium parallax */}
      <motion.div style={{ y: y2 }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 500"
          className="absolute bottom-0 w-full h-[55%] min-h-[220px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <motion.g
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            style={{ transformOrigin: "bottom" }}
          >
            {/* Tree cluster left */}
            <path d="M80 500 L80 320 L60 320 L100 240 L80 240 L110 180 L90 180 L120 120 L150 180 L130 180 L160 240 L140 240 L180 320 L160 320 L160 500 Z" fill="#143d1a" />
            <path d="M200 500 L200 350 L180 350 L220 280 L200 280 L230 220 L210 220 L240 160 L270 220 L250 220 L280 280 L260 280 L300 350 L280 350 L280 500 Z" fill="#1a4a20" />
            {/* Tree cluster center-left */}
            <path d="M400 500 L400 300 L375 300 L420 220 L395 220 L440 150 L415 150 L450 90 L485 150 L460 150 L505 220 L480 220 L525 300 L500 300 L500 500 Z" fill="#143d1a" />
            <path d="M520 500 L520 340 L500 340 L540 270 L520 270 L555 210 L535 210 L565 150 L595 210 L575 210 L610 270 L590 270 L630 340 L610 340 L610 500 Z" fill="#1a4a20" />
            {/* Tree cluster center */}
            <path d="M680 500 L680 310 L660 310 L700 240 L680 240 L720 170 L700 170 L730 100 L760 170 L740 170 L780 240 L760 240 L800 310 L780 310 L780 500 Z" fill="#164218" />
            {/* Tree cluster center-right */}
            <path d="M880 500 L880 330 L860 330 L900 260 L880 260 L920 190 L900 190 L935 120 L970 190 L950 190 L990 260 L970 260 L1010 330 L990 330 L990 500 Z" fill="#143d1a" />
            <path d="M1020 500 L1020 350 L1000 350 L1040 280 L1020 280 L1060 210 L1040 210 L1075 140 L1110 210 L1090 210 L1130 280 L1110 280 L1150 350 L1130 350 L1130 500 Z" fill="#1a4a20" />
            {/* Tree cluster right */}
            <path d="M1250 500 L1250 310 L1230 310 L1270 230 L1250 230 L1290 160 L1270 160 L1305 100 L1340 160 L1320 160 L1360 230 L1340 230 L1380 310 L1360 310 L1360 500 Z" fill="#164218" />
          </motion.g>
          {/* Ground fill */}
          <rect x="0" y="420" width="1440" height="80" fill="#112e14" />
        </svg>
      </motion.div>

      {/* Layer 3: Foreground trees — fastest parallax */}
      <motion.div style={{ y: y3 }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 600"
          className="absolute bottom-0 w-full h-[50%] min-h-[200px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <motion.g
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
            style={{ transformOrigin: "bottom" }}
          >
            {/* Large tree left edge */}
            <path d="M-20 600 L-20 350 L-50 350 L10 260 L-20 260 L30 180 L0 180 L50 100 L100 180 L70 180 L120 260 L90 260 L150 350 L120 350 L120 600 Z" fill="#0d2e10" />
            {/* Large tree right edge */}
            <path d="M1320 600 L1320 340 L1290 340 L1340 250 L1310 250 L1360 170 L1330 170 L1380 90 L1430 170 L1400 170 L1450 250 L1420 250 L1470 340 L1440 340 L1440 600 Z" fill="#0d2e10" />
          </motion.g>
          {/* Ground */}
          <rect x="0" y="520" width="1440" height="80" fill="#0b1a0f" />
        </svg>
      </motion.div>

      {/* Layer 4: Ground fog */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0b1a0f] via-[#0b1a0f]/80 to-transparent" />
    </div>
  );
}
