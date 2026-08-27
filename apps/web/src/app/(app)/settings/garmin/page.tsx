import { GarminConnectForm } from "./_components/garmin-connect-form";
import { Eyebrow } from "@/components/eyebrow";

export default function ConnectGarminPage() {
  return (
    <div className="max-w-md space-y-8">
      <Eyebrow>Connect Garmin</Eyebrow>

      <GarminConnectForm />
    </div>
  );
}
