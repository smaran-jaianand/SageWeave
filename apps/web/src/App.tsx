import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { OverviewPage }  from '@/pages/OverviewPage'
import { ExplorerPage } from '@/pages/ExplorerPage'
import { GraphPage }    from '@/pages/GraphPage'
import { AnalysesPage } from '@/pages/AnalysesPage'
import { HistoryPage }  from '@/pages/HistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<OverviewPage />} />
        <Route path="/explorer"  element={<ExplorerPage />} />
        <Route path="/graph"     element={<GraphPage />} />
        <Route path="/analyses"  element={<AnalysesPage />} />
        <Route path="/history"   element={<HistoryPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
        {/* Fallback stubs */}
        <Route path="/docs"  element={<Navigate to="/" replace />} />
        <Route path="/help"  element={<Navigate to="/" replace />} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
