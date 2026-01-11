"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type Direction = "up" | "down" | "left" | "right" | "none";

interface BaseAnimationProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

interface FadeInProps extends BaseAnimationProps {
  direction?: Direction;
  distance?: number; // How far it slides in px (default 20)
  fullWidth?: boolean;
}

interface StaggerContainerProps extends BaseAnimationProps {
  staggerDelay?: number;
}

// ------------------------------------------------------------------
// Variants (Animation Definitions)
// ------------------------------------------------------------------

const getVariants = (direction: Direction, distance: number) => {
  const variants = {
    hidden: { opacity: 0, x: 0, y: 0 },
    visible: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0 },
  };

  switch (direction) {
    case "up":
      variants.hidden.y = distance;
      break;
    case "down":
      variants.hidden.y = -distance;
      break;
    case "left":
      variants.hidden.x = distance;
      break;
    case "right":
      variants.hidden.x = -distance;
      break;
  }

  return variants;
};

// ------------------------------------------------------------------
// Components
// ------------------------------------------------------------------

/**
 * Orchestrates child animations.
 * Useful for wrapping a whole page or section.
 */
export const StaggerContainer = ({
  children,
  className,
  staggerDelay = 0.1,
  delay = 0,
}: StaggerContainerProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * A simple fade-in with directional slide.
 * Use inside a StaggerContainer or standalone.
 */
export const FadeIn = ({
  children,
  className,
  direction = "up",
  distance = 20,
  delay = 0,
  duration = 0.5,
  fullWidth = false,
}: FadeInProps) => {
  const variants = getVariants(direction, distance);

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`${className} ${fullWidth ? "w-full" : ""}`}
      transition={{
        duration,
        delay, // Only used if NOT in a StaggerContainer
        ease: [0.21, 0.47, 0.32, 0.98], // Custom "snappy" spring-like bezier
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Wrapper for conditional rendering (e.g. Tabs).
 * Ensures the exiting component animates out before the new one enters.
 */
export const AnimatedTabContent = ({
  children,
  tabKey,
  className,
}: {
  children: ReactNode;
  tabKey: string;
  className?: string;
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};