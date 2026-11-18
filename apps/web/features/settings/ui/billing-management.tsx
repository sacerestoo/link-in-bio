"use client";

import {
  type BillingManagementProps,
  useBillingManagement,
} from "@/features/settings/hooks/use-billing-management";
import { Button } from "@grabbin/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@grabbin/ui/components/field";
import { Separator } from "@grabbin/ui/components/separator";

export function BillingManagement(props: BillingManagementProps) {
  const billing = useBillingManagement(props);

  return (
    <div className="space-y-6">
      <BillingHeader />
      <BillingPlanCard
        active={billing.hasAccessGranted}
        description={billing.planDescription}
        disabled={
          billing.action !== null ||
          (!billing.hasAccessGranted && props.monthlyProductId === undefined)
        }
        managing={billing.action === "portal"}
        onManage={() => void billing.openPortal()}
        onUpgrade={() => void billing.startUpgrade()}
        upgrading={billing.action === "upgrade"}
      />
      <BillingError error={billing.error} />
    </div>
  );
}

function BillingHeader() {
  return (
    <header>
      <h1 className="text-base font-medium tracking-tight">Billing</h1>
      <p className="text-sm text-muted-foreground">Manage your subscription.</p>
    </header>
  );
}

function BillingError({ error }: Readonly<{ error: string | undefined }>) {
  return error === undefined ? null : (
    <p
      className="text-sm text-destructive"
      role="alert"
    >
      {error}
    </p>
  );
}

function PagesUsage() {
  return (
    <div className="space-y-2 px-4 pb-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Pages</span>
        <span className="text-muted-foreground">1 / 1</span>
      </div>
      <div
        aria-label="Pages"
        aria-valuemax={1}
        aria-valuemin={0}
        aria-valuenow={1}
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div className="h-full w-full rounded-full bg-brand" />
      </div>
    </div>
  );
}

function BillingPlanCard({
  active,
  description,
  onManage,
  onUpgrade,
  managing,
  upgrading,
  disabled,
}: Readonly<{
  active: boolean;
  description: string;
  onManage: () => void;
  onUpgrade: () => void;
  managing: boolean;
  upgrading: boolean;
  disabled: boolean;
}>) {
  return (
    <Field className="rounded-2xl shadow-default">
      <div className="p-4 pb-2">
        <FieldLabel className="text-base">{active ? "Pro" : "Free"}</FieldLabel>
      </div>
      <PagesUsage />
      <Separator size="a" />
      <div className="flex items-center justify-between p-2 px-4 pt-0">
        <FieldDescription className="text-xs">{description}</FieldDescription>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full"
          pending={active ? managing : upgrading}
          disabled={disabled}
          onClick={active ? onManage : onUpgrade}
        >
          {active ? "Manage" : "Upgrade"}
        </Button>
      </div>
    </Field>
  );
}
