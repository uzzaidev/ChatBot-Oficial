import Link from 'next/link'

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="bg-card/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md border border-border text-center">
        <div className="mb-6">
          <div className="text-5xl mb-4">&#9203;</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Conta em an&#225;lise</h1>
          <p className="text-muted-foreground">
            Sua conta foi criada com sucesso! Nossa equipe ir&#225; analis&#225;-la e voc&#234; receber&#225; um email quando for aprovada.
          </p>
        </div>

        <Link
          href="/login"
          className="block w-full text-center bg-muted/30 border border-border hover:bg-muted text-foreground font-medium py-3 px-4 rounded-lg transition-all"
        >
          Voltar para o login
        </Link>
      </div>
    </div>
  )
}
