import InformationSection from '@/app/[locale]/(protected)/profile/reservations/[id]/components/InformationSection'

// Standalone in-room information page (public — meant for a QR code in the
// room). The content is generic to every studio, so no reservation context and
// no auth are needed; it reuses the same InformationSection the cabinet shows.
// Header and footer come from the [locale] layout, so this page renders only
// the section (no extra <main> — the layout already provides one).
export default function InformationPage() {
  return (
    <div className="max-w-[1200px] mx-auto w-full px-4 md:px-8 py-10 md:py-16">
      <InformationSection />
    </div>
  )
}
