'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';

export const revealVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

interface RevealProps extends HTMLMotionProps<'div'> {
  delay?: number;
  /** Quando true, responde ao pai via propagação de variantes (sem whileInView próprio). */
  asChild?: boolean;
}

export default function Reveal({ delay = 0, asChild = false, children, ...rest }: RevealProps) {
  if (asChild) {
    return (
      <motion.div
        variants={revealVariants}
        transition={{ duration: 0.5, delay, ease: 'easeOut' }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
