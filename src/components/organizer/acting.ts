// An admin opens an organiser's portal with /organizer?as=<organiser id>.
// It's remembered for this tab, so moving between portal pages keeps it.
const ACTING_KEY = "jz-org-acting-as";
export function actingTarget(): string {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("as") || "";
    if (/^[A-Za-z0-9_-]{1,128}$/.test(fromUrl)) {
      sessionStorage.setItem(ACTING_KEY, fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem(ACTING_KEY) || "";
  } catch {
    return "";
  }
}
export function stopActing(): void {
  try {
    sessionStorage.removeItem(ACTING_KEY);
  } catch {
    /* nothing remembered */
  }
}

