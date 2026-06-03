import { PageHeader } from "@/components/layout/PageHeader";
import { KycWizard } from "@/components/onboarding/KycWizard";

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Seller onboarding"
        description="Complete your KYC/KYB and sign contracts to activate your account"
      />
      <KycWizard />
    </div>
  );
}
