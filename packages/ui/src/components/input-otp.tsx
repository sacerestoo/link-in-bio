import type { ReactElement } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { OTPInput, OTPInputContext } from "input-otp";
import MinusIcon from "lucide-react/icons/minus";
import * as React from "react";

const inputOTPSlotVariants = cva(
  "relative z-10 flex items-center justify-center rounded-md text-sm shadow-default transition-all outline-none group-data-[invalid=true]/otp-group:border-destructive group-data-[invalid=true]/otp-group:ring-2 group-data-[invalid=true]/otp-group:ring-destructive aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:group-data-[invalid=true]/otp-group:ring-destructive/40 dark:data-[active=true]:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        default: "size-8",
        sm: "size-7 text-xs",
        lg: "size-9 text-base",
        xl: "size-10 text-base",
        "2xl": "size-12 text-lg",
      },
    },
    defaultVariants: { size: "default" },
  },
);
type InputOTPSize = NonNullable<
  VariantProps<typeof inputOTPSlotVariants>["size"]
>;

const inputOTPSizeContext = React.createContext<InputOTPSize>("default");

type OTPIndicatorPosition = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

const useOTPIndicatorPosition = (): Readonly<{
  groupRef: React.RefObject<HTMLDivElement | null>;
  position: OTPIndicatorPosition | null;
}> => {
  const groupRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<OTPIndicatorPosition | null>(
    null,
  );
  const context = React.useContext(OTPInputContext);
  const activeIndex =
    context?.slots.findIndex((slot): boolean => slot.isActive) ?? -1;

  React.useEffect((): (() => void) => {
    const group = groupRef.current;
    let observer: ResizeObserver | undefined;
    if (group && activeIndex >= 0) {
      const updatePosition = (): void => {
        const activeSlot = group.querySelector<HTMLElement>(
          '[data-slot="input-otp-slot"][data-active="true"]',
        );
        if (!activeSlot) return;
        const slotRect = activeSlot.getBoundingClientRect();
        const groupRect = group.getBoundingClientRect();
        setPosition({
          x: slotRect.left - groupRect.left - group.clientLeft,
          y: slotRect.top - groupRect.top - group.clientTop,
          width: slotRect.width,
          height: slotRect.height,
        });
      };

      updatePosition();
      observer = new ResizeObserver(updatePosition);
      observer.observe(group);
    }
    return (): void => {
      observer?.disconnect();
    };
  }, [activeIndex]);

  return { groupRef, position: activeIndex >= 0 ? position : null };
};

function InputOTP({
  className,
  containerClassName,
  ...props
}: Readonly<
  React.ComponentProps<typeof OTPInput> & {
    containerClassName?: string;
  }
>): ReactElement {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        containerClassName,
      )}
      spellCheck={false}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({
  className,
  size = "default",
  ...props
}: Readonly<
  React.ComponentProps<"div"> & { size?: InputOTPSize }
>): ReactElement {
  const { groupRef, position } = useOTPIndicatorPosition();
  return (
    <inputOTPSizeContext.Provider value={size}>
      <div
        ref={groupRef}
        data-slot="input-otp-group"
        className={cn(
          "group/otp-group relative flex items-center gap-2 rounded-lg has-aria-invalid:border-destructive has-aria-invalid:ring-2 has-aria-invalid:ring-destructive dark:has-aria-invalid:ring-destructive/40",
          className,
        )}
        {...props}
      >
        {position && (
          <span
            className="pointer-events-none absolute top-0 left-0 z-0 rounded-md bg-brand/10 ring-2 ring-brand transition-transform duration-150 group-data-[invalid=true]/otp-group:bg-destructive/10 group-data-[invalid=true]/otp-group:ring-destructive! motion-reduce:transition-none"
            style={{
              width: position.width,
              height: position.height,
              transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            }}
            aria-hidden="true"
          />
        )}
        {props.children}
      </div>
    </inputOTPSizeContext.Provider>
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: Readonly<React.ComponentProps<"div"> & { index: number }>): ReactElement {
  const size = React.useContext(inputOTPSizeContext);
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(inputOTPSlotVariants({ size }), className)}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({
  ...props
}: Readonly<React.ComponentProps<"div">>): ReactElement {
  return (
    <div
      data-slot="input-otp-separator"
      className="flex items-center [&_svg:not([class*='size-'])]:size-4"
      role="separator"
      {...props}
    >
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
