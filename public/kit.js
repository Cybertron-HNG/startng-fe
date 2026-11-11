// start.ng Kit. One line connects a game to start.ng:
//   <script src="https://start.ng/kit.js" defer></script>
// It adds a "← start.ng" back button and a "Made on start.ng" badge, and gives the
// game window.startng: sign-in, the player, score saving, the leaderboard and
// gameOver(), which saves the score and shows the end-of-round card.
// Built on the same hidden /connect page as the manual helper in docs.md, so
// the game still never sees passwords, tokens or emails.
//
// Options, as attributes on the script tag:
//   data-back="off"       no back button
//   data-badge="off"      no badge
//   data-position="right" put the back button top right instead of top left
(() => {
  if (window.startng) return;

  // Games on *.start.localhost (local testing) talk to the local website and API.
  const LOCAL = location.hostname.endsWith('.start.localhost');
  const START_NG = LOCAL ? 'http://start.localhost:5173' : 'https://start.ng';
  const API_URL = LOCAL ? 'http://localhost:8000' : 'https://api.start.ng';
  const VERSION = '0.2.0';
  // start.ng's connect page only answers games served from *.start.ng.
  const ON_START_NG = location.hostname.endsWith('.start.ng') || LOCAL;
  // The start.ng homepage opens games with ?guest when the player chose "play as guest".
  const CHOSE_GUEST = new URLSearchParams(location.search).has('guest');
  const script = document.currentScript;
  const option = (name) => script?.dataset?.[name];

  // ---------- Talking to start.ng (same protocol as the manual helper) ----------

  // Random ids from the browser's secure generator (not Math.random).
  const randomId = () => (crypto.randomUUID ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(36)).join(''));

  let frame;
  function connectFrame() {
    frame ??= new Promise((resolve, reject) => {
      const el = document.createElement('iframe');
      el.src = `${START_NG}/connect`;
      el.hidden = true;
      el.onload = () => resolve(el);
      el.onerror = reject;
      document.body.append(el);
    });
    return frame;
  }

  // Sends a message and resolves to start.ng's reply, or null if it didn't answer.
  async function ask(message, replyType, timeoutMs = 5000) {
    if (!ON_START_NG) return null;
    let el;
    try {
      el = await connectFrame();
    } catch {
      return null;
    }
    return new Promise((resolve) => {
      const requestId = randomId();
      const done = (reply) => {
        clearTimeout(timer);
        removeEventListener('message', onMessage);
        resolve(reply);
      };
      const timer = setTimeout(() => done(null), timeoutMs);
      function onMessage(e) {
        // Only trust replies from start.ng's own connect frame.
        if (e.origin !== START_NG || e.source !== el.contentWindow) return;
        if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
      }
      addEventListener('message', onMessage);
      el.contentWindow.postMessage({ ...message, requestId }, START_NG);
    });
  }

  // Fire and forget (no reply expected). Used for session telemetry.
  async function tell(message) {
    if (!ON_START_NG) return;
    try {
      const el = await connectFrame();
      el.contentWindow.postMessage(message, START_NG);
    } catch {
      // Telemetry must never break a game.
    }
  }

  async function getPlayer() {
    const reply = await ask({ type: 'startng:whoami' }, 'startng:user');
    if (!reply) return null;
    return { user: reply.user ?? null, guest: reply.guest ?? null };
  }

  function onPlayerChange(fn) {
    let lastId;
    const check = async () => {
      const player = await getPlayer();
      if (!player) return;
      const id = player.user?.id ?? null;
      if (id !== lastId) {
        lastId = id;
        fn(player);
      }
    };
    addEventListener('focus', check);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    check();
  }

  function signIn() {
    // The address comes back with its query (an invite link is ?room=CODE) but not ?guest.
    const back = new URLSearchParams(location.search);
    back.delete('guest');
    const query = back.toString();
    location.href = `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname + (query ? `?${query}` : ''))}`;
  }

  // Saves a run for a signed-in player: stats (matching startng.json) or a plain score.
  // Resolves to { ok: true, result: { best, improved, rank, stats } },
  // { ok: false, error }, or null if start.ng didn't answer.
  function saveRun(stats, score) {
    const message = stats ? { type: 'startng:score', stats } : { type: 'startng:score', score };
    return ask(message, 'startng:scoreSaved');
  }

  async function getLeaderboard(limit = 10) {
    const reply = await ask({ type: 'startng:leaderboard', limit }, 'startng:leaderboardData');
    return reply?.ok ? reply.entries : null;
  }

  // ---------- Session telemetry (C11) ----------
  // start, a heartbeat every 30 s while the tab is visible, and end. The connect
  // page ignores these until game_sessions exists on the server.

  const sessionId = randomId();
  let beat;
  function startBeats() {
    clearInterval(beat);
    beat = setInterval(() => tell({ type: 'startng:session', event: 'heartbeat', sessionId }), 30000);
  }
  function startTelemetry() {
    tell({ type: 'startng:session', event: 'start', sessionId, kit: VERSION });
    startBeats();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') startBeats();
      else clearInterval(beat);
    });
    addEventListener('pagehide', () => tell({ type: 'startng:session', event: 'end', sessionId }));
  }

  // ---------- UI: back button, badge, end card ----------
  // Everything lives in a shadow root so the game's CSS can't break it (and ours
  // can't break the game).

  const host = document.createElement('div');
  host.id = 'startng-kit';
  const root = host.attachShadow({ mode: 'open' });
  // Colours, buttons and the card follow start.ng's own look (src/styles.css), in
  // light and dark. Games can't read start.ng's theme, so dark follows the device.
  root.innerHTML = `<style>
    :host { all: initial;
      --bg: #f6f5ee; --card: #fffefa; --ink: #292a23; --muted: #6b6c63; --line: #e4e2d6;
      --lime: #d8fd71; --on-solid: #fff; --solid-hover: #000; --ok: #2e7d32; --scrim: rgba(41, 42, 35, .45); }
    @media (prefers-color-scheme: dark) { :host {
      --bg: #292a23; --card: #33342c; --ink: #f6f5ee; --muted: #b0b1a6; --line: #4a4b41;
      --on-solid: #292a23; --solid-hover: #fff; --ok: #7fd884; --scrim: rgba(20, 21, 17, .65); } }
    * { box-sizing: border-box; font: 500 14px/1.3 "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif; }
    .pill { position: fixed; z-index: 2147483000; display: inline-flex; align-items: center; gap: 4px;
      padding: 7px 12px; border-radius: 999px; background: var(--card); color: var(--ink);
      border: 1px solid var(--line); text-decoration: none; font-weight: 700; -webkit-tap-highlight-color: transparent; }
    .pill:hover { border-color: var(--ink); }
    .pill:focus-visible, button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
    .back { top: max(10px, env(safe-area-inset-top)); left: max(10px, env(safe-area-inset-left)); }
    .back.right { left: auto; right: max(10px, env(safe-area-inset-right)); }
    .badge { bottom: max(10px, env(safe-area-inset-bottom)); right: max(10px, env(safe-area-inset-right));
      font-size: 11px; padding: 4px 9px; background: var(--lime); color: #292a23; border-color: transparent; }
    .shade { position: fixed; inset: 0; z-index: 2147483001; display: grid; place-items: center;
      background: var(--scrim); padding: 16px; }
    .card { width: 100%; max-width: 360px; background: var(--card); color: var(--ink); border: 1px solid var(--line);
      border-radius: 18px; padding: 24px; display: grid; gap: 10px; text-align: center; box-shadow: 6px 6px 0 var(--lime); }
    .card h2 { margin: 0; font-size: 18px; font-weight: 700; }
    .score { font-size: 44px; font-weight: 700; line-height: 1; }
    .meta { color: var(--muted); margin: 0; min-height: 1.3em; }
    .unlocks { margin: 0; padding: 0; list-style: none; color: var(--ok); font-weight: 700; }
    .buttons { display: grid; gap: 8px; margin-top: 4px; }
    button { border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: var(--card);
      color: var(--ink); font-weight: 700; font-size: 15px; cursor: pointer; }
    button:hover { border-color: var(--ink); }
    button.primary { background: var(--ink); color: var(--on-solid); border-color: var(--ink); }
    button.primary:hover { background: var(--solid-hover); }
    button[hidden] { display: none; }
  </style>`;

  function el(tag, attrs = {}, text = '') {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text) node.textContent = text;
    return node;
  }

  function addChrome() {
    if (option('back') !== 'off') {
      const back = el('a', { class: 'pill back', href: `${START_NG}/`, 'aria-label': 'Back to start.ng' }, '← start.ng');
      if (option('position') === 'right') back.classList.add('right');
      root.append(back);
    }
    if (option('badge') !== 'off') {
      root.append(el('a', { class: 'pill badge', href: `${START_NG}/`, target: '_blank', rel: 'noopener' }, 'Made on start.ng'));
    }
    document.body.append(host);
  }

  // Opens an X post with the player's result and a link to the game (start.ng's
  // third game standard: "Share your result on X").

  async function shareScore({ score, rank } = {}) {
    const game = document.title || 'this game';
    const player = await getPlayer();
    const gameSlug = location.pathname.split('/').filter(Boolean).pop() || 'game';
    const shareUrl = player?.user ? `${START_NG}/s/score/${gameSlug}-${player.user.id}` : `${START_NG}/games/${gameSlug}`;
    const text = rank ? `I scored ${score ?? ''} (#${rank}) on ${game} on start.ng. Can you beat me?` : `I scored ${score ?? ''} on ${game} on start.ng. Can you beat me?`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${game} Score`, text, url: shareUrl });
        return;
      } catch (e) {
        if (e.name !== 'AbortError') console.debug(e);
      }
    }
    share({ score, text });
  }
  function share({ score, text } = {}) {
    const game = document.title || 'this game';
    const line = text ?? (score != null ? `I scored ${score} in ${game} on start.ng. Can you beat it?` : `Play ${game} on start.ng`);
    const url = location.origin + location.pathname;
    const post = /@playonstartng/i.test(line) ? line : line + ' @playonstartng'; // start.ng's account on X
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(post)}&url=${encodeURIComponent(url)}`;
    open(intent, '_blank', 'noopener');
  }


  // ---------- Rooms: refereed multiplayer (tic-tac-toe, chess ...) ----------
  // start.ng's server runs the rules, so a player can't cheat and a dropped player can come back.
  //   const room = await startng.rooms.create();       // a room with a code to share
  //   const room = await startng.rooms.join('K7M2QX');  // a friend's room
  //   const room = await startng.rooms.quickMatch();    // find someone to play
  //   room.on('state', ({ state, turn, result }) => draw(state));   room.send({ cell: 4 });
  // Games with a host (a quiz, bingo): the creator is room.host (seat 0). room.setup({...}), wait for 'setup_ok', then room.start().
  // Games start.ng does not referee use Relay rooms: startng.rooms.create({ seats: 4 }), room.broadcast(data), room.on('message', ({ from, data }) => ...),
  // room.updateState((state) => newState) and room.shared ({ version, data }), also sent to anyone who joins. See docs.md.
  // room.serverNow() is the server's clock in milliseconds: count down to the deadlines in state against it.
  // Players must be signed in with start.ng. Opening a room rejects with an Error whose message is 'signin' if they
  // aren't (call startng.signIn(), which brings them back to the same address, ?room=CODE included).
  const ROOM_EVENTS = ['open', 'welcome', 'state', 'join', 'away', 'back', 'waiting', 'no_match', 'setup_ok', 'rematch', 'message', 'room_state', 'state_conflict', 'error', 'closed', 'reconnecting'];
  const NO_RETRY = [4401, 4403, 4404, 4409, 4429]; // not signed in, full, no such room, replaced by another tab, too many tries
  let roomsBase = null; // where the API and rooms are, learned from the first ticket

  async function roomTicket() {
    const reply = await ask({ type: 'startng:ticket' }, 'startng:ticketData');
    if (!reply) throw new Error('start.ng did not answer');
    if (!reply.ok) throw new Error(/sign in/i.test(reply.error || '') ? 'signin' : reply.error || 'Could not join');
    roomsBase = { rooms: reply.roomsUrl, api: reply.apiUrl };
    return reply;
  }

  function openRoom(game, which, opts = {}) {
    const handlers = Object.fromEntries(ROOM_EVENTS.map((n) => [n, new Set()]));
    const room = { game, code: null, you: null, players: [], status: null, state: null, turn: null, result: null, host: null, clock: 0, max: null, shared: null, rematchAsked: [] };
    let ws;
    let closedForGood = false;
    let tries = 0;
    let ping;
    let target = which; // 'new', 'match' or a code; once there is a room, always its code

    const emit = (name, data) => handlers[name]?.forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });

    function apply(msg) {
      if (msg.now) room.clock = msg.now - Date.now(); // the server's clock minus this device's, so countdowns match the server
      if (msg.type === 'welcome') {
        Object.assign(room, { code: msg.room, you: msg.you, players: msg.players, status: msg.status, state: msg.state, turn: msg.turn, result: msg.result, host: msg.host ?? null, max: msg.max ?? null, shared: msg.shared ?? null, rematchAsked: [] });
        target = msg.room;
      } else if (msg.type === 'state') {
        Object.assign(room, { state: msg.state, turn: msg.turn, result: msg.result, status: msg.status });
      } else if (msg.type === 'join') {
        room.players = [...room.players.filter((p) => p.seat !== msg.player.seat), msg.player];
      } else if (msg.type === 'away' || msg.type === 'back') {
        room.players = room.players.map((p) => (p.seat === msg.seat ? { ...p, online: msg.type === 'back' } : p));
      } else if (msg.type === 'rematch') {
        room.rematchAsked = msg.seats;
      } else if (msg.type === 'room_state') {
        room.shared = { version: msg.version, data: msg.data };
      } else if (msg.type === 'error' && msg.code === 'state_conflict') {
        room.shared = { version: msg.version, data: msg.data };
      } else if (msg.type === 'closed') {
        closedForGood = true;
      }
    }

    async function connect() {
      const t = await roomTicket();
      const url = `${t.roomsUrl}?game=${encodeURIComponent(game)}&ticket=${encodeURIComponent(t.ticket)}&room=${encodeURIComponent(target)}${opts.seats && target === 'new' ? `&seats=${Number(opts.seats)}` : ''}`;
      await new Promise((resolve, reject) => {
        let opened = false;
        ws = new WebSocket(url);
        ws.onopen = () => { opened = true; tries = 0; resolve(); emit('open', room); };
        ws.onmessage = (e) => {
          let msg;
          try { msg = JSON.parse(e.data); } catch { return; }
          apply(msg);
          emit(msg.type, msg);
          if (msg.type === 'error' && msg.code === 'state_conflict') emit('state_conflict', msg);
        };
        ws.onclose = (e) => {
          clearInterval(ping);
          if (!opened) reject(new Error(NO_RETRY.includes(e.code) ? `closed:${e.code}` : 'Could not connect'));
          else if (!closedForGood && !NO_RETRY.includes(e.code)) retry();
          else if (!closedForGood) { closedForGood = true; emit('closed', { type: 'closed', reason: NO_RETRY.includes(e.code) ? `code_${e.code}` : 'closed' }); }
        };
        ws.onerror = () => {};
      });
      clearInterval(ping);
      ping = setInterval(() => ws?.readyState === 1 && ws.send('{"type":"ping"}'), 25000); // keeps the connection open
    }

    // After a dropped connection: try again with a new ticket, a little slower each time (the server holds the seat for 10 minutes).
    async function retry() {
      if (closedForGood) return;
      tries += 1;
      if (tries > 8) { closedForGood = true; emit('closed', { type: 'closed', reason: 'offline' }); return; }
      emit('reconnecting', { attempt: tries });
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** (tries - 1), 15000)));
      try { await connect(); } catch (e) { if (!closedForGood) retry(); }
    }

    const send = (msg) => { if (ws?.readyState === 1) ws.send(JSON.stringify(msg)); };
    Object.assign(room, {
      on(name, fn) { (handlers[name] ??= new Set()).add(fn); return () => handlers[name].delete(fn); },
      send: (move) => send({ type: 'move', data: move }),
      resign: () => send({ type: 'resign' }),
      // After a game ends: ask to play again in this room. 'rematch' events say who has asked (room.rematchAsked); once everyone has,
      // a new 'welcome' starts the game, with the seats moved round so someone else goes first (room.you can change).
      rematch: () => send({ type: 'rematch' }),
      playBot: () => send({ type: 'bot' }),
      // Games with a host (a quiz, bingo): the room's creator sets the game up, then starts it.
      setup: (data) => send({ type: 'setup', data }),
      start: () => send({ type: 'start' }),
      serverNow: () => Date.now() + room.clock,
      // Relay rooms (a game start.ng does not referee): pass a message to the others (or to one seat), and keep a small shared state.
      broadcast: (data, to) => send(to === undefined ? { type: 'send', data } : { type: 'send', to, data }),
      setState: (data) => send({ type: 'set_state', version: room.shared?.version ?? 0, data }),
      // Change the shared state from what it is now; if someone else changed it first, it asks again with the newer state.
      updateState(fn, tries = 5) {
        return new Promise((resolve, reject) => {
          const attempt = (left) => {
            const done = () => { offOk(); offBad(); };
            const offOk = room.on('room_state', (m) => { if (m.by === room.you) { done(); resolve(m.data); } });
            const offBad = room.on('state_conflict', () => { done(); if (left > 1) attempt(left - 1); else reject(new Error('The shared state kept changing')); });
            room.setState(fn(room.shared?.data ?? null));
          };
          attempt(tries);
        });
      },
      leave() { closedForGood = true; clearInterval(ping); ws?.close(1000); },
      inviteUrl: () => (room.code ? `${location.origin}${location.pathname}?room=${room.code}` : null),
    });
    // The first connection can fail on a shaky network (some networks drop IPv6 to start.ng), so try it three times with a
    // new ticket each time before giving up. A connection that never opened made no room, so trying again is safe.
    const first = async (left) => {
      try { await connect(); } catch (e) {
        if (e.message !== 'Could not connect' || left <= 1) throw e;
        await new Promise((r) => setTimeout(r, left === 3 ? 500 : 1500));
        return first(left - 1);
      }
    };
    return first(3).then(() => room);
  }

  const rooms = Object.freeze({
    // create() or create({ seats: 4 }) (Relay games: how many players, 2 to 8)
    create: (arg) => (typeof arg === 'object' && arg ? openRoom(arg.game ?? gameName(), 'new', arg) : openRoom(arg ?? gameName(), 'new')),
    join: (code, game = gameName()) => openRoom(game, String(code).trim().toUpperCase()),
    quickMatch: (game = gameName()) => openRoom(game, 'match'),
    // The room code in the address (?room=CODE), if the player came from an invite.
    codeFromUrl: () => (new URLSearchParams(location.search).get('room') || '').trim().toUpperCase() || null,
    // How many people are in this game's rooms or waiting for a match (no sign-in needed). null if it can't be told.
    async online(game = gameName()) {
      try {
        const res = await fetch(`${roomsBase?.api ?? API_URL}/rooms/online?game=${encodeURIComponent(game)}`);
        return res.ok ? (await res.json()).online : null;
      } catch { return null; }
    },
  });

  // lanedash.start.ng -> "lanedash"
  const gameName = () => location.hostname.split('.')[0];

  let card;
  function closeCard() {
    card?.remove();
    card = null;
  }

  // Saves the run (if the player is signed in) and shows the end-of-round card.
  // options: { score, stats, title, onPlayAgain }. Pass stats when the game's
  // startng.json lists them; otherwise score alone is saved. Resolves to
  // start.ng's save reply, or null when nothing was saved.
  async function gameOver({ score, stats, title = 'Game over', onPlayAgain } = {}) {
    closeCard();
    card = el('div', { class: 'shade', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    const box = el('div', { class: 'card' });
    const meta = el('p', { class: 'meta' }, ON_START_NG ? 'Saving your score…' : 'Scores save when the game runs on start.ng.');
    const unlocks = el('ul', { class: 'unlocks' });
    const buttons = el('div', { class: 'buttons' });

    const again = el('button', { type: 'button', class: 'primary' }, 'Play again');
    again.onclick = () => { closeCard(); onPlayAgain?.(); };
    const scoreCardBtn = el('button', { type: 'button', class: 'score-card-btn', hidden: '' }, 'Share score card 🏆');
    const shareBtn = el('button', { type: 'button' }, 'Share on X');
    shareBtn.onclick = () => share({ score });
    // Challenge a friend (B1) and Play next (A1) are owned by other features;
    // they appear once those contracts exist.
    const challenge = el('button', { type: 'button', hidden: '' }, 'Challenge a friend');
    const next = el('button', { type: 'button', hidden: '' }, 'Play next');
    buttons.append(again, scoreCardBtn, shareBtn, challenge, next);

    box.append(el('h2', {}, title), el('div', { class: 'score' }, String(score ?? '')), meta, unlocks, buttons);
    card.append(box);
    root.append(card);
    again.focus();

    if (!ON_START_NG) return null;
    const player = await getPlayer();
    if (!player?.user) {
      meta.textContent = 'Sign in to save your score.';
      const signInBtn = el('button', { type: 'button' }, 'Sign in with start.ng');
      signInBtn.onclick = signIn;
      buttons.insertBefore(signInBtn, shareBtn);
      return null;
    }
    const saved = await saveRun(stats, score);
    if (!saved?.ok) {
      meta.textContent = saved?.error || "Couldn't reach start.ng, so this score wasn't saved.";
      return saved;
    }
    const r = saved.result ?? {};
    meta.textContent = r.improved ? `New personal best! You're #${r.rank}.` : `Saved. Your best is still ${r.best} (#${r.rank}).`;
    if (saved?.ok && player?.user) {
      scoreCardBtn.onclick = () => shareScore({ score: r.best ?? score, rank: r.rank });
      scoreCardBtn.removeAttribute('hidden');
    }
    // D1 adds new awards to the score reply as unlocked: [...].
    for (const item of r.unlocked ?? saved.unlocked ?? []) unlocks.append(el('li', {}, `Unlocked: ${item.name ?? item.key ?? item}`));
    return saved;
  }

  addEventListener('keydown', (e) => { if (e.key === 'Escape' && card) closeCard(); });

  window.startng = Object.freeze({
    version: VERSION, onStartNg: ON_START_NG, choseGuest: CHOSE_GUEST,
    getPlayer, onPlayerChange, signIn, saveRun, getLeaderboard, gameOver, closeCard, share, shareScore, rooms,
  });

  const init = () => { addChrome(); startTelemetry(); };
  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
