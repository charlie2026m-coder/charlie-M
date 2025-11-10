import { NextResponse } from 'next/server';
import { beds24Request } from '../auth';

export async function GET() {
  try {
    const data = await beds24Request('/properties', 'GET');
    console.log(data, 'properties') 
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(error, { status: 500 });
  }
}