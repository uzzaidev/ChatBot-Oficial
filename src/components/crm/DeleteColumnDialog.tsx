"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  columnName: string;
  cardCount?: number;
}

export const DeleteColumnDialog = ({
  open,
  onOpenChange,
  onConfirm,
  columnName,
  cardCount = 0,
}: DeleteColumnDialogProps) => {
  const handleConfirm = async () => {
    console.log('[DeleteColumnDialog] Confirming delete for:', columnName);
    await onConfirm();
    onOpenChange(false);
  };

  console.log('[DeleteColumnDialog] Render - open:', open, 'column:', columnName, 'cards:', cardCount);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            {cardCount > 0 ? (
              <>
                A coluna <strong>&quot;{columnName}&quot;</strong> contém{" "}
                <strong>{cardCount}</strong>{" "}
                {cardCount === 1 ? "card" : "cards"}.
                <br />
                <br />
                Você precisa mover ou excluir todos os cards antes de deletar
                esta coluna.
              </>
            ) : (
              <>
                Você está prestes a deletar a coluna{" "}
                <strong>&quot;{columnName}&quot;</strong>. Esta ação não pode
                ser desfeita.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {cardCount === 0 && (
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar coluna
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
