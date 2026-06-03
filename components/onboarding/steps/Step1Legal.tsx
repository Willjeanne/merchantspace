"use client";

import { useState } from "react";
import { Wand2, Loader2, Building2, User } from "lucide-react";
import type { LegalInfo, SellerType } from "@/lib/types/onboarding";

interface Step1LegalProps {
  data: Partial<LegalInfo>;
  onChange: (data: Partial<LegalInfo>) => void;
}

// Mock OCR — simulates extracting data from a Kbis document
function mockOcrExtract(): Partial<LegalInfo> {
  return {
    sellerType: "legal_entity",
    companyName: "Boutique Sport FR SAS",
    tradeName: "SportZone",
    siren: "123456789",
    siret: "12345678900012",
    vatNumber: "FR12345678900",
    legalForm: "SAS",
    incorporationDate: "2018-03-15",
    registeredAddress: "12 Rue de la Paix",
    postalCode: "75002",
    city: "Paris",
    country: "FR",
    repFirstName: "Jean",
    repLastName: "Dupont",
    repDateOfBirth: "1985-06-20",
    repNationality: "FR",
    repEmail: "jean.dupont@boutiquesvportfr.com",
    repPhone: "+33612345678",
  };
}

const FIELD_GROUPS = [
  {
    title: "Legal entity",
    fields: [
      { key: "companyName", label: "Company name", placeholder: "Ex: Boutique Sport FR SAS", required: true },
      { key: "tradeName", label: "Trade name", placeholder: "Ex: SportZone" },
      { key: "siren", label: "SIREN", placeholder: "9 digits", required: true },
      { key: "siret", label: "SIRET", placeholder: "14 digits" },
      { key: "vatNumber", label: "VAT number", placeholder: "FR + 11 digits" },
      { key: "legalForm", label: "Legal form", placeholder: "Ex: SAS, SARL, EI…" },
      { key: "incorporationDate", label: "Incorporation date", placeholder: "YYYY-MM-DD", type: "date" },
    ],
  },
  {
    title: "Registered address",
    fields: [
      { key: "registeredAddress", label: "Address", placeholder: "12 Rue de la Paix", required: true },
      { key: "postalCode", label: "Postal code", placeholder: "75002" },
      { key: "city", label: "City", placeholder: "Paris", required: true },
      { key: "country", label: "Country (ISO code)", placeholder: "FR" },
    ],
  },
  {
    title: "Legal representative",
    fields: [
      { key: "repFirstName", label: "First name", placeholder: "Jean", required: true },
      { key: "repLastName", label: "Last name", placeholder: "Dupont", required: true },
      { key: "repDateOfBirth", label: "Date of birth", placeholder: "YYYY-MM-DD", type: "date" },
      { key: "repNationality", label: "Nationality (ISO code)", placeholder: "FR" },
      { key: "repEmail", label: "Email", placeholder: "jean.dupont@example.com", type: "email", required: true },
      { key: "repPhone", label: "Phone", placeholder: "+33612345678" },
    ],
  },
] as const;

export function Step1Legal({ data, onChange }: Step1LegalProps) {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const sellerType = data.sellerType ?? "legal_entity";

  function handleOcr() {
    setScanning(true);
    setTimeout(() => {
      onChange(mockOcrExtract());
      setScanning(false);
      setScanned(true);
    }, 1800);
  }

  function set(key: keyof LegalInfo, value: string) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-6">
      {/* Seller type */}
      <div>
        <p className="text-sm font-medium text-zinc-700 mb-3">Seller type</p>
        <div className="grid grid-cols-2 gap-3">
          {([["legal_entity", "Business", Building2], ["individual", "Individual / Sole trader", User]] as const).map(
            ([type, label, Icon]) => (
              <button
                key={type}
                type="button"
                onClick={() => set("sellerType", type)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  sellerType === type
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <Icon className={`w-5 h-5 ${sellerType === type ? "text-indigo-600" : "text-zinc-400"}`} />
                <span className={`text-sm font-medium ${sellerType === type ? "text-indigo-700" : "text-zinc-700"}`}>
                  {label}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* OCR shortcut */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-indigo-800">Auto-fill from Kbis document</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Upload your Kbis extract — our OCR pre-fills the form
          </p>
        </div>
        <button
          type="button"
          onClick={handleOcr}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 shrink-0"
        >
          {scanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {scanning ? "Analysing…" : scanned ? "Re-scan" : "Scan a Kbis (demo)"}
        </button>
      </div>

      {scanned && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="text-green-500">✓</span>
          Data extracted from Kbis — verify and correct if needed.
        </div>
      )}

      {/* Form fields */}
      {FIELD_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-semibold text-zinc-800 mb-3 pb-2 border-b border-zinc-100">{group.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {group.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {f.label}
                  {("required" in f && f.required) && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  type={("type" in f ? f.type : undefined) ?? "text"}
                  value={(data[f.key as keyof LegalInfo] as string) ?? ""}
                  onChange={(e) => set(f.key as keyof LegalInfo, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
