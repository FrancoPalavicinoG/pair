import { GarminConnectForm } from "./_components/garmin-connect-form";
import { Wordmark } from "@/components/wordmark";
import { Eyebrow } from "@/components/eyebrow";

export default function ConnectGarminPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-6">
          <Wordmark />
          <Eyebrow>Connect Garmin</Eyebrow>
        </div>

        <GarminConnectForm />
      </div>
    </main>
  );
}
