import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { Button } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { cn } from "cn";
import * as React from "react";
import { AlertCircle } from "reicon-react/icons/AlertCircle";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { CircleInfo } from "reicon-react/icons/CircleInfo";
import { TriangleWarning } from "reicon-react/icons/TriangleWarning";

const toast = ToastPrimitive.createToastManager();

function ToastProvider({
  ...props
}: Readonly<ToastPrimitive.Provider.Props>): React.ReactElement {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal({
  ...props
}: Readonly<ToastPrimitive.Portal.Props>): React.ReactElement {
  return (
    <ToastPrimitive.Portal
      data-slot="toast-portal"
      {...props}
    />
  );
}

function ToastViewport({
  className,
  ...props
}: Readonly<ToastPrimitive.Viewport.Props>): React.ReactElement {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-sm outline-none xl:right-4 xl:left-auto xl:mx-0 xl:w-full",
        className,
      )}
      {...props}
    />
  );
}

function Toast({
  className,
  ...props
}: Readonly<ToastPrimitive.Root.Props>): React.ReactElement {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full max-w-[22rem] origin-bottom rounded-xl border-0 bg-background text-foreground shadow-default will-change-transform outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({
  className,
  ...props
}: Readonly<ToastPrimitive.Content.Props>): React.ReactElement {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-3 overflow-hidden p-3 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({
  className,
  ...props
}: Readonly<ToastPrimitive.Title.Props>): React.ReactElement {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-[13px] font-normal", className)}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: Readonly<ToastPrimitive.Description.Props>): React.ReactElement {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function ToastAction({
  className,
  render = (
    <Button
      variant="outline"
      size="sm"
    />
  ),
  ...props
}: Readonly<ToastPrimitive.Action.Props>): React.ReactElement {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  children,
  render = (
    <Button
      variant="ghost"
      size="icon-sm"
    />
  ),
  ...props
}: Readonly<ToastPrimitive.Close.Props>): React.ReactElement {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      className={cn(
        "relative shrink-0 text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children ?? (
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="m18 6-12 12" />
          <path d="m6 6 12 12" />
        </svg>
      )}
    </ToastPrimitive.Close>
  );
}

const toastIcons: Record<string, React.ReactNode> = {
  success: (
    <CheckCircle
      className="text-[var(--brand-green)]"
      weight="Filled"
      aria-hidden="true"
    />
  ),
  info: (
    <CircleInfo
      className="text-sky-500"
      weight="Filled"
      aria-hidden="true"
    />
  ),
  warning: (
    <TriangleWarning
      className="text-amber-500"
      weight="Filled"
      aria-hidden="true"
    />
  ),
  error: (
    <AlertCircle
      className="text-destructive"
      weight="Filled"
      aria-hidden="true"
    />
  ),
};

function ToastIcon({
  type,
}: Readonly<{ type: string | undefined }>): React.ReactElement | null {
  const icon =
    type === "loading" ? (
      <Loading className="size-4" />
    ) : (
      toastIcons[type ?? ""]
    );

  if (icon === undefined) {
    return null;
  }

  return (
    <span
      data-slot="toast-icon"
      className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5"
    >
      {icon}
    </span>
  );
}

function ToastList(): React.ReactElement[] {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem): React.ReactElement => (
    <Toast
      key={toastItem.id}
      toast={toastItem}
    >
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
      </ToastContent>
    </Toast>
  ));
}

function Toaster({
  children,
  toastManager = toast,
  ...props
}: Readonly<ToastPrimitive.Provider.Props>): React.ReactElement {
  return (
    <ToastProvider
      toastManager={toastManager}
      {...props}
    >
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
};
