import Phaser from 'phaser';
import { map, movementVector, nearestTerminal, isNearDoor, terminalSolid, doorFor, terminalFor } from '../map.js';
import { createTextures } from '../assets/createTextures.js';
import { drawArchive, drawSabotages } from './drawArchive.js';
const SHOCK_RANGE = 40;
const TEAM_TINT = { blue: 0x8fc3ff, red: 0xff9a8f };
export class DataCenter extends Phaser.Scene {
  constructor(state, updateContext, touch) { super('DataCenter'); this.state = state; this.updateContext = updateContext; this.touch = touch; this.direction = 'down'; }
  create() {
    createTextures(this);
    this.solids = this.physics.add.staticGroup();
    drawArchive(this, ({ x, y, width, height }) => {
      const zone = this.add.zone(x + width / 2, y + height / 2, width, height);
      this.physics.add.existing(zone, true); this.solids.add(zone);
    });
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
    const contam = sabotages.find(s => s.kind === 'contam' && s.era === terminal.era);
    if (contam) return { action: 'cleanse', era: terminal.era, item: contam };
    return { action: 'open', era: terminal.era };
  }
  interact() {
    if (document.querySelector('dialog[open]') || this.state.inputBlocked || this.state.snapshot.terminalOpen) return;
    const target = this.target();
    if (!target) return;
    this.player.setVelocity(0);
    const at = { x: Math.round(this.player.x * 10) / 10, y: Math.round(this.player.y * 10) / 10 };
    if (target.action === 'cleanse') this.state.emit('cleanse-open', { item: target.item, at });
    else if (target.action === 'open') this.state.openTerminal(target.era, at);
    else this.state.openRepair(target.kind, target.era, at);
  }
  renderSabotages() {
    const trap = this.state.raid?.role !== 'attacker' && this.state.me?.trap;
    const list = [...this.state.roomSabotages(), ...(trap ? [{ kind: 'trap', era: trap }] : [])];
    const signature = list.map(s => `${s.kind}:${s.era}`).sort().join('|');
    if (signature === this.sabotageSignature) return;
    this.sabotageSignature = signature;
    this.blockers.clear(true, true); this.overlay.clear();
    this.overlayLabels.forEach(text => text.destroy()); this.overlayLabels = [];
    this.overlayLabels = drawSabotages(this, this.overlay, list, d => {
      const zone = this.add.zone(d.x + d.width / 2, d.y + d.height / 2, d.width, d.height);
      this.physics.add.existing(zone, true); this.blockers.add(zone);
    });
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
