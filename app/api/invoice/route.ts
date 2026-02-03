import { NextRequest, NextResponse } from 'next/server';
import { getOrRefreshToken } from '@/services/Request';

const APALEO_API_URL = 'https://api.apaleo.com';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const folioId = searchParams.get('folioId');
    const languageCode = searchParams.get('languageCode') || 'en';
    const lineItemGrouping = searchParams.get('lineItemGrouping') || 'NoGrouping';

    if (!folioId) {
      return NextResponse.json(
        { error: 'folioId is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching invoice PDF:', {
      folioId,
      languageCode,
      lineItemGrouping
    });

    const queryParams = new URLSearchParams({
      folioId,
      languageCode,
      lineItemGrouping,
    });

    const url = `${APALEO_API_URL}/finance/v0-nsfw/invoices/preview-pdf?${queryParams.toString()}`;
    console.log('📡 Request URL:', url);

    const token = await getOrRefreshToken();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf',
      },
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorDetails;
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType?.includes('application/json')) {
          errorDetails = await response.json();
        } else {
          errorDetails = await response.text();
        }
      } catch (e) {
        errorDetails = 'Unable to parse error response';
      }

      console.error('❌ Apaleo invoice API error:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        errorDetails,
        url
      });

      return NextResponse.json(
        { error: `Failed to fetch invoice: ${response.status}`, details: errorDetails },
        { status: response.status }
      );
    }

    const pdfBlob = await response.blob();
    console.log('✅ Invoice PDF fetched successfully:', {
      size: pdfBlob.size,
      type: pdfBlob.type
    });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${folioId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('❌ Error in invoice download API:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
