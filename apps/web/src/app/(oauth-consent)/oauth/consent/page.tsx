import { validateConsentRequest, SCOPE_LABELS } from "@/services/oauth-service";
import { Wordmark } from "@/components/wordmark";
import { Eyebrow } from "@/components/eyebrow";
import { PairButton } from "@/components/pair-button";
import { approveConsentAction, denyConsentAction } from "./actions";

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const { client, request } = await validateConsentRequest({
    client_id: typeof raw.client_id === "string" ? raw.client_id : undefined,
    redirect_uri: typeof raw.redirect_uri === "string" ? raw.redirect_uri : undefined,
    code_challenge: typeof raw.code_challenge === "string" ? raw.code_challenge : undefined,
    scope: typeof raw.scope === "string" ? raw.scope : undefined,
    state: typeof raw.state === "string" ? raw.state : undefined,
  });

  const clientName = client.client_name ?? "Esta aplicación";

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-6">
          <Wordmark />
          <Eyebrow>Autorizar acceso</Eyebrow>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-ink">
            <strong>{clientName}</strong> quiere conectarse a tu cuenta de PAIR. Va a poder:
          </p>

          <ul className="space-y-2">
            {request.scopes.map((scope) => (
              <li key={scope} className="w-full border border-rule-soft px-3 py-2 text-sm text-ink">
                {SCOPE_LABELS[scope]}
              </li>
            ))}
          </ul>
        </div>

        <form className="flex gap-3">
          <input type="hidden" name="client_id" value={request.clientId} />
          <input type="hidden" name="redirect_uri" value={request.redirectUri} />
          <input type="hidden" name="code_challenge" value={request.codeChallenge} />
          <input type="hidden" name="scope" value={request.scopes.join(" ")} />
          {request.state !== undefined && <input type="hidden" name="state" value={request.state} />}

          <PairButton type="submit" formAction={denyConsentAction} variant="outline">
            Denegar
          </PairButton>
          <PairButton type="submit" formAction={approveConsentAction} variant="primary">
            Aprobar
          </PairButton>
        </form>
      </div>
    </main>
  );
}
