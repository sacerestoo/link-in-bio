import type { Variants } from "motion/react";
import type { ReactElement } from "react";
import { FieldDescription } from "@grabbin/ui/components/field";
import { TextEffect } from "@grabbin/ui/components/text-effect";

type TextEffectWithExitProps = Readonly<{
  children: string;
  description: string;
  descriptionClassName?: string;
  isActive: boolean;
  trigger: boolean;
}>;

const blurSlideVariants: { container: Variants; item: Variants } = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
    },
    exit: {},
  },
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(10px) brightness(0%)",
      y: 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px) brightness(100%)",
      transition: { duration: 0.4 },
    },
    exit: {
      opacity: 0,
      y: -30,
      filter: "blur(10px) brightness(0%)",
      transition: { duration: 0.4 },
    },
  },
};

export default function TextEffectWithExit({
  children,
  description,
  descriptionClassName,
  isActive,
  trigger,
}: TextEffectWithExitProps): ReactElement {
  return (
    <div className="grid items-baseline text-xs">
      <FieldDescription
        className={`col-start-1 row-start-1 text-xs ${descriptionClassName ?? ""} ${isActive ? "invisible" : ""}`}
      >
        {description}
      </FieldDescription>
      <TextEffect
        className="col-start-1 row-start-1 text-xs text-brand"
        speedReveal={3}
        variants={blurSlideVariants}
        trigger={trigger}
      >
        {children}
      </TextEffect>
    </div>
  );
}
