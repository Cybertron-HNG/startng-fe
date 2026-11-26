import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { listGames, me, trackPlay } from "../api";
import { styleFor } from "../character";
import { buildHuman, Human } from "./human";
import { arcadeGames, buildArcade } from "./arcade";
import { playableUrl, toCard, type Game } from "../games";
import { buildPark, PLAYER_RADIUS, seatSpot } from "./world";
import { LiveRoom, Player } from "./net";
import { createChat } from "./chat";
import { hourNow, startClock } from "./clock";
import { isTouchDevice } from "./device";
import { createJoystick } from "./joystick";

const WALK = 3.2; // metres a second
const RUN = 6;
const WORLD = 58; // keep inside the server's limit (60)
const SEND_EVERY = 0.1; // seconds between position updates
const AWAY_MS = 2 * 60 * 1000; // a tab hidden this long leaves the room (see "Stepping away")
const BUBBLE_MS = 10000; // how long what someone said stays above their head
const SKY_EVERY = 5; // seconds between moving the sky on to the time of day now

type Bubble = { object: CSS2DObject; el: HTMLElement; until: number };
type Avatar = { human: Human; label: CSS2DObject; target: { x: number; z: number; ry: number }; moving: boolean; bubble: Bubble | null };

/**
 * Starts the Hangout inside `root` (the markup in Hangout.tsx). Returns a function that stops it.
 * start.ng owns sign-in, so the signed-in player comes straight from the app's own session.
 */
export function startHangout(root: HTMLElement): () => void {
  const find = <T extends HTMLElement>(selector: string) => {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`The Hangout is missing ${selector}`);
    return el;
  };
  const ui = {
    overlay: find(".hangout-overlay"), title: find(".hangout-panel h1"), message: find(".hangout-panel p"), action: find<HTMLButtonElement>(".hangout-panel button"),
    online: find(".hangout-online"), status: find(".hangout-status"), hint: find(".hangout-hint"), touchHint: find(".hangout-hint-touch"),
    arcade: find(".hangout-arcade"), arcadeName: find(".hangout-arcade b"), arcadePlay: find<HTMLButtonElement>(".hangout-arcade button"),
  };
  // On a phone or tablet there's no keyboard, so there's an on-screen stick and a Wave button.
  const touch = isTouchDevice();
  root.classList.toggle("touch", touch);
  const listeners: [EventTarget, string, EventListener, AddEventListenerOptions?][] = [];
  const listen = <E extends Event>(target: EventTarget, type: string, fn: (e: E) => void, options?: AddEventListenerOptions) => {
    target.addEventListener(type, fn as EventListener, options);
    listeners.push([target, type, fn as EventListener, options]);
  };
  let stopped = false;

  // ---- scene ------------------------------------------------------------------

  const canvas = find<HTMLCanvasElement>(".hangout-scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const labels = new CSS2DRenderer();
  labels.domElement.className = "hangout-labels";
  root.append(labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  const park = buildPark(scene, touch ? 1024 : 2048); // sharper shadows cost more, which phones can't spare
  // The arcade (arcade.ts): machines for the most played games. Walk up to one and press play.
  const arcade = buildArcade(scene);
  listGames().then((games) => { if (!stopped) arcade.setGames(arcadeGames(games.map(toCard))); }).catch(() => {});
  let atMachine: Game | null = null;
  function showMachine(game: Game | null) {
    if (game === atMachine) return;
    atMachine = game;
    ui.arcade.hidden = !game;
    if (game) ui.arcadeName.textContent = game.title;
  }
  function playMachine() {
    if (!atMachine) return;
    stopMoving();
    trackPlay(atMachine.slug);
    // A new tab, so the park (and your place in it) is still here when you come back.
    window.open(playableUrl(atMachine.url), "_blank", "noopener");
  }

  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h, false);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  listen(window, "resize", resize);
  resize();

  // ---- people ------------------------------------------------------------------
  // Only people who are here right now are in the park: each is a live, moving character that
  // only its owner controls. Someone who leaves is gone until they come back.

  const avatars = new Map<number, Avatar>();
  let myId: number | null = null;

  function nameTag(name: string, kind: "you" | "here", height: number) {
    const el = document.createElement("div");
    el.className = kind === "here" ? "hangout-tag" : `hangout-tag ${kind}`;
    el.textContent = kind === "you" ? `${name} (you)` : name;
    const tag = new CSS2DObject(el);
    tag.position.set(0, height, 0);
    return tag;
  }

  function addAvatar(p: Player) {
    removeAvatar(p.id);
    const human = buildHuman(p.style ?? styleFor(p.id));
    const label = nameTag(p.name, p.id === myId ? "you" : "here", 2.15);
    human.root.add(label);
    // Not moved yet: standing up in front of their seat (or mid-park if they have none).
    const spot = p.seat != null ? seatSpot(p.seat) : null;
    const x = p.x ?? spot?.stand.x ?? 0;
    const z = p.z ?? spot?.stand.z ?? 0;
    const ry = p.x != null ? p.ry : spot?.ry ?? 0;
    human.root.position.set(x, 0, z);
    human.root.rotation.y = ry;
    scene.add(human.root);
    avatars.set(p.id, { human, label, target: { x, z, ry }, moving: p.moving, bubble: null });
  }

  // What someone said, in a box with an arrow, above their name. It goes after a while, and while
  // the chat sidebar is open (the CSS hides it; the sidebar shows everything).
  function showBubble(id: number, text: string) {
    const a = avatars.get(id);
    if (!a) return;
    if (!a.bubble) {
      const anchor = document.createElement("div");
      anchor.className = "hangout-bubble-anchor";
      const el = document.createElement("div");
      el.className = id === myId ? "hangout-bubble you" : "hangout-bubble";
      anchor.append(el);
      const object = new CSS2DObject(anchor);
      object.position.set(0, 2.15, 0);
      a.human.root.add(object);
      a.bubble = { object, el, until: 0 };
    }
    a.bubble.el.textContent = text;
    a.bubble.el.hidden = false;
    a.bubble.until = performance.now() + BUBBLE_MS;
  }

  function removeAvatar(id: number) {
    const a = avatars.get(id);
    if (!a) return;
    a.human.root.remove(a.label);
    a.label.element.remove();
    if (a.bubble) {
      a.human.root.remove(a.bubble.object);
      a.bubble.object.element.remove();
    }
    scene.remove(a.human.root);
    a.human.dispose();
    avatars.delete(id);
  }

  function clearAvatars() {
    for (const id of [...avatars.keys()]) removeAvatar(id);
  }

  function showOnline() {
    const n = avatars.size;
    ui.online.textContent = `${n} here now`;
    ui.online.hidden = n === 0;
  }

  // ---- overlay ------------------------------------------------------------------

  let overlayAction: (() => void) | null = null;
  function showOverlay(title: string, message: string, button: string | null = null, onClick: (() => void) | null = null) {
    ui.title.textContent = title;
    ui.message.textContent = message;
    ui.action.hidden = !button;
    if (button) ui.action.textContent = button;
    overlayAction = onClick;
    ui.overlay.hidden = false;
  }
  listen(ui.action, "click", () => overlayAction?.());

  // Sends the player to start.ng's sign-in, which brings them back here afterwards.
  const signIn = () => location.assign(`/?return_to=${encodeURIComponent(location.href)}`);

  function showSignIn() {
    room.stop();
    chat.setEnabled(false);
    clearAvatars();
    myId = null;
    showOnline();
    showOverlay(
      "The Hangout",
      "Sign in with start.ng to come in. Your start.ng character is your avatar, and everyone here sees you walk and wave.",
      "Sign in with start.ng",
      signIn,
    );
  }

  // ---- chat -------------------------------------------------------------------------

  const chat = createChat(root, (text) => room.send({ type: "chat", text }), () => keys.clear());

  // ---- the live room ---------------------------------------------------------------

  const room: LiveRoom = new LiveRoom({
    onMessage(msg) {
      if (msg.type === "welcome") {
        clearAvatars();
        myId = msg.you;
        msg.players.forEach(addAvatar);
        chat.setSelf(myId);
        chat.reset(msg.chat ?? []);
        chat.setEnabled(true);
        ui.overlay.hidden = true;
        ui.status.hidden = true;
        ui.hint.hidden = false;
        ui.touchHint.hidden = false;
      } else if (msg.type === "join") {
        addAvatar(msg.player);
      } else if (msg.type === "move") {
        const a = avatars.get(msg.id);
        if (a && msg.id !== myId) {
          a.target = { x: msg.x, z: msg.z, ry: msg.ry };
          a.moving = msg.moving;
        }
      } else if (msg.type === "wave") {
        avatars.get(msg.id)?.human.wave();
      } else if (msg.type === "leave") {
        removeAvatar(msg.id); // gone from the park until they come back
      } else if (msg.type === "chat") {
        chat.add(msg);
        showBubble(msg.id, msg.text);
      }
      showOnline();
    },
    onReconnecting(reason) {
      chat.setEnabled(false);
      ui.status.textContent = reason === "full" ? "The Hangout is full. Trying again…" : "Reconnecting…";
      ui.status.hidden = false;
    },
    onBlocked(reason) {
      chat.setEnabled(false);
      if (reason === "replaced") {
        room.stop();
        clearAvatars();
        myId = null;
        showOnline();
        showOverlay("You joined from somewhere else", "The Hangout is open in another tab or window.", "Play here", () => {
          showOverlay("The Hangout", "Coming in…");
          room.rejoin();
        });
      } else if (reason === "unavailable") {
        room.stop();
        clearAvatars();
        myId = null;
        showOnline();
        showOverlay("The Hangout", "The Hangout isn't open right now. Try again in a little while.");
      } else {
        showSignIn();
      }
    },
  });

  // ---- controls -------------------------------------------------------------------

  const keys = new Set<string>();
  const stick = touch ? createJoystick(find(".hangout-joystick")) : null;
  listen(find(".hangout-wave"), "click", () => wave());
  listen(ui.arcadePlay, "click", () => playMachine());
  const KEYS = {
    forward: ["KeyW", "ArrowUp"], back: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
    run: ["ShiftLeft", "ShiftRight"],
  };
  const held = (name: keyof typeof KEYS) => KEYS[name].some((k) => keys.has(k));

  listen<KeyboardEvent>(window, "keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === "Enter" || e.code === "NumpadEnter") {
      // Only from the game itself, so Enter still presses a focused button.
      if (e.target === document.body || e.target === canvas || e.target === root) {
        e.preventDefault();
        chat.focusInput();
      }
      return;
    }
    if (e.code === "KeyE" && atMachine && !e.repeat) {
      playMachine();
      return;
    }
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === "Space" && !e.repeat) wave();
  });
  listen<KeyboardEvent>(window, "keyup", (e) => keys.delete(e.code));
  // Leaving the page mid-walk (another tab or window): keyup never comes and the game loop pauses,
  // so stop here and tell the room now. Otherwise everyone else sees you walking on the spot.
  listen(window, "blur", () => stopMoving());
  listen(document, "visibilitychange", () => {
    if (document.visibilityState === "hidden") stopMoving();
  });
  listen(root, "focusin", (e) => {
    if (e.target instanceof HTMLInputElement) keys.clear(); // typing is not walking
  });

  let lastWave = -10;
  function wave() {
    const mine = myId === null ? undefined : avatars.get(myId);
    if (!mine || clock.elapsedTime - lastWave < 1) return; // the server drops faster waves too
    lastWave = clock.elapsedTime;
    mine.human.wave();
    room.send({ type: "wave" });
  }

  // Drag to look around, scroll to zoom. Start with the sun in the sky off to one side, so it's in
  // view but players are lit from the side rather than standing in their own shadow.
  let yaw = (() => {
    // Face the sun or moon, a little to one side, so it's in view without sitting under the top bar.
    const { dir, moon } = park.setTime(hourNow());
    return Math.atan2(-dir.x, -dir.z) + (moon ? -0.3 : 0.5);
  })();
  let pitch = 0.24;
  let distance = 6.5;
  let dragging: { x: number; y: number } | null = null;
  listen<PointerEvent>(canvas, "pointerdown", (e) => {
    if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur(); // back to the game
    dragging = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  listen<PointerEvent>(canvas, "pointermove", (e) => {
    if (!dragging) return;
    yaw -= (e.clientX - dragging.x) * 0.006;
    pitch = THREE.MathUtils.clamp(pitch + (e.clientY - dragging.y) * 0.004, 0.08, 1.25);
    dragging = { x: e.clientX, y: e.clientY };
  });
  listen(canvas, "pointerup", () => { dragging = null; });
  listen<WheelEvent>(canvas, "wheel", (e) => {
    e.preventDefault();
    distance = THREE.MathUtils.clamp(distance * (1 + Math.sign(e.deltaY) * 0.1), 3, 16);
  }, { passive: false });

  // ---- loop -------------------------------------------------------------------------

  const angleTo = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const clock = new THREE.Clock();
  const focus = new THREE.Vector3();
  let sentAt = 0;
  let skyAge = 0;
  let sent: { x: number; z: number; ry: number; moving: boolean } | null = null;

  function stopMoving() {
    keys.clear();
    stick?.release();
    const mine = myId === null ? undefined : avatars.get(myId);
    if (!mine) return;
    mine.human.setWalking(0);
    if (sent?.moving && room.connected) {
      sent = { ...sent, moving: false };
      room.send({ type: "move", ...sent });
    }
  }

  function step(dt: number, t: number) {
    skyAge += dt;
    if (skyAge >= SKY_EVERY) {
      skyAge = 0;
      park.setTime(hourNow());
    }
    const now = performance.now();
    for (const a of avatars.values()) {
      if (a.bubble && !a.bubble.el.hidden && now > a.bubble.until) a.bubble.el.hidden = true;
    }
    const mine = myId === null ? undefined : avatars.get(myId);
    if (mine) {
      // Move relative to where the camera looks.
      let f = (held("forward") ? 1 : 0) - (held("back") ? 1 : 0);
      let r = (held("right") ? 1 : 0) - (held("left") ? 1 : 0);
      // The stick adds to the keys: up is forward, and pushed all the way out is running.
      const push = stick ? stick.read() : { x: 0, y: 0 };
      const pushed = Math.hypot(push.x, push.y);
      if (pushed > 0.15) {
        f -= push.y;
        r += push.x;
      }
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      let mx = fx * f - fz * r;
      let mz = fz * f + fx * r;
      const len = Math.hypot(mx, mz);
      const pos = mine.human.root.position;
      if (len > 0) {
        const running = held("run") || pushed > 0.85;
        mx /= len;
        mz /= len;
        // stop at benches and trees, sliding along them (world.ts collide)
        const next = park.collide(
          THREE.MathUtils.clamp(pos.x + mx * (running ? RUN : WALK) * dt, -WORLD, WORLD),
          THREE.MathUtils.clamp(pos.z + mz * (running ? RUN : WALK) * dt, -WORLD, WORLD),
          pos.x,
          pos.z,
        );
        const clear = arcade.collide(next.x, next.z, PLAYER_RADIUS); // and at the arcade's machines
        pos.x = THREE.MathUtils.clamp(clear.x, -WORLD, WORLD);
        pos.z = THREE.MathUtils.clamp(clear.z, -WORLD, WORLD);
        const ry = mine.human.root.rotation.y;
        mine.human.root.rotation.y = ry + angleTo(ry, Math.atan2(mx, mz)) * Math.min(1, dt * 12);
        mine.human.setWalking(running ? 1.8 : 1);
      } else {
        mine.human.setWalking(0);
      }
      // Tell the room, about 10 times a second while something changes.
      const state = { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), ry: +mine.human.root.rotation.y.toFixed(3), moving: len > 0 };
      const changed = !sent || state.x !== sent.x || state.z !== sent.z || state.ry !== sent.ry || state.moving !== sent.moving;
      if (changed && t - sentAt >= SEND_EVERY && room.connected) {
        room.send({ type: "move", ...state });
        sent = state;
        sentAt = t;
      }
      focus.set(pos.x, 1.45, pos.z);
      showMachine(arcade.near(pos.x, pos.z));
    } else {
      showMachine(null);
      yaw += dt * 0.05; // nobody to follow: drift slowly around the park
      focus.set(0, 1.45, 0);
    }

    // Everyone else glides to where they last said they were.
    for (const [id, a] of avatars) {
      if (id !== myId) {
        const p = a.human.root.position;
        const k = Math.min(1, dt * 10);
        p.x += (a.target.x - p.x) * k;
        p.z += (a.target.z - p.z) * k;
        a.human.root.rotation.y += angleTo(a.human.root.rotation.y, a.target.ry) * k;
        a.human.setWalking(a.moving ? 1 : 0);
      }
      a.human.update(t);
    }

    camera.position.set(
      focus.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      focus.y + Math.sin(pitch) * distance,
      focus.z + Math.cos(yaw) * Math.cos(pitch) * distance,
    );
    camera.lookAt(focus);
    park.update(focus);
  }

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    step(dt, clock.elapsedTime);
    renderer.render(scene, camera);
    labels.render(scene, camera);
  });

  // ---- start --------------------------------------------------------------------------

  const stopClock = startClock(find(".hangout-clock"));

  showOverlay("The Hangout", "Coming in…");
  (async () => {
    const user = await me(localStorage.getItem("token")).catch(() => null);
    if (stopped) return;
    if (!user) showSignIn();
    else room.connect();
    // Signed in or out on start.ng in another tab: start again as whoever is signed in now.
    const recheck = async () => {
      if (document.visibilityState !== "visible") return;
      const now = await me(localStorage.getItem("token")).catch(() => undefined);
      if (now !== undefined && (now?.id ?? null) !== (user?.id ?? null)) location.reload(); // a failed check isn't a sign-out
    };
    listen(document, "visibilitychange", recheck);
    listen(window, "focus", recheck);
  })();

  // Stepping away: after AWAY_MS with the tab hidden, leave the room so others only see people
  // who are actually here. Coming back to the tab joins again.
  let awayTimer: ReturnType<typeof setTimeout> | undefined;
  let away = false;
  listen(document, "visibilitychange", () => {
    clearTimeout(awayTimer);
    if (document.visibilityState === "hidden") {
      awayTimer = setTimeout(() => {
        if (myId === null) return; // not in the room anyway
        away = true;
        room.stop();
        chat.setEnabled(false);
        clearAvatars();
        myId = null;
        showOnline();
        showOverlay("The Hangout", "You stepped away, so you left the park.");
      }, AWAY_MS);
    } else if (away) {
      away = false;
      showOverlay("The Hangout", "Coming in…");
      room.rejoin();
    }
  });

  return () => {
    stopped = true;
    clearTimeout(awayTimer);
    stopClock();
    chat.dispose();
    arcade.dispose();
    stick?.dispose();
    root.classList.remove("touch");
    room.stop();
    renderer.setAnimationLoop(null);
    for (const [target, type, fn, options] of listeners) target.removeEventListener(type, fn, options);
    clearAvatars();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      }
    });
    labels.domElement.remove();
    renderer.dispose();
  };
}
