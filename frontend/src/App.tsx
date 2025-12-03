import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import AnalysesPage from './pages/AnalysesPage'
import DetailPage from './pages/DetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<AnalysesPage />} />
        <Route path="detail/:serial" element={<DetailPage />} />
      </Route>
    </Routes>
  )
}

export default App