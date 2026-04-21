import { Resend } from "resend";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "UzzApp <noreply@send.uzzai.com.br>";

export const sendConfirmationEmail = async (
  to: string,
  confirmationUrl: string,
) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Confirme seu email - UzzApp",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #111; font-size: 24px; margin: 0;">UzzApp</h1>
        </div>
        <h2 style="color: #111; font-size: 20px; margin-bottom: 16px;">Bem-vindo! 🎉</h2>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">
          Sua conta foi criada com sucesso. Clique no botão abaixo para confirmar seu email e ativar a conta:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${confirmationUrl}" style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            Confirmar Email
          </a>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          Se o botão não funcionar, copie e cole este link no seu navegador:<br/>
          <a href="${confirmationUrl}" style="color: #6366f1; word-break: break-all;">${confirmationUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          Se você não criou esta conta, ignore este email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("[Resend] Erro ao enviar email de confirmação:", error);
    throw new Error(`Falha ao enviar email: ${error.message}`);
  }

  console.log("[Resend] Email de confirmação enviado:", data?.id, "→", to);
  return data;
};
