import Phaser from 'phaser';
import { map, terminalFor, terminalRoute } from '../prototype/map.js';
import { animateCharacter, playShock, createTextures, preloadCharacters, sizeCharacter } from '../prototype/assets/createTextures.js';
import { drawArchive, drawSabotages, preloadArchive } from '../prototype/scenes/drawArchive.js';
// Read-only view of one live raid: the defender's archive, both players, shocks.
// Loaded lazily by the teacher page so Phaser is only fetched once a raid happens.
const ROLE_ICON = { attacker: '⚡', defender: '🏃' };

class Spectator extends Phaser.Scene {
  constructor(onReady) { super('Spectator'); this.onReady = onReady; }
  preload() { preloadArchive(this); preloadCharacters(this); }
  create() {
    createTextures(this);
    drawArchive(this);
    this.overlay = this.add.graphics().setDepth(5);
    this.overlayLabels = [];
    this.actors = {};
    this.raid = null;
    this.cameras.main.setBounds(0, 0, map.width, map.height);
    this.cameras.main.centerOn(map.width / 2, map.height / 2);
    this.onReady(this);
  }
  show(raid) {
    this.clear();
    this.raid = raid;
    this.overlayLabels = drawSabotages(this, this.overlay, raid.room ?? []);
    for (const role of ['attacker', 'defender']) {
      const who = raid[role];
      const start = who.player ?? (role === 'attacker' ? map.entry : null);
      const sprite = sizeCharacter(this.add.sprite(start?.x ?? map.spawn.x, start?.y ?? map.spawn.y, who.team === 'red' ? 'red' : 'blue')).setVisible(Boolean(start));
      const label = this.add.text(0, 0, `${ROLE_ICON[role]} ${who.name}`, { fontSize: '11px', fontFamily: 'sans-serif', color: who.team === 'red' ? '#ffd6d0' : '#d6e8ff', backgroundColor: who.team === 'red' ? '#3d1a1acc' : '#13284acc', padding: { x: 3, y: 1 } }).setOrigin(.5).setDepth(20).setVisible(Boolean(start));
      this.actors[role] = { sprite, label, team: who.team, target: start ? { ...start, direction: 'down', moving: false } : null, receivedAt: 0 };
    }
    this.cameras.main.flash(250, 255, 220, 120);
  }
  move(role, player) {
    const actor = this.actors[role];
    if (!actor || !player) return;
    if (!actor.target) { actor.sprite.setPosition(player.x, player.y).setVisible(true); actor.label.setVisible(true); }
    actor.target = player; actor.receivedAt = performance.now();
  }
  shock({ stolen, defender }) {
    const actor = this.actors.defender;
    if (!actor) return;
    if (defender) this.move('defender', defender);
    const target = actor.sprite;
    const attacker = this.actors.attacker;
    playShock(attacker.sprite, attacker.team, 'cast', target, attacker.target?.direction);
    playShock(target, actor.team, 'hit', attacker.sprite, actor.target?.direction);
    this.cameras.main.shake(250, 0.008);
    const bolt = this.add.text(target.x, target.y - 30, stolen ? `⚡ -${stolen}` : '⚡', { fontSize: '16px', fontFamily: 'sans-serif', color: '#ffe36e', stroke: '#2b1d00', strokeThickness: 3 }).setOrigin(.5).setDepth(30);
    this.tweens.add({ targets: bolt, y: target.y - 56, alpha: 0, duration: 900, onComplete: () => bolt.destroy() });
    let flashes = 0;
    this.time.addEvent({ delay: 90, repeat: 9, callback: () => { flashes++; if (target.active) target.setTint(flashes % 2 ? 0xfff27a : 0xffffff); if (flashes === 10 && target.active) target.clearTint(); } });
  }
  clear() {
    for (const { sprite, label } of Object.values(this.actors)) { sprite.destroy(); label.destroy(); }
    this.actors = {}; this.raid = null;
    this.overlay.clear(); this.overlayLabels.forEach(text => text.destroy()); this.overlayLabels = [];
    (this.stageParts ?? []).forEach(part => part.destroy()); this.stageParts = [];
  }
  // Staged scene for a last-second era flip: missions record no positions, so this acts it out.
  stageFlip({ name, team, era }, { onArrive, onFlip, onDone }) {
    this.clear();
    const route = terminalRoute(era), terminal = terminalFor(era), color = team === 'red' ? 0xff6f61 : 0x5ea8ff;
    const sprite = sizeCharacter(this.add.sprite(route[0].x, route[0].y, team === 'red' ? 'red' : 'blue'));
    const label = this.add.text(0, 0, name, { fontSize: '11px', fontFamily: 'sans-serif', color: team === 'red' ? '#ffd6d0' : '#d6e8ff', backgroundColor: team === 'red' ? '#3d1a1acc' : '#13284acc', padding: { x: 3, y: 1 } }).setOrigin(.5).setDepth(20);
    const actor = { sprite, label, team, target: { ...route[0], direction: 'left', moving: true }, receivedAt: performance.now(), terminal: null };
    this.actors.attacker = actor;
    this.cameras.main.centerOn(route[0].x, route[0].y);
    const legs = route.slice(1).map((to, i) => ({ from: route[i], to, length: Math.hypot(to.x - route[i].x, to.y - route[i].y) }));
    const total = legs.reduce((sum, leg) => sum + leg.length, 0);
    const walkTo = distance => {
      let left = distance;
      const leg = legs.find(item => { if (left <= item.length) return true; left -= item.length; return false; }) ?? legs.at(-1);
      const ratio = leg.length ? Math.min(1, left / leg.length) : 1, dx = leg.to.x - leg.from.x, dy = leg.to.y - leg.from.y;
      const direction = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      actor.target = { x: leg.from.x + dx * ratio, y: leg.from.y + dy * ratio, direction, moving: true };
      actor.receivedAt = performance.now();
    };
    const flip = () => {
      // Team-coloured copies peek out around a clean copy, so the glow follows the console's shape.
      const copy = (x, y) => this.add.image(terminal.x + x, terminal.y + y, 'restoration-console').setDisplaySize(terminal.width, terminal.height);
      const outline = [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, y]) => copy(x, y).setTintFill(color).setDepth(25));
      const face = copy(0, 0).setDepth(26);
      this.stageParts.push(...outline, face);
      this.tweens.add({ targets: outline, alpha: .12, duration: 240, yoyo: true, repeat: 4, ease: 'Sine.easeInOut' });
      this.cameras.main.flash(320, (color >> 16) & 255, (color >> 8) & 255, color & 255);
      this.cameras.main.shake(320, 0.009);
      onFlip();
      this.time.delayedCall(2400, onDone);
    };
    const type = () => {
      actor.target = { ...route.at(-1), direction: 'up', moving: false };
      actor.terminal = terminal;
      onArrive();
      const back = this.add.rectangle(terminal.x, terminal.y - 30, 52, 7, 0x05080c, .9).setDepth(30);
      const bar = this.add.rectangle(terminal.x - 25, terminal.y - 30, 1, 3, color).setOrigin(0, .5).setDepth(31);
      this.stageParts.push(back, bar);
      this.tweens.addCounter({ from: 1, to: 50, duration: 1500, onUpdate: tween => { bar.width = tween.getValue(); }, onComplete: () => { back.destroy(); bar.destroy(); flip(); } });
    };
    this.tweens.addCounter({ from: 0, to: total, duration: total / 150 * 1000, onUpdate: tween => walkTo(tween.getValue()), onComplete: type });
  }
  update(time, delta) {
    const alpha = 1 - Math.exp(-delta / 65);
    const visible = [];
    for (const actor of Object.values(this.actors)) {
      const { sprite, label, target } = actor;
      if (!target) continue;
      sprite.x += (target.x - sprite.x) * alpha; sprite.y += (target.y - sprite.y) * alpha;
      const moving = target.moving && performance.now() - actor.receivedAt < 600;
      animateCharacter(sprite, actor.team, target.direction ?? 'down', moving, actor.terminal ?? null);
      label.setPosition(sprite.x, sprite.y + (actor.terminal ? 30 : -38));  // Keep the name off the terminal.
      visible.push(sprite);
    }
    // Keep both players in frame: centre on them and zoom to fit with some margin.
    const camera = this.cameras.main;
    if (!visible.length) return;
    const xs = visible.map(s => s.x), ys = visible.map(s => s.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const zoom = Phaser.Math.Clamp(Math.min(this.scale.width / (maxX - minX + 320), this.scale.height / (maxY - minY + 260)), 0.5, 2.2);
    camera.setZoom(camera.zoom + (zoom - camera.zoom) * Math.min(1, delta / 300));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const mid = camera.midPoint;
    camera.centerOn(mid.x + (cx - mid.x) * Math.min(1, delta / 200), mid.y + (cy - mid.y) * Math.min(1, delta / 200));
  }
}

export function createSpectator(parent) {
  let scene = null; const queue = [];
  const run = fn => (scene ? fn(scene) : queue.push(fn));
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, backgroundColor: '#101b25', pixelArt: true, roundPixels: true, antialias: false,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [new Spectator(ready => { scene = ready; queue.splice(0).forEach(fn => fn(scene)); })],
  });
  return {
    show: raid => run(s => s.show(raid)),
    move: (role, player) => run(s => s.move(role, player)),
    shock: event => run(s => s.shock(event)),
    clear: () => run(s => s.clear()),
    ready: fn => run(() => fn()),
    stageFlip: (plan, hooks) => run(s => s.stageFlip(plan, hooks)),
    destroy: () => { queue.length = 0; scene = null; game.destroy(true); },
  };
}
