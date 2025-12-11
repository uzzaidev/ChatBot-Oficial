"use client";

import { MessageTemplate, TemplateComponent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Image, Video, FileIcon } from "lucide-react";

interface TemplatePreviewProps {
  template: MessageTemplate;
  parameters?: string[]; // For previewing with actual values
}

const renderComponent = (component: TemplateComponent, parameters?: string[]) => {
  let text = component.text || "";

  // Replace variables {{1}}, {{2}}, etc with actual parameters if provided
  if (parameters && parameters.length > 0) {
    parameters.forEach((param, index) => {
      const placeholder = `{{${index + 1}}}`;
      text = text.replace(new RegExp(placeholder, "g"), param);
    });
  }

  switch (component.type) {
    case "HEADER":
      return (
        <div className="mb-3">
          {component.format === "TEXT" && (
            <div className="font-bold text-base text-erie-black-900">
              {text}
            </div>
          )}
          {component.format === "IMAGE" && (
            <div className="flex items-center gap-2 text-sm text-erie-black-700">
              <Image className="h-4 w-4" />
              <span>Imagem do cabeçalho</span>
            </div>
          )}
          {component.format === "VIDEO" && (
            <div className="flex items-center gap-2 text-sm text-erie-black-700">
              <Video className="h-4 w-4" />
              <span>Vídeo do cabeçalho</span>
            </div>
          )}
          {component.format === "DOCUMENT" && (
            <div className="flex items-center gap-2 text-sm text-erie-black-700">
              <FileIcon className="h-4 w-4" />
              <span>Documento do cabeçalho</span>
            </div>
          )}
        </div>
      );

    case "BODY":
      return (
        <div className="mb-3 text-sm text-erie-black-800 whitespace-pre-wrap">
          {text}
        </div>
      );

    case "FOOTER":
      return (
        <div className="text-xs text-erie-black-500 italic border-t border-silver-200 pt-2">
          {text}
        </div>
      );

    case "BUTTONS":
      return (
        <div className="space-y-2 mt-3">
          {component.buttons?.map((button, index) => (
            <div
              key={index}
              className="flex items-center justify-center py-2 px-4 bg-brand-blue-50 text-brand-blue-600 rounded-md text-sm font-medium border border-brand-blue-200 hover:bg-brand-blue-100 transition-colors"
            >
              {button.type === "URL" && "🔗 "}
              {button.type === "PHONE_NUMBER" && "📞 "}
              {button.text}
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
};

export const TemplatePreview = ({ template, parameters }: TemplatePreviewProps) => {
  return (
    <Card className="max-w-md">
      <CardHeader className="bg-mint-50 border-b border-silver-200">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5 text-mint-600" />
          <span>Preview da Mensagem</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* WhatsApp-like message bubble */}
        <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-100">
          {template.components.map((component, index) => (
            <div key={index}>{renderComponent(component, parameters)}</div>
          ))}

          {/* Template info */}
          <div className="mt-4 pt-3 border-t border-green-200 text-xs text-erie-black-500">
            <div className="flex justify-between">
              <span>Template: {template.name}</span>
              <span>{template.language}</span>
            </div>
          </div>
        </div>

        {/* Variable placeholders hint */}
        {!parameters && template.components.some(c => c.text?.includes("{{")) && (
          <div className="mt-3 text-xs text-erie-black-600 bg-yellow-50 p-2 rounded border border-yellow-200">
            💡 Este template contém variáveis que serão substituídas no momento do envio.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
