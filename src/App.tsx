import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import GruenderprofilPage from '@/pages/GruenderprofilPage';
import PhasenPage from '@/pages/PhasenPage';
import MeilensteinePage from '@/pages/MeilensteinePage';
import AufgabenPage from '@/pages/AufgabenPage';
import VorlagenToolsPage from '@/pages/VorlagenToolsPage';
import ReviewPunktePage from '@/pages/ReviewPunktePage';
import RoadmapCockpitPage from '@/pages/RoadmapCockpitPage';
import PhasenSetupPage from '@/pages/intents/PhasenSetupPage';
import PhasenAbschlussPage from '@/pages/intents/PhasenAbschlussPage';

export default function App() {
  return (
    <HashRouter>
      <ActionsProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="gruenderprofil" element={<GruenderprofilPage />} />
            <Route path="phasen" element={<PhasenPage />} />
            <Route path="meilensteine" element={<MeilensteinePage />} />
            <Route path="aufgaben" element={<AufgabenPage />} />
            <Route path="vorlagen-&-tools" element={<VorlagenToolsPage />} />
            <Route path="review-punkte" element={<ReviewPunktePage />} />
            <Route path="roadmap-cockpit" element={<RoadmapCockpitPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="intents/phasen-setup" element={<PhasenSetupPage />} />
            <Route path="intents/phasen-abschluss" element={<PhasenAbschlussPage />} />
          </Route>
        </Routes>
      </ActionsProvider>
    </HashRouter>
  );
}
