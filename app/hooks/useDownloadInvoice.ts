import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface DownloadInvoiceParams {
  folioId: string;
  languageCode?: 'en' | 'de';
  lineItemGrouping?: 'NoGrouping' | 'ByCharge' | 'ByRatePlanDetailed' | 'ByRatePlanSimplified';
  filename?: string;
}

async function downloadInvoice({
  folioId,
  languageCode = 'en',
  lineItemGrouping = 'NoGrouping',
  filename,
}: DownloadInvoiceParams): Promise<void> {
  const queryParams = new URLSearchParams({
    folioId,
    languageCode,
    lineItemGrouping,
  });

  const response = await fetch(`/api/invoice?${queryParams.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to download invoice');
  }

  const blob = await response.blob();
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `invoice-${folioId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function useDownloadInvoice() {
  const t = useTranslations('profile');

  return useMutation({
    mutationFn: downloadInvoice,
    onSuccess: () => {
      toast.success(t('invoiceDownloaded') || 'Invoice downloaded successfully');
    },
    onError: (error: Error) => {
      console.error('Error downloading invoice:', error);
      toast.error(t('invoiceDownloadFailed') || 'Failed to download invoice');
    },
  });
}
