import React from "react";
import { Loader2 } from "lucide-react";
import TicketPrintSheet from "./TicketPrintSheet";
import { AdminProvider, useAdmin } from "./admin/AdminContext";
import AdminLayout from "./admin/AdminLayout";
import BookingDrawer from "./admin/BookingDrawer";
import DashboardPage from "./admin/pages/DashboardPage";
import { TicketsPage, CheckInPage } from "./admin/pages/TicketsPage";
import IssueTicketPage from "./admin/pages/IssueTicketPage";
import { OrdersPage, PaymentsPage } from "./admin/pages/SalesPages";
import { ClientsPage, UsersPage } from "./admin/pages/PeoplePages";
import EventsPage from "./admin/pages/EventsPage";
import ArtistsPage from "./admin/pages/ArtistsPage";
import OrganizersPage from "./admin/pages/OrganizersPage";
import AccountSettingsPage from "./admin/pages/AccountSettingsPage";

/**
 * The admin portal (/admin/*): a WordPress-style dashboard with a collapsible
 * side menu. Each section lives in ./admin/pages; shared data, routing and
 * lookups (customer names, event titles…) come from ./admin/AdminContext.
 */
export default function AdminHub({ onLogout }: { onLogout: () => void }) {
  return (
    <AdminProvider onLogout={onLogout}>
      <AdminShell />
    </AdminProvider>
  );
}

function AdminShell() {
  const { route, loading, printData } = useAdmin();

  let page: React.ReactNode;
  switch (route.section) {
    case "tickets":
      page =
        route.sub === "new" ? (
          <React.Fragment key={route.query.toString()}>
            <IssueTicketPage />
          </React.Fragment>
        ) : route.sub === "check-in" ? (
          <CheckInPage />
        ) : (
          <React.Fragment key={`${route.sub}-${route.query.get("event") || ""}`}>
            <TicketsPage view={route.sub === "upcoming" ? "upcoming" : "all"} />
          </React.Fragment>
        );
      break;
    case "orders":
      page = <OrdersPage />;
      break;
    case "payments":
      page = <PaymentsPage />;
      break;
    case "clients":
      page = <ClientsPage />;
      break;
    case "events":
      page = <EventsPage />;
      break;
    case "artists":
      page = <ArtistsPage />;
      break;
    case "organizers":
      page = <OrganizersPage />;
      break;
    case "users":
      page = <UsersPage />;
      break;
    case "settings":
      page = <AccountSettingsPage />;
      break;
    default:
      page = <DashboardPage />;
  }

  return (
    <AdminLayout>
      {loading ? (
        <div className="py-32 text-center">
          <Loader2 className="w-8 h-8 text-black animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#8a8a8a] tracking-widest font-bold">Loading dashboard data…</p>
        </div>
      ) : (
        <div key={`${route.section}/${route.sub}`} className="jz-page">
          {page}
        </div>
      )}
      <BookingDrawer />
      {printData && <TicketPrintSheet ticket={printData} />}
    </AdminLayout>
  );
}
