export default function HealthCalendarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      {children}
    </div>
  )
}
