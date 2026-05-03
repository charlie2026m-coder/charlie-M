'use client';
import { useMutation } from '@tanstack/react-query';
import type { FolioDebitor } from '@/types/apaleo';

export function useUpdateDebitor() {
  return useMutation({
    mutationFn: async ({ folioId, debitor }: { folioId: string; debitor: FolioDebitor }) => {
      const response = await fetch('/api/invoice/folio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folioId, debitor }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to update billing data');
      }
    },
  });
}

export function useCreateInvoice() {
  return useMutation({
    mutationFn: async ({
      folioId,
      languageCode,
      debitor,
    }: {
      folioId: string;
      languageCode: string;
      debitor?: FolioDebitor;
    }): Promise<{ invoiceId: string; languageCode: string; alreadyLocked?: boolean }> => {
      const response = await fetch('/api/invoice/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folioId, languageCode, debitor }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to create invoice');
      }
      return response.json();
    },
  });
}

export function useDownloadInvoicePdf() {
  return useMutation({
    mutationFn: async ({
      invoiceId,
      filename,
    }: {
      invoiceId: string;
      filename?: string;
    }) => {
      const response = await fetch(
        `/api/invoice?invoiceId=${encodeURIComponent(invoiceId)}`
      );

      if (response.status === 202) {
        throw new Error('invoiceNotReady');
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });
}
