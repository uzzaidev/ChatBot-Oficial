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
  search?: string;
  limit?: number;
}

interface UseContactsResult {
  contacts: Contact[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  addContact: (phone: string, name?: string, status?: ConversationStatus) => Promise<Contact | null>;
  updateContact: (phone: string, updates: { name?: string; status?: ConversationStatus }) => Promise<Contact | null>;
  deleteContact: (phone: string) => Promise<boolean>;
  importContacts: (
    contacts: Array<{ phone: string; name?: string; status?: string }>,
    options?: { addToCrm?: boolean; columnId?: string }
  ) => Promise<ContactImportResult | null>;
}

export const useContacts = ({
  clientId,
  status,
  search,
  limit = 50,
}: UseContactsOptions): UseContactsResult => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchContacts = useCallback(async (options?: { append?: boolean; offset?: number }) => {
    const append = options?.append ?? false;
    const currentOffset = options?.offset ?? 0;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
      });

      if (status) {
        params.append("status", status);
      }

      const normalizedSearch = search?.trim();
      if (normalizedSearch) {
        params.append("search", normalizedSearch);
      }

      const response = await apiFetch(`/api/contacts?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao buscar contatos");
      }

      const data = await response.json();
      const nextContacts: Contact[] = data.contacts || [];

      if (append) {
        setContacts((previous) => {
          const existingPhones = new Set(previous.map((contact) => contact.phone));
          const onlyNew = nextContacts.filter((contact) => !existingPhones.has(contact.phone));
          return [...previous, ...onlyNew];
        });
      } else {
        setContacts(nextContacts);
      }

      setTotal(data.total || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [status, search, limit]);

  const refetch = useCallback(async () => {
    await fetchContacts({ append: false, offset: 0 });
  }, [fetchContacts]);

  const hasMore = contacts.length < total;

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    await fetchContacts({ append: true, offset: contacts.length });
  }, [loading, loadingMore, hasMore, fetchContacts, contacts.length]);

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
        await refetch();
        return data.contact;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        return null;
      }
    },
    [refetch]
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
        await refetch();
        return data.contact;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        return null;
      }
    },
    [refetch]
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

        await refetch();
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        return false;
      }
    },
    [refetch]
  );

  const importContacts = useCallback(
    async (
      contactsList: Array<{ phone: string; name?: string; status?: string }>,
      options?: { addToCrm?: boolean; columnId?: string }
    ): Promise<ContactImportResult | null> => {
      try {
        const response = await apiFetch("/api/contacts/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contacts: contactsList,
            addToCrm: options?.addToCrm,
            columnId: options?.columnId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao importar contatos");
        }

        const data = await response.json();
        await refetch();
        return data.result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        return null;
      }
    },
    [refetch]
  );

  useEffect(() => {
    void refetch();
  }, [refetch, clientId]);

  return {
    contacts,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    refetch,
    loadMore,
    addContact,
    updateContact,
    deleteContact,
    importContacts,
  };
};
