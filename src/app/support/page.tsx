import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Suporte - UzzApp",
  description:
    "Canal oficial de suporte da UzzApp com orientacoes de contato para clientes e equipe de review.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-erie-black-900 via-erie-black-800 to-erie-black-900">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="mb-4 inline-block text-mint-500 hover:text-mint-400"
          >
            {"<- Voltar para o portal"}
          </Link>
          <h1 className="mb-2 text-4xl font-bold text-white">
            Suporte UzzApp
          </h1>
          <p className="text-erie-black-400">
            Pagina publica para contato de suporte tecnico e app review.
          </p>
        </div>

        <div className="space-y-6 rounded-lg bg-white p-8 shadow-2xl">
          <section className="rounded border border-erie-black-200 bg-erie-black-50 p-4">
            <h2 className="mb-2 text-xl font-semibold text-erie-black-900">
              Contato principal
            </h2>
            <p className="text-erie-black-700">
              Suporte tecnico:
              {" "}
              <a
                href="mailto:suporte@uzzai.com.br"
                className="text-mint-700 hover:underline"
              >
                suporte@uzzai.com.br
              </a>
            </p>
            <p className="text-erie-black-700">
              Contato geral:
              {" "}
              <a
                href="mailto:contato@uzzai.com.br"
                className="text-mint-700 hover:underline"
              >
                contato@uzzai.com.br
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-erie-black-900">
              Informacoes para review
            </h2>
            <ul className="ml-4 list-disc space-y-1 text-erie-black-700">
              <li>Produto: UzzApp (plataforma de atendimento WhatsApp com IA).</li>
              <li>Ambiente web oficial: https://uzzapp.uzzai.com.br</li>
              <li>Politica de privacidade: https://uzzapp.uzzai.com.br/privacy</li>
              <li>Termos de uso: https://uzzapp.uzzai.com.br/terms</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-erie-black-900">
              Atendimento
            </h2>
            <p className="text-erie-black-700">
              Quando enviar sua solicitacao, informe email da conta, contexto do
              problema e, se possivel, capturas de tela para agilizar o suporte.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
