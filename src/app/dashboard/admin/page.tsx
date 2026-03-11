import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminHomePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Painel Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acesso central para operacoes internas da plataforma UzzAI.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>
              Lista de clientes, ativacao de assinatura e visao consolidada de pagamentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/admin/clients">Abrir clientes</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget plans</CardTitle>
            <CardDescription>
              Gestao de limites de uso por cliente para IA e custos operacionais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/admin/budget-plans">Abrir budgets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

