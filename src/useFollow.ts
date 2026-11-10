import { useCallback, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, type User } from './firebase';
import {
  FollowTargetType, followTarget, getFollowerCount, getFollowingIds, isFollowingTarget, unfollowTarget,
} from './services/backendService';

// ── Following artists and organisers ──────────────────────────────────────
// Every Follow button and follower count uses these, so they all behave the
// same: they wait for the sign-in to load (a page opened directly used to
// show "Follow" to people already following, and the tap then failed),
// update straight away, re-check with the database, and tell every other
// button on the page for the same artist or organiser.

const CHANGED = 'jz-follow-changed';
interface FollowChange { type: FollowTargetType; id: string; following: boolean }

function announce(change: FollowChange) {
  window.dispatchEvent(new CustomEvent<FollowChange>(CHANGED, { detail: change }));
}

/** The signed-in user, and whether Firebase has finished checking. */
export function useAuthUser(): { user: User | null; ready: boolean } {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>(() => ({
    user: auth.currentUser,
    ready: !!auth.currentUser,
  }));
  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, ready: true })), []);
  return state;
}

/** One artist or organiser: follower count, whether you follow, and the toggle. */
export function useFollow(type: FollowTargetType, targetId: string, onRequireLogin?: () => void) {
  const { user, ready } = useAuthUser();
  const [count, setCount] = useState<number | null>(null);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshCount = useCallback(() => {
    if (!targetId) return Promise.resolve();
    return getFollowerCount(type, targetId).then(setCount);
  }, [type, targetId]);

  useEffect(() => {
    setCount(null);
    if (targetId) void refreshCount();
  }, [targetId, refreshCount]);

  useEffect(() => {
    let cancelled = false;
    if (!ready) return;
    if (!user || !targetId) {
      setFollowing(false);
      return;
    }
    isFollowingTarget(user.uid, type, targetId).then((yes) => {
      if (!cancelled) setFollowing(yes);
    });
    return () => { cancelled = true; };
  }, [ready, user, type, targetId]);

  // Another button on the page followed or unfollowed the same target.
  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<FollowChange>).detail;
      if (d && d.type === type && d.id === targetId) {
        setFollowing(d.following);
        void refreshCount();
      }
    };
    window.addEventListener(CHANGED, onChange);
    return () => window.removeEventListener(CHANGED, onChange);
  }, [type, targetId, refreshCount]);

  const toggle = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      onRequireLogin?.();
      return;
    }
    if (!targetId || busy) return;
    const next = !following;
    setBusy(true);
    setFollowing(next);
    setCount((c) => (c === null ? c : Math.max(0, c + (next ? 1 : -1))));
    try {
      if (next) await followTarget(current.uid, type, targetId);
      else await unfollowTarget(current.uid, type, targetId);
    } catch (err) {
      // Already following (or already not): go by what the database says.
      console.warn('Follow change did not save; re-checking.', err);
    }
    const actual = await isFollowingTarget(current.uid, type, targetId);
    setFollowing(actual);
    await refreshCount();
    announce({ type, id: targetId, following: actual });
    setBusy(false);
  }, [busy, following, onRequireLogin, refreshCount, targetId, type]);

  return { count, following, busy, ready, toggle, signedIn: !!user };
}

/** Which of many artists (or organisers) the signed-in user follows — for lists. */
export function useFollowingSet(type: FollowTargetType, onRequireLogin?: () => void) {
  const { user, ready } = useAuthUser();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    if (!ready) return;
    if (!user) {
      setIds(new Set());
      return;
    }
    getFollowingIds(user.uid, type).then((set) => {
      if (!cancelled) setIds(set);
    });
    return () => { cancelled = true; };
  }, [ready, user, type]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<FollowChange>).detail;
      if (!d || d.type !== type) return;
      setIds((prev) => {
        const next = new Set(prev);
        if (d.following) next.add(d.id);
        else next.delete(d.id);
        return next;
      });
    };
    window.addEventListener(CHANGED, onChange);
    return () => window.removeEventListener(CHANGED, onChange);
  }, [type]);

  const toggle = useCallback(async (id: string) => {
    const current = auth.currentUser;
    if (!current) {
      onRequireLogin?.();
      return;
    }
    const next = !ids.has(id);
    setIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
    try {
      if (next) await followTarget(current.uid, type, id);
      else await unfollowTarget(current.uid, type, id);
    } catch (err) {
      console.warn('Follow change did not save; re-checking.', err);
    }
    const actual = await isFollowingTarget(current.uid, type, id);
    announce({ type, id, following: actual });
  }, [ids, onRequireLogin, type]);

  return { ids, toggle, ready };
}
