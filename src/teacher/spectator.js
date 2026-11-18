import Phaser from 'phaser';
import { map } from '../prototype/map.js';
import { createTextures } from '../prototype/assets/createTextures.js';
import { drawArchive, drawSabotages } from '../prototype/scenes/drawArchive.js';
// Read-only view of one live raid: the defender's archive, both players, shocks.
// Loaded lazily by the teacher page so Phaser is only fetched once a raid happens.
const TEAM_TINT = { blue: 0x8fc3ff, red: 0xff9a8f };
const ROLE_ICON = { attacker: '⚡', defender: '🏃' };

class Spectator extends Phaser.Scene {
  constructor(onReady) { super('Spectator'); this.onReady = onReady; }
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
      const sprite = this.add.sprite(start?.x ?? map.spawn.x, start?.y ?? map.spawn.y, 'player-down-0').setTint(TEAM_TINT[who.team] ?? 0xffffff).setDepth(10).setVisible(Boolean(start));
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
    this.cameras.main.shake(250, 0.008);
    const bolt = this.add.text(target.x, target.y - 30, stolen ? `⚡ -${stolen}` : '⚡', { fontSize: '16px', fontFamily: 'sans-serif', color: '#ffe36e', stroke: '#2b1d00', strokeThickness: 3 }).setOrigin(.5).setDepth(30);
    this.tweens.add({ targets: bolt, y: target.y - 56, alpha: 0, duration: 900, onComplete: () => bolt.destroy() });
    let flashes = 0;
    this.time.addEvent({ delay: 90, repeat: 9, callback: () => { flashes++; if (target.active) target.setTint(flashes % 2 ? 0xfff27a : 0xffffff); if (flashes === 10 && target.active) target.setTint(TEAM_TINT[actor.team]); } });
  }
  clear() {
    for (const { sprite, label } of Object.values(this.actors)) { sprite.destroy(); label.destroy(); }
    this.actors = {}; this.raid = null;
    this.overlay.clear(); this.overlayLabels.forEach(text => text.destroy()); this.overlayLabels = [];
  }
  update(time, delta) {
    const alpha = 1 - Math.exp(-delta / 65);
    const visible = [];
    for (const actor of Object.values(this.actors)) {
      const { sprite, label, target } = actor;
      if (!target) continue;
      sprite.x += (target.x - sprite.x) * alpha; sprite.y += (target.y - sprite.y) * alpha;
      const moving = target.moving && performance.now() - actor.receivedAt < 600;
      sprite.anims.play(`${moving ? 'walk' : 'idle'}-${target.direction ?? 'down'}`, true);
      label.setPosition(sprite.x, sprite.y - 26);
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
  new Phaser.Game({
    type: Phaser.AUTO, parent, backgroundColor: '#101b25', pixelArt: true, roundPixels: true, antialias: false,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [new Spectator(ready => { scene = ready; queue.splice(0).forEach(fn => fn(scene)); })],
  });
  return {
    show: raid => run(s => s.show(raid)),
    move: (role, player) => run(s => s.move(role, player)),
    shock: event => run(s => s.shock(event)),
    clear: () => run(s => s.clear()),
  };
}
