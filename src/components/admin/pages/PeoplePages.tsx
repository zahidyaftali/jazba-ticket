import React, { useMemo, useState } from "react";
import { Download, Eye, Send, Trash2, UserCheck, UserMinus, Mail, Phone, UserRound } from "lucide-react";
import { deleteUserAccount, updateUserRoleAndStatus, UserProfile } from "../../../services/backendService";
import { useAdmin, Client, byNewest } from "../AdminContext";
import {
  Avatar,
  Badge,
  DataTable,
  Drawer,
  EmptyRow,
  FilterTabs,
  IconButton,
  PageHeader,
  PAYMENT_STATUS,
  SearchInput,
  StatusBadge,
  TableFooter,
  Toolbar,
  btnOutline,
  btnPrimary,
  downloadCsv,
  fmtDate,
  money,
  overline,
  timeAgo,
  selectCls,
  tdCls,
  thCls,
} from "../ui";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  organizer: "Organiser",
  artist: "Artist",
  user: "Customer",
};

/** Side panel with one person's details and every order they hold. */
function PersonDrawer({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const { eventInfo, tierName, amountLabel, openBooking, navigate } = useAdmin();
  if (!client) return null;
  const orders = [...client.orders].sort(byNewest);
  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow={client.registered ? `Member · ${ROLE_LABELS[client.role || "user"] || "Customer"}` : "Guest client"}
      title={client.name}
      sub={
        <div className="space-y-1 text-xs">
          {client.email ? (
            <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 font-bold hover:underline break-all">
              <Mail className="w-3.5 h-3.5 shrink-0" /> {client.email}
            </a>
          ) : (
            <span className="text-[#8a8a8a]">No email on file</span>
          )}
          {client.phone && (
            <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 font-bold hover:underline">
              <Phone className="w-3.5 h-3.5" /> {client.phone}
            </a>
          )}
        </div>
      }
      footer={
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            onClose();
            navigate(`/admin/tickets/new${client.email ? `?client=${encodeURIComponent(client.email)}` : ""}`);
          }}
        >
          <Send className="w-4 h-4" /> Issue a ticket
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { k: "Orders", v: client.orders.length },
          { k: "Tickets", v: client.tickets },
          { k: "Spent", v: money(client.spentUsd) },
        ].map((s) => (
          <div key={s.k} className="bg-[#f7f7f7] p-3">
            <span className={`${overline} text-[#8a8a8a] block`}>{s.k}</span>
            <span className="font-display font-bold text-lg block mt-1">{s.v}</span>
          </div>
        ))}
      </div>
      <span className={`${overline} text-[#8a8a8a]`}>Orders</span>
      {orders.length === 0 ? (
        <p className="text-sm text-[#8a8a8a] mt-2">No tickets yet.</p>
      ) : (
        <div className="mt-2 border border-[#efefef] divide-y divide-[#f2f2f2]">
          {orders.map((b) => {
            const info = eventInfo(b.eventId, b);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onClose();
                  openBooking(b.id!);
                }}
                className="w-full text-left flex items-center gap-3 px-3 py-3 hover:bg-[#fafafa] cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{info.title}</p>
                  <p className="text-[11px] text-[#8a8a8a]">
                    {b.orderId || b.bookingNumber} · {b.quantity || 1} × {tierName(b)} · {fmtDate(b.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{amountLabel(b)}</p>
                  <StatusBadge map={PAYMENT_STATUS} value={b.paymentStatus} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

/** Clients — everyone who holds tickets, plus registered members. */
export function ClientsPage() {
  const { clients, navigate } = useAdmin();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"buyers" | "guests" | "all">("buyers");
  const [open, setOpen] = useState<Client | null>(null);

  const buyers = clients.filter((c) => c.orders.length > 0);
  const scoped = tab === "buyers" ? buyers : tab === "guests" ? clients.filter((c) => !c.registered) : clients;
  const q = query.trim().toLowerCase();
  const filtered = scoped.filter((c) => !q || [c.name, c.email, c.phone].some((v) => (v || "").toLowerCase().includes(q)));

  const exportCsv = () =>
    downloadCsv(`jazba-clients-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Name", "Email", "Phone", "Account", "Orders", "Tickets", "Spent (USD)", "Last order"],
      ...filtered.map((c) => [c.name, c.email, c.phone, c.registered ? "Member" : "Guest", c.orders.length, c.tickets, c.spentUsd.toFixed(2), c.lastOrderAt ? fmtDate(c.lastOrderAt) : ""]),
    ]);

  return (
    <div>
      <PageHeader
        title="Clients"
        sub="Everyone you've sold or issued tickets to — online buyers, members and guest clients added in the portal."
        actions={
          <>
            <button type="button" className={btnOutline} onClick={exportCsv}>
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button type="button" className={btnPrimary} onClick={() => navigate("/admin/tickets/new")}>
              <Send className="w-4 h-4" /> Add client & issue ticket
            </button>
          </>
        }
      />
      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs
          tabs={[
            { id: "buyers" as const, label: "With tickets", count: buyers.length },
            { id: "guests" as const, label: "Guest clients", count: clients.filter((c) => !c.registered).length },
            { id: "all" as const, label: "All contacts", count: clients.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, email or phone…" />
        </Toolbar>
        <DataTable
          head={
            <>
              <th className={thCls}>Client</th>
              <th className={thCls}>Phone</th>
              <th className={thCls}>Account</th>
              <th className={thCls}>Orders</th>
              <th className={thCls}>Tickets</th>
              <th className={thCls}>Spent</th>
              <th className={thCls}>Last order</th>
              <th className={`${thCls} text-right`}>Actions</th>
            </>
          }
        >
          {filtered.map((c) => (
            <tr key={c.key} className="hover:bg-[#fafafa]">
              <td className={tdCls}>
                <button type="button" onClick={() => setOpen(c)} className="flex items-center gap-3 min-w-[200px] text-left cursor-pointer group">
                  <Avatar src={c.photo} name={c.name} size={34} />
                  <span className="min-w-0">
                    <span className="block font-bold truncate max-w-[220px] group-hover:underline">{c.name}</span>
                    <span className="block text-[11px] text-[#8a8a8a] truncate max-w-[220px]">{c.email || "No email on file"}</span>
                  </span>
                </button>
              </td>
              <td className={`${tdCls} whitespace-nowrap`}>{c.phone || "—"}</td>
              <td className={tdCls}>
                {c.registered ? (
                  <Badge tone="info">
                    <UserRound className="w-3 h-3" /> {ROLE_LABELS[c.role || "user"] || "Member"}
                  </Badge>
                ) : (
                  <Badge tone="neutral">Guest</Badge>
                )}
              </td>
              <td className={`${tdCls} font-bold`}>{c.orders.length}</td>
              <td className={`${tdCls} font-bold`}>{c.tickets}</td>
              <td className={`${tdCls} font-bold whitespace-nowrap`}>{money(c.spentUsd)}</td>
              <td className={`${tdCls} whitespace-nowrap text-[#666]`}>{c.lastOrderAt ? fmtDate(c.lastOrderAt) : "—"}</td>
              <td className={`${tdCls} text-right`}>
                <div className="flex justify-end">
                  <IconButton
                    title="Issue a ticket"
                    onClick={() => navigate(`/admin/tickets/new${c.email ? `?client=${encodeURIComponent(c.email)}` : ""}`)}
                  >
                    <Send className="w-4 h-4" />
                  </IconButton>
                  <IconButton title="View client" onClick={() => setOpen(c)}>
                    <Eye className="w-4 h-4" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <EmptyRow
              colSpan={8}
              title={scoped.length ? "No clients match your search" : "No clients yet"}
              sub={scoped.length ? undefined : "Clients appear when someone buys a ticket or you issue one."}
            />
          )}
        </DataTable>
        <TableFooter shown={filtered.length} total={scoped.length} noun="clients" />
      </div>
      <PersonDrawer client={open} onClose={() => setOpen(null)} />
    </div>
  );
}

type RoleTab = "all" | "admin" | "organizer" | "artist" | "user" | "suspended";

/** Explains missing emails — and the one-time setup that recovers them. */
function EmailStatusBanner({
  status,
  error,
  missing,
  blankProfiles,
}: {
  status: "loading" | "ready" | "not-configured" | "error";
  error: string;
  missing: number;
  blankProfiles: number;
}) {
  const [open, setOpen] = useState(false);
  if (status === "loading") return null;
  if (status === "ready") {
    if (!missing) return null;
    return (
      <div className="mb-4 bg-white border border-[#e4e4e4] border-l-2 border-l-[#8a8a8a] px-4 py-3 text-xs text-[#555]">
        <span className="font-bold text-black">
          {missing} account{missing === 1 ? " has" : "s have"} no email at all.
        </span>{" "}
        Their sign-in carries none either — usually a Facebook account registered with a phone number instead of an email.
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="mb-4 bg-white border border-[#e4e4e4] border-l-2 border-l-[#be6464] px-4 py-3 text-xs text-[#555]">
        <span className="font-bold text-black">Couldn&rsquo;t read sign-in emails:</span> {error}
      </div>
    );
  }
  if (!blankProfiles) return null;
  return (
    <div className="mb-4 bg-white border border-[#e4e4e4] border-l-2 border-l-[#e0952b] px-4 py-3 text-xs text-[#555]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <p>
          <span className="font-bold text-black">
            {blankProfiles} account{blankProfiles === 1 ? " was" : "s were"} saved without an email
          </span>{" "}
          (older Google / Facebook sign-ups). Each fills in when that person next visits — or connect Firebase once to show them all now.
        </p>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-bold underline shrink-0 cursor-pointer text-left">
          {open ? "Hide setup" : "How to connect"}
        </button>
      </div>
      {open && (
        <ol className="list-decimal pl-5 mt-3 space-y-1.5 text-[#333]">
          <li>
            Open the <span className="font-bold">Firebase console</span> → your project → <span className="font-bold">Project settings</span> →{" "}
            <span className="font-bold">Service accounts</span> → <span className="font-bold">Generate new private key</span>. A .json file downloads.
          </li>
          <li>
            In <span className="font-bold">Vercel</span> → this project → Settings → <span className="font-bold">Environment Variables</span>, add{" "}
            <code className="bg-[#f2f2f2] px-1">FIREBASE_SERVICE_ACCOUNT</code> and paste the whole contents of that file as the value.
          </li>
          <li>Redeploy the site, then reopen this page — missing emails are filled in automatically.</li>
          <li className="text-[#8a8a8a]">Keep that file private: never email it or paste it into a chat.</li>
        </ol>
      )}
    </div>
  );
}


/** Users — registered accounts, roles and access. */
export function UsersPage() {
  const { data, clients, userEmail, signInMethodsFor, authUserFor, authStatus, authError, admin, notify, fail, reload } = useAdmin();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<RoleTab>("all");
  const [open, setOpen] = useState<Client | null>(null);

  const statsByUid = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients) if (c.uid) m.set(c.uid, c);
    return m;
  }, [clients]);

  const users = useMemo(
    () => [...data.users].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [data.users],
  );

  const inTab = (u: UserProfile, t: RoleTab) =>
    t === "all" ? true : t === "suspended" ? u.status === "suspended" : u.role === t;
  const q = query.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (!inTab(u, tab)) return false;
    if (!q) return true;
    const { email } = userEmail(u);
    return [u.name, email, u.role, ROLE_LABELS[u.role], u.phone, u.city].some((v) => (v || "").toLowerCase().includes(q));
  });
  const count = (t: RoleTab) => users.filter((u) => inTab(u, t)).length;

  const handleRoleChange = async (uid: string, newRole: string, currentStatus: string) => {
    try {
      await updateUserRoleAndStatus(uid, newRole, currentStatus || "active");
      notify("User role updated successfully.");
      reload();
    } catch {
      fail("Failed to update user. Please try again.");
    }
  };

  const handleToggleSuspension = async (u: UserProfile) => {
    const next = u.status === "suspended" ? "active" : "suspended";
    if (next === "suspended" && !window.confirm(`Suspend ${u.name}? They won't be able to use their account until you reactivate it.`)) return;
    try {
      await updateUserRoleAndStatus(u.uid, u.role, next);
      notify(`User status changed to ${next}.`);
      reload();
    } catch {
      fail("Failed to change user status.");
    }
  };

  const handleDelete = async (u: UserProfile) => {
    if (!window.confirm(`Delete ${u.name}'s profile? This action cannot be undone.`)) return;
    try {
      await deleteUserAccount(u.uid);
      notify("User profile deleted.");
      reload();
    } catch {
      fail("Failed to delete user profile.");
    }
  };

  const exportCsv = () =>
    downloadCsv(`jazba-users-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Name", "Email", "Sign-in", "Phone", "City", "Role", "Status", "Joined", "Last sign-in", "Orders", "Spent (USD)", "User ID"],
      ...filtered.map((u) => {
        const s = statsByUid.get(u.uid);
        const login = authUserFor(u.uid);
        return [u.name, userEmail(u).email, signInMethodsFor(u).join(" / "), u.phone, u.city, ROLE_LABELS[u.role] || u.role, u.status || "active", fmtDate(u.createdAt), login?.lastLoginAt ? fmtDate(login.lastLoginAt) : "", s?.orders.length || 0, (s?.spentUsd || 0).toFixed(2), u.uid];
      }),
    ]);

  const missingEmails = users.filter((u) => !userEmail(u).email).length;
  const blankProfiles = users.filter((u) => !u.email).length;

  return (
    <div>
      <PageHeader
        title="Users"
        sub="Everyone with an account on the site. Change roles, suspend access or remove profiles."
        actions={
          <button type="button" className={btnOutline} onClick={exportCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />
      <EmailStatusBanner status={authStatus} error={authError} missing={missingEmails} blankProfiles={blankProfiles} />
      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs
          tabs={[
            { id: "all" as RoleTab, label: "All", count: count("all") },
            { id: "admin" as RoleTab, label: "Admins", count: count("admin") },
            { id: "organizer" as RoleTab, label: "Organisers", count: count("organizer") },
            { id: "artist" as RoleTab, label: "Artists", count: count("artist") },
            { id: "user" as RoleTab, label: "Customers", count: count("user") },
            { id: "suspended" as RoleTab, label: "Suspended", count: count("suspended") },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email, role, phone or city…" />
        </Toolbar>
        <DataTable
          head={
            <>
              <th className={thCls}>User</th>
              <th className={thCls}>Email</th>
              <th className={thCls}>Phone · City</th>
              <th className={thCls}>Orders</th>
              <th className={thCls}>Role</th>
              <th className={thCls}>Status</th>
              <th className={`${thCls} text-right`}>Actions</th>
            </>
          }
        >
          {filtered.map((u) => {
            const { email, source } = userEmail(u);
            const methods = signInMethodsFor(u);
            const login = authUserFor(u.uid);
            const stats = statsByUid.get(u.uid);
            const isMe = u.uid === admin.uid;
            return (
              <tr key={u.uid} className="hover:bg-[#fafafa]">
                <td className={tdCls}>
                  <button
                    type="button"
                    onClick={() => stats && setOpen(stats)}
                    className="flex items-center gap-3 min-w-[190px] text-left cursor-pointer group"
                  >
                    <Avatar src={u.profileImage} name={u.name} size={34} />
                    <span className="min-w-0">
                      <span className="block font-bold truncate max-w-[200px] group-hover:underline">
                        {u.name}
                        {isMe && <span className="text-[#8a8a8a] font-medium"> (you)</span>}
                      </span>
                      <span className="block text-[11px] text-[#8a8a8a]">
                        Joined {fmtDate(u.createdAt)}
                        {login?.lastLoginAt ? ` · last sign-in ${timeAgo(login.lastLoginAt)}` : ""}
                      </span>
                    </span>
                  </button>
                </td>
                <td className={tdCls}>
                  {email ? (
                    <a href={`mailto:${email}`} className="font-medium hover:underline break-all">
                      {email}
                    </a>
                  ) : (
                    <span className="text-[#8a8a8a]">{authStatus === "ready" ? "No email on this account" : "No email saved yet"}</span>
                  )}
                  <span className="flex flex-wrap items-center gap-1 mt-1">
                    {methods.map((m) => (
                      <span key={m}>
                        <Badge tone="neutral" dot={false}>
                          {m}
                        </Badge>
                      </span>
                    ))}
                    {source === "login" && (
                      <span className="text-[10px] text-[#8a8a8a]" title="Taken from their Google / Facebook sign-in">
                        from their sign-in
                      </span>
                    )}
                    {source === "orders" && (
                      <span className="text-[10px] text-[#8a8a8a]" title="Taken from this member's orders">
                        from their orders
                      </span>
                    )}
                  </span>
                </td>
                <td className={`${tdCls} whitespace-nowrap`}>
                  <span className="block">{u.phone || "—"}</span>
                  <span className="block text-[11px] text-[#8a8a8a]">{u.city || ""}</span>
                </td>
                <td className={`${tdCls} whitespace-nowrap`}>
                  <span className="font-bold">{stats?.orders.length || 0}</span>
                  {stats && stats.spentUsd > 0 && <span className="block text-[11px] text-[#8a8a8a]">{money(stats.spentUsd)}</span>}
                </td>
                <td className={tdCls}>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value, u.status)}
                    className={selectCls}
                    disabled={isMe}
                    title={isMe ? "You can't change your own role" : "Change role"}
                  >
                    <option value="user">Customer</option>
                    <option value="organizer">Organiser</option>
                    <option value="artist">Artist</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className={tdCls}>
                  <Badge tone={u.status === "suspended" ? "negative" : "positive"}>
                    {u.status === "suspended" ? "Suspended" : "Active"}
                  </Badge>
                </td>
                <td className={`${tdCls} text-right`}>
                  <div className="flex items-center justify-end">
                    <IconButton title="View details" onClick={() => stats && setOpen(stats)} disabled={!stats}>
                      <Eye className="w-4 h-4" />
                    </IconButton>
                    <IconButton
                      title={u.status === "suspended" ? "Activate account" : "Suspend account"}
                      onClick={() => handleToggleSuspension(u)}
                      disabled={isMe}
                    >
                      {u.status === "suspended" ? <UserCheck className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                    </IconButton>
                    <IconButton title="Delete user" onClick={() => handleDelete(u)} danger disabled={isMe}>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && <EmptyRow colSpan={7} title="No users found." />}
        </DataTable>
        <TableFooter shown={filtered.length} total={users.length} noun="users" />
      </div>
      <PersonDrawer client={open} onClose={() => setOpen(null)} />
    </div>
  );
}
