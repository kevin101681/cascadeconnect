"use client";

import { motion } from "framer-motion";
import { ReactNode, useEffect, useRef, useState } from "react";

interface SmoothHeightWrapperProps {
  children: ReactNode;
  className?: string;
  /**
   * When false, renders a plain div with no height animation/ResizeObserver.
   * Useful for full-screen overlays where height should be stable.
   */
  enabled?: boolean;
}

export const SmoothHeightWrapper = ({
  children,
  className,
  enabled = true,
}: SmoothHeightWrapperProps) => {
  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      // We wrap this in a requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
      // which is a common benign error in strict mode
      window.requestAnimationFrame(() => {
        if (!entries[0]) return;
        setHeight(entries[0].contentRect.height);
      });
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <motion.div
      className={`overflow-hidden ${className ?? ""}`}
      animate={{ height }}
      initial={{ height: "auto" }}
      transition={{
        duration: 0.3,
        ease: [0.21, 0.47, 0.32, 0.98], // Matches our previous "snappy" curve
      }}
    >
      {/* This inner div is what we measure. 
        It must not have vertical margins collapsing outside of it, 
        or the measurement will be slightly off.
        Padding is safe.
      */}
      <div ref={containerRef} className="h-fit w-full">
        {children}
      </div>
    </motion.div>
  );
};