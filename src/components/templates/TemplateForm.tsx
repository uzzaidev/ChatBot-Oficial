"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, FileText, Image as ImageIcon, Video, File } from "lucide-react";
import type { TemplateComponent, TemplateCategory, TemplateButton } from "@/lib/types";

interface TemplateFormProps {
  initialData?: {
    name: string;
    category: TemplateCategory;
    language: string;
    waba_id: string;
    components: TemplateComponent[];
  };
  onSubmit: (data: {
    name: string;
    category: TemplateCategory;
    language: string;
    waba_id: string;
    components: TemplateComponent[];
  }) => Promise<void>;
  loading?: boolean;
}

export const TemplateForm = ({ initialData, onSubmit, loading = false }: TemplateFormProps) => {
  const [name, setName] = useState(initialData?.name || "");
  const [category, setCategory] = useState<TemplateCategory>(initialData?.category || "UTILITY");
  const [language, setLanguage] = useState(initialData?.language || "pt_BR");
  const [wabaId, setWabaId] = useState(initialData?.waba_id || "");
  
  // Components state
  const [hasHeader, setHasHeader] = useState(
    initialData?.components.some(c => c.type === "HEADER") || false
  );
  const [headerFormat, setHeaderFormat] = useState<"TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT">("TEXT");
  const [headerText, setHeaderText] = useState(
    initialData?.components.find(c => c.type === "HEADER")?.text || ""
  );
  
  const [bodyText, setBodyText] = useState(
    initialData?.components.find(c => c.type === "BODY")?.text || ""
  );
  const [bodyExample, setBodyExample] = useState("");
  
  const [hasFooter, setHasFooter] = useState(
    initialData?.components.some(c => c.type === "FOOTER") || false
  );
  const [footerText, setFooterText] = useState(
    initialData?.components.find(c => c.type === "FOOTER")?.text || ""
  );
  
  const [hasButtons, setHasButtons] = useState(
    initialData?.components.some(c => c.type === "BUTTONS") || false
  );
  const [buttons, setButtons] = useState<TemplateButton[]>(
    initialData?.components.find(c => c.type === "BUTTONS")?.buttons || []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate name (lowercase, underscores only)
    if (!name) {
      newErrors.name = "Nome é obrigatório";
    } else if (!/^[a-z0-9_]+$/.test(name)) {
      newErrors.name = "Nome deve conter apenas letras minúsculas, números e underscores";
    }

    // Validate WABA ID
    if (!wabaId) {
      newErrors.wabaId = "WhatsApp Business Account ID é obrigatório";
    }

    // Validate body text
    if (!bodyText) {
      newErrors.bodyText = "Texto do corpo é obrigatório";
    }

    // Validate header if present
    if (hasHeader && headerFormat === "TEXT" && !headerText) {
      newErrors.headerText = "Texto do cabeçalho é obrigatório";
    }

    // Validate footer if present
    if (hasFooter && !footerText) {
      newErrors.footerText = "Texto do rodapé é obrigatório";
    }

    // Validate buttons if present
    if (hasButtons && buttons.length === 0) {
      newErrors.buttons = "Adicione pelo menos um botão";
    }

    // Validate body example if has variables
    const variableCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;
    if (variableCount > 0) {
      const exampleValues = bodyExample.split(",").map(v => v.trim()).filter(v => v);
      if (exampleValues.length !== variableCount) {
        newErrors.bodyExample = `Forneça ${variableCount} valor(es) de exemplo separados por vírgula`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const components: TemplateComponent[] = [];

    // Add header if present
    if (hasHeader) {
      components.push({
        type: "HEADER",
        format: headerFormat,
        text: headerFormat === "TEXT" ? headerText : undefined,
      });
    }

    // Add body (required)
    const bodyComponent: TemplateComponent = {
      type: "BODY",
      text: bodyText,
    };

    // Add example if has variables
    const variableCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;
    if (variableCount > 0 && bodyExample) {
      const exampleValues = bodyExample.split(",").map(v => v.trim());
      bodyComponent.example = {
        body_text: [exampleValues],
      };
    }

    components.push(bodyComponent);

    // Add footer if present
    if (hasFooter && footerText) {
      components.push({
        type: "FOOTER",
        text: footerText,
      });
    }

    // Add buttons if present
    if (hasButtons && buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons,
      });
    }

    try {
      await onSubmit({
        name,
        category,
        language,
        waba_id: wabaId,
        components,
      });
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const addButton = () => {
    if (buttons.length >= 3) {
      setErrors({ ...errors, buttons: "Máximo de 3 botões permitidos" });
      return;
    }
    setButtons([...buttons, { type: "QUICK_REPLY", text: "" }]);
    // Clear error when adding button
    if (errors.buttons) {
      const newErrors = { ...errors };
      delete newErrors.buttons;
      setErrors(newErrors);
    }
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: keyof TemplateButton, value: string) => {
    const newButtons = [...buttons];
    const button = newButtons[index];
    
    // Type-safe field assignment
    if (field === "type") {
      button.type = value as TemplateButton["type"];
    } else if (field === "text") {
      button.text = value;
    } else if (field === "url") {
      button.url = value;
    } else if (field === "phone_number") {
      button.phone_number = value;
    }
    
    setButtons(newButtons);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>
            Configure as informações básicas do template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Template *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="exemplo_template_nome"
              disabled={loading || !!initialData}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
            <p className="text-xs text-erie-black-500 mt-1">
              Apenas letras minúsculas, números e underscores
            </p>
          </div>

          <div>
            <Label htmlFor="category">Categoria *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTILITY">Utilidade</SelectItem>
                <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-erie-black-500 mt-1">
              {category === "UTILITY" && "Para atualizações, confirmações e notificações"}
              {category === "AUTHENTICATION" && "Para códigos OTP e verificação"}
              {category === "MARKETING" && "Para promoções (requer opt-in do usuário)"}
            </p>
          </div>

          <div>
            <Label htmlFor="language">Idioma *</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                <SelectItem value="en_US">Inglês (EUA)</SelectItem>
                <SelectItem value="es_ES">Espanhol (Espanha)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="wabaId">WhatsApp Business Account ID *</Label>
            <Input
              id="wabaId"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="123456789012345"
            />
            {errors.wabaId && (
              <p className="text-sm text-red-600 mt-1">{errors.wabaId}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Header Component */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cabeçalho (Opcional)</CardTitle>
              <CardDescription>Adicione um título ou mídia ao template</CardDescription>
            </div>
            <Button
              type="button"
              variant={hasHeader ? "destructive" : "outline"}
              size="sm"
              onClick={() => setHasHeader(!hasHeader)}
            >
              {hasHeader ? "Remover" : "Adicionar"}
            </Button>
          </div>
        </CardHeader>
        {hasHeader && (
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="headerFormat">Formato</Label>
              <Select value={headerFormat} onValueChange={(v: any) => setHeaderFormat(v)}>
                <SelectTrigger id="headerFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Texto
                    </div>
                  </SelectItem>
                  <SelectItem value="IMAGE">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Imagem
                    </div>
                  </SelectItem>
                  <SelectItem value="VIDEO">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Vídeo
                    </div>
                  </SelectItem>
                  <SelectItem value="DOCUMENT">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Documento
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {headerFormat === "TEXT" && (
              <div>
                <Label htmlFor="headerText">Texto do Cabeçalho</Label>
                <Input
                  id="headerText"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Título do Template"
                  maxLength={60}
                />
                {errors.headerText && (
                  <p className="text-sm text-red-600 mt-1">{errors.headerText}</p>
                )}
                <p className="text-xs text-erie-black-500 mt-1">
                  Máximo 60 caracteres
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Body Component */}
      <Card>
        <CardHeader>
          <CardTitle>Corpo da Mensagem *</CardTitle>
          <CardDescription>
            O conteúdo principal do template. Use {`{{1}}`}, {`{{2}}`}, etc. para variáveis dinâmicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bodyText">Texto do Corpo</Label>
            <Textarea
              id="bodyText"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Olá {{1}}, seu pedido #{{2}} foi confirmado!"
              rows={4}
              maxLength={1024}
            />
            {errors.bodyText && (
              <p className="text-sm text-red-600 mt-1">{errors.bodyText}</p>
            )}
            <p className="text-xs text-erie-black-500 mt-1">
              Máximo 1024 caracteres. Use {`{{1}}`}, {`{{2}}`}, etc. para variáveis.
            </p>
          </div>

          {(bodyText.match(/\{\{\d+\}\}/g) || []).length > 0 && (
            <div>
              <Label htmlFor="bodyExample">Exemplos de Variáveis *</Label>
              <Input
                id="bodyExample"
                value={bodyExample}
                onChange={(e) => setBodyExample(e.target.value)}
                placeholder="João, 12345, R$ 150,00"
              />
              {errors.bodyExample && (
                <p className="text-sm text-red-600 mt-1">{errors.bodyExample}</p>
              )}
              <p className="text-xs text-erie-black-500 mt-1">
                Forneça valores de exemplo separados por vírgula (um para cada variável)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Component */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rodapé (Opcional)</CardTitle>
              <CardDescription>Adicione um texto curto no final do template</CardDescription>
            </div>
            <Button
              type="button"
              variant={hasFooter ? "destructive" : "outline"}
              size="sm"
              onClick={() => setHasFooter(!hasFooter)}
            >
              {hasFooter ? "Remover" : "Adicionar"}
            </Button>
          </div>
        </CardHeader>
        {hasFooter && (
          <CardContent>
            <Label htmlFor="footerText">Texto do Rodapé</Label>
            <Input
              id="footerText"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Obrigado pela preferência!"
              maxLength={60}
            />
            {errors.footerText && (
              <p className="text-sm text-red-600 mt-1">{errors.footerText}</p>
            )}
            <p className="text-xs text-erie-black-500 mt-1">
              Máximo 60 caracteres
            </p>
          </CardContent>
        )}
      </Card>

      {/* Buttons Component */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Botões (Opcional)</CardTitle>
              <CardDescription>Adicione até 3 botões de ação</CardDescription>
            </div>
            <Button
              type="button"
              variant={hasButtons ? "destructive" : "outline"}
              size="sm"
              onClick={() => {
                setHasButtons(!hasButtons);
                if (hasButtons) setButtons([]);
              }}
            >
              {hasButtons ? "Remover" : "Adicionar"}
            </Button>
          </div>
        </CardHeader>
        {hasButtons && (
          <CardContent className="space-y-4">
            {buttons.map((button, index) => (
              <div key={index} className="flex gap-2 items-start p-4 border rounded-lg">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Tipo de Botão</Label>
                    <Select
                      value={button.type}
                      onValueChange={(v) => updateButton(index, "type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUICK_REPLY">Resposta Rápida</SelectItem>
                        <SelectItem value="URL">Link (URL)</SelectItem>
                        <SelectItem value="PHONE_NUMBER">Telefone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Texto do Botão</Label>
                    <Input
                      value={button.text}
                      onChange={(e) => updateButton(index, "text", e.target.value)}
                      placeholder="Clique aqui"
                      maxLength={20}
                    />
                  </div>

                  {button.type === "URL" && (
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={button.url || ""}
                        onChange={(e) => updateButton(index, "url", e.target.value)}
                        placeholder="https://example.com/{{1}}"
                      />
                      <p className="text-xs text-erie-black-500 mt-1">
                        Pode incluir uma variável: {`{{1}}`}
                      </p>
                    </div>
                  )}

                  {button.type === "PHONE_NUMBER" && (
                    <div>
                      <Label>Número de Telefone</Label>
                      <Input
                        value={button.phone_number || ""}
                        onChange={(e) => updateButton(index, "phone_number", e.target.value)}
                        placeholder="+5511999999999"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeButton(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {buttons.length < 3 && (
              <Button
                type="button"
                variant="outline"
                onClick={addButton}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Botão
              </Button>
            )}

            {errors.buttons && (
              <p className="text-sm text-red-600">{errors.buttons}</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : initialData ? "Atualizar Template" : "Criar Template"}
        </Button>
      </div>
    </form>
  );
};
