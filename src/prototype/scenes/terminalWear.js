// Transparent decals in the original console artwork's 256 × 143 coordinate space.
export function createTerminalWear(scene) {
  for (const kind of ['broken', 'contam']) {
    const key = 'console-' + kind;
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.createCanvas(key, 256, 143);
    const ctx = texture.context;
    const shape = (points, fill) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    };
    const line = (points, color, width) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
    };
    const lamp = (x, y, w, h, color) => {
      ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 5;
      ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.restore();
    };
    ctx.save();
    shape([[82,26],[173,26],[181,69],[76,69]]);
    ctx.clip();
    if (kind === 'broken') {
      ctx.fillStyle = '#10171de8'; ctx.fillRect(75, 24, 110, 48);
      // Separate panes around one impact. The fracture crosses the printed record.
      shape([[82,26],[114,27],[103,40],[112,48],[90,56],[77,68]], '#52616a91');
      shape([[119,47],[148,40],[143,27],[173,26],[180,64],[151,57]], '#343f49ae');
      for (const fracture of [
        [[83,24],[104,35],[109,43],[119,47],[128,58],[147,71]],
        [[119,47],[137,45],[148,38],[175,31]],
        [[119,47],[103,50],[94,59],[76,65]],
        [[119,47],[124,36],[121,26]],
      ]) {
        line(fracture, '#060b12', 4);
        line(fracture.map(([x,y]) => [x,y-1]), '#b2bcc1', 1.4);
      }
      shape([[109,44],[119,39],[130,46],[122,53],[113,52]], '#080e12');
    } else {
      // Ghost copies of the document break left and right inside the glass.
      ctx.fillStyle = '#221e39df'; ctx.fillRect(75,24,110,48);
      for (let row = 0; row < 9; row++) {
        const x = 86 + [2,9,0,14][row % 4], y = 29 + row * 4;
        line([[x+3,y-1],[x+22,y-1]], '#67cfc9', 1.5);
        line([[x,y],[x+34+row%3*8,y]], '#d9a6f1', 2);
      }
      shape([[116,41],[177,38],[180,48],[109,52]], '#704793');
      line([[107,51],[131,50],[137,45],[178,43]], '#e0adff', 2);
      for (const [x,y,w] of [[154,29,13],[145,34,6],[158,53,14],[142,58,10],[166,62,8]]) {
        ctx.fillStyle = '#a57bcf'; ctx.fillRect(x,y,w,3);
      }
    }
    ctx.restore();
    if (kind === 'broken') {
      ctx.fillStyle = '#1a2326'; ctx.fillRect(84,16,89,3);
      lamp(85,16,13,2,'#e99b4b');
      // Unseated front drive, exposed contacts and a loose copper lead.
      shape([[132,99],[208,99],[212,118],[133,122]], '#080e13');
      for (let x=144; x<183; x+=7) line([[x,104],[x,110]], '#c19252', 3);
      shape([[150,109],[215,104],[218,118],[153,125]], '#47525b');
      line([[151,110],[214,105]], '#91a1a4', 2);
      line([[141,110],[137,121],[145,128],[156,124]], '#b0653e', 3);
      lamp(113,89,26,3,'#f4a144');
    } else {
      lamp(84,16,89,2,'#ba88e6');
      // The same interference reaches the status strip and drive indicators.
      line([[165,66],[176,71],[188,71],[196,78],[214,78]], '#865f9e', 2);
      lamp(113,89,26,3,'#cc93f7');
      lamp(200,110,12,2,'#c88aeb');
    }
    texture.refresh();
  }
}
