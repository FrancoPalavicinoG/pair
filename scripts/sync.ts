import {
  getExistingUser,
  loadCredentials,
  saveCredentials,
  performLogin,
  performMfa,
  createSyncClient,
  syncActivities,
  syncDailyMetrics,
  getDisplayName,
  type StoredCredentials,
} from "@pair/sync";

function readLine(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", (chunk) => {
      process.stdin.pause();
      resolve(chunk.toString("utf8").trim());
    });
  });
}

// Sin -s incorporado en readline: enmascara caracter por caracter en raw mode.
function readHidden(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    let input = "";
    process.stdin.resume();
    process.stdin.setRawMode?.(true);
    const onData = (chunk: Buffer) => {
      const char = chunk.toString("utf8");
      if (char === "\r" || char === "\n") {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
        return;
      }
      if (char === "\u0003") process.exit(1); // Ctrl+C
      if (char === "\u007f") {
        input = input.slice(0, -1);
        return;
      }
      input += char;
    };
    process.stdin.on("data", onData);
  });
}

async function loginInteractive(): Promise<StoredCredentials> {
  const email = await readLine("Email de Garmin: ");
  const password = await readHidden("Password de Garmin: ");

  const result = await performLogin(email, password);
  if (result.status === "success") return result.creds;

  const code = await readLine("Codigo MFA: ");
  return performMfa(result.sessionId, code);
}

async function main() {
  const userIndex = process.argv.indexOf("--user");
  const email = userIndex !== -1 ? process.argv[userIndex + 1] : undefined;
  if (!email) {
    console.error("Uso: pnpm sync --user <email>");
    process.exit(1);
  }

  const user = await getExistingUser(email);
  let creds = await loadCredentials(user.id);
  if (!creds) {
    console.log("Sin credenciales guardadas. Login interactivo.");
    creds = await loginInteractive();
    await saveCredentials(user.id, creds, "active");
  }

  const client = createSyncClient(user.id, creds, () => {});
  const displayName = await getDisplayName(client);

  const newActivities = await syncActivities(user.id, client);
  console.log(`Actividades nuevas guardadas: ${newActivities}`);

  const syncedDays = await syncDailyMetrics(user.id, displayName, client);
  console.log(`Métricas diarias sincronizadas: ${syncedDays} día(s).`);

  console.log("Sync terminado.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync fallo:", err);
  process.exit(1);
});
