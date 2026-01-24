import { ReactQueryProvider } from '@/app/providers'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>
}

