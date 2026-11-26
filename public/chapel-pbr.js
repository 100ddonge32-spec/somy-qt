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

    // 2-B) 대성전 본당 전용 고급 개별 예배 의자 행(Row) 생성기
    //      (장의자가 아닌 1인용 개별 원목·패브릭 쿠션 예배의자들이 일정한 간격으로 나란히 놓인 CAD 실사 행!)
    createSanctuaryChairRow(chairCount = 11, spacing = 0.76) {
      const rowGrp = new THREE.Group();
      const oakMat = this.woodPlankMaterial('sanc_indiv_oak', [216, 184, 140], [172, 140, 98], 1, 1, 0.32);
      const cushionMat = this.fabricMaterial('sanc_indiv_fabric', [86, 76, 70], 1, 1);
      const frameMat = this.darkSteelMaterial();

      // 지오메트리 공유로 수백 개 개별 의자도 60FPS 초고속 렌더링
      if (!this._indivChairGeos) {
        this._indivChairGeos = {
          seatWood: new THREE.BoxGeometry(0.58, 0.04, 0.54),
          seatPad: new THREE.BoxGeometry(0.54, 0.065, 0.50),
          backWood: new THREE.BoxGeometry(0.56, 0.52, 0.04),
          backPad: new THREE.BoxGeometry(0.50, 0.42, 0.045),
          pocket: new THREE.BoxGeometry(0.42, 0.22, 0.025),
          leg: new THREE.BoxGeometry(0.038, 0.45, 0.038),
          armPost: new THREE.BoxGeometry(0.035, 0.20, 0.035),
          armTop: new THREE.BoxGeometry(0.05, 0.03, 0.44)
        };
      }
      const g = this._indivChairGeos;
      const startX = -((chairCount - 1) * spacing) / 2;

      for (let i = 0; i < chairCount; i++) {
        const cx = startX + i * spacing;
        const ch = new THREE.Group();
        ch.position.x = cx;

        const seatWood = new THREE.Mesh(g.seatWood, oakMat);
        seatWood.position.set(0, 0.44, 0.02);
        const seatPad = new THREE.Mesh(g.seatPad, cushionMat);
        seatPad.position.set(0, 0.49, 0.03);
        seatPad.castShadow = true;
        seatPad.receiveShadow = true;

        const backWood = new THREE.Mesh(g.backWood, oakMat);
        backWood.position.set(0, 0.76, -0.23);
        backWood.rotation.x = -0.11;
        backWood.castShadow = true;

        const backPad = new THREE.Mesh(g.backPad, cushionMat);
        backPad.position.set(0, 0.76, -0.20);
        backPad.rotation.x = -0.11;

        // 등받이 뒷면 성경·찬송가 꽂이 포켓
        const pocket = new THREE.Mesh(g.pocket, oakMat);
        pocket.position.set(0, 0.68, -0.26);
        pocket.rotation.x = -0.11;

        // 4개 개별 다리 + 양측 개별 팔걸이
        [[-0.25, -0.21], [0.25, -0.21], [-0.25, 0.23], [0.25, 0.23]].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(g.leg, frameMat);
          leg.position.set(lx, 0.225, lz);
          ch.add(leg);
        });
        [-0.265, 0.265].forEach((ax) => {
          const post = new THREE.Mesh(g.armPost, frameMat);
          post.position.set(ax, 0.55, 0.14);
          const arm = new THREE.Mesh(g.armTop, oakMat);
          arm.position.set(ax, 0.66, -0.02);
          ch.add(post, arm);
        });

        ch.add(seatWood, seatPad, backWood, backPad, pocket);
        rowGrp.add(ch);
      }

      return rowGrp;
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

    // =========================================================================
    // 10) ☕ 루프탑 사계절·날씨 실사 파노라마 배경 전용 PBR 텍스처 & 지형 생성기
    //     (봄 벚꽃·산바다 / 여름 에메랄드 오션 / 가을 단풍 산맥 / 겨울 설경·적설 / 우천 운무 / 별빛 야경)
    // =========================================================================
    rooftopSkyPanoramaMaterial(theme = 'autumn') {
      const ck = `roof_sky_pano_${theme}`;
      if (this.cache[ck]) return this.cache[ck];

      const palettes = {
        spring: { zenith: '#2563eb', mid: '#60a5fa', horizon: '#fde68a', haze: '#fff1f2', sunColor: 'rgba(255,252,235,0.95)', sunY: 0.28, cloudAlpha: 0.52 },
        summer: { zenith: '#0284c7', mid: '#38bdf8', horizon: '#bae6fd', haze: '#e0f2fe', sunColor: 'rgba(255,254,240,0.98)', sunY: 0.22, cloudAlpha: 0.65 },
        autumn: { zenith: '#1d4ed8', mid: '#fb923c', horizon: '#fde047', haze: '#fed7aa', sunColor: 'rgba(255,237,175,0.96)', sunY: 0.39, cloudAlpha: 0.44 },
        winter: { zenith: '#334155', mid: '#94a3b8', horizon: '#e2e8f0', haze: '#f8fafc', sunColor: 'rgba(255,255,255,0.75)', sunY: 0.34, cloudAlpha: 0.58 },
        rain:   { zenith: '#1e293b', mid: '#475569', horizon: '#94a3b8', haze: '#cbd5e1', sunColor: 'rgba(226,232,240,0.20)', sunY: 0.30, cloudAlpha: 0.85 },
        night:  { zenith: '#020617', mid: '#0f172a', horizon: '#1e3a5f', haze: '#1e293b', sunColor: 'rgba(254,249,195,0.95)', sunY: 0.26, cloudAlpha: 0.16 }
      };
      const pal = palettes[theme] || palettes.autumn;

      const map = makeCanvasTex(1024, 512, (ctx, w, h) => {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.62);
        skyGrad.addColorStop(0.0, pal.zenith);
        skyGrad.addColorStop(0.52, pal.mid);
        skyGrad.addColorStop(0.86, pal.horizon);
        skyGrad.addColorStop(1.0, pal.haze);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // 하반부 수평선 안개 연결 톤
        const lowGrad = ctx.createLinearGradient(0, h * 0.52, 0, h);
        lowGrad.addColorStop(0.0, pal.haze);
        lowGrad.addColorStop(0.3, theme === 'night' ? '#0b192c' : pal.mid);
        lowGrad.addColorStop(1.0, theme === 'night' ? '#020617' : '#1e293b');
        ctx.fillStyle = lowGrad;
        ctx.fillRect(0, h * 0.52, w, h * 0.48);

        // 밤하늘 은하수 & 별빛
        if (theme === 'night') {
          for (let s = 0; s < 520; s++) {
            const sx = hash2(s, 11) * w;
            const sy = hash2(s, 37) * (h * 0.48);
            const sr = 0.5 + hash2(s, 73) * 1.4;
            const sa = 0.35 + hash2(s, 91) * 0.65;
            ctx.fillStyle = `rgba(255, 253, 240, ${sa.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 태양 / 노을 / 보름달 광원 헤일로 (북서쪽 바다 수평선 방향 u ≈ 0.48)
        const sunX = w * 0.48;
        const sunY = h * pal.sunY;
        const haloR = theme === 'autumn' ? 190 : theme === 'night' ? 75 : 135;
        const sunRg = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, haloR);
        sunRg.addColorStop(0.0, pal.sunColor);
        sunRg.addColorStop(0.22, theme === 'autumn' ? 'rgba(251,146,60,0.62)' : theme === 'night' ? 'rgba(186,230,253,0.32)' : 'rgba(255,250,220,0.45)');
        sunRg.addColorStop(1.0, 'rgba(255,255,255,0.0)');
        ctx.fillStyle = sunRg;
        ctx.fillRect(0, 0, w, h * 0.65);

        if (theme === 'night') {
          ctx.fillStyle = '#fef9c3';
          ctx.beginPath();
          ctx.arc(sunX, sunY, 13, 0, Math.PI * 2);
          ctx.fill();
        }

        // 절차적 FBM 실사 구름층 (비구름, 양떼구름, 노을구름)
        const cloudImg = ctx.getImageData(0, 0, w, Math.floor(h * 0.54));
        const cd = cloudImg.data;
        const chMax = Math.floor(h * 0.54);
        for (let y = 16; y < chMax; y++) {
          const vNorm = y / chMax;
          const bandFade = Math.sin(vNorm * Math.PI);
          for (let x = 0; x < w; x++) {
            const nx = (x / w) * 9.0;
            const ny = vNorm * 4.5;
            const n = fbm(nx, ny, 4);
            const thresh = theme === 'rain' ? 0.34 : 0.48;
            if (n > thresh) {
              const density = Math.min(1, (n - thresh) * 2.4) * bandFade * pal.cloudAlpha;
              const idx = (y * w + x) * 4;
              const cr = theme === 'autumn' ? 255 : theme === 'rain' ? 203 : 255;
              const cg = theme === 'autumn' ? 226 : theme === 'rain' ? 213 : 252;
              const cb = theme === 'autumn' ? 196 : theme === 'rain' ? 225 : 248;
              cd[idx] = Math.round(cd[idx] * (1 - density) + cr * density);
              cd[idx + 1] = Math.round(cd[idx + 1] * (1 - density) + cg * density);
              cd[idx + 2] = Math.round(cd[idx + 2] * (1 - density) + cb * density);
            }
          }
        }
        ctx.putImageData(cloudImg, 0, 0);
      }, 1, 1);

      const mat = new THREE.MeshBasicMaterial({ map, side: THREE.BackSide, fog: false });
      this.cache[ck] = mat;
      return mat;
    }

    // 계절·날씨별 실사 바다 수면 재질 (잔물결 노멀/범프 + 윤슬 반사)
    oceanWaterMaterial(theme = 'autumn') {
      const ck = `roof_ocean_${theme}`;
      if (this.cache[ck]) return this.cache[ck];

      const seaColors = {
        spring: { deep: [14, 116, 144], shallow: [45, 212, 191], glint: [255, 250, 225] },
        summer: { deep: [3, 105, 161], shallow: [14, 165, 233], glint: [255, 255, 255] },
        autumn: { deep: [23, 58, 94], shallow: [59, 110, 140], glint: [253, 186, 116] },
        winter: { deep: [30, 58, 95], shallow: [100, 136, 168], glint: [241, 245, 249] },
        rain:   { deep: [30, 41, 59], shallow: [71, 85, 105], glint: [203, 213, 225] },
        night:  { deep: [8, 20, 44], shallow: [23, 45, 82], glint: [254, 243, 199] }
      };
      const sc = seaColors[theme] || seaColors.autumn;

      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const wave1 = Math.sin((y / h) * Math.PI * 26 + fbm(x * 0.03, y * 0.05, 3) * 5.0);
            const wave2 = fbm(x * 0.06, y * 0.14, 4);
            const mix = Math.max(0, Math.min(1, 0.45 + wave1 * 0.22 + (wave2 - 0.5) * 0.45));
            let r = sc.deep[0] + (sc.shallow[0] - sc.deep[0]) * mix;
            let g = sc.deep[1] + (sc.shallow[1] - sc.deep[1]) * mix;
            let b = sc.deep[2] + (sc.shallow[2] - sc.deep[2]) * mix;

            // 윤슬 반짝임 또는 빗방울 동심원 파문
            if (theme === 'rain') {
              const ring = Math.sin(Math.hypot((x % 64) - 32, (y % 64) - 32) * 0.55);
              if (ring > 0.88) {
                r += 28; g += 32; b += 38;
              }
            } else if (wave1 > 0.86 && wave2 > 0.56) {
              r = r * 0.4 + sc.glint[0] * 0.6;
              g = g * 0.4 + sc.glint[1] * 0.6;
              b = b * 0.4 + sc.glint[2] * 0.6;
            }
            const idx = (y * w + x) * 4;
            d[idx] = Math.min(255, Math.round(r));
            d[idx + 1] = Math.min(255, Math.round(g));
            d[idx + 2] = Math.min(255, Math.round(b));
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, 10, 8);

      const bump = makeCanvasTex(256, 256, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const v = Math.round((0.5 + 0.3 * Math.sin(y * 0.35 + fbm(x * 0.05, y * 0.08, 3) * 4.5)) * 255);
            const idx = (y * w + x) * 4;
            d[idx] = d[idx + 1] = d[idx + 2] = v;
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, 14, 12, false);

      const mat = new THREE.MeshStandardMaterial({
        map,
        bumpMap: bump,
        bumpScale: 0.18,
        roughness: theme === 'rain' ? 0.18 : 0.09,
        metalness: 0.25,
        envMap: this.envMap,
        envMapIntensity: theme === 'autumn' ? 1.45 : theme === 'night' ? 1.2 : 1.15
      });
      this.cache[ck] = mat;
      return mat;
    }

    // 계절·날씨별 다층 3D 산맥 지형 PBR 재질 (단풍림 / 설산 / 벚꽃산 / 신록 / 운무산)
    mountainRidgeMaterial(theme = 'autumn', distLayer = 0) {
      const ck = `roof_mtn_${theme}_${distLayer}`;
      if (this.cache[ck]) return this.cache[ck];

      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        const hazeAmt = distLayer * 0.26; // 원경일수록 대기 원근법 안개 블렌딩

        for (let y = 0; y < h; y++) {
          // y=0 산 정상(봉우리), y=h 산기슭/해안선
          const elev = 1.0 - y / h;
          for (let x = 0; x < w; x++) {
            const n1 = fbm(x * 0.035, y * 0.035, 4);
            const n2 = fbm(x * 0.11 + 13, y * 0.11 + 7, 3);
            const ridge = Math.abs(fbm(x * 0.05, y * 0.015, 3) - 0.5) * 2.0;

            let r = 60, g = 90, b = 65;

            if (theme === 'autumn') {
              // 실사 한국 가을 단풍산: 정상 암릉 + 진홍 단풍 + 주황·황금 은행림 + 상록 소나무 군락 조화
              if (n1 > 0.58) {
                // 진홍 단풍 군락
                r = 188 + n2 * 52; g = 38 + n2 * 28; b = 28 + n2 * 18;
              } else if (n1 > 0.44) {
                // 황금빛·주황 단풍 군락
                r = 218 + n2 * 35; g = 128 + n2 * 65; b = 26 + n2 * 20;
              } else if (n1 > 0.34) {
                // 노란 은행·갈참나무 숲
                r = 196 + n2 * 36; g = 152 + n2 * 40; b = 42 + n2 * 20;
              } else {
                // 짙은 소나무·전나무 상록 군락 (단풍을 더욱 실사처럼 돋보이게 하는 대비!)
                r = 42 + n2 * 25; g = 74 + n2 * 30; b = 44 + n2 * 18;
              }
              if (elev > 0.82 && ridge > 0.45) {
                // 화강암 암봉 디테일
                r = 138 + n2 * 30; g = 128 + n2 * 28; b = 118 + n2 * 25;
              }
            } else if (theme === 'winter') {
              // 실사 겨울 설산: 봉우리 만년설 + 능선 적설 + 눈 덮인 침엽수림 암벽 대비
              const snowLine = elev + (n1 - 0.45) * 0.55;
              if (snowLine > 0.36) {
                const shade = 222 + n2 * 33 - ridge * 24;
                r = shade; g = shade + 3; b = Math.min(255, shade + 10);
              } else {
                // 눈 사이로 드러난 겨울 바위와 상록수
                r = 68 + n2 * 45; g = 78 + n2 * 48; b = 88 + n2 * 52;
              }
            } else if (theme === 'spring') {
              // 봄 신록 산맥 + 연분홍 산벚꽃/진달래 군락
              if (n1 > 0.57 && elev < 0.72) {
                r = 244 + n2 * 11; g = 182 + n2 * 38; b = 204 + n2 * 34;
              } else {
                r = 68 + n2 * 46; g = 128 + n2 * 52; b = 64 + n2 * 32;
              }
              if (elev > 0.85) {
                r = 134 + n2 * 28; g = 138 + n2 * 26; b = 132 + n2 * 24;
              }
            } else if (theme === 'summer') {
              // 여름 짙푸른 녹음 산맥 + 기암절벽
              r = 28 + n1 * 42; g = 88 + n1 * 64 + n2 * 22; b = 46 + n1 * 34;
              if (elev > 0.84 && ridge > 0.42) {
                r = 126 + n2 * 35; g = 130 + n2 * 32; b = 128 + n2 * 30;
              }
            } else if (theme === 'rain') {
              // 비 오는 날 운무(물안개)가 허리에 걸린 수묵 실사 산맥
              r = 44 + n1 * 32; g = 62 + n1 * 38; b = 74 + n1 * 42;
              const mistBand = Math.exp(-Math.pow((elev - 0.46) * 5.2, 2)) * (0.45 + n2 * 0.45);
              r = r * (1 - mistBand) + 212 * mistBand;
              g = g * (1 - mistBand) + 220 * mistBand;
              b = b * (1 - mistBand) + 230 * mistBand;
            } else {
              // 별빛 야경 산맥 실루엣 + 해안가 은은한 마을 불빛
              r = 16 + n1 * 18; g = 28 + n1 * 24; b = 48 + n1 * 32;
              if (elev < 0.10 && n2 > 0.72 && distLayer === 0) {
                r = 253; g = 224; b = 130;
              }
            }

            // 원경 대기 안개(Atmospheric Perspective) 적용
            const hazeRgb = theme === 'autumn' ? [245, 202, 162]
              : theme === 'winter' ? [226, 232, 240]
              : theme === 'rain' ? [168, 180, 196]
              : theme === 'night' ? [20, 34, 62]
              : [186, 222, 248];

            r = r * (1 - hazeAmt) + hazeRgb[0] * hazeAmt;
            g = g * (1 - hazeAmt) + hazeRgb[1] * hazeAmt;
            b = b * (1 - hazeAmt) + hazeRgb[2] * hazeAmt;

            const idx = (y * w + x) * 4;
            d[idx] = Math.max(0, Math.min(255, Math.round(r)));
            d[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
            d[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, 2, 1);

      const mat = new THREE.MeshStandardMaterial({
        map,
        roughness: 0.88,
        metalness: 0.02,
        fog: true
      });
      this.cache[ck] = mat;
      return mat;
    }

    // 실제 3D 입체 능선 산맥 메시 생성기 (수평선 해안과 만을 감싸는 호형 3D 지형!)
    createMountainRangeMesh(radius, arcAngle, centerAngle, maxHeight, radialDepth, theme, distLayer = 0) {
      const segsU = 96;
      const segsV = 18;
      const geo = new THREE.PlaneGeometry(1, 1, segsU, segsV);
      const pos = geo.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) + 0.5; // 0 .. 1 along arc
        const v = pos.getY(i) + 0.5; // 0 (front shoreline) .. 1 (back base)

        const ang = centerAngle - arcAngle * 0.5 + u * arcAngle;
        const prof = Math.sin(v * Math.PI); // 0 at shore & far back, peak in middle
        const edgeTaper = Math.sin(u * Math.PI);

        const nMain = fbm(u * 8.5 + distLayer * 3.7, v * 2.8 + distLayer, 4);
        const nSharp = 1.0 - Math.abs(fbm(u * 15.0 + 5.2, v * 4.0, 3) - 0.5) * 2.0;
        const h = Math.max(0, (nMain * 0.68 + nSharp * 0.38) * prof * Math.pow(edgeTaper, 0.45) * maxHeight);

        const r = radius + v * radialDepth;
        const wx = Math.sin(ang) * r;
        const wz = -Math.cos(ang) * r;
        const wy = -2.8 + h; // 수면(-2.6) 아래에서 자연스럽게 솟아오름

        pos.setXYZ(i, wx, wy, wz);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, this.mountainRidgeMaterial(theme, distLayer));
      return mesh;
    }

    // 루프탑 겨울 적설(쌓인 눈) PBR 재질
    snowDriftMaterial() {
      if (this.cache.snow_drift) return this.cache.snow_drift;
      const map = makeCanvasTex(256, 256, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const n = fbm(x * 0.08, y * 0.08, 3);
            const sparkle = hash2(x, y) > 0.985 ? 18 : 0;
            const v = Math.min(255, Math.round(234 + n * 18 + sparkle));
            const idx = (y * w + x) * 4;
            d[idx] = v;
            d[idx + 1] = Math.min(255, v + 2);
            d[idx + 2] = Math.min(255, v + 6);
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, 4, 4);
      const mat = new THREE.MeshStandardMaterial({
        map,
        roughness: 0.65,
        metalness: 0.05,
        envMap: this.envMap,
        envMapIntensity: 0.45
      });
      this.cache.snow_drift = mat;
      return mat;
    }

    // 계절 날씨 파티클 스프라이트 텍스처 (눈송이 / 빗방울 / 단풍잎 / 벚꽃잎)
    weatherParticleTexture(kind = 'snow') {
      const ck = `weather_pt_${kind}`;
      if (this.cache[ck]) return this.cache[ck];

      const tex = makeCanvasTex(64, 64, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        if (kind === 'snow') {
          const rg = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2 - 2);
          rg.addColorStop(0.0, 'rgba(255,255,255,1.0)');
          rg.addColorStop(0.45, 'rgba(241,245,249,0.85)');
          rg.addColorStop(1.0, 'rgba(255,255,255,0.0)');
          ctx.fillStyle = rg;
          ctx.fillRect(0, 0, w, h);
        } else if (kind === 'rain') {
          const lg = ctx.createLinearGradient(w / 2, 2, w / 2, h - 2);
          lg.addColorStop(0.0, 'rgba(224,242,254,0.0)');
          lg.addColorStop(0.5, 'rgba(224,242,254,0.88)');
          lg.addColorStop(1.0, 'rgba(255,255,255,0.95)');
          ctx.strokeStyle = lg;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(w / 2 + 3, 3);
          ctx.lineTo(w / 2 - 3, h - 3);
          ctx.stroke();
        } else if (kind === 'maple') {
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(32, 6);
          ctx.lineTo(40, 22);
          ctx.lineTo(58, 18);
          ctx.lineTo(44, 34);
          ctx.lineTo(52, 50);
          ctx.lineTo(32, 42);
          ctx.lineTo(12, 50);
          ctx.lineTo(20, 34);
          ctx.lineTo(6, 18);
          ctx.lineTo(24, 22);
          ctx.closePath();
          ctx.fill();
        } else {
          // 벚꽃잎 (petal)
          ctx.fillStyle = '#fbcfe8';
          ctx.beginPath();
          ctx.ellipse(32, 32, 18, 11, 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }, 1, 1);

      this.cache[ck] = tex;
      return tex;
    }

    // 실제 DSLR 고해상도 자연 사진(/seasons/*.jpg) 기반 360도 무이음매(Seamless) 파노라마 백드롭 재질
    rooftopRealPhotoPanorama(theme = 'autumn') {
      const ck = `real_photo_pano_${theme}`;
      if (this.cache[ck]) return this.cache[ck];

      const skyTopFallbacks = {
        spring: '#2c7be5',
        summer: '#1d70b8',
        autumn: '#d8cfc4',
        winter: '#cbd5e1',
        rain: '#aeb9c4',
        night: '#060d1f'
      };
      const bottomFallbacks = {
        spring: '#1e5b68',
        summer: '#0b4a6f',
        autumn: '#1f3b4d',
        winter: '#1e293b',
        rain: '#334155',
        night: '#040914'
      };

      const canvas = document.createElement('canvas');
      canvas.width = 4096;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      // 사진 로드 전 0.2초 동안의 자연스러운 대기 그라데이션
      const initGrad = ctx.createLinearGradient(0, 0, 0, 1024);
      initGrad.addColorStop(0, skyTopFallbacks[theme] || '#94a3b8');
      initGrad.addColorStop(1, bottomFallbacks[theme] || '#1e293b');
      ctx.fillStyle = initGrad;
      ctx.fillRect(0, 0, 4096, 1024);

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;

      // toneMapping: false + fog: false 설정으로 실제 사진의 원본 색감·선명도·명암을 왜곡 없이 100% 그대로 출력!
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide,
        fog: false,
        toneMapping: false
      });

      const skyCapMat = new THREE.MeshBasicMaterial({
        color: skyTopFallbacks[theme] || '#94a3b8',
        side: THREE.BackSide,
        fog: false,
        toneMapping: false
      });

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // 정면(중앙 50% = 180도 파노라마 시야)에 원본 고해상도 실사 사진 배치 + 후면 좌우에 미러링 연결하여 360도 이음매 완벽 제거
        const segW = W / 2; // 2048px
        // 중앙 메인 사진 (x = 1024 .. 3072 -> 정면 북쪽 -Z 바다·산맥 정중앙 매핑)
        ctx.drawImage(img, 1024, 0, segW, H);

        // 좌측 미러 연장 (x = 0 .. 1024)
        ctx.save();
        ctx.translate(1024, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, img.width * 0.5, img.height, 0, 0, 1024, H);
        ctx.restore();

        // 우측 미러 연장 (x = 3072 .. 4096)
        ctx.save();
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, img.width * 0.5, 0, img.width * 0.5, img.height, 0, 0, 1024, H);
        ctx.restore();

        // 사진 최상단 실제 픽셀 색상을 추출하여 상부 하늘 돔과 경계선 없이 부드럽게 페더링
        const sample = ctx.getImageData(2048, 8, 1, 1).data;
        const topCss = `rgb(${sample[0]}, ${sample[1]}, ${sample[2]})`;
        skyCapMat.color.setStyle(topCss);

        const topFade = ctx.createLinearGradient(0, 0, 0, 96);
        topFade.addColorStop(0, topCss);
        topFade.addColorStop(1, `rgba(${sample[0]}, ${sample[1]}, ${sample[2]}, 0)`);
        ctx.fillStyle = topFade;
        ctx.fillRect(0, 0, W, 96);

        tex.needsUpdate = true;
      };
      img.src = `/seasons/${theme}.jpg?v=6`;

      const bundle = { panoMat: mat, skyCapMat };
      this.cache[ck] = bundle;
      return bundle;
    }

    // 겨울 실사 서리·박설이 내려앉은 우드 데크 PBR 재질 (만화 같은 동그란 눈뭉치 대신 실제 눈 덮인 나무 데크 질감!)
    frostedWoodDeckMaterial() {
      if (this.cache.frosted_wood_deck) return this.cache.frosted_wood_deck;
      const map = makeCanvasTex(512, 512, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        const planks = 8;
        const pw = w / planks;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const pIdx = Math.floor(x / pw);
            const isGap = (x % Math.floor(pw) < 2);
            const snowNoise = fbm(x * 0.035, y * 0.035, 4);
            const fineFrost = fbm(x * 0.14 + 9, y * 0.14, 3);
            // 나무 판재 틈새와 가장자리에 하얀 눈이 자연스럽게 쌓여 있는 실사 질감
            const snowMix = isGap ? 0.92 : Math.max(0.18, Math.min(0.95, (snowNoise - 0.24) * 1.45 + fineFrost * 0.22));
            const wr = 128, wg = 104, wb = 82;
            const sr = 238, sg = 243, sb = 249;
            const idx = (y * w + x) * 4;
            d[idx] = Math.round(wr * (1 - snowMix) + sr * snowMix);
            d[idx + 1] = Math.round(wg * (1 - snowMix) + sg * snowMix);
            d[idx + 2] = Math.round(wb * (1 - snowMix) + sb * snowMix);
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }, 8, 8);

      const mat = new THREE.MeshStandardMaterial({
        map,
        roughness: 0.58,
        metalness: 0.04,
        envMap: this.envMap,
        envMapIntensity: 0.45
      });
      this.cache.frosted_wood_deck = mat;
      return mat;
    }
  }

  window.ArchitecturalPBR = ArchitecturalPBR;
})();
