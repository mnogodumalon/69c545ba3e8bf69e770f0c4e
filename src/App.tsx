import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import VorlagenToolsPage from '@/pages/VorlagenToolsPage';
import BusinessplanPage from '@/pages/BusinessplanPage';
import FinanzplanPage from '@/pages/FinanzplanPage';
import MeilensteinePage from '@/pages/MeilensteinePage';
import AufgabenPage from '@/pages/AufgabenPage';
import GruenderprofilPage from '@/pages/GruenderprofilPage';
import PhasenPage from '@/pages/PhasenPage';
import ReviewPunktePage from '@/pages/ReviewPunktePage';
import RoadmapCockpitPage from '@/pages/RoadmapCockpitPage';
import GruenderSetupPage from '@/pages/intents/GruenderSetupPage';
import PhaseReviewPage from '@/pages/intents/PhaseReviewPage';

export default function App() {
  return (
    <HashRouter>
      <ActionsProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="vorlagen-&-tools" element={<VorlagenToolsPage />} />
            <Route path="businessplan" element={<BusinessplanPage />} />
            <Route path="finanzplan" element={<FinanzplanPage />} />
            <Route path="meilensteine" element={<MeilensteinePage />} />
            <Route path="aufgaben" element={<AufgabenPage />} />
            <Route path="gruenderprofil" element={<GruenderprofilPage />} />
            <Route path="phasen" element={<PhasenPage />} />
            <Route path="review-punkte" element={<ReviewPunktePage />} />
            <Route path="roadmap-cockpit" element={<RoadmapCockpitPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="intents/gruender-setup" element={<GruenderSetupPage />} />
            <Route path="intents/phase-review" element={<PhaseReviewPage />} />
          </Route>
        </Routes>
      </ActionsProvider>
    </HashRouter>
  );
}
