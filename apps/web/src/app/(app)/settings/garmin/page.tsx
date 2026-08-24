import { GarminConnectForm } from "./_components/garmin-connect-form";

export default function ConnectGarminPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">
          Connect Garmin
        </h1>

        <GarminConnectForm />
      </div>
    </main>
  );
}
