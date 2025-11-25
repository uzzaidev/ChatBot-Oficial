# Notification Sound

Para adicionar o som de notificação, você precisa de um arquivo MP3.

## Opções:

### 1. Gerar Som Programaticamente (Não recomendado - qualidade ruim)
O navegador pode gerar um beep, mas não tem boa qualidade.

### 2. Baixar Som Gratuito (RECOMENDADO)
Baixe um som de notificação gratuito de:
- https://notificationsounds.com/
- https://mixkit.co/free-sound-effects/notification/
- https://freesound.org/

**Sugestões de sons:**
- "Pristine" - Som suave e profissional
- "Pop" - Som curto tipo WhatsApp
- "Ding" - Som clássico

### 3. Usar som do WhatsApp Web
Grave o som do WhatsApp Web usando uma ferramenta de captura de áudio.

## Instalação:

1. Baixe um arquivo MP3 de notificação
2. Renomeie para `notification.mp3`
3. Coloque em `/public/notification.mp3`

## Alternativa: Usar Data URI

Se não quiser arquivo separado, pode usar um beep gerado:

```typescript
// Em useNotifications.ts, trocar soundUrl por:
const soundUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGJ0fPTgjMGHm7A7+OZSA0PWajk7qdbGAg+mtfqvWkfBSl+zPLaizsIGGS56+ihUBELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHwU0jdT01H8rBSl8zPDajz0JFl236+ymUhELTKXh8bllHgU2kNXzzn0pBSd6yfDcjzoJFVu16+ujThALSqPf87toHw=='
```
