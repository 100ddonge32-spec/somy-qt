/* =========================================================================
 * 소미 3D 온라인 캠퍼스 — 실사풍 건축 PBR 재질 & 고디테일 3D 가구/소품 라이브러리
 * (대리석 · 월넛 원목 루버월 · 헤링본 마루 · 가죽장정 서가 · 그랜드피아노 · 브라스 스탠드 등)
 * ========================================================================= */
(function () {
  const THREE = window.THREE;
  if (!THREE) return;

  function hash2(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function valueNoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy);
    const b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1);
    const d = hash2(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y, octaves = 4) {
    let v = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
      v += amp * valueNoise(x * freq, y * freq);
      freq *= 2.02;
      amp *= 0.5;
    }
    return v;
  }

  function makeCanvasTex(sizeW, sizeH, drawFn, repeatX = 1, repeatY = 1, isSrgb = true) {
    const c = document.createElement('canvas');
    c.width = sizeW;
    c.height = sizeH;
    const ctx = c.getContext('2d');
    drawFn(ctx, sizeW, sizeH);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 8;
    if (isSrgb && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  class ArchitecturalPBR {
    constructor(renderer) {
      this.renderer = renderer;
      this.cache = {};
      this.envMap = this._buildInteriorEnvMap();
    }

    // 실내 건축 반사용 Equirectangular HDR-style 환경맵 (대리석·유리·황동·피아노 광택 핵심!)
    _buildInteriorEnvMap() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 256;
      const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0.0, '#2c2520');
      grd.addColorStop(0.35, '#6b533e');
      grd.addColorStop(0.48, '#fef3c7');
      grd.addColorStop(0.55, '#3b2e25');
      grd.addColorStop(1.0, '#171311');
      g.fillStyle = grd;
      g.fillRect(0, 0, 512, 256);

      // 천장 간접조명 스트립 하이라이트
      for (let i = 0; i < 6; i++) {
        const x = 40 + i * 82;
        const rg = g.createRadialGradient(x, 72, 2, x, 72, 38);
        rg.addColorStop(0, 'rgba(255, 248, 220, 0.95)');
        rg.addColorStop(1, 'rgba(255, 215, 140, 0)');
        g.fillStyle = rg;
        g.beginPath();
        g.arc(x, 72, 38, 0, Math.PI * 2);
        g.fill();
      }

      const tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
      return tex;
    }

    // 1) 실사 원목(월넛/오크/마호가니) 나뭇결 판재 PBR 재질
    woodPlankMaterial(key, baseRgb, darkRgb, rx = 3, ry = 3, roughness = 0.34) {
      const ck = `wood_${key}_${rx}_${ry}`;
      if (this.cache[ck]) return this.cache[ck];

      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        const planks = 6;
        const pw = w / planks;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const pIdx = Math.floor(x / pw);
            const seamY = (y + pIdx * 170) % 256;
            const isGap = (x % Math.floor(pw) < 2) || seamY < 2;
            const plankTone = (hash2(pIdx, Math.floor((y + pIdx * 170) / 256)) - 0.5) * 0.14;
            const n = fbm(x * 0.06, y * 0.012 + pIdx * 3.1, 4);
            const ring = Math.sin(x * 0.22 + n * 9.5) * 0.5 + 0.5;
            const t = Math.max(0, Math.min(1, ring * 0.65 + n * 0.35 + plankTone));

            const idx = (y * w + x) * 4;
            if (isGap) {
              d[idx] = darkRgb[0] * 0.45;
              d[idx + 1] = darkRgb[1] * 0.45;
              d[idx + 2] = darkRgb[2] * 0.45;
            } else {
              d[idx] = darkRgb[0] + (baseRgb[0] - darkRgb[0]) * t;
              d[idx + 1] = darkRgb[1] + (baseRgb[1] - darkRgb[1]) * t;
              d[idx + 2] = darkRgb[2] + (baseRgb[2] - darkRgb[2]) * t;
            }
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, rx, ry);

      const bump = makeCanvasTex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);
        const pw = w / 6;
        ctx.strokeStyle = '#181818';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(i * pw, 0);
          ctx.lineTo(i * pw, h);
          ctx.stroke();
        }
      }, rx, ry, false);

      const mat = new THREE.MeshStandardMaterial({
        map,
        bumpMap: bump,
        bumpScale: 0.025,
        roughness,
        metalness: 0.04,
        envMap: this.envMap,
        envMapIntensity: 0.55
      });
      this.cache[ck] = mat;
      return mat;
    }

    // 2) 현대 대형교회 세로 어쿠스틱 원목 루버(Slat) 아트월 PBR 재질
    acousticSlatMaterial(rx = 6, ry = 2) {
      const ck = `slat_${rx}_${ry}`;
      if (this.cache[ck]) return this.cache[ck];

      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#120e0c'; // 흡음 블랙 펠트 바탕
        ctx.fillRect(0, 0, w, h);
        const slats = 16;
        const sw = w / slats;
        for (let i = 0; i < slats; i++) {
          const sx = i * sw + 3;
          const slatW = sw - 6;
          const tone = 0.86 + hash2(i, 3) * 0.26;
          const grd = ctx.createLinearGradient(sx, 0, sx + slatW, 0);
          grd.addColorStop(0, `rgb(${Math.round(115 * tone)}, ${Math.round(74 * tone)}, ${Math.round(44 * tone)})`);
          grd.addColorStop(0.5, `rgb(${Math.round(168 * tone)}, ${Math.round(112 * tone)}, ${Math.round(68 * tone)})`);
          grd.addColorStop(1, `rgb(${Math.round(98 * tone)}, ${Math.round(62 * tone)}, ${Math.round(36 * tone)})`);
          ctx.fillStyle = grd;
          ctx.fillRect(sx, 0, slatW, h);

          // 미세 나뭇결 결선
          ctx.fillStyle = 'rgba(40, 20, 8, 0.14)';
          for (let g = 0; g < 18; g++) {
            const gx = sx + hash2(i, g) * slatW;
            ctx.fillRect(gx, 0, 1, h);
          }
        }
      }, rx, ry);

      const bump = makeCanvasTex(512, 64, (ctx, w, h) => {
        ctx.fillStyle = '#101010';
        ctx.fillRect(0, 0, w, h);
        const slats = 16;
        const sw = w / slats;
        ctx.fillStyle = '#f0f0f0';
        for (let i = 0; i < slats; i++) {
          ctx.fillRect(i * sw + 3, 0, sw - 6, h);
        }
      }, rx, ry, false);

      const mat = new THREE.MeshStandardMaterial({
        map,
        bumpMap: bump,
        bumpScale: 0.08,
        roughness: 0.42,
        metalness: 0.05,
        envMap: this.envMap,
        envMapIntensity: 0.65
      });
      this.cache[ck] = mat;
      return mat;
    }

    // 3) 천연 트래버틴 / 칼라카타 대리석 타일 PBR 재질
    marbleMaterial(key, baseRgb, veinRgb, rx = 3, ry = 3, roughness = 0.20) {
      const ck = `marble_${key}_${rx}_${ry}`;
      if (this.cache[ck]) return this.cache[ck];

      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const n = fbm(x * 0.012, y * 0.012, 5);
            const vein = Math.pow(Math.abs(Math.sin((x * 0.015 + y * 0.008) + n * 5.2)), 14);
            const softCloud = fbm(x * 0.025 + 9, y * 0.025 + 4, 3);
            const isJoint = (x % 256 < 2) || (y % 256 < 2);
            const idx = (y * w + x) * 4;
            if (isJoint) {
              d[idx] = baseRgb[0] * 0.72;
              d[idx + 1] = baseRgb[1] * 0.72;
              d[idx + 2] = baseRgb[2] * 0.72;
            } else {
              const cMix = (softCloud - 0.5) * 18;
              d[idx] = Math.min(255, Math.max(0, baseRgb[0] + cMix - vein * (baseRgb[0] - veinRgb[0])));
              d[idx + 1] = Math.min(255, Math.max(0, baseRgb[1] + cMix - vein * (baseRgb[1] - veinRgb[1])));
              d[idx + 2] = Math.min(255, Math.max(0, baseRgb[2] + cMix - vein * (baseRgb[2] - veinRgb[2])));
            }
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, rx, ry);

      const mat = new THREE.MeshStandardMaterial({
        map,
        roughness,
        metalness: 0.06,
        envMap: this.envMap,
        envMapIntensity: 0.95
      });
      this.cache[ck] = mat;
      return mat;
    }

    // 4) 야외 화강암 석재 보도블록 / 잔디 / 패브릭 / 브러시드 황동 재질
    granitePaverMaterial(rx = 8, ry = 8) {
      const ck = `granite_${rx}_${ry}`;
      if (this.cache[ck]) return this.cache[ck];
      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const tx = Math.floor(x / 128), ty = Math.floor(y / 128);
            const joint = (x % 128 < 3) || (y % 128 < 3);
            const grain = (hash2(x, y) - 0.5) * 26 + (fbm(x * 0.05, y * 0.05, 3) - 0.5) * 24;
            const tileShift = (hash2(tx, ty) - 0.5) * 14;
            const v = joint ? 68 : Math.max(85, Math.min(185, 138 + grain + tileShift));
            const idx = (y * w + x) * 4;
            d[idx] = v;
            d[idx + 1] = v * 0.98;
            d[idx + 2] = v * 0.95;
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, rx, ry);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.68, metalness: 0.05, envMap: this.envMap, envMapIntensity: 0.35 });
      this.cache[ck] = mat;
      return mat;
    }

    grassMaterial(rx = 12, ry = 12) {
      const ck = `grass_${rx}_${ry}`;
      if (this.cache[ck]) return this.cache[ck];
      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const n = fbm(x * 0.08, y * 0.08, 4);
            const blade = (hash2(x * 2, y * 2) - 0.5) * 22;
            const idx = (y * w + x) * 4;
            d[idx] = Math.max(18, Math.min(80, 34 + n * 24 + blade * 0.4));
            d[idx + 1] = Math.max(45, Math.min(135, 68 + n * 42 + blade));
            d[idx + 2] = Math.max(20, Math.min(75, 36 + n * 20 + blade * 0.3));
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, rx, ry);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0.0 });
      this.cache[ck] = mat;
      return mat;
    }

    fabricMaterial(key, rgb, rx = 4, ry = 4) {
      const ck = `fab_${key}_${rx}`;
      if (this.cache[ck]) return this.cache[ck];
      const map = makeCanvasTex(256, 256, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const weave = ((x + y) % 4 === 0 ? 8 : -4) + (hash2(x, y) - 0.5) * 10;
            const idx = (y * w + x) * 4;
            d[idx] = Math.min(255, Math.max(0, rgb[0] + weave));
            d[idx + 1] = Math.min(255, Math.max(0, rgb[1] + weave));
            d[idx + 2] = Math.min(255, Math.max(0, rgb[2] + weave));
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, rx, ry);
      const mat = new THREE.MeshStandardMaterial({
        map,
        roughness: 0.78,
        metalness: 0.02,
        envMap: this.envMap,
        envMapIntensity: 0.25
      });
      this.cache[ck] = mat;
      return mat;
    }

    persianRugMaterial() {
      if (this.cache.persianRug) return this.cache.persianRug;
      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#5c1622';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#d4a359';
        ctx.lineWidth = 14;
        ctx.strokeRect(22, 22, w - 44, h - 44);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 6;
        ctx.strokeRect(42, 42, w - 84, h - 84);
        ctx.strokeStyle = 'rgba(245, 222, 179, 0.38)';
        ctx.lineWidth = 3;
        for (let r = 40; r <= 170; r += 32) {
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.86, metalness: 0.0 });
      this.cache.persianRug = mat;
      return mat;
    }

    brassMaterial() {
      if (!this.cache.brass) {
        this.cache.brass = new THREE.MeshStandardMaterial({
          color: 0xd4af37,
          roughness: 0.22,
          metalness: 0.88,
          envMap: this.envMap,
          envMapIntensity: 1.35
        });
      }
      return this.cache.brass;
    }

    darkSteelMaterial() {
      if (!this.cache.steel) {
        this.cache.steel = new THREE.MeshStandardMaterial({
          color: 0x27272a,
          roughness: 0.34,
          metalness: 0.78,
          envMap: this.envMap,
          envMapIntensity: 1.0
        });
      }
      return this.cache.steel;
    }

    glassMaterial(opacity = 0.36, tint = 0xe2f1ff) {
      return new THREE.MeshStandardMaterial({
        color: tint,
        transparent: true,
        opacity,
        roughness: 0.06,
        metalness: 0.15,
        envMap: this.envMap,
        envMapIntensity: 1.6
      });
    }

    // =======================================================================
    // 실사풍 정교한 3D 건축 가구 & 소품 생성기 (벽돌 느낌 완전 제거!)
    // =======================================================================

    // 1) 예배당 고급 곡면 원목·벨벳 장의자 (측면 조각 팔걸이 + 패브릭 방석/등받이 + 찬송가 꽂이)
    createRealisticPew(width = 4.6) {
      const grp = new THREE.Group();
      const walnut = this.woodPlankMaterial('walnut_pew', [128, 82, 48], [68, 40, 22], 2, 1, 0.30);
      const darkWood = this.woodPlankMaterial('dark_pew', [78, 48, 28], [42, 24, 12], 1, 1, 0.36);
      const velvet = this.fabricMaterial('burgundy_velvet', [126, 26, 44], 3, 1);

      // 좌판 원목 프레임 + 벨벳 쿠션
      const seatWood = new THREE.Mesh(new THREE.BoxGeometry(width, 0.10, 0.68), walnut);
      seatWood.position.set(0, 0.48, 0.04);
      seatWood.castShadow = true;
      seatWood.receiveShadow = true;

      const seatPad = new THREE.Mesh(new THREE.BoxGeometry(width - 0.18, 0.11, 0.58), velvet);
      seatPad.position.set(0, 0.57, 0.06);
      seatPad.castShadow = true;

      // 인체공학 경사 등받이 + 벨벳 패드 + 상단 원목 몰딩 레일
      const backPivot = new THREE.Group();
      backPivot.position.set(0, 0.52, -0.26);
      backPivot.rotation.x = -0.15;

      const backWood = new THREE.Mesh(new THREE.BoxGeometry(width, 0.68, 0.09), walnut);
      backWood.position.y = 0.34;
      backWood.castShadow = true;

      const backPad = new THREE.Mesh(new THREE.BoxGeometry(width - 0.22, 0.48, 0.06), velvet);
      backPad.position.set(0, 0.34, 0.06);

      const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, width + 0.06, 12), darkWood);
      topRail.rotation.z = Math.PI / 2;
      topRail.position.y = 0.70;

      // 뒷면 성경/찬송가 꽂이 선반
      const bookRack = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, 0.16, 0.12), darkWood);
      bookRack.position.set(0, 0.30, -0.09);

      backPivot.add(backWood, backPad, topRail, bookRack);
      grp.add(seatWood, seatPad, backPivot);

      // 양쪽 측면 입체 원목 엔드패널 & 팔걸이
      [-width / 2 + 0.07, width / 2 - 0.07].forEach((sx) => {
        const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.96, 0.76), darkWood);
        sidePanel.position.set(sx, 0.48, -0.02);
        sidePanel.castShadow = true;

        const armRest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.68), walnut);
        armRest.position.set(sx, 0.78, 0.02);
        grp.add(sidePanel, armRest);
      });

      return grp;
    }

    // 2) 실사 그랜드 피아노 (곡선 바디 + 열려있는 상판 리드 + 88건반 + 보면대 + 황동 페달)
    createGrandPiano() {
      const grp = new THREE.Group();
      const ebony = new THREE.MeshStandardMaterial({
        color: 0x0d1017,
        roughness: 0.07,
        metalness: 0.22,
        envMap: this.envMap,
        envMapIntensity: 1.65
      });
      const brass = this.brassMaterial();

      const shape = new THREE.Shape();
      shape.moveTo(-1.1, -1.1);
      shape.lineTo(1.1, -1.1);
      shape.lineTo(1.1, 0.1);
      shape.bezierCurveTo(1.1, 1.05, 0.25, 1.35, -0.35, 1.25);
      shape.bezierCurveTo(-0.95, 1.15, -1.1, 0.55, -1.1, -1.1);

      const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 });
      bodyGeo.rotateX(-Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, ebony);
      body.position.y = 0.88;
      body.castShadow = true;
      grp.add(body);

      // 내부 골드 하프 프레임(향판)
      const soundboard = new THREE.Mesh(new THREE.CircleGeometry(0.92, 24), brass);
      soundboard.rotation.x = -Math.PI / 2;
      soundboard.position.set(0, 1.31, -0.05);
      grp.add(soundboard);

      // 비스듬히 열린 피아노 덮개(리드) & 황동 지지대
      const lidGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
      lidGeo.rotateX(-Math.PI / 2);
      const lid = new THREE.Mesh(lidGeo, ebony);
      lid.position.set(-1.05, 1.34, 0);
      lid.rotation.z = 0.48;
      lid.position.x = 0;
      grp.add(lid);

      const propStick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), brass);
      propStick.position.set(0.75, 1.62, -0.35);
      propStick.rotation.z = -0.22;
      grp.add(propStick);

      // 88건반 텍스처
      const keyTex = makeCanvasTex(512, 64, (ctx, w, h) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#cbd5e1';
        for (let i = 0; i < 52; i++) {
          ctx.strokeRect((i * w) / 52, 0, w / 52, h);
        }
        ctx.fillStyle = '#0f172a';
        for (let i = 0; i < 52; i++) {
          const m = i % 7;
          if (m !== 2 && m !== 6) {
            ctx.fillRect((i * w) / 52 + 6, 0, (w / 52) * 0.62, h * 0.62);
          }
        }
      }, 1, 1);
      const keys = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.08, 0.28), new THREE.MeshStandardMaterial({ map: keyTex, roughness: 0.2 }));
      keys.position.set(0, 0.92, -1.22);
      grp.add(keys);

      // 다리 3개 & 페달 리라
      [[-0.92, -0.92], [0.92, -0.92], [-0.15, 0.92]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.88, 12), ebony);
        leg.position.set(lx, 0.44, lz);
        leg.castShadow = true;
        grp.add(leg);
      });

      const pedalLyre = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.68, 0.08), ebony);
      pedalLyre.position.set(0, 0.42, -0.85);
      const pedals = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.16), brass);
      pedals.position.set(0, 0.10, -0.92);
      grp.add(pedalLyre, pedals);

      return grp;
    }

    // 3) 현대식 강화유리 & 월넛 원목 강대상 (오픈 성경책 + 듀얼 구즈넥 마이크 + 황동 십자가)
    createModernPulpit() {
      const grp = new THREE.Group();
      const walnut = this.woodPlankMaterial('pulpit_w', [118, 74, 42], [58, 34, 18], 1, 2, 0.26);
      const glass = this.glassMaterial(0.42, 0xdbeafe);
      const brass = this.brassMaterial();

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 0.95), walnut);
      base.position.y = 0.06;
      const centerPillar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.12, 0.36), walnut);
      centerPillar.position.y = 0.66;
      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.08, 0.04), glass);
      glassFront.position.set(0, 0.68, -0.22);

      // 전면 황동 십자가 엠블럼
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.03), brass);
      cv.position.set(0, 0.74, -0.25);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.03), brass);
      ch.position.set(0, 0.82, -0.25);

      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 0.86), walnut);
      deskTop.position.set(0, 1.24, 0);
      deskTop.rotation.x = 0.18;

      const openBible = this.createOpenBibleProp();
      openBible.position.set(0, 1.30, 0.02);
      openBible.rotation.x = 0.18;

      // 구즈넥 마이크 2개
      [-0.36, 0.36].forEach((mx) => {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8), this.darkSteelMaterial());
        stem.position.set(mx, 1.44, -0.18);
        stem.rotation.x = 0.32;
        grp.add(stem);
      });

      grp.add(base, centerPillar, glassFront, cv, ch, deskTop, openBible);
      return grp;
    }

    // 4) 펼쳐진 성경책 소품 (인쇄된 두 페이지 텍스트 & 붉은 가름끈)
    createOpenBibleProp() {
      const grp = new THREE.Group();
      const cover = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.03, 0.48),
        new THREE.MeshStandardMaterial({ color: 0x29150c, roughness: 0.65 })
      );
      const pageTex = makeCanvasTex(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#fdf8ee';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#d6cbb8';
        ctx.fillRect(w / 2 - 2, 0, 4, h);
        ctx.fillStyle = '#475569';
        for (let col = 0; col < 4; col++) {
          const cx = 14 + col * 60 + (col >= 2 ? 8 : 0);
          for (let y = 14; y < h - 14; y += 6) {
            ctx.fillRect(cx, y, 44 - ((y * 7 + col) % 10), 2);
          }
        }
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(w / 2 + 6, 12, 2, h);
      }, 1, 1);

      const pageMat = new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.85 });
      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.045, 0.44), pageMat);
      pages.position.y = 0.03;
      grp.add(cover, pages);
      return grp;
    }

    // 5) 성경통독방 클래식 원목 서가 (몰딩 프레임 + 개별 가죽장정/금박 책등 수십 권!)
    createRealisticBookshelf(width = 4.2, height = 6.4) {
      const grp = new THREE.Group();
      const walnut = this.woodPlankMaterial('shelf_walnut', [112, 68, 38], [52, 28, 14], 2, 3, 0.34);

      // 뒷판 + 좌우 기둥 + 상단 크라운 몰딩
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.12), walnut);
      back.position.set(0, height / 2, -0.38);

      const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.16, height, 0.85), walnut);
      leftSide.position.set(-width / 2 + 0.08, height / 2, 0);
      const rightSide = leftSide.clone();
      rightSide.position.x = width / 2 - 0.08;

      const crown = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, 0.28, 1.0), walnut);
      crown.position.set(0, height + 0.12, 0.04);

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.32, 0.92), walnut);
      plinth.position.set(0, 0.16, 0.02);

      grp.add(back, leftSide, rightSide, crown, plinth);

      // 개별 가죽장정 책등 고해상도 PBR 텍스처
      const bookRowTex = makeCanvasTex(512, 160, (ctx, w, h) => {
        ctx.fillStyle = '#18120e';
        ctx.fillRect(0, 0, w, h);
        const leatherPalette = ['#5b1919', '#1e3a5f', '#1b4332', '#4a2c11', '#2e1f47', '#3f2e21', '#6b2d1f', '#1f2937'];
        let x = 4;
        let idx = 0;
        while (x < w - 18) {
          const bw = 18 + Math.floor(hash2(idx, 1) * 18);
          const bh = Math.floor(h * (0.78 + hash2(idx, 2) * 0.18));
          const col = leatherPalette[idx % leatherPalette.length];

          const grd = ctx.createLinearGradient(x, 0, x + bw, 0);
          grd.addColorStop(0, '#0f0c0a');
          grd.addColorStop(0.22, col);
          grd.addColorStop(0.78, col);
          grd.addColorStop(1, '#0f0c0a');
          ctx.fillStyle = grd;
          ctx.fillRect(x, h - bh, bw - 2, bh);

          // 금박 띠 장식 (Gold Foil Spine Rib)
          ctx.fillStyle = '#eab308';
          ctx.fillRect(x + 2, h - bh + 16, bw - 6, 3);
          ctx.fillRect(x + 2, h - bh + 26, bw - 6, 2);
          ctx.fillRect(x + 2, h - 22, bw - 6, 3);

          x += bw;
          idx++;
        }
      }, 1, 1);

      const bookMat = new THREE.MeshStandardMaterial({ map: bookRowTex, roughness: 0.55, metalness: 0.12 });

      const shelves = 5;
      for (let s = 0; s < shelves; s++) {
        const sy = 0.34 + s * ((height - 0.5) / shelves);
        const board = new THREE.Mesh(new THREE.BoxGeometry(width - 0.16, 0.11, 0.82), walnut);
        board.position.set(0, sy, 0);
        board.castShadow = true;
        grp.add(board);

        const bookBlock = new THREE.Mesh(new THREE.BoxGeometry(width - 0.36, 0.92, 0.54), bookMat);
        bookBlock.position.set(0, sy + 0.51, -0.04);
        bookBlock.castShadow = true;
        grp.add(bookBlock);
      }

      return grp;
    }

    // 6) 통독실/큐티방 실사 원목 책상 + 황동 뱅커스 스탠드 + 펼쳐진 성경책
    createLibraryDeskWithLamp(width = 4.0) {
      const grp = new THREE.Group();
      const oak = this.woodPlankMaterial('desk_oak', [142, 96, 56], [82, 50, 26], 2, 1, 0.28);
      const leatherMat = this.fabricMaterial('desk_pad', [26, 48, 38], 1, 1);
      const brass = this.brassMaterial();

      const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, 1.75), oak);
      top.position.y = 1.06;
      top.castShadow = true;
      top.receiveShadow = true;

      // 가죽 데스크 매트
      const blotter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.015, 0.95), leatherMat);
      blotter.position.set(0, 1.125, 0.15);

      // 테이퍼드 원목 다리 4개 + 하단 보강재
      [[-width / 2 + 0.22, -0.68], [width / 2 - 0.22, -0.68], [-width / 2 + 0.22, 0.68], [width / 2 - 0.22, 0.68]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 1.04, 12), oak);
        leg.position.set(lx, 0.52, lz);
        leg.castShadow = true;
        grp.add(leg);
      });

      // 정통 브라스 뱅커스 램프 (에메랄드 유리 갓 + 황동 기둥)
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.06, 16), brass);
      lampBase.position.set(width * 0.30, 1.15, -0.42);
      const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 10), brass);
      lampStem.position.set(width * 0.30, 1.39, -0.42);
      const lampShade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 0.18, 14, 1, false, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x059669, emissive: 0x065f46, emissiveIntensity: 0.75, roughness: 0.15 })
      );
      lampShade.rotation.z = Math.PI / 2;
      lampShade.rotation.y = Math.PI / 2;
      lampShade.position.set(width * 0.30, 1.62, -0.38);

      const bible = this.createOpenBibleProp();
      bible.position.set(0, 1.13, 0.16);

      grp.add(top, blotter, lampBase, lampStem, lampShade, bible);
      return grp;
    }

    // 7) 사랑방 패브릭 라운드 소파 & 도자기 화분 올리브 나무
    createLoungeSofa(width = 2.5) {
      const grp = new THREE.Group();
      const boucle = this.fabricMaterial('cream_boucle', [226, 218, 205], 3, 2);
      const cushionCol = this.fabricMaterial('warm_cushion', [194, 120, 68], 2, 2);
      const oak = this.woodPlankMaterial('sofa_leg', [135, 92, 54], [75, 48, 24], 1, 1, 0.35);

      const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.34, 0.96), boucle);
      base.position.y = 0.36;
      base.castShadow = true;

      const back = new THREE.Mesh(new THREE.BoxGeometry(width, 0.58, 0.26), boucle);
      back.position.set(0, 0.76, -0.35);
      back.rotation.x = -0.1;
      back.castShadow = true;

      [-width / 2 + 0.14, width / 2 - 0.14].forEach((ax) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.48, 0.96), boucle);
        arm.position.set(ax, 0.58, 0);
        grp.add(arm);
      });

      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.14), cushionCol);
      pillow.position.set(-width * 0.25, 0.72, -0.16);
      pillow.rotation.z = 0.18;

      [[-width / 2 + 0.2, -0.35], [width / 2 - 0.2, -0.35], [-width / 2 + 0.2, 0.35], [width / 2 - 0.2, 0.35]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.20, 8), oak);
        leg.position.set(lx, 0.10, lz);
        grp.add(leg);
      });

      grp.add(base, back, pillow);
      return grp;
    }

    createPottedPlant(scale = 1) {
      const grp = new THREE.Group();
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42 * scale, 0.32 * scale, 0.68 * scale, 16),
        new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.45 })
      );
      pot.position.y = 0.34 * scale;
      pot.castShadow = true;

      const soil = new THREE.Mesh(
        new THREE.CircleGeometry(0.39 * scale, 14),
        new THREE.MeshStandardMaterial({ color: 0x291d16, roughness: 0.95 })
      );
      soil.rotation.x = -Math.PI / 2;
      soil.position.y = 0.67 * scale;

      const stemMat = new THREE.MeshStandardMaterial({ color: 0x57412d, roughness: 0.8 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, 1.5 * scale, 8), stemMat);
      stem.position.y = 1.35 * scale;

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6f44, roughness: 0.52, side: THREE.DoubleSide });
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const h = (0.95 + (i % 5) * 0.26) * scale;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.24 * scale, 8, 6), leafMat);
        leaf.scale.set(1.3, 0.18, 0.72);
        leaf.position.set(Math.cos(a) * 0.38 * scale, h, Math.sin(a) * 0.38 * scale);
        leaf.rotation.y = -a;
        leaf.rotation.z = 0.35;
        grp.add(leaf);
      }

      grp.add(pot, soil, stem);
      return grp;
    }

    // 8) 성화 갤러리 액자 (고풍스러운 금장 조각 액자 + 명암법 유화 스타일 일러스트 캔버스)
    createFramedSacredPainting(art, idx) {
      const grp = new THREE.Group();
      const goldFrame = this.brassMaterial();

      const outer = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.8, 0.18), goldFrame);
      outer.castShadow = true;

      const tex = makeCanvasTex(512, 340, (ctx, w, h) => {
        const bg = ctx.createRadialGradient(w * 0.5, h * 0.38, 18, w * 0.5, h * 0.5, w * 0.68);
        bg.addColorStop(0, art.color2);
        bg.addColorStop(0.55, art.color1);
        bg.addColorStop(1, '#09090b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // 고전 명화 느낌의 빛줄기(Chiaroscuro Rays) & 실루엣 묘사
        ctx.save();
        ctx.globalAlpha = 0.22;
        for (let r = -3; r <= 3; r++) {
          ctx.fillStyle = '#fef3c7';
          ctx.beginPath();
          ctx.moveTo(w * 0.5, 24);
          ctx.lineTo(w * 0.5 + r * 75 - 28, h);
          ctx.lineTo(w * 0.5 + r * 75 + 28, h);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // 중앙 상징 오브제 (십자가 / 언덕 / 비둘기 빛무리)
        ctx.fillStyle = 'rgba(15, 18, 28, 0.72)';
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h + 18, w * 0.58, 95, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        if (idx % 2 === 0) {
          ctx.fillStyle = 'rgba(254, 243, 199, 0.88)';
          ctx.fillRect(w * 0.5 - 6, h * 0.26, 12, 118);
          ctx.fillRect(w * 0.5 - 38, h * 0.36, 76, 12);
        } else {
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.42, 42, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(254, 249, 195, 0.78)';
          ctx.fill();
        }

        // 하단 뮤지엄 명패 바
        ctx.fillStyle = 'rgba(12, 10, 9, 0.82)';
        ctx.fillRect(0, h - 58, w, 58);
        ctx.fillStyle = '#fde68a';
        ctx.font = '700 22px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(art.title, w / 2, h - 29, w - 36);
      }, 1, 1);

      const canvasMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(5.05, 3.35),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.04 })
      );
      canvasMesh.position.z = 0.11;

      grp.add(outer, canvasMesh);
      return grp;
    }

    // 9) 야외 정원 및 루프탑용 자연스러운 수목 (다중 가지 + 풍성한 유기적 수관)
    createRealisticTree(scale = 1) {
      const grp = new THREE.Group();
      const bark = this.woodPlankMaterial('bark', [92, 68, 48], [44, 30, 20], 1, 3, 0.88);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.34 * scale, 2.5 * scale, 10), bark);
      trunk.position.y = 1.25 * scale;
      trunk.castShadow = true;
      grp.add(trunk);

      const leafShades = [0x1e4d2b, 0x276338, 0x1a4225, 0x317243];
      const clusters = [
        [0, 3.1, 0, 1.35],
        [0.85, 2.65, 0.45, 0.95],
        [-0.8, 2.7, 0.35, 1.0],
        [0.45, 2.8, -0.75, 0.92],
        [-0.55, 2.55, -0.65, 0.88],
        [0, 3.75, 0.1, 0.90]
      ];
      clusters.forEach(([cx, cy, cz, cr], i) => {
        const mat = new THREE.MeshStandardMaterial({ color: leafShades[i % leafShades.length], roughness: 0.82 });
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(cr * scale, 1), mat);
        m.position.set(cx * scale, cy * scale, cz * scale);
        m.scale.y = 0.82;
        m.castShadow = true;
        grp.add(m);
      });
      return grp;
    }
  }

  window.ArchitecturalPBR = ArchitecturalPBR;
})();
