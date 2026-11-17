import Phaser from 'phaser';
import { map, movementVector, nearestTerminal, isNearDoor, terminalSolid, doorFor, terminalFor } from '../map.js';
import { createTextures } from '../assets/createTextures.js';
const SHOCK_RANGE = 40;
const TEAM_TINT = { blue: 0x8fc3ff, red: 0xff9a8f };
export class DataCenter extends Phaser.Scene {
  constructor(state, updateContext, touch) { super('DataCenter'); this.state = state; this.updateContext = updateContext; this.touch = touch; this.direction = 'down'; }
  create() {
    createTextures(this);
    this.add.tileSprite(0, 0, map.width, map.height, 'floor').setOrigin(0);
    const g = this.add.graphics();
    const r = (x, y, w, h, c, a = 1) => g.fillStyle(c, a).fillRect(x, y, w, h);
    this.solids = this.physics.add.staticGroup();
    const solid = ({ x, y, width, height }, group = this.solids) => {
      const zone = this.add.zone(x + width / 2, y + height / 2, width, height);
      this.physics.add.existing(zone, true); group.add(zone); return zone;
    };
    map.walls.forEach(w => { r(w.x, w.y, w.width, w.height, 0x101a25); r(w.x, w.y, w.width, 3, 0x2a3b48); solid(w); });
    r(24, 12, 912, 30, 0x263745); r(24, 45, 912, 4, 0x344c5b); r(24, 60, 912, 4, 0x080f18);
    for (let x = 48; x < 920; x += 112) { r(x, 22, 60, 4, 0x75c3c8); r(x, 26, 60, 20, 0x6ad4d3, .04); }
    // Hall floor guidance and doorway thresholds.
    for (let y = 240; y < map.height - 80; y += 278) r(344, y, 272, 2, 0x38505a);
    for (const d of map.doors) { r(d.x - 4, d.y - 4, d.width + 8, 4, 0x4d6b74); r(d.x - 4, d.y + d.height, d.width + 8, 4, 0x4d6b74); r(d.x, d.y, d.width, d.height, 0x1d2d38); }
    for (const o of map.racks) {
      r(o.x - 6, o.y + 10, o.width + 12, o.height + 4, 0x080f17, .65);
      r(o.x - 4, o.y - 4, o.width + 8, o.height + 8, 0x2a414d);
      r(o.x, o.y, o.width, o.height, 0x0e1722); r(o.x, o.y, o.width, 8, 0x3c5361);
      for (let row = 0; row < 5; row++) {
        const y = o.y + 14 + row * 18;
        r(o.x + 4, y, 48, 14, 0x22333f); r(o.x + 8, y + 3, 25, 2, 0x101b26); r(o.x + 8, y + 8, 25, 2, 0x14232e);
        r(o.x + 41, y + 4, 3, 3, row === 3 ? 0xc4a06a : 0x6ad5c6); r(o.x + 47, y + 4, 2, 3, 0x3f797b);
      }
      solid(o);
    }
    for (const o of map.crates) {
      r(o.x + 4, o.y + 5, o.width, o.height, 0x0b151e);
      r(o.x, o.y, o.width, o.height, 0x36414a); r(o.x + 3, o.y + 3, o.width - 6, o.height - 6, 0x26333c);
      r(o.x + 8, o.y, 4, o.height, 0x52616a); r(o.x + o.width - 12, o.y, 4, o.height, 0x52616a); solid(o);
    }
    const label = (x, y, text, size = 10, color = '#69838c') => this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: size, color }).setOrigin(.5);
    for (const t of map.terminals) {
      r(t.x - 48, t.y - 38, 96, 88, 0x51d6c3, .035);
      r(t.x - 36, t.y - 26, 72, 52, 0x0a141e); r(t.x - 32, t.y - 24, 64, 38, 0x475e67);
      r(t.x - 27, t.y - 20, 54, 25, 0x112c36); r(t.x - 24, t.y - 17, 48, 19, 0x53bfaf);
      r(t.x - 20, t.y - 13, 30, 2, 0x173b40); r(t.x - 20, t.y - 8, 22, 2, 0x28615d);
      r(t.x - 32, t.y + 14, 64, 10, 0x283d48);
      for (let x = -24; x < 20; x += 6) r(t.x + x, t.y + 16, 4, 2, 0x819c9e);
      solid(terminalSolid(t));
      label(t.x, t.y - 54, `ARCHIVE / ${t.era}`, 14, '#8aa9ad');
      label(t.x, t.y - 38, `${t.era}년대 기록실`, 9, '#77c3b8');
    }
    label(480, 580, 'ARCHIVE HUB', 16, '#8aa9ad'); label(480, 598, 'LITERATURE DATA STORAGE', 8);
    label(480, 1130, 'SERVICE HATCH', 8, '#5d7680');
    // Sabotage overlays are rebuilt whenever the visible room's sabotage list changes.
    this.blockers = this.physics.add.staticGroup();
    this.overlay = this.add.graphics().setDepth(5);
    this.overlayLabels = [];
    this.sabotageSignature = '';
    this.player = this.physics.add.sprite(map.spawn.x, map.spawn.y, 'player-down-0').setDepth(10);
    this.player.body.setSize(14, 11).setOffset(5, 21);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(24, 64, map.width - 48, map.height - 88);
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.blockers);
    this.opponent = null;
    this.nameLabel = this.add.text(this.player.x, this.player.y - 25, '나', { fontSize: '9px', fontFamily: 'sans-serif', color: '#d7fff0', backgroundColor: '#10232c' }).setOrigin(.5).setDepth(20);
    this.lastSentAt = 0; this.lastSent = '';
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,ESC,SPACE');
    this.input.keyboard.on('keydown-E', event => { if (!event.repeat) this.interact(); });
    if (this.touch) this.touch.onAction = () => { if (this.state.raid?.role === 'attacker') this.state.shock(); else this.interact(); };
    this.input.keyboard.on('keydown-SPACE', event => { if (!event.repeat && this.state.raid?.role === 'attacker') this.state.shock(); });
    this.resetInput = () => { this.input.keyboard.resetKeys(); this.player.setVelocity(0); };
    this.game.events.on('blur', this.resetInput);
    let wasOpen;
    this.unsubscribe = this.state.subscribe(({ terminalOpen }) => {
      if (wasOpen === terminalOpen) return;
      wasOpen = terminalOpen;
      this.resetInput();
      if (terminalOpen) this.input.keyboard.disableGlobalCapture();
      else this.input.keyboard.enableGlobalCapture();
    });
    const onRaid = ({ detail }) => {
      this.resetInput(); this.lastSent = '';
      if (detail.role === 'attacker') { this.home = { x: this.player.x, y: this.player.y }; this.player.body.reset(detail.entry.x, detail.entry.y); }
      this.cameras.main.flash(250, 255, 220, 120);
    };
    const onRaidEnd = () => {
      this.resetInput();
      if (this.home) { this.player.body.reset(this.home.x, this.home.y); this.home = null; }
      this.opponent?.sprite.destroy(); this.opponent?.label.destroy(); this.opponent = null;
    };
    const onShock = ({ detail }) => {
      const victim = this.state.raid?.role === 'defender' ? this.player : this.opponent?.sprite;
      if (this.state.raid?.role === 'defender') { this.player.setVelocity(0); this.cameras.main.shake(300, 0.012); }
      if (victim) this.zap(victim, detail.stolen);
    };
    this.state.events.addEventListener('raid', onRaid);
    this.state.events.addEventListener('raid-end', onRaidEnd);
    this.state.events.addEventListener('shock', onShock);
    const resize = () => {
      const camera = this.cameras.main;
      camera.setZoom(this.scale.width >= 700 && this.scale.height >= 420 ? 2 : 1);
      camera.setBounds(0, 0, map.width, map.height);
    };
    resize(); this.scale.on('resize', resize);
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.events.once('shutdown', () => {
      this.unsubscribe(); this.scale.off('resize', resize); this.game.events.off('blur', this.resetInput);
      this.state.events.removeEventListener('raid', onRaid); this.state.events.removeEventListener('raid-end', onRaidEnd); this.state.events.removeEventListener('shock', onShock);
    });
  }
  zap(target, stolen) {
    const bolt = this.add.text(target.x, target.y - 30, stolen ? `⚡ -${stolen}` : '⚡', { fontSize: '14px', fontFamily: 'sans-serif', color: '#ffe36e', stroke: '#2b1d00', strokeThickness: 3 }).setOrigin(.5).setDepth(30);
    this.tweens.add({ targets: bolt, y: target.y - 52, alpha: 0, duration: 900, onComplete: () => bolt.destroy() });
    let flashes = 0;
    const timer = this.time.addEvent({ delay: 90, repeat: 9, callback: () => { flashes++; target.setTint(flashes % 2 ? 0xfff27a : 0xffffff); if (flashes === 10) target.clearTint?.(); } });
    this.time.delayedCall(1000, () => { timer.remove(); if (target.active) (target === this.player ? target.clearTint() : target.setTint(TEAM_TINT[this.state.raid?.opponent.team] ?? 0x94c9ed)); });
  }
  // What the E key would do here: open a terminal, or repair a sabotage.
  target() {
    if (this.state.raid) return null;
    const sabotages = this.state.roomSabotages();
    const barricade = sabotages.find(s => s.kind === 'barricade' && isNearDoor(this.player, doorFor(s.era)));
    if (barricade) return { action: 'repair', kind: 'barricade', era: barricade.era };
    const terminal = nearestTerminal(this.player);
    if (!terminal) return null;
    if (sabotages.some(s => s.kind === 'broken' && s.era === terminal.era)) return { action: 'repair', kind: 'broken', era: terminal.era };
    return { action: 'open', era: terminal.era };
  }
  interact() {
    if (document.querySelector('dialog[open]') || this.state.inputBlocked || this.state.snapshot.terminalOpen) return;
    const target = this.target();
    if (!target) return;
    this.player.setVelocity(0);
    const at = { x: Math.round(this.player.x * 10) / 10, y: Math.round(this.player.y * 10) / 10 };
    if (target.action === 'open') this.state.openTerminal(target.era, at);
    else this.state.openRepair(target.kind, target.era, at);
  }
  renderSabotages() {
    const list = this.state.roomSabotages();
    const signature = list.map(s => `${s.kind}:${s.era}`).sort().join('|');
    if (signature === this.sabotageSignature) return;
    this.sabotageSignature = signature;
    this.blockers.clear(true, true); this.overlay.clear();
    this.overlayLabels.forEach(text => text.destroy()); this.overlayLabels = [];
    const r = (x, y, w, h, c, a = 1) => this.overlay.fillStyle(c, a).fillRect(x, y, w, h);
    for (const s of list) {
      if (s.kind === 'barricade') {
        const d = doorFor(s.era);
        r(d.x - 2, d.y, d.width + 4, d.height, 0x3a2a12);
        for (let y = d.y; y < d.y + d.height; y += 12) { r(d.x - 2, y, d.width + 4, 6, 0xe0b23c); r(d.x - 2, y + 6, d.width + 4, 6, 0x24221d); }
        const zone = this.add.zone(d.x + d.width / 2, d.y + d.height / 2, d.width, d.height);
        this.physics.add.existing(zone, true); this.blockers.add(zone);
        this.overlayLabels.push(this.add.text(d.x + d.width / 2, d.y - 10, '🚧', { fontSize: '12px' }).setOrigin(.5).setDepth(6));
      } else {
        const t = terminalFor(s.era);
        r(t.x - 24, t.y - 17, 48, 19, 0x5b1f24);
        r(t.x - 20, t.y - 15, 4, 15, 0xff6b6b); r(t.x - 6, t.y - 15, 3, 12, 0xff6b6b); r(t.x + 10, t.y - 13, 4, 11, 0xff6b6b);
        this.overlayLabels.push(this.add.text(t.x, t.y - 34, '💥 고장', { fontSize: '10px', fontFamily: 'sans-serif', color: '#ffb3a8', backgroundColor: '#2a1014' }).setOrigin(.5).setDepth(6));
      }
    }
  }
  update(time, delta) {
    const k = this.keys;
    const raid = this.state.raid;
    this.state.checkRaidTimeout();
    const open = this.state.snapshot.terminalOpen;
    const modal = Boolean(document.querySelector('dialog[open]'));
    const stunned = raid?.role === 'defender' && performance.now() < raid.stunnedUntil;
    const blocked = open || modal || this.state.inputBlocked || stunned;
    if (modal) this.input.keyboard.disableGlobalCapture();
    else if (!open) this.input.keyboard.enableGlobalCapture();
    if (this.state.correction) {
      const { x, y } = this.state.correction; this.player.body.reset(x, y); this.state.correction = null;
      this.lastSent = '';
    }
    this.renderSabotages();
    let v = blocked ? { x: 0, y: 0 } : movementVector(k.A.isDown || k.LEFT.isDown, k.D.isDown || k.RIGHT.isDown, k.W.isDown || k.UP.isDown, k.S.isDown || k.DOWN.isDown);
    // Joystick: any direction at full walking speed (same speed the server allows for keys).
    const stick = this.touch && !blocked && !v.x && !v.y && Math.hypot(this.touch.x, this.touch.y) > 0;
    if (stick) { const length = Math.hypot(this.touch.x, this.touch.y); v = { x: this.touch.x / length * 130, y: this.touch.y / length * 130 }; }
    this.player.setVelocity(v.x, v.y);
    if (v.x || v.y) this.direction = Math.abs(v.x) >= Math.abs(v.y) ? (v.x < 0 ? 'left' : 'right') : (v.y < 0 ? 'up' : 'down');
    this.player.anims.play(`${v.x || v.y ? 'walk' : 'idle'}-${this.direction}`, true);
    const team = this.state.me?.team;
    this.nameLabel.setPosition(this.player.x, this.player.y - 25).setText(this.state.online ? `${this.state.name} (나)` : '나');
    this.nameLabel.setColor(team === 'red' ? '#ffc9c2' : team === 'blue' ? '#cfe4ff' : '#d7fff0');
    // Positions travel only during a live raid, at most 10 Hz and only when changed.
    if (raid && this.state.connected && time - this.lastSentAt >= 100) {
      const packet = { type: 'move', x: Math.round(this.player.x * 10) / 10, y: Math.round(this.player.y * 10) / 10, direction: this.direction, moving: Boolean(v.x || v.y) };
      const signature = JSON.stringify(packet);
      if (signature !== this.lastSent) { this.state.send(packet); this.lastSent = signature; }
      this.lastSentAt = time;
    }
    const peer = raid?.opponent;
    if (peer && !this.opponent) {
      this.opponent = {
        sprite: this.add.sprite(peer.x ?? map.entry.x, peer.y ?? map.entry.y, 'player-down-0').setTint(TEAM_TINT[peer.team] ?? 0x94c9ed).setDepth(9).setVisible(peer.x != null),
        label: this.add.text(0, 0, `${raid.role === 'attacker' ? '🎯' : '⚡'} ${peer.name}`, { fontSize: '9px', fontFamily: 'sans-serif', color: '#ffe0a8', backgroundColor: '#2a1d10' }).setOrigin(.5).setDepth(20).setVisible(peer.x != null),
      };
    }
    if (peer && this.opponent && peer.x != null) {
      const { sprite, label } = this.opponent;
      if (!sprite.visible) { sprite.setPosition(peer.x, peer.y).setVisible(true); label.setVisible(true); }
      const alpha = 1 - Math.exp(-delta / 65);
      sprite.x += (peer.x - sprite.x) * alpha; sprite.y += (peer.y - sprite.y) * alpha;
      const moving = peer.moving && performance.now() - (peer.receivedAt ?? 0) < 600;
      sprite.anims.play(`${moving ? 'walk' : 'idle'}-${peer.direction ?? 'down'}`, true);
      label.setPosition(sprite.x, sprite.y - 25);
    }
    const target = this.target();
    const inRange = raid?.role === 'attacker' && peer?.x != null && Math.hypot(this.player.x - peer.x, this.player.y - peer.y) <= SHOCK_RANGE;
    const context = { open, target, raid, inRange, stunned };
    this.updateContext(context); this.touch?.update(context);
  }
}
