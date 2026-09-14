import { DoorScanner } from '@/app/_components/breakfast/DoorScanner'

/** The same door scanner the admin has, reached from the kitchen's own screen. */
export default function KitchenScanPage() {
  return <DoorScanner backHref='/kitchen' backLabel='Frühstück' />
}
