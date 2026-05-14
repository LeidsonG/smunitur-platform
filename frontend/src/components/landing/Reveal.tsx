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
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
