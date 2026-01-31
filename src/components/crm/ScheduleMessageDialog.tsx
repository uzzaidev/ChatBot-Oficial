"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { useState } from "react";

interface ScheduleMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (data: {
    content: string;
    scheduled_for: string;
  }) => Promise<boolean>;
  phone: string | number;
  contactName?: string;
}

export const ScheduleMessageDialog = ({
  open,
  onClose,
  onSchedule,
  phone,
  contactName,
}: ScheduleMessageDialogProps) => {
  const [content, setContent] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Digite uma mensagem");
      return;
    }
    if (!date) {
      setError("Selecione uma data");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Combine date with time
      const scheduledDate = setMinutes(
        setHours(date, parseInt(hour)),
        parseInt(minute),
      );

      // Check if date is in the future
      if (scheduledDate <= new Date()) {
        setError("A data deve ser no futuro");
        setSubmitting(false);
        return;
      }

      const success = await onSchedule({
        content: content.trim(),
        scheduled_for: scheduledDate.toISOString(),
      });

      if (success) {
        // Reset form
        setContent("");
        setDate(undefined);
        setHour("09");
        setMinute("00");
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Erro ao agendar mensagem");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setContent("");
      setDate(undefined);
      setHour("09");
      setMinute("00");
      setError(null);
      onClose();
    }
  };

  // Generate hour options (00-23)
  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );

  // Generate minute options (00, 15, 30, 45)
  const minutes = ["00", "15", "30", "45"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agendar Mensagem</DialogTitle>
          <DialogDescription>
            Agendar mensagem para{" "}
            <span className="font-medium">{contactName || String(phone)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Message content */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite a mensagem..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              disabled={submitting}
            />
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                  disabled={submitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    format(date, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <Label>Horário</Label>
            <div className="flex gap-2">
              <Select
                value={hour}
                onValueChange={setHour}
                disabled={submitting}
              >
                <SelectTrigger className="w-[100px]">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center">:</span>
              <Select
                value={minute}
                onValueChange={setMinute}
                disabled={submitting}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error message */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Preview */}
          {date && content && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <p className="text-muted-foreground mb-1">Prévia:</p>
              <p className="font-medium">
                {format(
                  setMinutes(setHours(date, parseInt(hour)), parseInt(minute)),
                  "PPPp",
                  { locale: ptBR },
                )}
              </p>
              <p className="text-muted-foreground mt-1 line-clamp-2">
                {content}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
