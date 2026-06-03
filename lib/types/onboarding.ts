// ─── Onboarding / KYC types ──────────────────────────────────────────────────

export type SellerType = "legal_entity" | "individual";

export type KycStatus = "not_started" | "pending" | "in_review" | "verified" | "requires_action";

export type DocStatus = "required" | "uploaded" | "verified" | "rejected";

export type ContractStatus = "pending" | "signed";

export type WizardStep = 1 | 2 | 3 | 4 | 5;

// ─── Step 1 — Legal info ──────────────────────────────────────────────────────

export interface LegalInfo {
  sellerType: SellerType;
  companyName: string;
  tradeName: string;
  siren: string;
  siret: string;
  vatNumber: string;
  legalForm: string;
  incorporationDate: string;
  registeredAddress: string;
  postalCode: string;
  city: string;
  country: string;
  // Representative
  repFirstName: string;
  repLastName: string;
  repDateOfBirth: string;
  repNationality: string;
  repEmail: string;
  repPhone: string;
}

// ─── Step 2 — Documents ──────────────────────────────────────────────────────

export interface KycDocument {
  id: string;
  label: string;
  description: string;
  required: boolean;
  status: DocStatus;
  fileName?: string;
  uploadedAt?: string;
  rejectionReason?: string;
}

// ─── Step 3 — KYC checks ─────────────────────────────────────────────────────

export interface KycCheck {
  id: string;
  label: string;
  description: string;
  status: KycStatus;
  completedAt?: string;
  failureReason?: string;
}

// ─── Step 4 — Contracts ──────────────────────────────────────────────────────

export interface Contract {
  id: string;
  title: string;
  description: string;
  pdfUrl?: string;
  status: ContractStatus;
  signedAt?: string;
  signerName?: string;
}

// ─── Global wizard state ──────────────────────────────────────────────────────

export interface OnboardingState {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  kycStatus: KycStatus;
  legalInfo: Partial<LegalInfo>;
  documents: KycDocument[];
  kycChecks: KycCheck[];
  contracts: Contract[];
  sellerCreated: boolean;
  sellerId?: string;
}
