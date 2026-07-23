import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { sendEmail } from "../src/lib/gmail";
import { buildRenewalReminderEmailHtml } from "../src/lib/renewal-reminder-email";

const main = async () => {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 7);

  const html = buildRenewalReminderEmailHtml({
    clientName: "Luis Fernando Boff",
    periodEnd: periodEnd.toISOString(),
    planName: "pro",
    amount: 25000,
    currency: "brl",
  });

  await sendEmail(
    "luisfboff@gmail.com",
    "[TESTE] Sua assinatura será renovada em breve",
    html,
  );

  console.log("Email enviado com sucesso para luisfboff@gmail.com");
};

main().catch((err) => {
  console.error("Falha ao enviar email de teste:", err);
  process.exit(1);
});
