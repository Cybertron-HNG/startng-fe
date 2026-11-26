// The places features plug into the website, so nobody edits the same file twice (see the PRD, section 3).
// A feature lives in src/features/<feature>/ and registers itself from its own index.ts; src/features/index.ts
// imports each feature with ONE line. Everything a feature registers is hidden while its flag is off (GET /features).
import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import type { AdminMe, PublishedGame, User } from "../api";
import type { Game } from "../games";

// ---- pages

/** What a page inside the start.ng shell (top bar, sign-in) is given. */
export type PageProps = { user: User | null; onSignIn: () => void; params: Record<string, string> };
export type FeaturePage = {
  feature: string; // its flag
  path: string | RegExp; // "/wardrobe", or a RegExp with named groups: /^\/p\/(?<id>\d+)/ (the groups become params)
  /** "app": inside the start.ng shell (top bar, sign-in, theme). "bare": the whole window (like the Hangout). */
  shell: "app" | "bare";
  Component: LazyExoticComponent<ComponentType<PageProps>>;
};
const pages: FeaturePage[] = [];

/** A feature's page. load is a dynamic import, so the page's code only downloads when someone opens it.
 *  Also add its address to nginx.conf (one location line), like the other pages. */
export function registerPage(p: Omit<FeaturePage, "Component"> & { load: () => Promise<{ default: ComponentType<PageProps> }> }) {
  pages.push({ feature: p.feature, path: p.path, shell: p.shell, Component: lazy(p.load) });
}

/** The registered page for an address, with its params, or null. Flags are checked by the caller. */
export function findPage(pathname: string): { page: FeaturePage; params: Record<string, string> } | null {
  for (const page of pages) {
    if (typeof page.path === "string") {
      if (pathname === page.path || pathname === `${page.path}/`) return { page, params: {} };
    } else {
      const m = pathname.match(page.path);
      if (m) return { page, params: { ...(m.groups ?? {}) } };
    }
  }
  return null;
}

// ---- game card slots

/** Where on a game card: badges sit on the picture, stats under the title, actions next to Play. */
export type CardSlot = "badges" | "stats" | "actions";
export type CardContext = { user: User | null; onSignIn: () => void };
type CardPart = { feature: string; key: string; slot: CardSlot; order: number; render: (game: Game, ctx: CardContext) => ReactNode };
const cardParts: CardPart[] = [];

/** Something a feature shows on every game card (a category chip, stars, a "Rate" button). Return null to skip a card. */
export function registerCardPart(part: Omit<CardPart, "order"> & { order?: number }) {
  cardParts.push({ order: 100, ...part });
  cardParts.sort((a, b) => a.order - b.order);
}
export const cardPartsFor = (slot: CardSlot) => cardParts.filter((p) => p.slot === slot);

// ---- admin tabs

/** What an admin tab is given: the admin's access, a way to open another tab, and the shared confirm dialog. */
export type AdminTabProps = {
  access: AdminMe;
  can: (permission: string) => boolean;
  go: (tabKey: string) => void;
  ask: (a: { title: string; body?: ReactNode; confirm: string; danger?: boolean; input?: { label: string; placeholder?: string; initial?: string; required?: boolean }; typeToConfirm?: string }) => Promise<string | null>;
};
export type AdminTab = {
  feature: string | null; // its flag (null: part of the admin page itself)
  key: string; // also the #anchor: /admin#<key>
  label: string;
  order: number;
  /** Who sees it: admins with this permission, super admins only, or every admin. The API still checks everything. */
  permission?: string;
  superOnly?: boolean;
  Component: ComponentType<AdminTabProps>;
};
const adminTabs: AdminTab[] = [];

/** A tab on start.ng/admin. The feature's API checks its permission (registered with app/features on the back end). */
export function registerAdminTab(tab: Omit<AdminTab, "order"> & { order?: number }) {
  const i = adminTabs.findIndex((t) => t.key === tab.key);
  if (i >= 0 && adminTabs[i].feature !== tab.feature) throw new Error(`Admin tab "${tab.key}" is already used by another feature`);
  if (i >= 0) adminTabs.splice(i, 1); // the same tab again (a hot reload while developing)
  adminTabs.push({ order: 100, ...tab });
  adminTabs.sort((a, b) => a.order - b.order);
}
export const allAdminTabs = () => adminTabs;

// ---- parts of an admin tab

/** A section a feature adds to one of the admin page's own tabs, under its content (private tournaments in Tournaments).
 *  Shown while the feature's flag is on, to admins with its permission (super admins always). */
type AdminTabPart = { feature: string; tab: string; key: string; order: number; permission?: string; Component: ComponentType<AdminTabProps> };
const adminTabParts: AdminTabPart[] = [];

export function registerAdminTabPart(p: Omit<AdminTabPart, "order"> & { order?: number }) {
  const i = adminTabParts.findIndex((x) => x.key === p.key && x.tab === p.tab);
  if (i >= 0) adminTabParts.splice(i, 1); // the same part again (a hot reload while developing)
  adminTabParts.push({ order: 100, ...p });
  adminTabParts.sort((a, b) => a.order - b.order);
}
export const adminTabPartsFor = (tab: string) => adminTabParts.filter((p) => p.tab === tab);

// ---- profile sections

export type ProfileSectionProps = { userId: number; isMe: boolean };
type ProfileSection = { feature: string; key: string; title: string; order: number; ownerOnly?: boolean; Component: ComponentType<ProfileSectionProps> };
const profileSections: ProfileSection[] = [];

/** A section on a player's profile (their league tier, crews, wardrobe). The profile page (S1) shows them in order.
 *  ownerOnly: shown only on your own profile, so visitors don't see an empty heading. */
export function registerProfileSection(s: Omit<ProfileSection, "order"> & { order?: number }) {
  profileSections.push({ order: 100, ...s });
  profileSections.sort((a, b) => a.order - b.order);
}
export const allProfileSections = () => profileSections;

// ---- Your games (the owner's own game cards, in the profile)

export type YourGameProps = { game: PublishedGame; reload: () => void };
type YourGamePart = { feature: string; key: string; order: number; Component: ComponentType<YourGameProps> };
const yourGameParts: YourGamePart[] = [];

/** Something a feature adds to each of the owner's games in Your games (a note from admins, a category picker, a
 *  checklist). Render nothing for a game it doesn't apply to. reload refreshes the list after a change. */
export function registerYourGamePart(p: Omit<YourGamePart, "order"> & { order?: number }) {
  const i = yourGameParts.findIndex((x) => x.key === p.key);
  if (i >= 0) yourGameParts.splice(i, 1);
  yourGameParts.push({ order: 100, ...p });
  yourGameParts.sort((a, b) => a.order - b.order);
}
export const allYourGameParts = () => yourGameParts;

// ---- parts of start.ng's own pages

/** A start.ng page with a place for features to add a box (the tournament page: an email sign-up, crew invites). */
// everywhere: once on every page of the site. game-head: on a game's page, under its name (game and info are set).
export type PageSlot = "tournament" | "game" | "game-head" | "home" | "games" | "indie" | "everywhere";
/** game: the game's slug, on the "game" page. info: that game's card, on "game-head". games: every community game, on the "home" page. */
export type PagePartProps = { user: User | null; onSignIn: () => void; game?: string; info?: Game; games?: Game[]; query?: string /* the search on /games, if any */ };
type PagePart = { feature: string; key: string; page: PageSlot; order: number; Component: ComponentType<PagePartProps> };
const pageParts: PagePart[] = [];

/** A box a feature adds to one of start.ng's pages, in order. Render nothing when it doesn't apply. */
export function registerPagePart(p: Omit<PagePart, "order"> & { order?: number }) {
  const i = pageParts.findIndex((x) => x.key === p.key && x.page === p.page);
  if (i >= 0) pageParts.splice(i, 1);
  pageParts.push({ order: 100, ...p });
  pageParts.sort((a, b) => a.order - b.order);
}
export const pagePartsFor = (page: PageSlot) => pageParts.filter((p) => p.page === page);
