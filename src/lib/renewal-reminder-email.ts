export const REMINDER_DAYS_BEFORE = 7;

const formatDateBR = (iso: string): string =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

const formatCurrency = (amountCents: number, currency: string): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

export const buildRenewalReminderEmailHtml = (params: {
  clientName: string;
  periodEnd: string;
  planName: string;
  amount: number;
  currency: string;
}): string => {
  const { clientName, periodEnd, planName, amount, currency } = params;
  const renewalDate = formatDateBR(periodEnd);
  const priceLabel = formatCurrency(amount, currency);

  return `
Olá, ${clientName}!<br><br>
Este é um aviso automático: sua assinatura do plano <strong>${planName}</strong> será renovada automaticamente em <strong>${renewalDate}</strong> (daqui a ${REMINDER_DAYS_BEFORE} dias).<br><br>
Valor da renovação: <strong>${priceLabel}</strong>.<br><br>
Se você não deseja renovar, cancele antes dessa data pelo painel. Caso não haja nenhuma ação, a cobrança será feita automaticamente no cartão cadastrado.<br><br>
Qualquer dúvida, é só responder este email.
`.trim();
};
