import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ApiKeyProvider } from './context/ApiKeyContext.jsx'
import { MyListProvider } from './context/MyListContext.jsx'
import { HistoryProvider } from './context/HistoryContext.jsx'
import { RatingsProvider } from './context/RatingsContext.jsx'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { ProviderProvider } from './context/ProviderContext.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import Navbar from './components/Navbar.jsx'
import MobileDock from './components/MobileDock.jsx'
import Footer from './components/Footer.jsx'
import VideoModal from './components/VideoModal.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import HomePage from './pages/HomePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import MyListPage from './pages/MyListPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import GenrePage from './pages/GenrePage.jsx'
import MoviesPage from './pages/MoviesPage.jsx'
import AnimePage from './pages/AnimePage.jsx'
import CoveragePage from './pages/CoveragePage.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
import SeriesPage from './pages/SeriesPage.jsx'
import WatchPage from './pages/WatchPage.jsx'
import AudioLabPage from './pages/AudioLabPage.jsx'
import LiveTVPage from './pages/LiveTVPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import WatchPartyPage from './pages/WatchPartyPage.jsx'
import WatchPartyRoom from './pages/WatchPartyRoom.jsx'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ApiKeyProvider>
        <PreferencesProvider>
        <MyListProvider>
          <HistoryProvider>
          <RatingsProvider>
          <ProviderProvider>
          <PlayerProvider>
            <ScrollToTop />
            <div className="flex min-h-screen flex-col bg-ink">
              <Navbar />
              <MobileDock />
              <main id="main-content" tabIndex={-1} className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/movies" element={<MoviesPage />} />
                  <Route path="/anime" element={<AnimePage />} />
                  <Route path="/tv" element={<LiveTVPage />} />
                  <Route path="/cobertura" element={<CoveragePage />} />
                  <Route path="/inventario" element={<InventoryPage />} />
                  <Route path="/series" element={<SeriesPage />} />
                  <Route path="/watch/:type/:id" element={<WatchPage />} />
                  <Route path="/laboratorio-audio" element={<AudioLabPage />} />
                  <Route path="/party" element={<WatchPartyPage />} />
                  <Route path="/party/:code" element={<WatchPartyRoom />} />
                  <Route path="/mylist" element={<MyListPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/genre/:id" element={<GenrePage />} />
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </main>
              <Footer />
              <VideoModal />
            </div>
          </PlayerProvider>
          </ProviderProvider>
          </RatingsProvider>
          </HistoryProvider>
        </MyListProvider>
        </PreferencesProvider>
      </ApiKeyProvider>
    </BrowserRouter>
  )
}
