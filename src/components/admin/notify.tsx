import { createContext, useContext } from "react";

/** Toast messages, provided by whichever portal is showing (admin or
 *  organiser) — lets shared pieces like the image picker report results. */
export interface Notifier {
  notify: (msg: string) => void;
  fail: (msg: string) => void;
}

export const NotifyContext = createContext<Notifier>({
  notify: () => {},
  fail: (msg) => console.error(msg),
});

export function useNotify(): Notifier {
  return useContext(NotifyContext);
}

/** Who the image library belongs to: an admin sees every image in folders;
 *  an organiser sees only their own uploads. */
export type MediaScope = "admin" | "organizer";
export const MediaScopeContext = createContext<MediaScope>("admin");

export function useMediaScope(): MediaScope {
  return useContext(MediaScopeContext);
}
