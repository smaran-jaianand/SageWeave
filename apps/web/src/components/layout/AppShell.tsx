import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface AppShellProps {
  children: React.ReactNode
  topbarTitle?: string
  topbarBreadcrumb?: string[]
}

export function AppShell({ children, topbarTitle, topbarBreadcrumb }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar title={topbarTitle} breadcrumb={topbarBreadcrumb} />

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
