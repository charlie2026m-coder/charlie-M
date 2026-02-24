import { getUnit } from '@/services/getUnit';
import { NextRequest, NextResponse } from 'next/server';

interface UnitAttribute {
  id: string;
  name: string;
  description: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;


    const unit = await getUnit(id);

    if ('error' in unit) {
      return NextResponse.json({ error: unit.error }, { status: unit.error.includes('not found') ? 404 : 500 });
    }

    const floorAttribute = unit.attributes?.find(
      (attr: UnitAttribute) => attr.description === 'Floor number');

    let floor: string | null = null;
    if (floorAttribute) {
      const match = floorAttribute.name.match(/([-]?\d+)/);
      if (match) {
        floor = match[1];
      } else {
        floor = floorAttribute.name;
      }
    }

    return NextResponse.json({ floor });
  } catch (error: any) {
    console.error('Error fetching unit:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch unit' },
      { status: 500 }
    );
  }
}
