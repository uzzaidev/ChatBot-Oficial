import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { MessageTemplate, TemplateStatus } from "@/lib/types";

interface UseTemplatesOptions {
  status?: TemplateStatus;
  autoFetch?: boolean;
}

interface UseTemplatesResult {
  templates: MessageTemplate[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  submitTemplate: (templateId: string) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  syncTemplates: () => Promise<void>;
}

export const useTemplates = ({
  status,
  autoFetch = true,
}: UseTemplatesOptions = {}): UseTemplatesResult => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (status) {
        params.append("status", status);
      }

      const queryString = params.toString();
      const url = `/api/templates${queryString ? `?${queryString}` : ""}`;

      const response = await apiFetch<{
        templates: MessageTemplate[];
        count: number;
      }>(url);

      setTemplates(response.templates);
      setTotal(response.count);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch templates";
      setError(errorMessage);
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  }, [status]);

  const submitTemplate = useCallback(
    async (templateId: string) => {
      try {
        setError(null);

        const response = await apiFetch<{
          message: string;
          template: MessageTemplate;
        }>(`/api/templates/${templateId}/submit`, {
          method: "POST",
        });

        // Update the template in the list
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === templateId ? response.template : t
          )
        );

        return Promise.resolve();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to submit template";
        setError(errorMessage);
        console.error("Error submitting template:", err);
        return Promise.reject(err);
      }
    },
    []
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        setError(null);

        await apiFetch(`/api/templates/${templateId}`, {
          method: "DELETE",
        });

        // Remove the template from the list
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        setTotal((prev) => prev - 1);

        return Promise.resolve();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete template";
        setError(errorMessage);
        console.error("Error deleting template:", err);
        return Promise.reject(err);
      }
    },
    []
  );

  const syncTemplates = useCallback(async () => {
    try {
      setError(null);

      await apiFetch<{
        message: string;
        synced: number;
        templates: Array<{
          id: string;
          name: string;
          old_status: string;
          new_status: string;
        }>;
      }>("/api/templates/sync", {
        method: "POST",
      });

      // Refetch templates to get updated statuses
      await fetchTemplates();

      return Promise.resolve();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sync templates";
      setError(errorMessage);
      console.error("Error syncing templates:", err);
      return Promise.reject(err);
    }
  }, [fetchTemplates]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchTemplates();
    }
  }, [autoFetch, fetchTemplates]);

  return {
    templates,
    loading,
    error,
    total,
    refetch: fetchTemplates,
    submitTemplate,
    deleteTemplate,
    syncTemplates,
  };
};
