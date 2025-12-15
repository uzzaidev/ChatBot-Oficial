"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Send, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useTemplates } from "@/hooks/useTemplates";
import type { MessageTemplate } from "@/lib/types";

export default function TestTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [parameters, setParameters] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
  } | null>(null);

  const { templates, loading } = useTemplates({
    status: "APPROVED", // Only show approved templates
  });

  // Extract parameters from body component when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      const bodyComponent = selectedTemplate.components.find(c => c.type === "BODY");
      if (bodyComponent?.text) {
        const matches = bodyComponent.text.match(/\{\{\d+\}\}/g) || [];
        setParameters(new Array(matches.length).fill(""));
      }
    }
  }, [selectedTemplate]);

  const handleSendTest = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Erro",
        description: "Selecione um template primeiro",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber) {
      toast({
        title: "Erro",
        description: "Informe o número de telefone",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      toast({
        title: "Erro",
        description: "Número de telefone inválido. Use formato: 5511999999999",
        variant: "destructive",
      });
      return;
    }

    // Check if all parameters are filled
    const bodyComponent = selectedTemplate.components.find(c => c.type === "BODY");
    const variableCount = (bodyComponent?.text?.match(/\{\{\d+\}\}/g) || []).length;
    if (variableCount > 0 && parameters.some(p => !p)) {
      toast({
        title: "Erro",
        description: "Preencha todos os parâmetros do template",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await apiFetch(`/api/templates/${selectedTemplate.id}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: cleanPhone,
          parameters: parameters.filter(p => p),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Falha ao enviar template");
      }

      setResult({
        success: true,
        message: "Template enviado com sucesso!",
        messageId: data.messageId,
      });

      toast({
        title: "✅ Sucesso",
        description: "Template enviado com sucesso via WhatsApp!",
      });
    } catch (error: any) {
      console.error("Error sending template:", error);
      
      setResult({
        success: false,
        message: error.message || "Falha ao enviar template",
      });

      toast({
        title: "❌ Erro",
        description: error.message || "Falha ao enviar template.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getBodyPreview = () => {
    if (!selectedTemplate) return "";
    
    const bodyComponent = selectedTemplate.components.find(c => c.type === "BODY");
    if (!bodyComponent?.text) return "";

    let preview = bodyComponent.text;
    parameters.forEach((param, index) => {
      if (param) {
        preview = preview.replace(`{{${index + 1}}}`, param);
      }
    });
    return preview;
  };

  return (
    <div className="min-h-screen bg-silver-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/templates")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Templates
          </Button>

          <h1 className="text-2xl font-bold text-erie-black-900 mb-2">
            Testar Envio de Template
          </h1>
          <p className="text-sm text-erie-black-600">
            Selecione um template aprovado e envie uma mensagem de teste para verificar
            se está funcionando corretamente com a Meta API.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Selecione um Template Aprovado</CardTitle>
                <CardDescription>
                  Apenas templates com status APPROVED podem ser enviados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue-500"></div>
                  </div>
                ) : (!templates?.length) ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-erie-black-600 mb-4">
                      Nenhum template aprovado encontrado.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/dashboard/templates/new")}
                    >
                      Criar Novo Template
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedTemplate?.id === template.id
                            ? "border-brand-blue-500 bg-brand-blue-50"
                            : "border-silver-200 hover:border-brand-blue-300"
                        }`}
                      >
                        <div className="font-medium text-erie-black-900">
                          {template.name}
                        </div>
                        <div className="text-sm text-erie-black-600 mt-1">
                          {template.category} • {template.language}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedTemplate && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>2. Configure os Parâmetros</CardTitle>
                    <CardDescription>
                      Preencha os valores das variáveis do template
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Número do WhatsApp (destinatário)</Label>
                      <Input
                        id="phone"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="5511999999999"
                      />
                      <p className="text-xs text-erie-black-500 mt-1">
                        Formato: código do país + DDD + número (sem espaços ou símbolos)
                      </p>
                    </div>

                    {parameters.length > 0 && (
                      <div className="space-y-3">
                        <Label>Variáveis do Template</Label>
                        {parameters.map((param, index) => (
                          <div key={index}>
                            <Label htmlFor={`param-${index}`} className="text-sm">
                              Variável {`{{${index + 1}}}`}
                            </Label>
                            <Input
                              id={`param-${index}`}
                              value={param}
                              onChange={(e) => {
                                const newParams = [...parameters];
                                newParams[index] = e.target.value;
                                setParameters(newParams);
                              }}
                              placeholder={`Valor para {{${index + 1}}}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>3. Enviar Teste</CardTitle>
                    <CardDescription>
                      Clique para enviar o template via WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleSendTest}
                      disabled={sending || !phoneNumber}
                      className="w-full"
                      size="lg"
                    >
                      {sending ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Template
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Preview & Result */}
          <div className="space-y-6">
            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle>Pré-visualização</CardTitle>
                  <CardDescription>
                    Como a mensagem aparecerá no WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-[#E5DDD5] p-4 rounded-lg">
                    <div className="bg-white rounded-lg p-3 shadow-sm max-w-sm">
                      {selectedTemplate.components
                        .find(c => c.type === "HEADER" && c.format === "TEXT")?.text && (
                        <div className="font-semibold text-sm mb-2">
                          {selectedTemplate.components.find(c => c.type === "HEADER")?.text}
                        </div>
                      )}
                      
                      <div className="text-sm whitespace-pre-wrap">
                        {getBodyPreview()}
                      </div>
                      
                      {selectedTemplate.components.find(c => c.type === "FOOTER")?.text && (
                        <div className="text-xs text-gray-500 mt-2">
                          {selectedTemplate.components.find(c => c.type === "FOOTER")?.text}
                        </div>
                      )}
                      
                      {selectedTemplate.components.find(c => c.type === "BUTTONS")?.buttons && (
                        <div className="mt-3 space-y-1">
                          {selectedTemplate.components
                            .find(c => c.type === "BUTTONS")
                            ?.buttons?.map((button, index) => (
                            <button
                              key={index}
                              className="w-full text-center py-2 text-sm text-brand-blue-600 border border-brand-blue-200 rounded hover:bg-brand-blue-50"
                            >
                              {button.text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    Resultado do Envio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`p-4 rounded-lg ${
                    result.success
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}>
                    <p className={`text-sm ${
                      result.success ? "text-green-800" : "text-red-800"
                    }`}>
                      {result.message}
                    </p>
                    {result.messageId && (
                      <p className="text-xs text-green-700 mt-2">
                        ID da Mensagem: {result.messageId}
                      </p>
                    )}
                  </div>

                  {result.success && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-erie-black-900">
                        ✅ Próximos passos:
                      </p>
                      <ul className="text-sm text-erie-black-600 space-y-1 list-disc list-inside">
                        <li>Verifique o WhatsApp do destinatário</li>
                        <li>Confirme que a mensagem foi recebida</li>
                        <li>Teste os botões (se houver)</li>
                        <li>Valide as variáveis substituídas</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
