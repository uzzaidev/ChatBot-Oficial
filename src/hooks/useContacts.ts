import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ConversationStatus, ContactImportResult } from "@/lib/types";

export interface Contact {
  id: string;
  phone: string;
  name: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

interface UseContactsOptions {
  clientId: string;
  status?: ConversationStatus;
  limit?: number;
  offset?: number;
}

interface UseContactsResult {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  addContact: (phone: string, name?: string, status?: ConversationStatus) => Promise<Contact | null>;
  updateContact: (phone: string, updates: { name?: string; status?: ConversationStatus }) => Promise<Contact | null>;
  deleteContact: (phone: string) => Promise<boolean>;
  importContacts: (contacts: Array<{ phone: string; name?: string; status?: string }>) => Promise<ContactImportResult | null>;
}

export const useContacts = ({
  clientId,
  status,
  limit = 50,
  offset = 0,
}: UseContactsOptions): UseContactsResult => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) {
        params.append("status", status);
      }

      const response = await apiFetch(`/api/contacts?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao buscar contatos");
      }

      const data = await response.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [status, limit, offset]);

  const addContact = useCallback(
    async (phone: string, name?: string, contactStatus: ConversationStatus = "bot"): Promise<Contact | null> => {
      try {
        const response = await apiFetch("/api/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone, name, status: contactStatus }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao adicionar contato");
        }

        const data = await response.json();
        await fetchContacts(); // Refresh the list
        return data.contact;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        return null;
      }
    },
    [fetchContacts]
  );

  const updateContact = useCallback(
    async (phone: string, updates: { name?: string; status?: ConversationStatus }): Promise<Contact | null> => {
      try {
        const response = await apiFetch(`/api/contacts/${phone}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao atualizar contato");
        }

        const data = await response.json();
        await fetchContacts(); // Refresh the list
        return data.contact;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        return null;
      }
    },
    [fetchContacts]
  );

  const deleteContact = useCallback(
    async (phone: string): Promise<boolean> => {
      try {
        const response = await apiFetch(`/api/contacts/${phone}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao remover contato");
        }

        await fetchContacts(); // Refresh the list
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        return false;
      }
    },
    [fetchContacts]
  );

  const importContacts = useCallback(
    async (contactsList: Array<{ phone: string; name?: string; status?: string }>): Promise<ContactImportResult | null> => {
      try {
        const response = await apiFetch("/api/contacts/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contacts: contactsList }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao importar contatos");
        }

        const data = await response.json();
        await fetchContacts(); // Refresh the list
        return data.result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        return null;
      }
    },
    [fetchContacts]
  );

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    total,
    refetch: fetchContacts,
    addContact,
    updateContact,
    deleteContact,
    importContacts,
  };
};
