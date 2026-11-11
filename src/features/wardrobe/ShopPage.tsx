import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { PageProps } from "../registry";
import { PAGES, setSeo } from "../../seo";
import { styleFor } from "../../character";
import { buy, changed, getShop, getWallet, getWardrobe, type Item, type Shop } from "./api";
import { dressed, useWorn, withItem } from "./dress";
import ItemTile from "./ItemTile";
import WardrobeTab from "./WardrobeTab";
import { useDialog } from "../../useDialog";
import "./wardrobe.css";
import { coins } from "./words";

const Viewer = lazy(() => import("../../three/Viewer"));

/** Time until the shop changes: midnight Nigeria time (UTC+1). */
function untilRestock(now: number): string {
  const lagos = new Date(now + 3600_000);
  const next = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate() + 1) - 3600_000;
  const mins = Math.max(0, Math.floor((next - now) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** start.ng/shop: today's stock (it changes at midnight Nigeria time), the featured picks 20% off first. Only common,
 *  uncommon and rare items are ever sold, plus Limited ones during their event; the rarest are earned only. */
export default function ShopPage({ user, onSignIn }: PageProps) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<Item | null>(null);
  const [trying, setTrying] = useState<Item | null>(null);
  const worn = useWorn(user?.id ?? null);
  const base = useMemo(() => user?.character?.style ?? styleFor(user?.id ?? 0), [user]);
  const tryLook = useMemo(() => (trying ? dressed(base, withItem(worn ?? [], trying.key, trying.slot)) : null), [base, worn, trying]);
  const [busy, setBusy] = useState(false);
  const tryRef = useDialog(!!trying, () => setTrying(null));
  const buyRef = useDialog(!!confirm, () => { if (!busy) setConfirm(null); }); // not while it's buying
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [tab, setTabState] = useState<"shop" | "wardrobe">(() => (location.hash === "#wardrobe" ? "wardrobe" : "shop"));
  const setTab = (t: "shop" | "wardrobe") => { setTabState(t); history.replaceState(null, "", t === "shop" ? "/shop" : "/shop#wardrobe"); };

  useEffect(() => setSeo(PAGES.shop), []);
  useEffect(() => {
    getShop().then(setShop).catch(() => setMessage({ ok: false, text: "Couldn't load the shop. Try again in a moment." }));
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    // A new account (or signing out) starts from nothing, and a late answer for the last one is ignored.
    setBalance(null);
    setOwned(new Set());
    if (!user) return;
    let current = true;
    getWallet().then((w) => { if (current) setBalance(w.balance); }).catch(() => {});
    getWardrobe().then((w) => { if (current) setOwned(new Set(w.owned.map((o) => o.key))); }).catch(() => {});
    return () => { current = false; };
  }, [user?.id]);

  async function purchase(item: Item) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await buy(item.key);
      setBalance(res.balance);
      setOwned((o) => new Set(o).add(item.key));
      // Bought, not unlocked: don't show the unlock popup for it.
      window.dispatchEvent(new CustomEvent("wardrobe:seen", { detail: item.key }));
      changed();
      setMessage({ ok: true, text: `${item.name} is yours. Wear it from My wardrobe.` });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't buy it" });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const tile = (item: Item, featured: boolean) => {
    const have = owned.has(item.key);
    const short = balance !== null && item.price !== null && balance < item.price;
    return (
      <ItemTile key={item.key} item={item}>
        <span className="wd-price">🪙 {item.price?.toLocaleString()}{featured && <span className="tag">20% off</span>}</span>
        <button type="button" className="link wd-try" onClick={() => setTrying(item)}>Try on</button>
        {have ? (
          <span className="tag done">Yours</span>
        ) : !user ? (
          <button type="button" className="ghost" onClick={onSignIn}>Sign in to buy</button>
        ) : (
          <button type="button" disabled={busy || short} title={short ? `You need ${coins(item.price! - balance!)} more` : undefined}
            onClick={() => setConfirm(item)}>{short ? "Not enough coins" : "Buy"}</button>
        )}
      </ItemTile>
    );
  };

  return (
    <section className="container wd-page">
      <header className="shop-hero">
        <div>
          <h1>Shop</h1>
          <p className="tournament-sub">Spend the coins you earn playing, then wear what you own in every game. Epic and Legendary items can't be bought: <button type="button" className="link" onClick={() => setTab("wardrobe")}>earn them</button>.</p>
        </div>
        <span className="shop-restock">New stock in <b>{untilRestock(now)}</b></span>
      </header>

      <div className="segmented wd-tabs" role="group" aria-label="Shop or wardrobe">
        <button type="button" className={tab === "shop" ? "on" : ""} aria-pressed={tab === "shop"} onClick={() => setTab("shop")}>Today's shop</button>
        <button type="button" className={tab === "wardrobe" ? "on" : ""} aria-pressed={tab === "wardrobe"} onClick={() => setTab("wardrobe")}>My wardrobe</button>
      </div>

      {message && <p className={message.ok ? "wd-ok" : "error"} role="status">{message.text}</p>}
      {tab === "wardrobe" ? (
        <WardrobeTab user={user} onSignIn={onSignIn} />
      ) : !shop ? (
        !message && <p className="board-sub">Loading…</p>
      ) : (
        <>
          <h3 className="wd-heading">Featured today</h3>
          <ul className="wd-grid featured">{shop.featured.map((i) => tile(i, true))}</ul>
          <h3 className="wd-heading">Everything else</h3>
          <ul className="wd-grid">{shop.items.map((i) => tile(i, false))}</ul>
        </>
      )}

      {trying && tryLook && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setTrying(null); }}>
          <div ref={tryRef} tabIndex={-1} className={`card wd-tryon r-${trying.rarity}`} role="dialog" aria-modal="true" aria-labelledby="wd-try-title">
            <Suspense fallback={<p className="board-sub">Loading…</p>}><Viewer style={tryLook} className="wd-viewer" /></Suspense>
            <h3 id="wd-try-title">{trying.name}</h3>
            <p className="note"><span className={`wd-rarity r-${trying.rarity}`}>{trying.rarity}</span> 🪙 {trying.price?.toLocaleString()} · Drag to turn</p>
            <div className="creator-actions">
              {user && !owned.has(trying.key) && (
                <button type="button" disabled={balance !== null && trying.price !== null && balance < trying.price}
                  onClick={() => { setConfirm(trying); setTrying(null); }}>Buy</button>
              )}
              <button type="button" className="ghost" onClick={() => setTrying(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) setConfirm(null); }}>
          <div ref={buyRef} tabIndex={-1} className="card" role="dialog" aria-modal="true" aria-labelledby="wd-buy-title">
            <h3 id="wd-buy-title">Buy {confirm.name}?</h3>
            <p className="note">It costs {coins(confirm.price ?? 0)}. You'll have {coins((balance ?? 0) - (confirm.price ?? 0))} left. Coins can't be refunded.</p>
            <div className="creator-actions">
              <button type="button" disabled={busy} onClick={() => purchase(confirm)}>{busy ? "Buying…" : "Buy it"}</button>
              <button type="button" className="ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
