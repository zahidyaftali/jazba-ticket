import React from "react";
import type { User } from "../../firebase";
import type { OrganizerProfile, UserProfile } from "../../services/backendService";
import { OrganizerProvider, useOrg } from "./OrganizerContext";
import OrganizerLayout from "./OrganizerLayout";
import OrgDashboardPage from "./pages/OrgDashboardPage";
import { OrgEventDetail, OrgEventsList } from "./pages/OrgEventsPage";
import OrgEventEditor from "./pages/OrgEventEditor";
import OrgOrdersPage from "./pages/OrgOrdersPage";
import { OrgAccountPage, OrgProfilePage } from "./pages/OrgProfilePages";
import OrgPayoutsPage from "./pages/OrgPayoutsPage";
import OrgCustomersPage from "./pages/OrgCustomersPage";
import OrgIssuePage from "./pages/OrgIssuePage";
import OrgPromoCodesPage from "./pages/OrgPromoCodesPage";
import OrgWaitlistPage from "./pages/OrgWaitlistPage";
import OrgDoorStaffPage from "./pages/OrgDoorStaffPage";
import OrgMediaPage from "./pages/OrgMediaPage";

/** The portal for an approved organiser (or an admin acting for one). */
export default function OrganizerApp(props: {
  user: User;
  me: UserProfile | null;
  org: OrganizerProfile;
  onLogout: () => void;
  actingAsAdmin?: boolean;
}) {
  return (
    <OrganizerProvider {...props}>
      <OrganizerLayout>
        <Page />
      </OrganizerLayout>
    </OrganizerProvider>
  );
}

function Page() {
  const { route } = useOrg();
  switch (route.section) {
    case "events":
      if (route.sub === "new" || route.sub === "edit") {
        return (
          <React.Fragment key={`${route.sub}:${route.id}`}>
            <OrgEventEditor eventId={route.sub === "edit" ? route.id : undefined} />
          </React.Fragment>
        );
      }
      if (route.sub === "view") {
        return (
          <React.Fragment key={route.id}>
            <OrgEventDetail eventId={route.id} />
          </React.Fragment>
        );
      }
      return <OrgEventsList />;
    case "orders":
      return <OrgOrdersPage />;
    case "customers":
      return <OrgCustomersPage />;
    case "issue":
      return <OrgIssuePage />;
    case "codes":
      return <OrgPromoCodesPage />;
    case "waitlist":
      return <OrgWaitlistPage />;
    case "door-staff":
      return <OrgDoorStaffPage />;
    case "media":
      return <OrgMediaPage />;
    case "payouts":
      return <OrgPayoutsPage />;
    case "profile":
      return <OrgProfilePage />;
    case "account":
      return <OrgAccountPage />;
    default:
      return <OrgDashboardPage />;
  }
}
