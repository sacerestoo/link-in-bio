import type { ReactElement } from "react";
import { AnimatePresence, motion, stagger, type Variants } from "motion/react";

type TextEffectProps = Readonly<{
  children: string;
  className?: string;
  trigger: boolean;
  variants: Readonly<{ container: Variants; item: Variants }>;
  speedReveal: number;
}>;

export function TextEffect({
  children,
  className,
  trigger,
  variants,
  speedReveal,
}: TextEffectProps): ReactElement {
  const charCounts = new Map<string, number>();
  const chars = Array.from(children).map((char): ReactElement => {
    const count = (charCounts.get(char) ?? 0) + 1;
    charCounts.set(char, count);
    return (
      <motion.span
        key={`${char}-${count}`}
        aria-hidden="true"
        className="inline-block whitespace-pre"
        variants={variants.item}
      >
        {char}
      </motion.span>
    );
  });

  const containerVariants: Variants = {
    ...variants.container,
    visible: {
      opacity: 1,
      transition: { delayChildren: stagger(0.03 / speedReveal) },
    },
  };

  return (
    <AnimatePresence mode="popLayout">
      {trigger && (
        <motion.span
          aria-label={children}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          className={className}
        >
          {chars}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
