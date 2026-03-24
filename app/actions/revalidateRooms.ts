'use server';
import { revalidateTag } from 'next/cache';

export async function revalidateRooms() {
  revalidateTag('rooms');
}
