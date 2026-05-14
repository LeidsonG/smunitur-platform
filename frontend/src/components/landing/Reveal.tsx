'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';

interface RevealProps extends HTMLMotionProps<'div'> {
  delay?: number;
}

/**
 * Wrapper que aplica fade-in + slide-up sutil quando o elemento entra
 * na viewport. Renderiza apenas uma vez (não re-anima ao rolar de volta).
 * Respeita `prefers-reduced-motion` automaticamente via framer-motion.
 */
export default function Reveal({ delay = 0, children, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: 'blur(2px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
