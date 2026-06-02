import { PageHeader } from "@/components/layout/PageHeader";
import { SellerProfile } from "@/components/onboarding/SellerProfile";
import { IntegrationCards } from "@/components/onboarding/IntegrationCards";
import { PaymentSchedule } from "@/components/onboarding/PaymentSchedule";
import { SetupChecklist } from "@/components/onboarding/SetupChecklist";
import {
  MOCK_ADYEN_SETTLEMENTS,
  ONBOARDING_CHECKLIST,
  INTEGRATIONS,
} from "@/lib/mock/onboarding";

const SELLER_ACCOUNT = process.env.VTEX_SELLER_ACCOUNT ?? "franceretailer1388";
const SELLER_ID = process.env.VTEX_SELLER_ID ?? "franceretailer1388";
const AFFILIATE_ID = process.env.VTEX_SELLER_AFFILIATE_ID ?? "FRN";

export default function OnboardingPage() {
  const completedSteps = ONBOARDING_CHECKLIST.filter((i) => i.completed).length;
  const totalSteps = ONBOARDING_CHECKLIST.length;

  return (
    <>
      <PageHeader
        title="Onboarding"
        description="Seller setup, integrations and payment schedule"
      />

      <div className="space-y-6">
        {/* Seller profile + progress */}
        <SellerProfile
          account={SELLER_ACCOUNT}
          sellerId={SELLER_ID}
          affiliateId={AFFILIATE_ID}
          completedSteps={completedSteps}
          totalSteps={totalSteps}
        />

        {/* Integrations */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Integrations
          </h2>
          <IntegrationCards integrations={INTEGRATIONS} />
        </section>

        {/* Payment schedule */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Payment Schedule — Adyen
          </h2>
          <PaymentSchedule settlements={MOCK_ADYEN_SETTLEMENTS} />
        </section>

        {/* Setup checklist */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Setup Checklist
          </h2>
          <SetupChecklist items={ONBOARDING_CHECKLIST} />
        </section>
      </div>
    </>
  );
}
