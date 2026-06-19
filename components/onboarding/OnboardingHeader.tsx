import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { OnboardingProgress } from "@/components/ui/OnboardingProgress";

export function OnboardingHeader({ step, backHref }: { step: number; backHref?: string }) {
  return (
    <>
      <StatusBar />
      <div className="flex items-center gap-4 px-6 pt-4">
        <BackButton href={backHref} />
        <OnboardingProgress step={step} />
      </div>
    </>
  );
}
