import * as THREE from 'three';

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStudioEnvironment(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const base = ctx.createLinearGradient(0, 0, 0, 512);
  base.addColorStop(0, '#20170f');
  base.addColorStop(0.42, '#0a0705');
  base.addColorStop(0.62, '#050403');
  base.addColorStop(1, '#100b07');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = '#3b2a1b';
  ctx.globalAlpha = 0.45;
  ctx.fillRect(0, 332, 1024, 52);
  ctx.globalAlpha = 1;

  ctx.filter = 'blur(38px)';
  // Tall amber workshop window on the left.
  const windowGlow = ctx.createLinearGradient(150, 0, 310, 0);
  windowGlow.addColorStop(0, 'rgba(255, 177, 98, 0)');
  windowGlow.addColorStop(0.4, 'rgba(255, 177, 98, 0.92)');
  windowGlow.addColorStop(0.65, 'rgba(255, 226, 174, 1)');
  windowGlow.addColorStop(1, 'rgba(255, 157, 73, 0)');
  ctx.fillStyle = windowGlow;
  ctx.fillRect(162, 64, 150, 292);

  // Cool moonlight slit gives the brass a contrasting edge.
  const coolSlit = ctx.createLinearGradient(740, 0, 850, 0);
  coolSlit.addColorStop(0, 'rgba(92, 147, 142, 0)');
  coolSlit.addColorStop(0.5, 'rgba(132, 192, 183, 0.8)');
  coolSlit.addColorStop(1, 'rgba(92, 147, 142, 0)');
  ctx.fillStyle = coolSlit;
  ctx.fillRect(742, 116, 98, 250);

  // Broad hot canopy light for polished-metal highlights.
  const canopy = ctx.createRadialGradient(505, 16, 0, 505, 16, 265);
  canopy.addColorStop(0, 'rgba(255, 245, 218, 1)');
  canopy.addColorStop(0.25, 'rgba(255, 193, 120, 0.86)');
  canopy.addColorStop(1, 'rgba(255, 160, 82, 0)');
  ctx.fillStyle = canopy;
  ctx.fillRect(230, 0, 550, 280);

  // Faint lamps in the deep background.
  [[70, 210, 26], [905, 260, 22], [548, 306, 16], [650, 150, 12]].forEach(([x, y, r]) => {
    const lamp = ctx.createRadialGradient(x, y, 0, x, y, r);
    lamp.addColorStop(0, 'rgba(255, 223, 170, 0.9)');
    lamp.addColorStop(1, 'rgba(255, 166, 80, 0)');
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.filter = 'blur(7px)';
  ctx.fillStyle = 'rgba(255, 244, 214, 0.95)';
  ctx.fillRect(220, 115, 12, 195);
  ctx.fillRect(256, 88, 8, 235);
  ctx.fillStyle = 'rgba(182, 227, 218, 0.8)';
  ctx.fillRect(783, 165, 6, 170);
  ctx.filter = 'none';

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(texture);
  texture.dispose();
  pmrem.dispose();
  return target.texture;
}

export function makeGlowTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.13, 'rgba(255,244,215,0.95)');
  glow.addColorStop(0.36, 'rgba(255,199,129,0.42)');
  glow.addColorStop(0.7, 'rgba(255,153,68,0.09)');
  glow.addColorStop(1, 'rgba(255,130,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeSmokeTexture(size = 192) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(74);

  ctx.filter = 'blur(13px)';
  for (let i = 0; i < 9; i += 1) {
    const x = size * (0.3 + random() * 0.4);
    const y = size * (0.3 + random() * 0.4);
    const r = size * (0.11 + random() * 0.18);
    const puff = ctx.createRadialGradient(x, y, 0, x, y, r);
    puff.addColorStop(0, `rgba(255, 244, 226, ${0.13 + random() * 0.12})`);
    puff.addColorStop(0.6, `rgba(255, 226, 196, ${0.06 + random() * 0.06})`);
    puff.addColorStop(1, 'rgba(255, 214, 174, 0)');
    ctx.fillStyle = puff;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = 'none';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeWeatheredMetalTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(413);
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 54; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const r = 18 + random() * 110;
    const smudge = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = random() > 0.48;
    smudge.addColorStop(0, dark ? 'rgba(70,70,70,0.09)' : 'rgba(255,255,255,0.08)');
    smudge.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = smudge;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 190; i += 1) {
    const y = random() * size;
    const x = random() * size;
    const length = 8 + random() * 70;
    ctx.strokeStyle = random() > 0.55 ? 'rgba(255,255,255,0.08)' : 'rgba(40,40,40,0.065)';
    ctx.lineWidth = 0.4 + random() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y + (random() - 0.5) * 2.5);
    ctx.stroke();
  }

  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(55,55,55,0.055)' : 'rgba(255,255,255,0.065)';
    ctx.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 1.8);
  return texture;
}

export function makeAstrolabeTexture(size = 2048) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(1887);
  const cx = size * 0.5;
  const cy = size * 0.5;
  const radius = size * 0.486;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const base = ctx.createRadialGradient(cx, cy * 0.92, 0, cx, cy, radius);
  base.addColorStop(0, '#24170d');
  base.addColorStop(0.32, '#160e08');
  base.addColorStop(0.66, '#0b0704');
  base.addColorStop(1, '#050302');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 9; i += 1) {
    const x = cx + (random() - 0.5) * radius * 1.4;
    const y = cy + (random() - 0.5) * radius * 1.4;
    const r = radius * (0.18 + random() * 0.34);
    const cloud = ctx.createRadialGradient(x, y, 0, x, y, r);
    const warm = i % 3 !== 0;
    cloud.addColorStop(0, warm ? 'rgba(176, 113, 56, 0.1)' : 'rgba(76, 126, 116, 0.065)');
    cloud.addColorStop(0.55, warm ? 'rgba(122, 74, 33, 0.035)' : 'rgba(43, 80, 75, 0.025)');
    cloud.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  const haze = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius * 0.4, cy + radius);
  haze.addColorStop(0, 'rgba(225, 176, 112, 0.07)');
  haze.addColorStop(0.45, 'rgba(86, 57, 31, 0.015)');
  haze.addColorStop(1, 'rgba(10, 20, 18, 0.025)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, size, size);

  const stars = [];
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 360; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius * 0.92;
    const x = cx + Math.cos(angle) * distance;
    const y = cy + Math.sin(angle) * distance * 0.93;
    const bright = random();
    const dot = 0.55 + bright * 1.9;
    ctx.fillStyle =
      bright > 0.86
        ? `rgba(255, 231, 190, ${0.35 + random() * 0.5})`
        : `rgba(226, 196, 154, ${0.08 + random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, dot, 0, Math.PI * 2);
    ctx.fill();
    if (bright > 0.92) stars.push({ x, y });
  }

  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(196, 166, 118, 0.12)';
  for (let i = 0; i < Math.min(20, stars.length - 1); i += 1) {
    ctx.beginPath();
    ctx.moveTo(stars[i].x, stars[i].y);
    ctx.lineTo(stars[i + 1].x, stars[i + 1].y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  const brass = (alpha) => `rgba(203, 163, 102, ${alpha})`;
  const paleBrass = (alpha) => `rgba(233, 207, 161, ${alpha})`;

  const rings = [
    { r: 0.96, width: 0.008, alpha: 0.28 },
    { r: 0.925, width: 0.003, alpha: 0.4 },
    { r: 0.842, width: 0.0022, alpha: 0.31 },
    { r: 0.665, width: 0.003, alpha: 0.28 },
    { r: 0.49, width: 0.0018, alpha: 0.23 },
    { r: 0.3, width: 0.0015, alpha: 0.18 },
  ];
  rings.forEach((ring) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * ring.r, 0, Math.PI * 2);
    ctx.lineWidth = radius * ring.width;
    ctx.strokeStyle = brass(ring.alpha);
    ctx.stroke();
  });

  for (let i = 0; i < 120; i += 1) {
    const angle = (i / 120) * Math.PI * 2;
    const long = i % 10 === 0;
    const outer = radius * 0.952;
    const inner = radius * (long ? 0.905 : 0.934);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.lineWidth = long ? 4 : 1.4;
    ctx.strokeStyle = brass(long ? 0.5 : 0.24);
    ctx.stroke();
  }

  for (let i = 0; i < 72; i += 1) {
    const angle = (i / 72) * Math.PI * 2 + Math.PI / 72;
    const outer = radius * 0.982;
    const inner = radius * 0.962;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.lineWidth = 3;
    ctx.strokeStyle = brass(0.22);
    ctx.stroke();
  }

  // Zodiac interval spokes and constellation medallions.
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const start = radius * 0.318;
    const end = radius * 0.655;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * start, cy + Math.sin(angle) * start);
    ctx.lineTo(cx + Math.cos(angle) * end, cy + Math.sin(angle) * end);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = brass(0.17);
    ctx.stroke();

    const mx = cx + Math.cos(angle) * radius * 0.565;
    const my = cy + Math.sin(angle) * radius * 0.565;
    ctx.beginPath();
    ctx.arc(mx, my, radius * 0.035, 0, Math.PI * 2);
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = brass(0.23);
    ctx.stroke();

    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.arc(mx, my, radius * 0.052, 0, Math.PI * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = brass(0.16);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = paleBrass(0.27);
    ctx.beginPath();
    ctx.arc(mx, my, radius * 0.006, 0, Math.PI * 2);
    ctx.fill();
  }

  // Two bands of small clockwork notches.
  for (let band = 0; band < 2; band += 1) {
    const r = radius * (band === 0 ? 0.7 : 0.742);
    for (let i = 0; i < 48; i += 1) {
      const angle = (i / 48) * Math.PI * 2;
      ctx.fillStyle = brass(band === 0 ? 0.15 : 0.09);
      ctx.fillRect(
        cx + Math.cos(angle) * r - 2,
        cy + Math.sin(angle) * r - 2,
        4,
        4,
      );
    }
  }

  // Roman chapter ring.
  const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = paleBrass(0.42);
  ctx.shadowColor = 'rgba(222, 172, 99, 0.34)';
  ctx.shadowBlur = 8;
  numerals.forEach((numeral, i) => {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r = radius * 0.784;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    ctx.save();
    ctx.translate(x, y);
    ctx.font = `500 ${Math.round(size * 0.026)}px Georgia, "Times New Roman", serif`;
    ctx.fillText(numeral, 0, 0);
    ctx.restore();
  });
  ctx.shadowBlur = 0;

  // Fine engraved arcs beneath the numerals.
  ctx.setLineDash([22, 18]);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = brass(0.17);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.815, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Radial glass mullions at the window center.
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * radius * 0.08, cy + Math.sin(angle) * radius * 0.08);
    ctx.lineTo(cx + Math.cos(angle) * radius * 0.29, cy + Math.sin(angle) * radius * 0.29);
    ctx.lineWidth = 2;
    ctx.strokeStyle = brass(0.12);
    ctx.stroke();
  }

  // Soft central glow, kept dark enough to silhouette the specimen.
  ctx.globalCompositeOperation = 'lighter';
  const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.44);
  coreGlow.addColorStop(0, 'rgba(168, 105, 47, 0.1)');
  coreGlow.addColorStop(0.45, 'rgba(111, 68, 29, 0.03)');
  coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGlow;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';

  // Vignette and patina, so the window dissolves into the architecture.
  const vignette = ctx.createRadialGradient(cx, cy, radius * 0.28, cx, cy, radius);
  vignette.addColorStop(0, 'rgba(3, 2, 1, 0)');
  vignette.addColorStop(0.72, 'rgba(3, 2, 1, 0.12)');
  vignette.addColorStop(0.94, 'rgba(2, 1, 1, 0.5)');
  vignette.addColorStop(1, 'rgba(2, 1, 1, 0.82)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 600; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius;
    ctx.fillStyle = random() > 0.5 ? 'rgba(0,0,0,0.09)' : 'rgba(255,223,178,0.055)';
    ctx.fillRect(
      cx + Math.cos(angle) * distance,
      cy + Math.sin(angle) * distance,
      1 + random() * 2,
      1 + random() * 2,
    );
  }

  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i += 1) {
    const angle = random() * Math.PI;
    const distance = radius * (0.1 + random() * 0.82);
    const x = cx + Math.cos(angle) * distance;
    const y = cy + Math.sin(angle) * distance;
    const length = radius * (0.02 + random() * 0.08);
    ctx.strokeStyle = 'rgba(224, 193, 148, 0.035)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle + 1.2) * length, y + Math.sin(angle + 1.2) * length);
    ctx.stroke();
  }

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function makeWingTexture(seed = 5) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(seed);

  const base = ctx.createLinearGradient(0, 512, 512, 0);
  base.addColorStop(0, '#6d3b18');
  base.addColorStop(0.3, '#b97633');
  base.addColorStop(0.62, '#e4b568');
  base.addColorStop(1, '#f0cf91');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'screen';
  const coolWash = ctx.createRadialGradient(340, 210, 20, 340, 210, 265);
  coolWash.addColorStop(0, 'rgba(132, 173, 155, 0.44)');
  coolWash.addColorStop(0.5, 'rgba(94, 128, 116, 0.16)');
  coolWash.addColorStop(1, 'rgba(30, 46, 38, 0)');
  ctx.fillStyle = coolWash;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 52; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const r = 2 + random() * 24;
    const dark = random() > 0.5;
    const spot = ctx.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, dark ? 'rgba(72, 36, 12, 0.15)' : 'rgba(255, 232, 178, 0.14)');
    spot.addColorStop(1, 'rgba(90, 50, 20, 0)');
    ctx.fillStyle = spot;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Overlapping scale cells give the membrane a powdery, organic finish.
  ctx.lineWidth = 0.7;
  const scaleWidth = 14;
  const scaleHeight = 10;
  for (let row = 0; row < 60; row += 1) {
    for (let col = -1; col < 42; col += 1) {
      const x = col * scaleWidth + (row % 2) * scaleWidth * 0.5;
      const y = row * scaleHeight;
      const radius = scaleWidth * (0.44 + random() * 0.12);
      ctx.strokeStyle =
        random() > 0.44 ? 'rgba(255, 229, 177, 0.085)' : 'rgba(79, 40, 15, 0.075)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0.08, Math.PI - 0.08);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(79, 42, 17, 0.14)';
  for (let i = 0; i < 14; i += 1) {
    ctx.lineWidth = 0.7 + random() * 1.2;
    ctx.beginPath();
    const startY = random() * size;
    ctx.moveTo(0, startY);
    for (let x = 0; x <= size; x += 24) {
      ctx.lineTo(x, startY + Math.sin(x * 0.024 + i) * (7 + random() * 12));
    }
    ctx.stroke();
  }

  for (let i = 0; i < 420; i += 1) {
    const tone = random();
    ctx.fillStyle =
      tone > 0.7
        ? `rgba(255, 235, 190, ${0.05 + random() * 0.2})`
        : `rgba(62, 31, 11, ${0.03 + random() * 0.16})`;
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, 0.35 + random() * 1.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'multiply';
  const edge = ctx.createRadialGradient(size * 0.48, size * 0.47, size * 0.1, size * 0.5, size * 0.5, size * 0.72);
  edge.addColorStop(0, 'rgba(255,255,255,1)');
  edge.addColorStop(0.7, 'rgba(210,176,126,0.95)');
  edge.addColorStop(1, 'rgba(84,53,27,0.78)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
