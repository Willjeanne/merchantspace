import { PageHeader } from "@/components/layout/PageHeader";
import { KycWizard } from "@/components/onboarding/KycWizard";

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding vendeur"
        description="Complétez votre KYC/KYB et signez les contrats pour activer votre compte"
      />
      <KycWizard />
    </div>
  );
}
