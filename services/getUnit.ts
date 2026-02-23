import { Fetch } from './Request';

export interface UnitProperty {
  id: string;
  code: string;
  name: string;
}

export interface UnitGroup {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface ConnectedUnit {
  id: string;
  code: string;
  name: string;
}

export interface UnitAttribute {
  id: string;
  name: string;
  description: string;
}

export interface Unit {
  id: string;
  attributes: UnitAttribute[];
}

type GetUnitResult = Unit | { error: string };

export async function getUnit(unitId: string): Promise<GetUnitResult> {
  if (!unitId) {
    console.error('Unit ID is required');
    return { error: 'Unit ID is required' };
  }

  try {
    const unit = await Fetch<Unit>(`/inventory/v1/units/${unitId}`);
    if (!unit) return { error: 'Unit not found' };
    return { id: unit.id, attributes: unit.attributes } as Unit;
  } catch (error: any) {
    console.error('Get Unit error:', error);
    if (error.message?.includes('404') || error.message?.includes('not found')) return { error: 'Unit not found' };
    return { error: error.message || 'Failed to fetch unit. Please try again later.' };
  }
}