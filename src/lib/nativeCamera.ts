"use client";

/**
 * Native Camera - wrapper fino sobre @capacitor/camera
 *
 * Por que isto existe: no iOS, um <input type="file" accept="image/*"> puro
 * deixa a WKWebView injetar seu próprio action sheet nativo ("Take Photo" /
 * "Photo Library"), sem controle do app sobre qualidade/resolução da foto.
 * Fotos de câmeras modernas (12MP+) podem estourar o limite de memória do
 * processo da WebView e derrubar o app (rejeição Apple Guideline 2.1(a),
 * reproduzido em: Base de Conhecimento → Selecionar arquivo → Take Photo).
 *
 * O plugin nativo evita isso: a captura roda fora da WebView, com controle
 * explícito de qualidade/dimensão antes do resultado voltar para o JS.
 */

import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export const pickImageNative = async (): Promise<File | null> => {
  const photo = await Camera.getPhoto({
    quality: 70,
    width: 1600,
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt,
    promptLabelHeader: "Adicionar foto",
    promptLabelPhoto: "Escolher da galeria",
    promptLabelPicture: "Tirar foto",
  });

  if (!photo.webPath) {
    return null;
  }

  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const extension = photo.format || "jpeg";
  const fileName = `foto-${Date.now()}.${extension}`;

  return new File([blob], fileName, {
    type: blob.type || `image/${extension}`,
  });
};
