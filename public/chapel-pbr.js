/* =========================================================================
 * 소미 3D 온라인 캠퍼스 — CAD / Enscape / V-Ray 스타일 실사 건축 인테리어 PBR 라이브러리
 * (곡선 간접조명 천장 · 벽면 월워셔(Wall-Wash) GI 그라데이션 · 모던 오크 가구 · 빌트인 LED 서가)
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
      this.envMap = this._buildBrightCadEnvMap();
      this.glowDotTex = this._buildSoftRadialGlowTex();
      this.coveGlowTex = this._buildLinearGlowTex();
    }

    // 밝고 화사한 3800K 현대 건축 인테리어 반사 환경맵 (V-Ray / Enscape 느낌)
    _buildBrightCadEnvMap() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 256;
      const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0.0, '#fffaf0');
      grd.addColorStop(0.32, '#f5ebd6');
      grd.addColorStop(0.50, '#e5d5bc');
      grd.addColorStop(0.75, '#8c8275');
      grd.addColorStop(1.0, '#4a4744');
      g.fillStyle = grd;
      g.fillRect(0, 0, 512, 256);

      // 천장 간접 라인조명 반사 밴드
      g.fillStyle = '#ffffff';
      for (let y = 18; y <= 78; y += 20) {
        g.fillRect(0, y, 512, 6);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
      return tex;
    }

    // 매립형 원형 다운라이트(타공 조명) 소프트 헤일로 텍스처
    _buildSoftRadialGlowTex() {
      return makeCanvasTex(128, 128, (ctx, w, h) => {
        const rg = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
        rg.addColorStop(0.0, 'rgba(255, 253, 244, 1.0)');
        rg.addColorStop(0.28, 'rgba(255, 244, 214, 0.85)');
        rg.addColorStop(0.62, 'rgba(255, 230, 175, 0.25)');
        rg.addColorStop(1.0, 'rgba(255, 230, 175, 0.0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      }, 1, 1);
    }

    // 간접 코브(Cove) 라인조명 빛 번짐(Wall/Ceiling Wash) 텍스처
    _buildLinearGlowTex() {
      return makeCanvasTex(64, 256, (ctx, w, h) => {
        const lg = ctx.createLinearGradient(0, 0, 0, h);
        lg.addColorStop(0.0, 'rgba(255, 250, 232, 0.92)');
        lg.addColorStop(0.25, 'rgba(255, 238, 196, 0.48)');
        lg.addColorStop(0.65, 'rgba(255, 228, 170, 0.12)');
        lg.addColorStop(1.0, 'rgba(255, 228, 170, 0.0)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, w, h);
      }, 1, 1);
    }

    // 1) 벽면 수직 간접조명(Wall-Wash GI) 베이지/내추럴오크 어쿠스틱 패널 (참조 이미지의 핵심 벽면!)
    wallWashPanelMaterial(key = 'sand', fromLeft = true) {
      const ck = `wallwash_${key}_${fromLeft}`;
      if (this.cache[ck]) return this.cache[ck];

      const base = key === 'white' ? [232, 229, 222] : [208, 184, 150];
      const shade = key === 'white' ? [196, 191, 182] : [158, 132, 98];

      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        // 기본 따뜻한 패브릭/우드 흡음보드 결 + 좌측(또는 우측) 수직 간접조명 GI 그라데이션 + 상단 천장 간접광
        const hGrad = ctx.createLinearGradient(fromLeft ? 0 : w, 0, fromLeft ? w : 0, 0);
        hGrad.addColorStop(0.0, `rgb(255, 246, 222)`);
        hGrad.addColorStop(0.18, `rgb(${Math.min(255, base[0] + 16)}, ${Math.min(255, base[1] + 14)}, ${Math.min(255, base[2] + 10)})`);
        hGrad.addColorStop(0.58, `rgb(${base[0]}, ${base[1]}, ${base[2]})`);
        hGrad.addColorStop(1.0, `rgb(${shade[0]}, ${shade[1]}, ${shade[2]})`);
        ctx.fillStyle = hGrad;
        ctx.fillRect(0, 0, w, h);

        // 상단 천장 코브 빛 번짐 & 하단 걸레받이 음영(AO)
        const vGrad = ctx.createLinearGradient(0, 0, 0, h);
        vGrad.addColorStop(0.0, 'rgba(255, 246, 218, 0.36)');
        vGrad.addColorStop(0.22, 'rgba(255, 246, 218, 0.0)');
        vGrad.addColorStop(0.88, 'rgba(0, 0, 0, 0.0)');
        vGrad.addColorStop(0.97, 'rgba(30, 24, 18, 0.18)');
        vGrad.addColorStop(1.0, 'rgba(40, 32, 24, 0.55)');
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, w, h);

        // 선명한 건축용 패널 줄눈(CAD 줄눈 디테일)
        ctx.strokeStyle = 'rgba(70, 55, 38, 0.18)';
        ctx.lineWidth = 2;
        for (let y = 128; y < h; y += 128) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        for (let x = 128; x < w; x += 128) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
      }, 1, 1);

      // FrontSide 전용: 실내에서는 선명하게 보이고, 카메라가 벽 뒤로 빠져나갈 때는 자동으로 투명 투과됨!
      const mat = new THREE.MeshStandardMaterial({
        map,
        emissive: new THREE.Color(0xffe8b8),
        emissiveMap: map,
        emissiveIntensity: 0.08,
        roughness: 0.65,
        metalness: 0.02,
        envMap: this.envMap,
        envMapIntensity: 0.25,
        side: THREE.FrontSide
      });
      this.cache[ck] = mat;
      return mat;
    }

    // 2) 천장 파인 오크 우드 루버 (참조 사진 천장의 촘촘한 밝은 우드 슬랫 + 간접광 반사)
    ceilingFineSlatMaterial(rx = 16, ry = 4) {
      const ck = `ceil_slat_${rx}_${ry}`;
      if (this.cache[ck]) return this.cache[ck];

      const map = makeCanvasTex(512, 256, (ctx, w, h) => {
        ctx.fillStyle = '#8c7355';
        ctx.fillRect(0, 0, w, h);
        const slats = 32;
        const sw = w / slats;
        for (let i = 0; i < slats; i++) {
          const tone = 0.94 + hash2(i, 7) * 0.10;
          ctx.fillStyle = `rgb(${Math.round(226 * tone)}, ${Math.round(202 * tone)}, ${Math.round(168 * tone)})`;
          ctx.fillRect(i * sw + 1.5, 0, sw - 3, h);
        }
      }, rx, ry);

      const mat = new THREE.MeshStandardMaterial({
        map,
        emissive: new THREE.Color(0xffecc4),
        emissiveIntensity: 0.10,
        roughness: 0.52,
        metalness: 0.03,
        envMap: this.envMap,
        envMapIntensity: 0.3,
        side: THREE.FrontSide
      });
      this.cache[ck] = mat;
      return mat;
    }

    // 3) 밝은 내추럴 오크 / 라이트 월넛 원목 재질 (모던 가구 및 마루용)
    woodPlankMaterial(key, baseRgb, darkRgb, rx = 3, ry = 3, roughness = 0.32) {
      const ck = `wood2_${key}_${rx}_${ry}`;
      if (this.cache[ck]) return this.cache[ck];

      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        const planks = 8;
        const pw = w / planks;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const pIdx = Math.floor(x / pw);
            const seamY = (y + pIdx * 160) % 256;
            const isGap = (x % Math.floor(pw) < 1) || seamY < 1;
            const plankTone = (hash2(pIdx, Math.floor((y + pIdx * 160) / 256)) - 0.5) * 0.08;
            const n = fbm(x * 0.06, y * 0.014 + pIdx * 2.7, 4);
            const ring = Math.sin(x * 0.20 + n * 7.5) * 0.5 + 0.5;
            const t = Math.max(0, Math.min(1, ring * 0.55 + n * 0.45 + plankTone));

            const idx = (y * w + x) * 4;
            if (isGap) {
              d[idx] = darkRgb[0] * 0.72;
              d[idx + 1] = darkRgb[1] * 0.72;
              d[idx + 2] = darkRgb[2] * 0.72;
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

      const mat = new THREE.MeshStandardMaterial({
        map,
        roughness,
        metalness: 0.03,
        envMap: this.envMap,
        envMapIntensity: 0.5
      });
      this.cache[ck] = mat;
      return mat;
    }

    // 4) 모던 내추럴 오크 세로 어쿠스틱 루버월 (밝고 세련된 현대 교회/세미나실 아트월)
    acousticSlatMaterial(rx = 6, ry = 2, lightMode = true) {
      const ck = `slat2_${rx}_${ry}_${lightMode}`;
      if (this.cache[ck]) return this.cache[ck];

      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        ctx.fillStyle = lightMode ? '#3d332a' : '#181310';
        ctx.fillRect(0, 0, w, h);
        const slats = 18;
        const sw = w / slats;
        for (let i = 0; i < slats; i++) {
          const sx = i * sw + 2.5;
          const slatW = sw - 5;
          const tone = 0.90 + hash2(i, 5) * 0.18;
          const r = lightMode ? 208 : 148;
          const g = lightMode ? 172 : 102;
          const b = lightMode ? 128 : 64;
          const grd = ctx.createLinearGradient(sx, 0, sx + slatW, 0);
          grd.addColorStop(0, `rgb(${Math.round(r * 0.86 * tone)}, ${Math.round(g * 0.86 * tone)}, ${Math.round(b * 0.86 * tone)})`);
          grd.addColorStop(0.5, `rgb(${Math.round(r * tone)}, ${Math.round(g * tone)}, ${Math.round(b * tone)})`);
          grd.addColorStop(1, `rgb(${Math.round(r * 0.82 * tone)}, ${Math.round(g * 0.82 * tone)}, ${Math.round(b * 0.82 * tone)})`);
          ctx.fillStyle = grd;
          ctx.fillRect(sx, 0, slatW, h);
        }
      }, rx, ry);

      const mat = new THREE.MeshStandardMaterial({
        map,
        roughness: 0.40,
        metalness: 0.04,
        envMap: this.envMap,
        envMapIntensity: 0.55
      });
      this.cache[ck] = mat;
      return mat;
    }

    // 5) 다크 그레이 아키텍처 카펫 타일 (참조 사진 대성전·통독실 바닥 카펫 타일!)
    carpetTileMaterial(rx = 16, ry = 16, baseRgb = [78, 80, 84]) {
      const ck = `carpet_tile_${rx}_${ry}_${baseRgb[0]}`;
      if (this.cache[ck]) return this.cache[ck];

      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const tx = Math.floor(x / 128), ty = Math.floor(y / 128);
            const checker = (tx + ty) % 2 === 0 ? 3 : -3;
            const seam = (x % 128 === 0 || y % 128 === 0) ? -8 : 0;
            const grain = (hash2(x, y) - 0.5) * 14;
            const idx = (y * w + x) * 4;
            d[idx] = Math.max(0, Math.min(255, baseRgb[0] + checker + seam + grain));
            d[idx + 1] = Math.max(0, Math.min(255, baseRgb[1] + checker + seam + grain));
            d[idx + 2] = Math.max(0, Math.min(255, baseRgb[2] + checker + seam + grain));
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, rx, ry);

      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.90, metalness: 0.0 });
      this.cache[ck] = mat;
      return mat;
    }

    // 6) 크림 아이보리 대리석 / 트래버틴 / 화이트 스투코 재질
    marbleMaterial(key, baseRgb, veinRgb, rx = 3, ry = 3, roughness = 0.22) {
      const ck = `marble2_${key}_${rx}_${ry}`;
      if (this.cache[ck]) return this.cache[ck];

      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const n = fbm(x * 0.012, y * 0.012, 5);
            const vein = Math.pow(Math.abs(Math.sin((x * 0.014 + y * 0.009) + n * 4.8)), 16);
            const isJoint = (x % 256 < 2) || (y % 256 < 2);
            const idx = (y * w + x) * 4;
            if (isJoint) {
              d[idx] = baseRgb[0] * 0.88;
              d[idx + 1] = baseRgb[1] * 0.88;
              d[idx + 2] = baseRgb[2] * 0.88;
            } else {
              d[idx] = Math.min(255, Math.max(0, baseRgb[0] - vein * (baseRgb[0] - veinRgb[0])));
              d[idx + 1] = Math.min(255, Math.max(0, baseRgb[1] - vein * (baseRgb[1] - veinRgb[1])));
              d[idx + 2] = Math.min(255, Math.max(0, baseRgb[2] - vein * (baseRgb[2] - veinRgb[2])));
            }
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, rx, ry);

      const mat = new THREE.MeshStandardMaterial({
        map,
        roughness,
        metalness: 0.04,
        envMap: this.envMap,
        envMapIntensity: 0.75
      });
      this.cache[ck] = mat;
      return mat;
    }

    granitePaverMaterial(rx = 8, ry = 8) {
      const ck = `granite2_${rx}_${ry}`;
      if (this.cache[ck]) return this.cache[ck];
      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const joint = (x % 128 < 2) || (y % 128 < 2);
            const grain = (hash2(x, y) - 0.5) * 18;
            const v = joint ? 135 : Math.max(160, Math.min(225, 196 + grain));
            const idx = (y * w + x) * 4;
            d[idx] = v;
            d[idx + 1] = v * 0.99;
            d[idx + 2] = v * 0.97;
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, rx, ry);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.58, metalness: 0.04, envMap: this.envMap, envMapIntensity: 0.4 });
      this.cache[ck] = mat;
      return mat;
    }

    grassMaterial(rx = 12, ry = 12) {
      const ck = `grass2_${rx}_${ry}`;
      if (this.cache[ck]) return this.cache[ck];
      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const n = fbm(x * 0.08, y * 0.08, 4);
            const blade = (hash2(x * 2, y * 2) - 0.5) * 18;
            const idx = (y * w + x) * 4;
            d[idx] = Math.max(30, Math.min(95, 52 + n * 28 + blade * 0.4));
            d[idx + 1] = Math.max(70, Math.min(155, 98 + n * 42 + blade));
            d[idx + 2] = Math.max(32, Math.min(90, 48 + n * 20 + blade * 0.3));
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, rx, ry);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.88, metalness: 0.0 });
      this.cache[ck] = mat;
      return mat;
    }

    fabricMaterial(key, rgb, rx = 4, ry = 4) {
      const ck = `fab2_${key}_${rx}`;
      if (this.cache[ck]) return this.cache[ck];
      const map = makeCanvasTex(256, 256, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const weave = ((x + y) % 4 === 0 ? 5 : -3) + (hash2(x, y) - 0.5) * 7;
            const idx = (y * w + x) * 4;
            d[idx] = Math.min(255, Math.max(0, rgb[0] + weave));
            d[idx + 1] = Math.min(255, Math.max(0, rgb[1] + weave));
            d[idx + 2] = Math.min(255, Math.max(0, rgb[2] + weave));
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, rx, ry);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.80, metalness: 0.01, envMap: this.envMap, envMapIntensity: 0.25 });
      this.cache[ck] = mat;
      return mat;
    }

    modernRugMaterial() {
      if (this.cache.modRug) return this.cache.modRug;
      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#e7e2d8';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#c8bfb0';
        ctx.lineWidth = 10;
        ctx.strokeRect(26, 26, w - 52, h - 52);
        for (let i = 0; i < 4000; i++) {
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(180,170,155,0.18)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
        }
      }, 1, 1);
      this.cache.modRug = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0 });
      return this.cache.modRug;
    }

    brassMaterial() {
      if (!this.cache.brass2) {
        this.cache.brass2 = new THREE.MeshStandardMaterial({
          color: 0xd4af37,
          roughness: 0.22,
          metalness: 0.85,
          envMap: this.envMap,
          envMapIntensity: 1.2
        });
      }
      return this.cache.brass2;
    }

    whiteMetalMaterial() {
      if (!this.cache.wmetal) {
        this.cache.wmetal = new THREE.MeshStandardMaterial({
          color: 0xf4f4f5,
          roughness: 0.26,
          metalness: 0.35,
          envMap: this.envMap,
          envMapIntensity: 0.8
        });
      }
      return this.cache.wmetal;
    }

    darkSteelMaterial() {
      if (!this.cache.steel2) {
        this.cache.steel2 = new THREE.MeshStandardMaterial({
          color: 0x27272a,
          roughness: 0.30,
          metalness: 0.75,
          envMap: this.envMap,
          envMapIntensity: 0.9
        });
      }
      return this.cache.steel2;
    }

    glassMaterial(opacity = 0.34, tint = 0xeff6ff) {
      return new THREE.MeshStandardMaterial({
        color: tint,
        transparent: true,
        opacity,
        roughness: 0.05,
        metalness: 0.12,
        envMap: this.envMap,
        envMapIntensity: 1.5
      });
    }

    // =======================================================================
    // CAD 건축 조명 컴포넌트 (매립형 다운라이트 · 우물천장 간접 코브 · 벽면 간접 라인)
    // =======================================================================
    createRecessedDownlight(radius = 0.28) {
      const grp = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.65, radius, 20),
        this.whiteMetalMaterial()
      );
      ring.rotation.x = Math.PI / 2;

      const core = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 0.66, 20),
        new THREE.MeshBasicMaterial({ color: 0xfffdf5 })
      );
      core.rotation.x = Math.PI / 2;
      core.position.y = -0.005;

      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 5.2, radius * 5.2),
        new THREE.MeshBasicMaterial({
          map: this.glowDotTex,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = -0.015;

      grp.add(ring, core, halo);
      return grp;
    }

    // 일반 모던 룸용 우물천장(Coffered Cove Ceiling) + 매립 다운라이트 그리드 일체형 생성기
    createModernRoomCeiling(width, depth, height, downlightCols = 4, downlightRows = 4) {
      const grp = new THREE.Group();
      // FrontSide가 아래(-Y)를 향하도록 설정 ➔ 실내에서 올려다보면 완벽한 천장이 보이며, 천장 위 조감도에서는 시야를 가리지 않음!
      const whiteCeilMat = new THREE.MeshStandardMaterial({
        color: 0xf8f6f0,
        emissive: 0xfff8e7,
        emissiveIntensity: 0.26,
        roughness: 0.65,
        side: THREE.FrontSide
      });
      const oakSlatCeil = this.ceilingFineSlatMaterial(10, 6);
      oakSlatCeil.side = THREE.FrontSide;

      // 외곽 천장 테두리
      const mainPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), whiteCeilMat);
      mainPlane.rotation.x = Math.PI / 2;
      mainPlane.position.y = height;
      grp.add(mainPlane);

      // 중앙 매립 우물천장 (우드 슬랫 + 사방 간접 라인조명 코브)
      const inW = width * 0.72;
      const inD = depth * 0.72;
      const centerWell = new THREE.Mesh(new THREE.PlaneGeometry(inW, inD), oakSlatCeil);
      centerWell.rotation.x = Math.PI / 2;
      centerWell.position.y = height + 0.35;
      grp.add(centerWell);

      const coveMat = new THREE.MeshBasicMaterial({ color: 0xfff8dc });
      const cFront = new THREE.Mesh(new THREE.BoxGeometry(inW, 0.14, 0.08), coveMat);
      cFront.position.set(0, height + 0.12, -inD / 2);
      const cBack = cFront.clone();
      cBack.position.z = inD / 2;
      const cLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, inD), coveMat);
      cLeft.position.set(-inW / 2, height + 0.12, 0);
      const cRight = cLeft.clone();
      cRight.position.x = inW / 2;
      grp.add(cFront, cBack, cLeft, cRight);

      // 정교한 격자형 매립 타공 다운라이트 배치
      for (let r = 0; r < downlightRows; r++) {
        for (let c = 0; c < downlightCols; c++) {
          const lx = -width * 0.38 + (c / Math.max(1, downlightCols - 1)) * (width * 0.76);
          const lz = -depth * 0.38 + (r / Math.max(1, downlightRows - 1)) * (depth * 0.76);
          const dl = this.createRecessedDownlight(0.24);
          dl.position.set(lx, height - 0.01, lz);
          grp.add(dl);
        }
      }

      return grp;
    }

    // =======================================================================
    // CAD 스타일 모던 가구 컴포넌트
    // =======================================================================

    // 1) 참조 사진과 동일한 밝은 내추럴 자작/오크 모던 장의자 (깔끔한 직선형 오픈 암레스트 프레임!)
    createRealisticPew(width = 4.5) {
      const grp = new THREE.Group();
      const lightOak = this.woodPlankMaterial('cad_birch_pew', [218, 186, 142], [176, 144, 102], 2, 1, 0.32);
      const seatPadMat = this.fabricMaterial('pew_beige_pad', [196, 174, 144], 2, 1);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, 0.56), lightOak);
      seat.position.set(0, 0.46, 0.04);
      seat.castShadow = true;
      seat.receiveShadow = true;

      const cushion = new THREE.Mesh(new THREE.BoxGeometry(width - 0.14, 0.05, 0.50), seatPadMat);
      cushion.position.set(0, 0.51, 0.05);

      const back = new THREE.Mesh(new THREE.BoxGeometry(width, 0.54, 0.06), lightOak);
      back.position.set(0, 0.78, -0.22);
      back.rotation.x = -0.10;
      back.castShadow = true;
      back.receiveShadow = true;

      // CAD 도면 스타일 오픈 프레임 팔걸이 & 다리 (참조 사진 하단 장의자 디테일 완벽 재현!)
      const framePositions = [-width / 2 + 0.04, width / 2 - 0.04];
      if (width > 3.5) framePositions.push(0);

      framePositions.forEach((fx) => {
        const frontLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.05), lightOak);
        frontLeg.position.set(fx, 0.36, 0.28);
        const backLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.04, 0.05), lightOak);
        backLeg.position.set(fx, 0.52, -0.24);
        const topArm = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.56), lightOak);
        topArm.position.set(fx, 0.72, 0.02);
        const baseFoot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.62), lightOak);
        baseFoot.position.set(fx, 0.02, 0.02);
        grp.add(frontLeg, backLeg, topArm, baseFoot);
      });

      grp.add(seat, cushion, back);
      return grp;
    }

    // 2) 모던 세미나/통독 의자 (화이트·그레이 패브릭 쉘 + 크롬/블랙 슬레드 프레임)
    createModernChair() {
      const grp = new THREE.Group();
      const shellMat = this.fabricMaterial('chair_grey', [92, 96, 104], 1, 1);
      const metal = this.whiteMetalMaterial();

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.52), shellMat);
      seat.position.y = 0.46;
      seat.castShadow = true;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.46, 0.05), shellMat);
      back.position.set(0, 0.72, -0.24);
      back.rotation.x = -0.1;
      back.castShadow = true;

      [[-0.23, -0.22], [0.23, -0.22], [-0.23, 0.22], [0.23, 0.22]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), metal);
        leg.position.set(lx, 0.23, lz);
        grp.add(leg);
      });

      grp.add(seat, back);
      return grp;
    }

    // 3) 그랜드 피아노 (고광택 에보니 + 골드 프레임 + 88건반)
    createGrandPiano() {
      const grp = new THREE.Group();
      const ebony = new THREE.MeshStandardMaterial({
        color: 0x111318,
        roughness: 0.06,
        metalness: 0.25,
        envMap: this.envMap,
        envMapIntensity: 1.5
      });
      const brass = this.brassMaterial();

      const shape = new THREE.Shape();
      shape.moveTo(-1.05, -1.0);
      shape.lineTo(1.05, -1.0);
      shape.lineTo(1.05, 0.1);
      shape.bezierCurveTo(1.05, 0.98, 0.22, 1.28, -0.35, 1.18);
      shape.bezierCurveTo(-0.92, 1.08, -1.05, 0.50, -1.05, -1.0);

      const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.38, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
      bodyGeo.rotateX(-Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, ebony);
      body.position.y = 0.84;
      body.castShadow = true;
      grp.add(body);

      const soundboard = new THREE.Mesh(new THREE.CircleGeometry(0.86, 24), brass);
      soundboard.rotation.x = -Math.PI / 2;
      soundboard.position.set(0, 1.24, -0.05);
      grp.add(soundboard);

      const lidGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false });
      lidGeo.rotateX(-Math.PI / 2);
      const lid = new THREE.Mesh(lidGeo, ebony);
      lid.position.set(0, 1.26, 0);
      lid.rotation.z = 0.44;
      grp.add(lid);

      const propStick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.78, 8), brass);
      propStick.position.set(0.72, 1.52, -0.32);
      propStick.rotation.z = -0.22;
      grp.add(propStick);

      const keys = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.07, 0.26), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 }));
      keys.position.set(0, 0.88, -1.12);
      grp.add(keys);

      [[-0.86, -0.86], [0.86, -0.86], [-0.12, 0.86]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.84, 12), ebony);
        leg.position.set(lx, 0.42, lz);
        grp.add(leg);
      });

      return grp;
    }

    // 4) 모던 화이트 & 클리어 아크릴 강대상 (참조 사진 성단 중앙의 깔끔한 화이트/크리스탈 강대상!)
    createModernPulpit() {
      const grp = new THREE.Group();
      const whiteStone = this.marbleMaterial('pulpit_white', [248, 246, 242], [220, 216, 208], 1, 1, 0.2);
      const acrylic = this.glassMaterial(0.45, 0xffffff);

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.10, 0.82), whiteStone);
      base.position.y = 0.05;
      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.08, 0.46), whiteStone);
      leftPillar.position.set(-0.42, 0.59, 0);
      const rightPillar = leftPillar.clone();
      rightPillar.position.x = 0.42;
      const centerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.04, 0.04), acrylic);
      centerGlass.position.set(0, 0.59, -0.14);

      const top = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 0.78), whiteStone);
      top.position.set(0, 1.15, 0);
      top.rotation.x = 0.15;

      const openBible = this.createOpenBibleProp();
      openBible.position.set(0, 1.20, 0.02);
      openBible.rotation.x = 0.15;

      grp.add(base, leftPillar, rightPillar, centerGlass, top, openBible);
      return grp;
    }

    createOpenBibleProp() {
      const grp = new THREE.Group();
      const cover = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.025, 0.44),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
      );
      const pageTex = makeCanvasTex(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(w / 2 - 2, 0, 4, h);
        ctx.fillStyle = '#64748b';
        for (let col = 0; col < 4; col++) {
          const cx = 14 + col * 60 + (col >= 2 ? 8 : 0);
          for (let y = 14; y < h - 14; y += 6) {
            ctx.fillRect(cx, y, 42 - ((y * 5 + col) % 8), 2);
          }
        }
      }, 1, 1);
      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.04, 0.40), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.8 }));
      pages.position.y = 0.028;
      grp.add(cover, pages);
      return grp;
    }

    // 5) 모던 북카페형 빌트인 라이트오크 서가 (선반 하단마다 매립형 간접 LED 라인조명 내장!)
    createRealisticBookshelf(width = 4.8, height = 6.4) {
      const grp = new THREE.Group();
      const lightOak = this.woodPlankMaterial('mod_shelf_oak', [216, 184, 142], [174, 142, 102], 2, 3, 0.35);
      const warmBack = new THREE.MeshStandardMaterial({
        color: 0xfbf8f1,
        emissive: 0xfff3d1,
        emissiveIntensity: 0.32,
        roughness: 0.6
      });

      const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.08), warmBack);
      back.position.set(0, height / 2, -0.34);

      const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.10, height, 0.72), lightOak);
      leftSide.position.set(-width / 2 + 0.05, height / 2, 0);
      const rightSide = leftSide.clone();
      rightSide.position.x = width / 2 - 0.05;
      const topBoard = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, 0.76), lightOak);
      topBoard.position.set(0, height, 0);

      grp.add(back, leftSide, rightSide, topBoard);

      // 모던 아트북·성경책·화이트/베이지/네이비 북커버 디자인 텍스처
      const bookTex = makeCanvasTex(512, 160, (ctx, w, h) => {
        ctx.fillStyle = '#f8f5ee';
        ctx.fillRect(0, 0, w, h);
        const modColors = ['#f8fafc', '#e2e8f0', '#cbd5e1', '#1e293b', '#334155', '#d6c7b2', '#94a3b8', '#475569'];
        let x = 10;
        let idx = 0;
        while (x < w - 22) {
          if (idx % 7 === 5) {
            x += 26; // 모던 북카페 특유의 여백미!
            idx++;
            continue;
          }
          const bw = 15 + Math.floor(hash2(idx, 2) * 16);
          const bh = Math.floor(h * (0.72 + hash2(idx, 4) * 0.22));
          ctx.fillStyle = modColors[idx % modColors.length];
          ctx.fillRect(x, h - bh, bw - 2, bh);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(x + bw - 3, h - bh, 1.5, bh);
          x += bw;
          idx++;
        }
      }, 1, 1);

      const bookMat = new THREE.MeshStandardMaterial({ map: bookTex, roughness: 0.5 });
      const ledMat = new THREE.MeshBasicMaterial({ color: 0xfff8dc });

      const shelves = 5;
      for (let s = 0; s < shelves; s++) {
        const sy = 0.24 + s * ((height - 0.36) / shelves);
        const board = new THREE.Mesh(new THREE.BoxGeometry(width - 0.12, 0.07, 0.70), lightOak);
        board.position.set(0, sy, 0);
        grp.add(board);

        // 선반 하단 매립 LED 바
        const led = new THREE.Mesh(new THREE.BoxGeometry(width - 0.24, 0.025, 0.04), ledMat);
        led.position.set(0, sy + ((height - 0.36) / shelves) - 0.06, 0.24);
        grp.add(led);

        const books = new THREE.Mesh(new THREE.BoxGeometry(width - 0.42, 0.84, 0.42), bookMat);
        books.position.set(0, sy + 0.46, -0.06);
        books.castShadow = true;
        grp.add(books);
      }

      return grp;
    }

    // 6) 모던 화이트 & 라이트오크 스터디/세미나 데스크 (미니멀 리니어 LED 데스크 램프 + 오픈 성경/태블릿)
    createModernStudyDesk(width = 4.0) {
      const grp = new THREE.Group();
      const whiteTopMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.28, envMap: this.envMap, envMapIntensity: 0.5 });
      const oakEdge = this.woodPlankMaterial('desk_edge_oak', [216, 184, 142], [174, 142, 102], 2, 1, 0.35);
      const metalLeg = this.whiteMetalMaterial();
      const glassDivider = this.glassMaterial(0.32, 0xe2e8f0);

      const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, 1.55), whiteTopMat);
      top.position.y = 0.96;
      top.castShadow = true;
      top.receiveShadow = true;

      const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.04, 1.57), oakEdge);
      trim.position.y = 0.93;

      // 반투명 프로스트 유리 전면 가림막(파티션)
      const screen = new THREE.Mesh(new THREE.BoxGeometry(width - 0.3, 0.32, 0.025), glassDivider);
      screen.position.set(0, 1.14, -0.45);

      // 슬림 스틸 사각 프레임 다리
      [-width / 2 + 0.14, width / 2 - 0.14].forEach((lx) => {
        const legF = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.94, 0.05), metalLeg);
        legF.position.set(lx, 0.47, 0.68);
        const legB = legF.clone();
        legB.position.z = -0.68;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.41), metalLeg);
        bar.position.set(lx, 0.03, 0);
        grp.add(legF, legB, bar);
      });

      // 미니멀 알루미늄 아키텍처 리니어 데스크 스탠드
      const lStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.46, 8), this.darkSteelMaterial());
      lStem.position.set(width * 0.32, 1.21, -0.35);
      const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.02, 0.035), this.darkSteelMaterial());
      lArm.position.set(width * 0.32 - 0.18, 1.44, -0.25);
      const lGlow = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.01, 0.03), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
      lGlow.position.set(width * 0.32 - 0.18, 1.425, -0.25);

      const bible = this.createOpenBibleProp();
      bible.position.set(0, 1.00, 0.18);

      grp.add(top, trim, screen, lStem, lArm, lGlow, bible);
      return grp;
    }

    // 7) 모던 로우프로파일 패브릭 라운지 소파 (사랑방/라운지용)
    createLoungeSofa(width = 2.4) {
      const grp = new THREE.Group();
      const oatmeal = this.fabricMaterial('oatmeal_sofa', [236, 230, 220], 3, 2);
      const accentPillow = this.fabricMaterial('sage_pillow', [168, 182, 164], 2, 2);
      const oakBase = this.woodPlankMaterial('sofa_oak_plinth', [206, 174, 132], [164, 132, 92], 2, 1, 0.35);

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(width, 0.10, 0.94), oakBase);
      plinth.position.y = 0.10;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(width, 0.28, 0.92), oatmeal);
      seat.position.y = 0.29;
      seat.castShadow = true;
      seat.receiveShadow = true;

      const back = new THREE.Mesh(new THREE.BoxGeometry(width, 0.50, 0.24), oatmeal);
      back.position.set(0, 0.64, -0.34);
      back.castShadow = true;

      [-width / 2 + 0.13, width / 2 - 0.13].forEach((ax) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.92), oatmeal);
        arm.position.set(ax, 0.52, 0);
        grp.add(arm);
      });

      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.34, 0.12), accentPillow);
      pillow.position.set(-width * 0.24, 0.60, -0.16);
      pillow.rotation.z = 0.14;

      grp.add(plinth, seat, back, pillow);
      return grp;
    }

    // 8) 화이트 도자기 대형 플랜터 화분 관엽식물 (참조 사진 우측 화이트 화분 야자/몬스테라 재현!)
    createPottedPlant(scale = 1) {
      const grp = new THREE.Group();
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.44 * scale, 0.34 * scale, 0.72 * scale, 20),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, envMap: this.envMap, envMapIntensity: 0.6 })
      );
      pot.position.y = 0.36 * scale;
      pot.castShadow = true;

      const soil = new THREE.Mesh(
        new THREE.CircleGeometry(0.41 * scale, 16),
        new THREE.MeshStandardMaterial({ color: 0x3b2f26, roughness: 0.9 })
      );
      soil.rotation.x = -Math.PI / 2;
      soil.position.y = 0.71 * scale;

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d7a47, roughness: 0.45, side: THREE.DoubleSide });
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x4b6b3c, roughness: 0.7 });

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const tilt = 0.28 + (i % 3) * 0.18;
        const frond = new THREE.Group();
        frond.position.set(0, 0.68 * scale, 0);
        frond.rotation.y = a;
        frond.rotation.z = tilt;

        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * scale, 0.025 * scale, 1.2 * scale, 6), stemMat);
        stalk.position.y = 0.6 * scale;
        const blade = new THREE.Mesh(new THREE.SphereGeometry(0.32 * scale, 10, 8), leafMat);
        blade.scale.set(0.75, 1.85, 0.12);
        blade.position.y = 1.15 * scale;
        blade.castShadow = true;

        frond.add(stalk, blade);
        grp.add(frond);
      }

      grp.add(pot, soil);
      return grp;
    }

    // 9) 현대 미술관 스타일 미니멀 슬림 프레임 성화 액자 + 상단 갤러리 월워셔 스포트라이트
    createFramedSacredPainting(art, idx) {
      const grp = new THREE.Group();
      const slimFrame = this.darkSteelMaterial();

      const outer = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.6, 0.10), slimFrame);
      outer.castShadow = true;

      const tex = makeCanvasTex(512, 340, (ctx, w, h) => {
        const bg = ctx.createRadialGradient(w * 0.5, h * 0.38, 18, w * 0.5, h * 0.5, w * 0.68);
        bg.addColorStop(0, art.color2);
        bg.addColorStop(0.58, art.color1);
        bg.addColorStop(1, '#111827');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 24;
        ctx.strokeRect(12, 12, w - 24, h - 24); // 모던 화이트 매트 보드

        if (idx % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 251, 235, 0.92)';
          ctx.fillRect(w * 0.5 - 5, h * 0.24, 10, 114);
          ctx.fillRect(w * 0.5 - 34, h * 0.35, 68, 10);
        } else {
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.42, 40, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(254, 249, 195, 0.85)';
          ctx.fill();
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.fillRect(24, h - 64, w - 48, 40);
        ctx.fillStyle = '#1e293b';
        ctx.font = '700 20px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(art.title, w / 2, h - 44, w - 64);
      }, 1, 1);

      const canvasMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4.96, 3.36),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.15 })
      );
      canvasMesh.position.z = 0.06;

      // 상단 갤러리 핀조명 브래킷
      const lampBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.35), slimFrame);
      lampBar.position.set(0, 2.02, 0.18);

      grp.add(outer, canvasMesh, lampBar);
      return grp;
    }

    createRealisticTree(scale = 1) {
      const grp = new THREE.Group();
      const bark = this.woodPlankMaterial('bark2', [112, 88, 68], [64, 48, 36], 1, 3, 0.85);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.30 * scale, 2.5 * scale, 10), bark);
      trunk.position.y = 1.25 * scale;
      trunk.castShadow = true;
      grp.add(trunk);

      const leafShades = [0x2d6a4f, 0x40916c, 0x1b4332, 0x52b788];
      const clusters = [
        [0, 3.1, 0, 1.3],
        [0.82, 2.65, 0.42, 0.92],
        [-0.78, 2.7, 0.35, 0.95],
        [0.42, 2.8, -0.72, 0.88],
        [-0.52, 2.55, -0.62, 0.85],
        [0, 3.72, 0.1, 0.86]
      ];
      clusters.forEach(([cx, cy, cz, cr], i) => {
        const mat = new THREE.MeshStandardMaterial({ color: leafShades[i % leafShades.length], roughness: 0.78 });
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
