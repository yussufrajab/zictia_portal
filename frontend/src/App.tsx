import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TicketsPage from "./pages/TicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAccounts from "./pages/admin/AdminAccounts";
import AdminServices from "./pages/admin/AdminServices";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import NotFoundPage from "./pages/NotFoundPage";

import OrderPage from "./pages/OrderPage";
import OrdersPage from "./pages/OrdersPage";
import BillingPage from "./pages/BillingPage";
import PaymentPage from "./pages/PaymentPage";
import KBPage from "./pages/KBPage";
import KBArticlePage from "./pages/KBArticlePage";
import AdminKB from "./pages/admin/AdminKB";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="catalog/:id" element={<ServiceDetailPage />} />
          <Route path="order/:serviceId" element={<OrderPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="kb" element={<KBPage />} />
          <Route path="kb/:id" element={<KBArticlePage />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/kb" element={<AdminKB />} />
          <Route path="admin/accounts" element={<AdminAccounts />} />
          <Route path="admin/services" element={<AdminServices />} />
          <Route path="admin/tickets" element={<AdminTickets />} />
          <Route path="admin/orders" element={<AdminOrders />} />
          <Route path="admin/billing" element={<AdminBilling />} />
          <Route path="admin/analytics" element={<AdminAnalytics />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
