import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";
import { motion } from "motion/react";

const switchVariants = {
  sm: {
    hover: { width: 14 },
    press: { width: 16 },
    rest: { width: 12 },
  },
  md: {
    hover: { width: 26 },
    press: { width: 28 },
    rest: { width: 24 },
  },
};

const switchSpring = {
  damping: 34,
  mass: 0.6,
  stiffness: 520,
  type: "spring",
} as const;

function Switch({
  className,
  disabled,
  size = "default",
  ...props
}: Readonly<
  SwitchPrimitive.Root.Props & {
    size?: "sm" | "md" | "default";
  }
>): React.ReactElement {
  const motionSize = size === "md" ? "md" : "sm";

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      disabled={disabled}
      nativeButton
      render={
        <motion.button
          animate="rest"
          initial={false}
          whileHover={disabled === true ? undefined : "hover"}
          whileTap={disabled === true ? undefined : "press"}
        />
      }
      className={cn(
        'peer group/switch relative inline-flex shrink-0 items-center justify-start rounded-full p-0.5 transition-[color,background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] outline-none before:absolute before:rounded-full before:content-[""] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-4 data-[size=default]:w-6 data-[size=md]:h-7 data-[size=md]:w-11 data-[size=sm]:h-4 data-[size=sm]:w-6 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 pointer-coarse:before:-inset-1.5 pointer-fine:before:-inset-1 data-checked:justify-end data-checked:bg-brand data-unchecked:bg-muted data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        render={
          <motion.span
            className={cn(
              "pointer-events-none block shrink-0 rounded-full bg-white ring-0",
              motionSize === "sm" ? "h-3" : "h-6",
            )}
            initial={false}
            layout="position"
            transition={switchSpring}
            variants={switchVariants[motionSize]}
          />
        }
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
