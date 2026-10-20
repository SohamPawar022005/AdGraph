import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DiscoverPage from "./pages/DiscoverPage";
import RegulationsPage from "./pages/RegulationsPage";
import RegulationDetailPage from "./pages/RegulationDetailPage";
import RulesPage from "./pages/RulesPage";
import RuleDetailPage from "./pages/RuleDetailPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import ApprovalDetailPage from "./pages/ApprovalDetailPage";
import ApprovalGraphPage from "./pages/ApprovalGraphPage";
import BusinessesPage from "./pages/BusinessesPage";
import BusinessDetailPage from "./pages/BusinessDetailPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import RegulatoryChangesPage from "./pages/RegulatoryChangesPage";
import RegulatoryChangeDetailPage from "./pages/RegulatoryChangeDetailPage";
import TextComparisonPage from "./pages/TextComparisonPage";
import DocumentsPage from "./pages/DocumentsPage";
import SearchRegulationsPage from "./pages/SearchRegulationsPage";
import AuditLogPage from "./pages/AuditLogPage";
import ReviewQueuePage from "./pages/ReviewQueuePage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/search" element={<SearchRegulationsPage />} />
            <Route path="/regulations" element={<RegulationsPage />} />
            <Route path="/regulations/:id" element={<RegulationDetailPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/rules/:id" element={<RuleDetailPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/approvals-graph" element={<ApprovalGraphPage />} />
            <Route path="/approvals/:id" element={<ApprovalDetailPage />} />
            <Route path="/businesses" element={<BusinessesPage />} />
            <Route path="/businesses/:id" element={<BusinessDetailPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationDetailPage />} />
            <Route path="/regulatory-changes" element={<RegulatoryChangesPage />} />
            <Route path="/regulatory-changes/:id" element={<RegulatoryChangeDetailPage />} />
            <Route path="/compare" element={<TextComparisonPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/review" element={<ReviewQueuePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
