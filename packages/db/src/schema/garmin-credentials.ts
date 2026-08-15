import { pgTable, timestamp, uuid, text, unique, customType } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Nunca se construye a mano. La única forma válida de obtener un valor de
 * este tipo es la función `seal()` de la tarea de cifrado — así el schema
 * no permite escribir un token en claro por accidente.
 */
export type EncryptedPayload = string & { readonly __brand: "EncryptedPayload" };

const encryptedPayload = customType<{ data: EncryptedPayload; driverData: string }>({
  dataType() {
    return "text";
  },
});

export type GarminCredentialStatus = "active" | "expired" | "invalid" | "degraded";

export const garminCredentials = pgTable(
  "garmin_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** JSON con oauth1 + oauth2 (garth) cifrado con libsodium secretbox. */
    credentialsCiphertext: encryptedPayload("credentials_ciphertext").notNull(),
    status: text("status").notNull().default("active").$type<GarminCredentialStatus>(),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId)],
);
