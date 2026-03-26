import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import AufgabenPage from '@/pages/AufgabenPage';
import VorlagenToolsPage from '@/pages/VorlagenToolsPage';
import MeilensteinePage from '@/pages/MeilensteinePage';
import PhasenPage from '@/pages/PhasenPage';
import GruenderprofilPage from '@/pages/GruenderprofilPage';
import RoadmapCockpitPage from '@/pages/RoadmapCockpitPage';
import ReviewPunktePage from '@/pages/ReviewPunktePage';
import BusinessplanPage from '@/pages/BusinessplanPage';
import FinanzplanPage from '@/pages/FinanzplanPage';

const PhaseReviewPage = lazy(() => import('@/pages/intents/PhaseReviewPage'));
const BusinessplanSetupPage = lazy(() => import('@/pages/intents/BusinessplanSetupPage'));

export default function App() {
  return (
    <HashRouter>
      <ActionsProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="aufgaben" element={<AufgabenPage />} />
            <Route path="vorlagen-&-tools" element={<VorlagenToolsPage />} />
            <Route path="meilensteine" element={<MeilensteinePage />} />
            <Route path="phasen" element={<PhasenPage />} />
            <Route path="gruenderprofil" element={<GruenderprofilPage />} />
            <Route path="roadmap-cockpit" element={<RoadmapCockpitPage />} />
            <Route path="review-punkte" element={<ReviewPunktePage />} />
            <Route path="businessplan" element={<BusinessplanPage />} />
            <Route path="finanzplan" element={<FinanzplanPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="intents/phase-review" element={<Suspense fallback={null}><PhaseReviewPage /></Suspense>} />
            <Route path="intents/businessplan-setup" element={<Suspense fallback={null}><BusinessplanSetupPage /></Suspense>} />
          </Route>
        </Routes>
      </ActionsProvider>
    </HashRouter>
  );
}
