import { PageHeader } from "@/components/layout/PageHeader";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Account and portal configuration" />
      <ComingSoon
        icon={<Settings className="w-8 h-8 text-zinc-300" />}
        module="a future module"
        description="Account settings, notifications, and portal preferences."
      />
    </>
  );
}
