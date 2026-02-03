import { NextRequest, NextResponse } from 'next/server';
import { getOrRefreshToken } from '@/services/Request';

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

    // Map language codes: en -> en-US, de -> de-DE (or keep as is if Apaleo accepts en/de)
    const apaleoLanguageCode = languageCode === 'de' ? 'de-DE' : 'en-US';

    // Build query parameters
    const queryParams = new URLSearchParams({
      folioId,
      languageCode: apaleoLanguageCode,
      lineItemGrouping,
    });

    // Fetch PDF from Apaleo
    const token = await getOrRefreshToken();
    const response = await fetch(
      `https://api.apaleo.com/finance/v0-nsfw/invoices/preview-pdf?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Apaleo invoice API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Failed to fetch invoice: ${response.status}` },
        { status: response.status }
      );
    }

    // Get PDF blob
    const pdfBlob = await response.blob();

    // Return PDF with appropriate headers
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${folioId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error fetching invoice PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
