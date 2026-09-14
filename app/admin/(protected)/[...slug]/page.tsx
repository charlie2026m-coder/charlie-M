import { redirect } from 'next/navigation'

// Anything under /admin that is not a screen goes home rather than 404-ing:
// old bookmarks point at /admin/rooms and at pages that no longer exist.
export default function AdminCatchAll() {
  redirect('/admin')
}
