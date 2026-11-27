/* =========================================================================
 * 소미 3D 온라인 캠퍼스 — CAD / Enscape 실사 건축 인테리어 Three.js 엔진 (v3)
 * [핵심 보강] 외곽 벽체 FrontSide 자동 투과(카메라 시야 가림 원천 차단) + 선명한 CAD 명암비
 * ========================================================================= */
(function () {
  const THREE = window.THREE;
  if (!THREE) return;

  // =========================================================================
  // 🎨 정통 3D 순정만화 · 로맨스 웹툰 카툰 렌더링(Cel-Shading + Manga Outline) 캐릭터 엔진
  // =========================================================================
  const AVATAR_PRESETS = [
    {
      id: 'webtoon_boy',
      label: '✨ 순정만화 안경남주 (추천)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'porcelain', faceStyle: 'gentle', eyeColor: 'amber', expression: 'smile', hairStyle: 'shaggy_bang', hairColor: 'black', outfitStyle: 'webtoon_layered', outfitColor: '#181920', bottomColor: '#1e293b', accessory: 'horn_glasses' }
    },
    {
      id: 'lovely_wave',
      label: '🌸 순정만화 여주 (롱웨이브)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'porcelain', faceStyle: 'lovely', eyeColor: 'amber', expression: 'smile', hairStyle: 'long_wave', hairColor: 'chestnut', outfitStyle: 'onepiece', outfitColor: '#be185d', bottomColor: '#fdf2f8', accessory: 'necklace' }
    },
    {
      id: 'dandy_suit',
      label: '👔 댄디 수트 남주 (형제)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'warm', faceStyle: 'chic', eyeColor: 'sapphire', expression: 'smile', hairStyle: 'dandy', hairColor: 'espresso', outfitStyle: 'suit', outfitColor: '#1e3a8a', bottomColor: '#18181b', accessory: 'earcuff' }
    },
    {
      id: 'tweed_bob',
      label: '💎 청순 단발 여주 (셋업)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'porcelain', faceStyle: 'chic', eyeColor: 'amethyst', expression: 'smile', hairStyle: 'bob_c', hairColor: 'black', outfitStyle: 'jacket_skirt', outfitColor: '#f8fafc', bottomColor: '#1e293b', accessory: 'crossbag' }
    },
    {
      id: 'trench_chic',
      label: '🧥 감성 트렌치코트 (청년)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'warm', faceStyle: 'gentle', eyeColor: 'emerald', expression: 'grace', hairStyle: 'short_layered', hairColor: 'ash_brown', outfitStyle: 'trench', outfitColor: '#b48352', bottomColor: '#1f2937', accessory: 'wire_glasses' }
    },
    {
      id: 'elder_suit',
      label: '🎩 지적인 품격 정장 (장로·집사)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'natural', faceStyle: 'dignified', eyeColor: 'obsidian', expression: 'smile', hairStyle: 'pomade', hairColor: 'silver', outfitStyle: 'suit', outfitColor: '#27272a', bottomColor: '#18181b', accessory: 'wire_glasses' }
    },
    {
      id: 'kwonsa_grace',
      label: '🌺 우아한 올림머리 (권사·집사)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'warm', faceStyle: 'gentle', eyeColor: 'amber', expression: 'smile', hairStyle: 'low_bun', hairColor: 'espresso', outfitStyle: 'jacket_skirt', outfitColor: '#6d28d9', bottomColor: '#1e1b4b', accessory: 'necklace' }
    },
    {
      id: 'cute_somy',
      label: '🧸 귀여운 SD 만화 캐릭터',
      config: { bodyStyle: 'cute', gender: 'female', skinTone: 'porcelain', faceStyle: 'lovely', eyeColor: 'rose', expression: 'joy', hairStyle: 'ponytail', hairColor: 'chestnut', outfitStyle: 'webtoon_layered', outfitColor: '#be185d', bottomColor: '#1e293b', accessory: 'horn_glasses' }
    },
    // 하위 호환 프리셋 매핑
    {
      id: 'choir_gown',
      label: '🎵 은혜 성가대 가운',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'porcelain', faceStyle: 'lovely', eyeColor: 'sapphire', expression: 'grace', hairStyle: 'ponytail', hairColor: 'ash_brown', outfitStyle: 'choir', outfitColor: '#f8fafc', bottomColor: '#1e293b', accessory: 'none' }
    },
    {
      id: 'david',
      label: '다윗 (형제)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'porcelain', faceStyle: 'gentle', eyeColor: 'amber', expression: 'smile', hairStyle: 'shaggy_bang', hairColor: 'black', outfitStyle: 'webtoon_layered', outfitColor: '#181920', bottomColor: '#1e293b', accessory: 'horn_glasses' }
    },
    {
      id: 'miriam',
      label: '미리암 (자매)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'porcelain', faceStyle: 'lovely', eyeColor: 'amber', expression: 'smile', hairStyle: 'long_wave', hairColor: 'chestnut', outfitStyle: 'onepiece', outfitColor: '#db2777', bottomColor: '#334155', accessory: 'necklace' }
    },
    {
      id: 'joseph',
      label: '요셉 (청년)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'warm', faceStyle: 'chic', eyeColor: 'emerald', expression: 'smile', hairStyle: 'short_layered', hairColor: 'black', outfitStyle: 'trench', outfitColor: '#047857', bottomColor: '#1f2937', accessory: 'horn_glasses' }
    },
    {
      id: 'lydia',
      label: '루디아 (집사)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'warm', faceStyle: 'gentle', eyeColor: 'amber', expression: 'smile', hairStyle: 'low_bun', hairColor: 'espresso', outfitStyle: 'jacket_skirt', outfitColor: '#6d28d9', bottomColor: '#1e1b4b', accessory: 'necklace' }
    },
    {
      id: 'somy',
      label: '소미 (인도자)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'porcelain', faceStyle: 'lovely', eyeColor: 'rose', expression: 'joy', hairStyle: 'bob_c', hairColor: 'ash_brown', outfitStyle: 'knit_slacks', outfitColor: '#d97706', bottomColor: '#1e293b', accessory: 'crossbag' }
    }
  ];

  const SKIN_TONE_HEX = {
    porcelain: '#fff0e6',
    warm: '#ffe3cf',
    natural: '#f4ccb0',
    tan: '#dfa884'
  };

  const HAIR_COLOR_HEX = {
    black: '#171821',
    espresso: '#2e1f1c',
    chestnut: '#5a3828',
    ash_brown: '#7e6250',
    burgundy: '#521d2d',
    silver: '#aeb6c4'
  };

  // 순정만화 투톤 보석 눈동자 팔레트 (상단 딥 섀도우 + 하단 발광 그라데이션)
  const EYE_IRIS_PALETTE = {
    amber:    { top: '#1c1924', mid: '#5c4028', glow: '#fbbf24', rim: '#fde68a' },
    obsidian: { top: '#111118', mid: '#2d2b38', glow: '#71717a', rim: '#d4d4d8' },
    sapphire: { top: '#131c36', mid: '#1d4ed8', glow: '#38bdf8', rim: '#bae6fd' },
    emerald:  { top: '#0f2922', mid: '#047857', glow: '#34d399', rim: '#a7f3d0' },
    amethyst: { top: '#211438', mid: '#6d28d9', glow: '#c084fc', rim: '#e9d5ff' },
    rose:     { top: '#2b1321', mid: '#9d174d', glow: '#fb7185', rim: '#fecdd3' }
  };

  function resolveAvatarConfig(presetId, rawCfg) {
    const found = AVATAR_PRESETS.find((p) => p.id === presetId) || AVATAR_PRESETS[0];
    const base = found.config;
    const cfg = rawCfg && typeof rawCfg === 'object' ? rawCfg : {};
    const gender = cfg.gender || base.gender || 'male';
    return {
      bodyStyle: cfg.bodyStyle === 'cute' ? 'cute' : (base.bodyStyle || 'model'),
      gender,
      skinTone: SKIN_TONE_HEX[cfg.skinTone] ? cfg.skinTone : (base.skinTone || 'porcelain'),
      faceStyle: cfg.faceStyle || base.faceStyle || 'gentle',
      eyeColor: EYE_IRIS_PALETTE[cfg.eyeColor] ? cfg.eyeColor : (base.eyeColor || 'amber'),
      expression: cfg.expression || base.expression || 'smile',
      hairStyle: cfg.hairStyle || base.hairStyle || (gender === 'female' ? 'long_wave' : 'shaggy_bang'),
      hairColor: HAIR_COLOR_HEX[cfg.hairColor] ? cfg.hairColor : (base.hairColor || 'black'),
      outfitStyle: cfg.outfitStyle || base.outfitStyle || (gender === 'female' ? 'onepiece' : 'webtoon_layered'),
      outfitColor: cfg.outfitColor || base.outfitColor || '#181920',
      bottomColor: cfg.bottomColor || base.bottomColor || '#1e293b',
      accessory: cfg.accessory || base.accessory || 'none'
    };
  }

  function avatarConfigSignature(presetId, rawCfg) {
    return JSON.stringify(resolveAvatarConfig(presetId, rawCfg));
  }

  // -------------------------------------------------------------------------
  // 1. 카툰 셀 셰이딩(Cel-Shading) 그라데이션 램프 & 만화 펜선 외곽선(Inverted Hull Outline)
  // -------------------------------------------------------------------------
  const toonRampCache = new Map();
  function getAnimeToonRamp(kind) {
    if (toonRampCache.has(kind)) return toonRampCache.get(kind);
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 1;
    const g = c.getContext('2d');
    if (kind === 'skin') {
      // 피부 전용: 붉은 복숭아빛 부드러운 2.5단 셀 명암 (얼굴이 칙칙해지지 않음!)
      g.fillStyle = '#dec4be';
      g.fillRect(0, 0, 18, 1);
      g.fillStyle = '#f5e9e5';
      g.fillRect(18, 0, 16, 1);
      g.fillStyle = '#ffffff';
      g.fillRect(34, 0, 30, 1);
    } else if (kind === 'hair') {
      // 머리카락 전용: 선명한 만화 셀 음영
      g.fillStyle = '#9aa1b2';
      g.fillRect(0, 0, 22, 1);
      g.fillStyle = '#d8dde8';
      g.fillRect(22, 0, 18, 1);
      g.fillStyle = '#ffffff';
      g.fillRect(40, 0, 24, 1);
    } else {
      // 의상 전용: 깔끔한 웹툰 옷주름 명암
      g.fillStyle = '#a3aab8';
      g.fillRect(0, 0, 20, 1);
      g.fillStyle = '#dfe4ec';
      g.fillRect(20, 0, 18, 1);
      g.fillStyle = '#ffffff';
      g.fillRect(38, 0, 26, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    toonRampCache.set(kind, tex);
    return tex;
  }

  function makeToonMat(colorHex, kind = 'cloth', extra = {}) {
    return new THREE.MeshToonMaterial({
      color: colorHex,
      gradientMap: getAnimeToonRamp(kind),
      ...extra
    });
  }

  const outlineMatCache = new Map();
  function getOutlineMat(hexColor) {
    if (!outlineMatCache.has(hexColor)) {
      outlineMatCache.set(
        hexColor,
        new THREE.MeshBasicMaterial({
          color: hexColor,
          side: THREE.BackSide
        })
      );
    }
    return outlineMatCache.get(hexColor);
  }

  // 법선 벡터 방향으로 정점을 밀어 균일한 만화 펜선(Outline)을 입히는 헬퍼
  function attachMangaOutline(mesh, offsetDist = 0.0045, outlineHex = 0x1a151c) {
    if (!mesh || !mesh.geometry) return mesh;
    const og = mesh.geometry.clone();
    og.computeVertexNormals();
    const pos = og.attributes.position;
    const nrm = og.attributes.normal;
    if (pos && nrm) {
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(
          i,
          pos.getX(i) + nrm.getX(i) * offsetDist,
          pos.getY(i) + nrm.getY(i) * offsetDist,
          pos.getZ(i) + nrm.getZ(i) * offsetDist
        );
      }
      pos.needsUpdate = true;
    }
    const outlineMesh = new THREE.Mesh(og, getOutlineMat(outlineHex));
    mesh.add(outlineMesh);
    return mesh;
  }

  // -------------------------------------------------------------------------
  // 2. 날렵한 V라인 순정만화 3D 헤드 & 무왜곡 정면 투영 데칼 지오메트리
  // -------------------------------------------------------------------------
  const animeHeadGeoCache = new Map();
  function getAnimeVLineHeadGeometries(R, isFemale, isCute) {
    const key = `${R.toFixed(4)}_${isFemale ? 'F' : 'M'}_${isCute ? 'C' : 'M'}`;
    if (animeHeadGeoCache.has(key)) return animeHeadGeoCache.get(key);

    const headGeo = new THREE.SphereGeometry(R, 40, 32);
    const pos = headGeo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const nx = x / R;
      const ny = y / R;
      const nz = z / R;

      // 상단 두상은 자연스럽고, 눈 아래부터 턱끝까지 날렵한 순정만화 V라인으로 조형!
      let widthFactor = isFemale ? 0.88 : 0.91;
      if (isCute) widthFactor = 0.96;

      if (ny < 0.12) {
        const t = Math.min(1, Math.max(0, (0.12 - ny) / 1.12));
        const vSharpness = isCute ? 0.46 : (isFemale ? 0.72 : 0.68);
        // 볼선에서 턱끝으로 샤프하게 좁아지는 V라인 곡선
        const jawCurve = 1.0 - vSharpness * Math.pow(t, 1.48);
        widthFactor *= jawCurve;

        // 뒤통수 아래쪽도 목선으로 매끄럽게 수렴
        if (nz < 0) {
          z *= 1.0 - 0.36 * Math.pow(t, 1.2);
        }
      }

      x *= widthFactor;
      y *= isCute ? 1.02 : 1.10;

      // 정면 안면 평탄화(3/4 얼짱 각도에서 눈이 볼록 렌즈처럼 왜곡되지 않도록 VRoid식 평면 곡률 적용)
      if (nz > 0) {
        const frontFlatten = 0.84 + 0.06 * Math.cos(Math.min(Math.PI * 0.5, Math.abs(ny) * 1.3));
        z *= frontFlatten;

        // 날렵하게 앞으로 살짝 뻗는 순정만화 턱끝 라인
        if (ny < -0.25) {
          const chinT = Math.min(1, (-0.25 - ny) / 0.75);
          z += R * (isCute ? 0.05 : 0.095) * Math.pow(chinT, 1.35) * Math.max(0, 1 - Math.abs(nx) * 1.4);
        }

        // 오똑하고 섬세한 순정만화 콧날 포인트
        const noseDx = Math.abs(nx) / 0.15;
        const noseDy = (ny + 0.13) / 0.16;
        const noseDist = Math.hypot(noseDx, noseDy);
        if (noseDist < 1.0) {
          const nosePeak = Math.pow(Math.cos(noseDist * Math.PI * 0.5), 1.8);
          z += R * (isCute ? 0.055 : 0.088) * nosePeak;
        }
      } else {
        z *= 0.92;
      }

      pos.setXYZ(i, x, y, z);
    }
    headGeo.computeVertexNormals();

    // 정면 얼굴 작화용 무왜곡 직교 투영(Planar Projection) 데칼 메쉬 생성
    const faceGeo = headGeo.clone();
    const fPos = faceGeo.attributes.position;
    const fNrm = faceGeo.attributes.normal;
    const uvs = new Float32Array(fPos.count * 2);

    const spanX = R * (isCute ? 1.72 : 1.56);
    const spanY = R * (isCute ? 1.88 : 2.02);

    for (let i = 0; i < fPos.count; i++) {
      const px = fPos.getX(i);
      const py = fPos.getY(i);
      const pz = fPos.getZ(i);
      const push = pz > 0 ? R * 0.008 : -R * 0.01;
      fPos.setXYZ(
        i,
        px + fNrm.getX(i) * push,
        py + fNrm.getY(i) * push,
        pz + (pz > 0 ? R * 0.009 : -R * 0.02)
      );
      // 뒷면에는 텍스처가 비치지 않도록 UV 바깥(0,0 투명 영역)으로 매핑
      if (pz > R * 0.16) {
        uvs[i * 2] = Math.max(0.01, Math.min(0.99, 0.5 + px / spanX));
        uvs[i * 2 + 1] = Math.max(0.01, Math.min(0.99, 0.50 + py / spanY));
      } else {
        uvs[i * 2] = 0.0;
        uvs[i * 2 + 1] = 0.0;
      }
    }
    faceGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const bundle = { headGeo, faceGeo };
    animeHeadGeoCache.set(key, bundle);
    return bundle;
  }

  // -------------------------------------------------------------------------
  // 3. 한 올씩 끝이 뾰족하게 빠지는 3D 순정만화 머리카락 다발(Hair Strand) 생성기
  // -------------------------------------------------------------------------
  function createHairStrandGeometry(width, length, thickness, curveZ, sweepX = 0, archY = 0) {
    const segs = 7;
    const positions = [];
    const indices = [];

    // 각 단면은 4개 정점(전면 능선, 좌측 엣지, 우측 엣지, 후면)으로 구성된 샤프한 만화 헤어 프리즘!
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      // 뿌리는 도톰하고 끝부분(t->1)은 바늘처럼 날렵하게 0으로 수렴!
      const taper = s === segs ? 0.0 : Math.sin(Math.min(1, t * 2.4) * Math.PI * 0.5) * Math.pow(1 - t, 0.78);
      const w = width * 0.5 * taper;
      const th = thickness * taper;

      const cx = sweepX * Math.pow(t, 1.45);
      const cy = -length * t + archY * Math.sin(t * Math.PI);
      const cz = curveZ * Math.sin(t * Math.PI * 0.72);

      // 0: 전면 중앙 능선(셀 셰이딩 하이라이트 각 살림), 1: 우측, 2: 후면, 3: 좌측
      positions.push(cx, cy, cz + th * 0.75);
      positions.push(cx + w, cy, cz);
      positions.push(cx, cy, cz - th * 0.45);
      positions.push(cx - w, cy, cz);
    }

    for (let s = 0; s < segs; s++) {
      const b = s * 4;
      const n = (s + 1) * 4;
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        indices.push(b + k, n + k, n + k2);
        indices.push(b + k, n + k2, b + k2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // 순정만화 엔젤링(Angel-Ring 머릿결 윤기 하이라이트) 텍스처
  let angelRingTex = null;
  function getAngelRingTexture() {
    if (angelRingTex) return angelRingTex;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 64);
    g.fillStyle = 'rgba(255, 255, 255, 0.26)';
    // 지그재그 만화풍 머릿결 광택 패턴
    const pts = [
      [24, 34], [46, 18], [62, 38], [88, 16], [112, 38],
      [142, 16], [166, 38], [194, 18], [216, 36], [234, 24]
    ];
    g.beginPath();
    g.moveTo(20, 44);
    pts.forEach(([x, y]) => g.lineTo(x, y));
    for (let i = pts.length - 1; i >= 0; i--) {
      g.lineTo(pts[i][0], pts[i][1] + 10);
    }
    g.closePath();
    g.fill();
    angelRingTex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) angelRingTex.encoding = THREE.sRGBEncoding;
    return angelRingTex;
  }

  // -------------------------------------------------------------------------
  // 4. 1024x1024 초고해상도 순정만화 · 로맨스 웹툰 얼굴 작화 렌더러
  // -------------------------------------------------------------------------
  const faceTextureCache = new Map();
  function createStylizedFaceTexture(cfg, isBlinking = false) {
    const key = `v3|${cfg.gender}|${cfg.skinTone}|${cfg.faceStyle}|${cfg.eyeColor}|${cfg.expression}|${cfg.hairColor}|${isBlinking ? 1 : 0}`;
    if (faceTextureCache.has(key)) return faceTextureCache.get(key);

    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1024;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 1024, 1024);

    // 외곽 경계 4px는 완전 투명 유지 (후면 UV 클램핑 보호)
    const isFemale = cfg.gender === 'female';
    const browColor = HAIR_COLOR_HEX[cfg.hairColor] || '#1e1b24';
    const irisPal = EYE_IRIS_PALETTE[cfg.eyeColor] || EYE_IRIS_PALETTE.amber;

    const eyeY = 502;
    const leftX = 338;
    const rightX = 686;

    // 1) 순정만화 수채화 볼터치 + 사선 홍조 (///)
    const blushAlpha = cfg.faceStyle === 'lovely' || cfg.expression === 'joy' || cfg.expression === 'grace'
      ? 0.30
      : (isFemale ? 0.20 : 0.13);
    [leftX - 38, rightX + 38].forEach((bx) => {
      const grad = g.createRadialGradient(bx, eyeY + 108, 10, bx, eyeY + 108, 92);
      grad.addColorStop(0, `rgba(251, 113, 133, ${blushAlpha})`);
      grad.addColorStop(1, 'rgba(251, 113, 133, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(bx, eyeY + 108, 92, 0, Math.PI * 2);
      g.fill();

      // 순정만화 특유의 섬세한 사선 홍조 터치
      if (cfg.faceStyle === 'lovely' || cfg.expression === 'joy' || cfg.expression === 'wink') {
        g.strokeStyle = 'rgba(225, 85, 110, 0.32)';
        g.lineWidth = 3.5;
        g.lineCap = 'round';
        for (let s = -1; s <= 1; s++) {
          g.beginPath();
          g.moveTo(bx + s * 18 + 6, eyeY + 96);
          g.lineTo(bx + s * 18 - 6, eyeY + 116);
          g.stroke();
        }
      }
    });

    // 2) 가늘고 섬세한 순정만화 펜선 눈썹 (시스루 앞머리 사이로 비치는 효과)
    g.strokeStyle = browColor;
    g.lineCap = 'round';
    g.lineWidth = isFemale ? 7.5 : 9.5;
    const browLift = cfg.expression === 'joy' || cfg.expression === 'grace' ? -16 : 0;

    const drawAnimeBrow = (cx, dir) => {
      g.beginPath();
      if (cfg.faceStyle === 'chic') {
        g.moveTo(cx - dir * 82, eyeY - 102 + browLift);
        g.quadraticCurveTo(cx + dir * 10, eyeY - 132 + browLift, cx + dir * 88, eyeY - 114 + browLift);
      } else if (cfg.faceStyle === 'lovely') {
        // 순정만화 청순 아치형 눈썹
        g.moveTo(cx - dir * 78, eyeY - 110 + browLift);
        g.quadraticCurveTo(cx, eyeY - 126 + browLift, cx + dir * 80, eyeY - 102 + browLift);
      } else {
        // 다정하고 부드러운 호형 눈썹 (레퍼런스 남주 스타일!)
        g.moveTo(cx - dir * 84, eyeY - 104 + browLift);
        g.quadraticCurveTo(cx, eyeY - 128 + browLift, cx + dir * 84, eyeY - 104 + browLift);
      }
      g.stroke();
    };
    drawAnimeBrow(leftX, -1);
    drawAnimeBrow(rightX, 1);

    // 3) 순정만화 투톤 보석 눈동자 & 날렵한 속눈썹 작화
    const drawShoujoOpenEye = (cx, isLeft) => {
      const outerDir = isLeft ? -1 : 1;
      const rx = isFemale ? 86 : 80;
      const ry = cfg.faceStyle === 'chic' ? 48 : (cfg.faceStyle === 'lovely' ? 62 : 54);
      const tilt = cfg.faceStyle === 'chic' ? outerDir * -0.07 : (cfg.faceStyle === 'gentle' ? outerDir * 0.03 : 0);

      g.save();
      g.translate(cx, eyeY);
      g.rotate(tilt);

      // (a) 쌍꺼풀 가느다란 펜선 (레퍼런스 일러스트 디테일!)
      g.strokeStyle = 'rgba(72, 46, 44, 0.62)';
      g.lineWidth = 4.2;
      g.beginPath();
      g.moveTo(-rx * 0.78, -ry * 0.92);
      g.quadraticCurveTo(0, -ry * 1.48, rx * 0.84, -ry * 0.86);
      g.stroke();

      // (b) 아몬드형 흰자위(공막) 클리핑 영역 + 상단 속눈썹 그림자
      g.save();
      g.beginPath();
      g.moveTo(-rx, 4);
      g.bezierCurveTo(-rx * 0.58, -ry * 1.24, rx * 0.58, -ry * 1.24, rx, 4);
      g.bezierCurveTo(rx * 0.55, ry * 1.12, -rx * 0.55, ry * 1.12, -rx, 4);
      g.closePath();
      g.fillStyle = '#fdfcfb';
      g.fill();
      g.clip();

      // 흰자위 상단 연보라/블루그레이 만화 셀 그림자
      const scleraShadow = g.createLinearGradient(0, -ry, 0, 0);
      scleraShadow.addColorStop(0, 'rgba(148, 152, 178, 0.45)');
      scleraShadow.addColorStop(1, 'rgba(148, 152, 178, 0)');
      g.fillStyle = scleraShadow;
      g.fillRect(-rx, -ry * 1.3, rx * 2, ry * 1.3);

      // (c) 순정만화 투톤 보석 홍채 (위쪽은 딥 차콜블랙 ➔ 아래쪽은 영롱한 호박빛/보석빛 발광!)
      const irisRx = rx * 0.64;
      const irisRy = ry * 1.02;
      const irisGrad = g.createLinearGradient(0, -irisRy, 0, irisRy);
      irisGrad.addColorStop(0.0, irisPal.top);
      irisGrad.addColorStop(0.46, irisPal.top);
      irisGrad.addColorStop(0.66, irisPal.mid);
      irisGrad.addColorStop(0.92, irisPal.glow);
      irisGrad.addColorStop(1.0, irisPal.rim);

      g.fillStyle = irisGrad;
      g.beginPath();
      g.ellipse(0, 3, irisRx, irisRy, 0, 0, Math.PI * 2);
      g.fill();

      // 홍채 테두리 또렷한 링
      g.strokeStyle = irisPal.top;
      g.lineWidth = 5.5;
      g.stroke();

      // 하단 반달 발광 아크 (보내주신 레퍼런스 눈동자의 황금빛 반달 포인트!)
      g.fillStyle = irisPal.rim;
      g.globalAlpha = 0.65;
      g.beginPath();
      g.arc(0, irisRy * 0.24, irisRx * 0.68, Math.PI * 0.14, Math.PI * 0.86);
      g.fill();
      g.globalAlpha = 1.0;

      // 중심 동공
      g.fillStyle = '#0d0c14';
      g.beginPath();
      g.ellipse(0, 2, irisRx * 0.34, irisRy * 0.38, 0, 0, Math.PI * 2);
      g.fill();

      // (d) 만화 캐치라이트 하이라이트 (경계선을 가로지르는 선명한 화이트 광원!)
      const sp = cfg.expression === 'grace' ? 1.35 : 1.0;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(-irisRx * 0.36, -irisRy * 0.24, 14 * sp, 10 * sp, -0.25, 0, Math.PI * 2);
      g.fill();

      g.beginPath();
      g.arc(irisRx * 0.38, irisRy * 0.22, 6.2 * sp, 0, Math.PI * 2);
      g.fill();

      if (cfg.expression === 'grace') {
        // 별빛 반짝임 십자 하이라이트
        g.strokeStyle = '#ffffff';
        g.lineWidth = 3.2;
        g.beginPath();
        g.moveTo(-irisRx * 0.36 - 22, -irisRy * 0.24);
        g.lineTo(-irisRx * 0.36 + 22, -irisRy * 0.24);
        g.moveTo(-irisRx * 0.36, -irisRy * 0.24 - 22);
        g.lineTo(-irisRx * 0.36, -irisRy * 0.24 + 22);
        g.stroke();
      }
      g.restore();

      // (e) 진하고 날렵한 윗 아이라인 & 속눈썹 엣지
      g.fillStyle = '#141118';
      g.beginPath();
      g.moveTo(-rx - 4, 8);
      g.bezierCurveTo(-rx * 0.58, -ry * 1.38, rx * 0.58, -ry * 1.38, rx + 6, 6);
      g.lineTo(rx + outerDir * (isFemale ? 20 : 12), isFemale ? -14 : -4);
      g.bezierCurveTo(rx * 0.56, -ry * 1.08, -rx * 0.56, -ry * 1.08, -rx - 4, 8);
      g.closePath();
      g.fill();

      // 언더 속눈썹 섬세한 라인
      g.strokeStyle = 'rgba(42, 30, 34, 0.55)';
      g.lineWidth = 3.6;
      g.beginPath();
      g.moveTo(-rx * 0.55, ry * 0.88);
      g.quadraticCurveTo(0, ry * 1.08, rx * 0.62, ry * 0.84);
      g.stroke();

      // 애교살 얇은 음영선
      if (cfg.faceStyle === 'lovely' || cfg.faceStyle === 'gentle') {
        g.strokeStyle = 'rgba(175, 118, 108, 0.28)';
        g.lineWidth = 3.0;
        g.beginPath();
        g.moveTo(-rx * 0.45, ry * 1.24);
        g.quadraticCurveTo(0, ry * 1.40, rx * 0.45, ry * 1.24);
        g.stroke();
      }

      g.restore();
    };

    const drawAnimeClosedEye = (cx, isLeft, smileArc) => {
      const outerDir = isLeft ? -1 : 1;
      g.save();
      g.translate(cx, eyeY);
      g.strokeStyle = '#18131c';
      g.lineWidth = 10.5;
      g.lineCap = 'round';
      g.beginPath();
      if (smileArc) {
        g.moveTo(-74, 14);
        g.quadraticCurveTo(0, -48, 74, 14);
      } else {
        g.moveTo(-74, -8);
        g.quadraticCurveTo(0, 38, 74, -8);
      }
      g.stroke();

      // 감은 눈 끝 속눈썹 포인트
      g.lineWidth = 5.5;
      g.beginPath();
      g.moveTo(outerDir * 66, smileArc ? 8 : -4);
      g.lineTo(outerDir * 86, smileArc ? 2 : -14);
      g.stroke();
      g.restore();
    };

    if (isBlinking || cfg.expression === 'pray') {
      drawAnimeClosedEye(leftX, true, false);
      drawAnimeClosedEye(rightX, false, false);
    } else if (cfg.expression === 'joy') {
      drawAnimeClosedEye(leftX, true, true);
      drawAnimeClosedEye(rightX, false, true);
    } else if (cfg.expression === 'wink') {
      drawShoujoOpenEye(leftX, true);
      drawAnimeClosedEye(rightX, false, true);
    } else {
      drawShoujoOpenEye(leftX, true);
      drawShoujoOpenEye(rightX, false);
    }

    // 4) 순정만화 미니멀 콧날 펜선 + 작은 삼각 음영 (레퍼런스 그림체 핵심!)
    g.fillStyle = 'rgba(168, 112, 98, 0.34)';
    g.beginPath();
    g.moveTo(512, 598);
    g.lineTo(525, 622);
    g.lineTo(510, 625);
    g.closePath();
    g.fill();

    g.strokeStyle = 'rgba(84, 52, 48, 0.65)';
    g.lineWidth = 4.2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(509, 604);
    g.lineTo(505, 623);
    g.stroke();

    // 5) 순정만화 입매 (레퍼런스 사진처럼 양 끝 입꼬리가 살짝 올라간 매력적인 펜선 미소!)
    const mouthY = 718;
    if (cfg.expression === 'joy') {
      // 환하게 웃는 순정만화 열린 미소
      g.fillStyle = '#d95d6e';
      g.beginPath();
      g.moveTo(446, mouthY - 8);
      g.quadraticCurveTo(512, mouthY + 2, 578, mouthY - 8);
      g.quadraticCurveTo(512, mouthY + 68, 446, mouthY - 8);
      g.closePath();
      g.fill();

      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(458, mouthY - 5);
      g.quadraticCurveTo(512, mouthY + 4, 566, mouthY - 5);
      g.quadraticCurveTo(512, mouthY + 18, 458, mouthY - 5);
      g.fill();

      g.strokeStyle = '#3b1d24';
      g.lineWidth = 5.5;
      g.beginPath();
      g.moveTo(442, mouthY - 10);
      g.quadraticCurveTo(512, mouthY + 2, 582, mouthY - 10);
      g.stroke();
    } else if (cfg.expression === 'pray' || cfg.expression === 'calm') {
      if (isFemale) {
        g.fillStyle = 'rgba(236, 112, 134, 0.42)';
        g.beginPath();
        g.ellipse(512, mouthY + 3, 34, 11, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = '#4a282c';
      g.lineWidth = 5.2;
      g.beginPath();
      g.moveTo(466, mouthY + 2);
      g.quadraticCurveTo(512, mouthY + 8, 558, mouthY + 2);
      g.stroke();
    } else {
      // 레퍼런스 남주·여주 시그니처: 양 입꼬리 쏙 올라간 다정한 순정만화 미소!
      if (isFemale) {
        const lipGrad = g.createRadialGradient(512, mouthY + 4, 4, 512, mouthY + 4, 42);
        lipGrad.addColorStop(0, 'rgba(244, 114, 140, 0.52)');
        lipGrad.addColorStop(1, 'rgba(244, 114, 140, 0)');
        g.fillStyle = lipGrad;
        g.beginPath();
        g.ellipse(512, mouthY + 4, 44, 16, 0, 0, Math.PI * 2);
        g.fill();
      }

      g.strokeStyle = '#452428';
      g.lineWidth = 5.8;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(436, mouthY - 6);
      g.bezierCurveTo(468, mouthY + 16, 556, mouthY + 16, 588, mouthY - 6);
      g.stroke();

      // 양 끝 귀여운 입꼬리 터치
      g.fillStyle = 'rgba(136, 62, 68, 0.55)';
      g.beginPath();
      g.arc(435, mouthY - 7, 5.2, 0, Math.PI * 2);
      g.arc(589, mouthY - 7, 5.2, 0, Math.PI * 2);
      g.fill();

      // 아랫입술 밑 살짝 찍힌 만화 음영선
      g.strokeStyle = 'rgba(165, 108, 98, 0.38)';
      g.lineWidth = 3.8;
      g.beginPath();
      g.moveTo(496, mouthY + 24);
      g.quadraticCurveTo(512, mouthY + 28, 528, mouthY + 24);
      g.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    faceTextureCache.set(key, tex);
    return tex;
  }

  // -------------------------------------------------------------------------
  // 5. 순정만화 웰링턴/하프림 안경 & 반투명 렌즈 사선 빛반사 + 이어커프 생성기
  // -------------------------------------------------------------------------
  function addAnimeGlassesToHead(headGroup, R, isHorn, isCute) {
    const frameHex = isHorn ? 0x181924 : 0xd4af37;
    const frameMat = new THREE.MeshStandardMaterial({
      color: frameHex,
      roughness: isHorn ? 0.28 : 0.22,
      metalness: isHorn ? 0.15 : 0.78
    });
    const lensMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    });
    const glareMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });

    const gGroup = new THREE.Group();
    const gZ = R * (isCute ? 0.90 : 0.89);
    const gY = R * 0.01;
    const eyeOffX = R * (isCute ? 0.34 : 0.32);
    const fw = R * (isCute ? 0.50 : 0.48);
    const fh = R * (isCute ? 0.32 : 0.30);
    const thick = isHorn ? R * 0.042 : R * 0.022;

    [-1, 1].forEach((side) => {
      const fBox = new THREE.Group();
      fBox.position.set(side * eyeOffX, gY, gZ);
      fBox.rotation.z = side * -0.04; // 순정만화 특유의 세련된 안경테 각도!

      // 상단 브로우 바 (조금 더 도톰하고 날렵하게)
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(fw + thick, thick * 1.35, thick * 1.1), frameMat);
      topBar.position.y = fh * 0.5;
      // 하단 림
      const botBar = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.92, thick * (isHorn ? 0.85 : 0.55), thick * 0.9), frameMat);
      botBar.position.y = -fh * 0.5;
      // 좌우 세로 림
      const outerBar = new THREE.Mesh(new THREE.BoxGeometry(thick, fh, thick), frameMat);
      outerBar.position.x = side * (fw * 0.48);
      outerBar.rotation.z = side * 0.08;
      const innerBar = new THREE.Mesh(new THREE.BoxGeometry(thick * 0.85, fh * 0.92, thick * 0.9), frameMat);
      innerBar.position.x = -side * (fw * 0.46);

      // 반투명 안경알 + 만화풍 사선 빛반사 스트립
      const lens = new THREE.Mesh(new THREE.PlaneGeometry(fw * 0.88, fh * 0.88), lensMat);
      lens.position.z = 0.001;
      const glare = new THREE.Mesh(new THREE.PlaneGeometry(fw * 0.16, fh * 0.78), glareMat);
      glare.position.set(-fw * 0.16, 0, 0.002);
      glare.rotation.z = -0.38;

      // 귀로 이어지는 안경다리 (템플)
      const temple = new THREE.Mesh(new THREE.BoxGeometry(thick * 0.75, thick * 0.85, R * 0.82), frameMat);
      temple.position.set(side * (fw * 0.50), fh * 0.25, -R * 0.40);

      fBox.add(topBar, botBar, outerBar, innerBar, lens, glare, temple);
      gGroup.add(fBox);
    });

    // 중앙 브릿지
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(eyeOffX * 0.48, thick * 0.95, thick), frameMat);
    bridge.position.set(0, gY + fh * 0.34, gZ + 0.003);
    gGroup.add(bridge);

    headGroup.add(gGroup);
  }

  // -------------------------------------------------------------------------
  // 6. 한 올씩 살아있는 8종 순정만화 3D 입체 헤어 빌더
  // -------------------------------------------------------------------------
  function buildAnimeHairStyle(headGroup, R, cfg, isCute, hairColorHex, accentMat) {
    const hairGrp = new THREE.Group();
    headGroup.add(hairGrp);

    const hairMat = makeToonMat(hairColorHex, 'hair');
    const outlineHex = 0x120f17;
    const wScale = isCute ? 0.97 : (cfg.gender === 'female' ? 0.89 : 0.92);
    const hScale = isCute ? 1.03 : 1.11;

    // 1) 두상 볼륨 크라운 돔 + 만화 외곽선
    const crownGeo = new THREE.SphereGeometry(R * 1.06, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const crown = new THREE.Mesh(crownGeo, hairMat);
    crown.scale.set(wScale * 1.05, hScale * 1.04, 1.02);
    crown.position.set(0, R * 0.06, -R * 0.03);
    crown.rotation.x = -0.14;
    attachMangaOutline(crown, R * 0.025, outlineHex);
    hairGrp.add(crown);

    // 후두부 감싸는 베이스 캡
    const backCapGeo = new THREE.SphereGeometry(R * 1.04, 24, 18, Math.PI * 0.88, Math.PI * 1.24, Math.PI * 0.16, Math.PI * 0.68);
    const backCap = new THREE.Mesh(backCapGeo, hairMat);
    backCap.scale.set(wScale * 1.04, hScale, 1.02);
    backCap.position.set(0, R * 0.02, -R * 0.04);
    hairGrp.add(backCap);

    // 공통 헬퍼: 뾰족하게 빠지는 입체 머리카락 한 다발 추가
    const addLock = (x, y, z, w, len, th, cz, sx, rotX = 0, rotY = 0, rotZ = 0, withOutline = true) => {
      const sGeo = createHairStrandGeometry(w, len, th, cz, sx);
      const m = new THREE.Mesh(sGeo, hairMat);
      m.position.set(x, y, z);
      m.rotation.set(rotX, rotY, rotZ);
      if (withOutline) attachMangaOutline(m, R * 0.016, outlineHex);
      hairGrp.add(m);
      return m;
    };

    // 공통 귀 옆 구레나룻/사이드 락 (얼굴 여백을 샤프하게 잡아주는 순정만화 핵심 디테일!)
    [-1, 1].forEach((side) => {
      addLock(
        side * R * wScale * 0.90,
        R * 0.34,
        R * 0.36,
        R * 0.24,
        R * (cfg.gender === 'female' ? 1.18 : 0.92),
        R * 0.11,
        R * 0.08,
        -side * R * 0.10,
        0.06,
        side * 0.35,
        0
      );
    });

    // 목덜미 뒤쪽 삐죽삐죽 샤기 팁 (구체 느낌 완전 제거)
    [-0.42, -0.15, 0.15, 0.42].forEach((nx) => {
      addLock(
        nx * R,
        -R * 0.20,
        -R * 0.86,
        R * 0.28,
        R * 0.68,
        R * 0.11,
        -R * 0.10,
        nx * R * 0.12,
        -0.12,
        0,
        0,
        false
      );
    });

    // 순정만화 엔젤링(머릿결 하이라이트 아크)
    const sheenPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(R * 1.18, R * 0.26),
      new THREE.MeshBasicMaterial({
        map: getAngelRingTexture(),
        transparent: true,
        depthWrite: false
      })
    );
    sheenPlane.position.set(0, R * 0.64, R * 0.89);
    sheenPlane.rotation.x = -0.32;
    hairGrp.add(sheenPlane);

    const style = cfg.hairStyle;

    if (style === 'shaggy_bang' || style === 'short_layered') {
      // ★ 보내주신 레퍼런스 캐릭터의 시스루 샤기 뱅! (눈썹·안경 위로 한 올씩 갈라지는 7가닥 앞머리 + 정수리 잔머리!)
      const bangSpecs = [
        [-0.50, 0.72, 0.72, 0.26, 0.96, -0.06, 0.16],
        [-0.31, 0.78, 0.77, 0.25, 1.06,  0.04, 0.07],
        [-0.12, 0.80, 0.80, 0.24, 1.12, -0.03, 0.02],
        [ 0.06, 0.80, 0.80, 0.26, 1.08,  0.05, -0.03],
        [ 0.25, 0.78, 0.78, 0.24, 1.02,  0.06, -0.06],
        [ 0.46, 0.72, 0.72, 0.26, 0.95,  0.08, -0.15]
      ];
      bangSpecs.forEach(([bx, by, bz, bw, blen, sx, rz]) => {
        addLock(bx * R, by * R, bz * R, bw * R, blen * R, R * 0.10, R * 0.16, sx * R, -0.06, 0, rz);
      });

      // 정수리 볼륨 바보털(아호게) & 결감 레이어
      if (style === 'shaggy_bang') {
        const ahoge = createHairStrandGeometry(R * 0.16, R * 0.52, R * 0.07, R * 0.14, R * 0.18, R * 0.12);
        const ahogeMesh = new THREE.Mesh(ahoge, hairMat);
        ahogeMesh.position.set(R * 0.05, R * 1.16, R * 0.06);
        ahogeMesh.rotation.set(2.35, 0.2, -0.45);
        hairGrp.add(ahogeMesh);
      }
    } else if (style === 'dandy') {
      // 부드러운 6:4 애즈펌 / 가르마펌 만화 남주 헤어
      addLock(-R * 0.34, R * 0.82, R * 0.74, R * 0.44, R * 1.08, R * 0.14, R * 0.18, -R * 0.22, -0.08, 0, 0.22);
      addLock(-R * 0.14, R * 0.84, R * 0.78, R * 0.32, R * 0.96, R * 0.12, R * 0.16, -R * 0.14, -0.06, 0, 0.12);
      addLock( R * 0.24, R * 0.82, R * 0.76, R * 0.42, R * 1.04, R * 0.14, R * 0.18,  R * 0.24, -0.08, 0, -0.24);
      addLock( R * 0.46, R * 0.74, R * 0.68, R * 0.28, R * 0.92, R * 0.11, R * 0.14,  R * 0.16, -0.06, 0, -0.28);
    } else if (style === 'pomade') {
      // 이마가 단정히 드러나며 한 가닥 애교 앞머리가 떨어지는 슬릭 가일/포마드컷
      addLock(-R * 0.18, R * 1.06, R * 0.56, R * 0.54, R * 0.78, R * 0.18, R * 0.20, -R * 0.35, -1.05, 0, 0.35);
      addLock( R * 0.22, R * 1.04, R * 0.54, R * 0.48, R * 0.72, R * 0.16, R * 0.18,  R * 0.32, -1.12, 0, -0.32);
      // 한 올 내려오는 지적인 시스루 스트랜드
      addLock(-R * 0.26, R * 0.84, R * 0.78, R * 0.18, R * 0.92, R * 0.08, R * 0.15,  R * 0.08, -0.05, 0, 0.08);
    } else if (style === 'bob_c' || style === 'beret_wave') {
      // 청순 시스루 뱅 + 턱선을 샤프하게 감싸는 C컬 단발 보브
      [-0.32, -0.10, 0.12, 0.34].forEach((bx, idx) => {
        addLock(bx * R, R * 0.78, R * 0.78, R * 0.25, R * 0.96, R * 0.09, R * 0.15, (idx - 1.5) * R * 0.04, -0.06, 0, 0);
      });
      [-1, 1].forEach((side) => {
        addLock(side * R * 0.74, R * 0.52, R * 0.20, R * 0.44, R * 1.68, R * 0.18, R * 0.12, -side * R * 0.22, 0.05, side * 0.25, 0);
        addLock(side * R * 0.64, R * 0.44, -R * 0.35, R * 0.48, R * 1.62, R * 0.18, -R * 0.08, -side * R * 0.12, 0, side * 0.65, 0, false);
      });
      if (style === 'beret_wave') {
        const beret = new THREE.Mesh(new THREE.SphereGeometry(R * 1.15, 24, 16), accentMat);
        beret.scale.set(1.06, 0.40, 1.04);
        beret.position.set(R * 0.14, R * 0.92, -R * 0.05);
        beret.rotation.z = -0.22;
        attachMangaOutline(beret, R * 0.022, outlineHex);
        hairGrp.add(beret);
      }
    } else if (style === 'long_wave') {
      // 순정만화 여주인공 롱 웨이브 헤어 (시스루 앞머리 + 긴 양갈래 웨이브 옆머리 + 풍성한 등판 물결!)
      [-0.34, -0.11, 0.11, 0.34].forEach((bx) => {
        addLock(bx * R, R * 0.80, R * 0.78, R * 0.24, R * 0.98, R * 0.09, R * 0.15, bx * R * 0.08, -0.06, 0, 0);
      });
      [-1, 1].forEach((side) => {
        // 얼굴 옆에서 가슴 앞으로 우아하게 흐르는 롱 사이드 락
        addLock(side * R * 0.76, R * 0.48, R * 0.22, R * 0.38, R * 2.75, R * 0.16, R * 0.18, -side * R * 0.14, 0.08, side * 0.18, side * -0.05);
      });
      // 등 뒤 풍성한 5갈래 롱 웨이브 레이어
      [-0.58, -0.29, 0, 0.29, 0.58].forEach((bx) => {
        addLock(bx * R, R * 0.30, -R * 0.76, R * 0.48, R * 3.05, R * 0.18, -R * 0.22, bx * R * 0.24, -0.08, 0, 0);
      });
    } else if (style === 'low_bun') {
      // 단아한 로우번 시뇽 + 얼굴 옆 애교 잔머리 S컬
      [-0.28, 0.0, 0.28].forEach((bx) => {
        addLock(bx * R, R * 0.80, R * 0.77, R * 0.26, R * 0.92, R * 0.09, R * 0.14, bx * R * 0.12, -0.06, 0, 0);
      });
      [-1, 1].forEach((side) => {
        addLock(side * R * 0.74, R * 0.36, R * 0.34, R * 0.22, R * 1.38, R * 0.09, R * 0.14, -side * R * 0.12, 0.06, side * 0.20, 0);
      });
      const bun = new THREE.Mesh(new THREE.SphereGeometry(R * 0.48, 20, 16), hairMat);
      bun.scale.set(1.12, 0.92, 0.96);
      bun.position.set(0, -R * 0.18, -R * 1.02);
      attachMangaOutline(bun, R * 0.022, outlineHex);
      const pearlPin = new THREE.Mesh(
        new THREE.SphereGeometry(R * 0.11, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.2, metalness: 0.3 })
      );
      pearlPin.position.set(R * 0.24, 0, -R * 0.90);
      hairGrp.add(bun, pearlPin);
    } else if (style === 'ponytail') {
      // 발랄한 하이 포니테일 + 리본 + 시스루 앞머리
      [-0.32, -0.10, 0.12, 0.34].forEach((bx) => {
        addLock(bx * R, R * 0.78, R * 0.78, R * 0.24, R * 0.96, R * 0.09, R * 0.15, 0, -0.06, 0, 0);
      });
      const ribbon = new THREE.Mesh(new THREE.TorusGeometry(R * 0.20, R * 0.065, 10, 18), accentMat);
      ribbon.position.set(0, R * 0.42, -R * 0.94);
      hairGrp.add(ribbon);
      // 풍성하게 뻗어 내리는 3갈래 포니테일 다발
      addLock(0, R * 0.44, -R * 1.00, R * 0.52, R * 2.35, R * 0.22, -R * 0.36, 0, -0.22, 0, 0);
      addLock(-R * 0.14, R * 0.40, -R * 0.98, R * 0.34, R * 2.05, R * 0.15, -R * 0.28, -R * 0.22, -0.20, 0, 0.10, false);
      addLock( R * 0.14, R * 0.40, -R * 0.98, R * 0.34, R * 2.05, R * 0.15, -R * 0.28,  R * 0.22, -0.20, 0, -0.10, false);
    }
  }

  // -------------------------------------------------------------------------
  // 7. 전체 3D 순정만화 아바타 리깅 조립 (8등신 주인공 비율 & 귀여운 SD 만화 비율)
  // -------------------------------------------------------------------------
  function buildStylizedAvatarRig(presetId, rawCfg, currentDrink) {
    const cfg = resolveAvatarConfig(presetId, rawCfg);
    const isCute = cfg.bodyStyle === 'cute';
    const isFemale = cfg.gender === 'female';

    const skinHex = SKIN_TONE_HEX[cfg.skinTone] || '#fff0e6';
    const hairHex = HAIR_COLOR_HEX[cfg.hairColor] || '#171821';
    const skinMat = makeToonMat(skinHex, 'skin');
    const outfitMat = makeToonMat(cfg.outfitColor, 'cloth');
    const bottomMat = makeToonMat(cfg.bottomColor, 'cloth');
    const whiteShirtMat = makeToonMat('#f8fafc', 'cloth');
    const crimsonKnitMat = makeToonMat(isFemale ? '#be185d' : '#8f1d2c', 'cloth');
    const ribCollarMat = makeToonMat('#524c54', 'cloth');
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.78, roughness: 0.22 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.18 });
    const darkShoeMat = makeToonMat(isFemale ? '#272024' : '#16161d', 'cloth');

    const bodyOutline = 0x1c1520;
    const skinOutline = 0x432927;

    const rigGroup = new THREE.Group();

    const P = isCute
      ? {
          hipY: 0.66,
          legLen: 0.58,
          legSpacing: 0.135,
          torsoH: 0.60,
          torsoTopR: isFemale ? 0.185 : 0.205,
          torsoWaistR: isFemale ? 0.155 : 0.175,
          hipR: isFemale ? 0.195 : 0.185,
          shoulderY: 1.20,
          armX: isFemale ? 0.245 : 0.270,
          armLen: 0.46,
          neckY: 1.31,
          headY: 1.56,
          headR: 0.235,
          heightTop: 2.04
        }
      : {
          hipY: 0.92,
          legLen: 0.86,
          legSpacing: isFemale ? 0.102 : 0.122,
          torsoH: 0.64,
          torsoTopR: isFemale ? 0.168 : 0.212,
          torsoWaistR: isFemale ? 0.122 : 0.164,
          hipR: isFemale ? 0.168 : 0.166,
          shoulderY: 1.50,
          armX: isFemale ? 0.218 : 0.262,
          armLen: 0.61,
          neckY: 1.60,
          headY: 1.78,
          headR: 0.164,
          heightTop: 2.18
        };

    const isSkirtLook = cfg.outfitStyle === 'onepiece' || cfg.outfitStyle === 'jacket_skirt';
    const isChoir = cfg.outfitStyle === 'choir';

    // 1) 슬림 만화 다리 + 로퍼/스니커즈
    const makeLeg = () => {
      const lg = new THREE.Group();
      const legMat = isSkirtLook ? skinMat : bottomMat;
      const legOut = isSkirtLook ? skinOutline : bodyOutline;
      const rTop = isSkirtLook ? 0.066 : 0.082;
      const rMid = isSkirtLook ? 0.052 : 0.066;
      const upperH = P.legLen * 0.52;
      const lowerH = P.legLen * 0.48;

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rMid, upperH, 16), legMat);
      thigh.position.y = -upperH * 0.5;
      thigh.castShadow = true;
      attachMangaOutline(thigh, 0.0038, legOut);

      const calf = new THREE.Mesh(new THREE.CylinderGeometry(rMid, rMid * 0.80, lowerH, 16), legMat);
      calf.position.y = -upperH - lowerH * 0.5 + 0.02;
      calf.castShadow = true;
      attachMangaOutline(calf, 0.0038, legOut);

      const isSneaker = cfg.outfitStyle === 'webtoon_layered' || cfg.outfitStyle === 'knit_slacks';
      const shoe = new THREE.Mesh(
        new THREE.SphereGeometry(0.078, 14, 10),
        isSneaker ? whiteShirtMat : (cfg.outfitStyle === 'onepiece' ? outfitMat : darkShoeMat)
      );
      shoe.scale.set(0.84, 0.52, 1.58);
      shoe.position.set(0, -P.legLen + 0.02, 0.044);
      attachMangaOutline(shoe, 0.0035, bodyOutline);

      lg.add(thigh, calf, shoe);
      return lg;
    };

    const leftLeg = makeLeg();
    leftLeg.position.set(-P.legSpacing, P.hipY, 0);
    const rightLeg = makeLeg();
    rightLeg.position.set(P.legSpacing, P.hipY, 0);
    rigGroup.add(leftLeg, rightLeg);

    const pelvis = new THREE.Mesh(
      new THREE.SphereGeometry(P.hipR, 16, 12),
      isSkirtLook ? (cfg.outfitStyle === 'onepiece' ? outfitMat : bottomMat) : bottomMat
    );
    pelvis.scale.set(1.04, 0.54, 0.74);
    pelvis.position.y = P.hipY;
    rigGroup.add(pelvis);

    // 2) 슬림 V-테이퍼 상체 & 웹툰 레이어드 의상 디테일
    const torsoCenterY = P.hipY + P.torsoH * 0.5 - 0.02;
    const upperTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(P.torsoTopR, P.torsoWaistR, P.torsoH * 0.62, 20),
      outfitMat
    );
    upperTorso.scale.set(1.18, 1, 0.70);
    upperTorso.position.y = torsoCenterY + P.torsoH * 0.18;
    upperTorso.castShadow = true;
    attachMangaOutline(upperTorso, 0.0045, bodyOutline);
    rigGroup.add(upperTorso);

    const lowerTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(P.torsoWaistR, P.hipR * 0.98, P.torsoH * 0.44, 20),
      outfitMat
    );
    lowerTorso.scale.set(1.10, 1, 0.72);
    lowerTorso.position.y = P.hipY + P.torsoH * 0.18;
    lowerTorso.castShadow = true;
    attachMangaOutline(lowerTorso, 0.0045, bodyOutline);
    rigGroup.add(lowerTorso);

    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(P.torsoTopR * 1.14, 18, 12), outfitMat);
    shoulderCap.scale.set(1.16, 0.34, 0.68);
    shoulderCap.position.y = P.shoulderY;
    attachMangaOutline(shoulderCap, 0.0042, bodyOutline);
    rigGroup.add(shoulderCap);

    // ★ 패션별 만화풍 입체 레이어드 디테일
    if (cfg.outfitStyle === 'webtoon_layered') {
      // [레퍼런스 사진 100% 재현!] 오픈 지퍼 블루종 자켓 + 시보리 넥 + 레드/버건디 니트 + 화이트 셔츠 카라 & 탑버튼!
      const innerKnit = new THREE.Mesh(new THREE.BoxGeometry(P.torsoTopR * 0.92, P.torsoH * 0.84, 0.032), crimsonKnitMat);
      innerKnit.position.set(0, P.hipY + P.torsoH * 0.46, P.torsoTopR * 0.69);
      rigGroup.add(innerKnit);

      // 화이트 드레스 셔츠 V카라 + 실버 단추
      [-1, 1].forEach((side) => {
        const collarWing = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.105, 0.022), whiteShirtMat);
        collarWing.position.set(side * 0.036, P.shoulderY + 0.015, P.torsoTopR * 0.68);
        collarWing.rotation.z = side * -0.42;
        attachMangaOutline(collarWing, 0.0025, bodyOutline);
        rigGroup.add(collarWing);

        // 양쪽 실버 지퍼 라인!
        const zipTrack = new THREE.Mesh(new THREE.BoxGeometry(0.012, P.torsoH * 0.78, 0.018), silverMat);
        zipTrack.position.set(side * P.torsoTopR * 0.44, P.hipY + P.torsoH * 0.44, P.torsoTopR * 0.73);
        zipTrack.rotation.z = side * -0.05;
        rigGroup.add(zipTrack);
      });

      const shirtCenter = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.13, 0.024), whiteShirtMat);
      shirtCenter.position.set(0, P.shoulderY - 0.03, P.torsoTopR * 0.70);
      const topBtn = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 10), silverMat);
      topBtn.position.set(0, P.shoulderY - 0.02, P.torsoTopR * 0.73);

      // 블루종 골지 시보리 카라
      const ribCollar = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.020, 10, 22, Math.PI * 1.35), ribCollarMat);
      ribCollar.rotation.x = Math.PI * 0.52;
      ribCollar.rotation.z = Math.PI * 0.82;
      ribCollar.position.set(0, P.shoulderY + 0.025, 0.01);

      rigGroup.add(shirtCenter, topBtn, ribCollar);
    } else if (cfg.outfitStyle === 'suit') {
      const vZone = new THREE.Mesh(new THREE.ConeGeometry(0.086, 0.34, 4), whiteShirtMat);
      vZone.rotation.x = Math.PI;
      vZone.rotation.y = Math.PI * 0.25;
      vZone.scale.set(1.0, 1.0, 0.35);
      vZone.position.set(0, P.shoulderY - 0.12, P.torsoTopR * 0.68);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.25, 0.018), crimsonKnitMat);
      tie.position.set(0, P.shoulderY - 0.15, P.torsoTopR * 0.74);
      rigGroup.add(vZone, tie);
    } else if (cfg.outfitStyle === 'knit_slacks') {
      [-1, 1].forEach((side) => {
        const cWing = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.095, 0.020), whiteShirtMat);
        cWing.position.set(side * 0.034, P.shoulderY + 0.02, P.torsoTopR * 0.64);
        cWing.rotation.z = side * -0.45;
        attachMangaOutline(cWing, 0.0025, bodyOutline);
        rigGroup.add(cWing);
      });
      const vTie = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.12, 0.018), crimsonKnitMat);
      vTie.position.set(0, P.shoulderY - 0.05, P.torsoTopR * 0.71);
      rigGroup.add(vTie);
    } else if (cfg.outfitStyle === 'onepiece') {
      // 로맨스 리본 카라 + 플레어 스커트
      const flareSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(P.torsoWaistR * 1.05, P.hipR * 1.78, P.legLen * 0.56, 24),
        outfitMat
      );
      flareSkirt.scale.set(1.06, 1, 0.84);
      flareSkirt.position.y = P.hipY - P.legLen * 0.18;
      attachMangaOutline(flareSkirt, 0.0042, bodyOutline);
      const whiteCollar = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.018, 10, 20), whiteShirtMat);
      whiteCollar.rotation.x = Math.PI * 0.48;
      whiteCollar.position.set(0, P.shoulderY + 0.02, 0.02);
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(P.torsoWaistR * 1.13, P.torsoWaistR * 1.13, 0.032, 20), darkShoeMat);
      belt.scale.set(1.08, 1, 0.74);
      belt.position.y = P.hipY + 0.14;
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.038, 0.02), goldMat);
      buckle.position.set(0, P.hipY + 0.14, P.torsoWaistR * 0.84);
      rigGroup.add(flareSkirt, whiteCollar, belt, buckle);
    } else if (cfg.outfitStyle === 'jacket_skirt') {
      const midiSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(P.hipR * 0.98, P.hipR * 1.38, P.legLen * 0.50, 22),
        bottomMat
      );
      midiSkirt.scale.set(1.06, 1, 0.80);
      midiSkirt.position.y = P.hipY - P.legLen * 0.17;
      attachMangaOutline(midiSkirt, 0.0042, bodyOutline);
      rigGroup.add(midiSkirt);
      for (let bi = 0; bi < 3; bi++) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 10), goldMat);
        btn.position.set(0, P.shoulderY - 0.09 - bi * 0.105, P.torsoTopR * 0.74);
        rigGroup.add(btn);
      }
    } else if (cfg.outfitStyle === 'trench') {
      const innerTurtleneck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.078, 0.19, 14), bottomMat);
      innerTurtleneck.position.set(0, P.shoulderY + 0.01, 0.02);
      const coatHem = new THREE.Mesh(
        new THREE.CylinderGeometry(P.torsoWaistR * 1.12, P.hipR * 1.52, P.legLen * 0.58, 22, 1, true, Math.PI * 0.18, Math.PI * 1.64),
        makeToonMat(cfg.outfitColor, 'cloth', { side: THREE.DoubleSide })
      );
      coatHem.rotation.y = Math.PI;
      coatHem.scale.set(1.08, 1, 0.82);
      coatHem.position.y = P.hipY - P.legLen * 0.16;
      rigGroup.add(innerTurtleneck, coatHem);
    } else if (isChoir) {
      const robeSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(P.torsoWaistR * 1.15, P.hipR * 1.78, P.legLen * 0.82, 24),
        outfitMat
      );
      robeSkirt.scale.set(1.08, 1, 0.84);
      robeSkirt.position.y = P.hipY - P.legLen * 0.34;
      attachMangaOutline(robeSkirt, 0.0045, bodyOutline);
      const stole = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.026, 8, 18), goldMat);
      stole.rotation.x = Math.PI * 0.38;
      stole.scale.set(1.0, 1.35, 0.55);
      stole.position.set(0, P.shoulderY - 0.04, 0.05);
      rigGroup.add(robeSkirt, stole);
    }

    // 3) 슬림한 팔 & 섬세한 손목·손
    const makeArm = () => {
      const ag = new THREE.Group();
      const sleeveLen = P.armLen * (cfg.outfitStyle === 'onepiece' ? 0.58 : 0.88);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.043, sleeveLen, 14), outfitMat);
      sleeve.position.y = -sleeveLen * 0.5;
      sleeve.castShadow = true;
      attachMangaOutline(sleeve, 0.0036, bodyOutline);
      ag.add(sleeve);

      if (sleeveLen < P.armLen) {
        const forearmLen = P.armLen - sleeveLen;
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.033, forearmLen, 12), skinMat);
        forearm.position.y = -sleeveLen - forearmLen * 0.5;
        attachMangaOutline(forearm, 0.003, skinOutline);
        ag.add(forearm);
      }

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.040, 12, 10), skinMat);
      hand.scale.set(0.82, 1.22, 0.62);
      hand.position.y = -P.armLen - 0.02;
      attachMangaOutline(hand, 0.0028, skinOutline);
      ag.add(hand);
      return ag;
    };

    const leftArm = makeArm();
    leftArm.position.set(-P.armX, P.shoulderY - 0.02, 0);
    const rightArm = makeArm();
    rightArm.position.set(P.armX, P.shoulderY - 0.02, 0);
    rigGroup.add(leftArm, rightArm);

    const cupGroup = new THREE.Group();
    const cupBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.050, 0.038, 0.135, 14),
      whiteShirtMat
    );
    const cupSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.043, 0.055, 14),
      makeToonMat('#92400e', 'cloth')
    );
    cupGroup.add(cupBody, cupSleeve);
    cupGroup.position.set(0, -P.armLen - 0.01, 0.082);
    cupGroup.visible = !!currentDrink;
    rightArm.add(cupGroup);

    // 4) 가늘고 긴 순정만화 목선 + 턱 아래 만화 그림자 + V라인 3D 헤드
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.050, 0.16, 16), skinMat);
    neck.position.y = P.neckY;
    attachMangaOutline(neck, 0.003, skinOutline);
    rigGroup.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.y = P.headY;
    rigGroup.add(headGroup);

    const R = P.headR;
    const { headGeo, faceGeo } = getAnimeVLineHeadGeometries(R, isFemale, isCute);

    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    attachMangaOutline(headMesh, R * 0.024, skinOutline);
    headGroup.add(headMesh);

    // 양쪽 귀 + 시크 이어커프/피어싱 디테일(레퍼런스 사진 왼쪽 귀 더블 링 반영!)
    const earW = isCute ? 0.96 : (isFemale ? 0.88 : 0.91);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.17, 12, 10), skinMat);
      ear.scale.set(0.42, 0.98, 0.62);
      ear.position.set(side * R * earW * 0.97, -R * 0.06, -R * 0.04);
      ear.rotation.z = side * -0.14;
      attachMangaOutline(ear, R * 0.016, skinOutline);
      headGroup.add(ear);

      if (side === 1 && (cfg.accessory === 'earcuff' || cfg.accessory === 'horn_glasses')) {
        const cuffMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.85, roughness: 0.2 });
        [0.01, -0.04].forEach((cy) => {
          const cuff = new THREE.Mesh(new THREE.TorusGeometry(R * 0.048, R * 0.012, 8, 14), cuffMat);
          cuff.position.set(R * earW * 1.03, cy * R - R * 0.02, -R * 0.03);
          cuff.rotation.y = Math.PI * 0.4;
          headGroup.add(cuff);
        });
      }
    });

    // 1024px 순정만화 눈동자·속눈썹·입매 데칼 (기본 열림 + 깜빡임 텍스처 스왑용 참조 보관)
    const openFaceTex = createStylizedFaceTexture(cfg, false);
    const blinkFaceTex = createStylizedFaceTexture(cfg, true);
    const faceDecalMat = new THREE.MeshBasicMaterial({
      map: openFaceTex,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false
    });
    const faceShell = new THREE.Mesh(faceGeo, faceDecalMat);
    headGroup.add(faceShell);

    // 5) 한 올씩 갈라지는 8종 3D 순정만화 헤어 장착
    buildAnimeHairStyle(headGroup, R, cfg, isCute, hairHex, outfitMat);

    // 6) 순정만화 안경 / 목걸이 / 크로스백 장착
    if (cfg.accessory === 'horn_glasses') {
      addAnimeGlassesToHead(headGroup, R, true, isCute);
    } else if (cfg.accessory === 'wire_glasses') {
      addAnimeGlassesToHead(headGroup, R, false, isCute);
    } else if (cfg.accessory === 'necklace') {
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.005, 8, 20, Math.PI), silverMat);
      chain.rotation.x = Math.PI * 0.82;
      chain.position.set(0, P.shoulderY + 0.02, 0.075);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.046, 0.008), silverMat);
      crossV.position.set(0, P.shoulderY - 0.05, P.torsoTopR * 0.76);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.010, 0.008), silverMat);
      crossH.position.set(0, P.shoulderY - 0.04, P.torsoTopR * 0.76);
      rigGroup.add(chain, crossV, crossH);
    } else if (cfg.accessory === 'crossbag') {
      const bagLeather = makeToonMat('#5c341d', 'cloth');
      const strap = new THREE.Mesh(new THREE.TorusGeometry(P.torsoTopR * 1.36, 0.013, 8, 24), bagLeather);
      strap.rotation.y = Math.PI * 0.5;
      strap.rotation.x = 0.55;
      strap.scale.set(0.60, 1.25, 1.0);
      strap.position.set(0, P.hipY + P.torsoH * 0.44, 0);
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.155, 0.19), bagLeather);
      pouch.position.set(P.hipR * 1.12, P.hipY + 0.04, 0.04);
      attachMangaOutline(pouch, 0.0035, bodyOutline);
      rigGroup.add(strap, pouch);
    }

    return {
      rigGroup,
      headGroup,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      cupGroup,
      faceDecalMat,
      openFaceTex,
      blinkFaceTex,
      heightTop: P.heightTop,
      cfg
    };
  }

  const ZONE_META = {
    garden: {
      id: 'garden',
      name: '🌿 앞마당 캠퍼스 광장',
      subtitle: '모던 화강암 광장 · 글래스 카페 파빌리온 · 대성전 커튼월 외관',
      sky: 0x152030,
      fogColor: 0x1d2a3d,
      fogDensity: 0.0055,
      spawn: { x: 0, z: 22, rotY: Math.PI },
      panorama: { pos: [-18, 16, 36], look: [0, 4, -8] },
      bounds: { x: 34, zMin: -28, zMax: 34 },
      hasBoard: false
    },
    sanctuary: {
      id: 'sanctuary',
      name: '🏛️ 그레이스 대성전',
      subtitle: '곡선 간접조명 루버천장 · 3열 개별 예배의자 본당 · 화이트 백라이트 십자가홀',
      sky: 0x1f1c18,
      fogColor: 0x2c2721,
      fogDensity: 0.0025,
      spawn: { x: 0, z: 24.6, rotY: Math.PI },
      panorama: { pos: [-22, 9.8, 25], look: [0, 3.5, -8] },
      bounds: { x: 28.5, zMin: -21.5, zMax: 27.5 },
      hasBoard: true,
      boardPos: [0, 6.4, -22.6],
      boardSize: [18.6, 5.8]
    },
    sarangbang: {
      id: 'sarangbang',
      name: '🏠 사랑방 (모던 소그룹실)',
      subtitle: '우물천장 간접조명 · 오트밀 모듈 소파 · 트래버틴 라운지',
      sky: 0x24201c,
      fogColor: 0x2e2924,
      fogDensity: 0.003,
      spawn: { x: 0, z: 8.5, rotY: Math.PI },
      panorama: { pos: [-12, 7.6, 13.5], look: [0, 2.6, -3] },
      bounds: { x: 14.8, zMin: -12.8, zMax: 13.8 },
      hasBoard: true,
      boardPos: [0, 4.9, -13.2],
      boardSize: [11.2, 5.2]
    },
    bible: {
      id: 'bible',
      name: '📖 성경통독방 (모던 북라운지)',
      subtitle: '선반 LED 빌트인 서가 · 화이트 스터디 데스크 · 개역개정 66권',
      sky: 0x22201d,
      fogColor: 0x2b2824,
      fogDensity: 0.003,
      spawn: { x: 0, z: 10.5, rotY: Math.PI },
      panorama: { pos: [-13, 8.0, 15.0], look: [0, 3.0, -4] },
      bounds: { x: 15.8, zMin: -14.8, zMax: 15.5 },
      hasBoard: true,
      boardPos: [0, 5.2, -15.1],
      boardSize: [12.4, 5.6]
    },
    qt: {
      id: 'qt',
      name: '✏️ 큐티방 (모던 세미나홀)',
      subtitle: '리니어 LED 우물천장 · 화이트 세미나 데스크 · 큐티 기초반 강의실',
      sky: 0x202328,
      fogColor: 0x282c33,
      fogDensity: 0.003,
      spawn: { x: 0, z: 10.2, rotY: Math.PI },
      panorama: { pos: [-13, 8.0, 15.0], look: [0, 3.0, -4] },
      bounds: { x: 16.2, zMin: -14.8, zMax: 15.5 },
      hasBoard: true,
      boardPos: [0, 5.2, -15.1],
      boardSize: [13.0, 5.8]
    },
    prayer: {
      id: 'prayer',
      name: '🕯️ 기도실 & 현대 성화갤러리',
      subtitle: '화이트 뮤지엄 월워셔 회랑 · 간접조명 원목 루버 개인기도부스',
      sky: 0x1c1a18,
      fogColor: 0x252220,
      fogDensity: 0.0035,
      spawn: { x: 0, z: 11.8, rotY: Math.PI },
      panorama: { pos: [-11, 7.6, 16.0], look: [0, 2.8, -5] },
      bounds: { x: 14.2, zMin: -15.8, zMax: 16.8 },
      hasBoard: true,
      boardPos: [0, 5.0, -16.1],
      boardSize: [10.6, 5.0]
    },
    rooftop: {
      id: 'rooftop',
      name: '☕ 루프탑 글래스 소미카페',
      subtitle: '사계절 산과 바다 파노라마 · 눈/비/단풍/벚꽃 실사 전망 테라스',
      sky: 0x1e3a5f,
      fogColor: 0x94a3b8,
      fogDensity: 0.0022,
      spawn: { x: 0, z: 14.5, rotY: Math.PI },
      panorama: { pos: [-14, 9.5, 22], look: [0, 3.2, -28] },
      bounds: { x: 21, zMin: -18.6, zMax: 19.5 },
      hasBoard: true,
      boardPos: [18.8, 3.9, 2.5],
      boardRotY: -Math.PI / 2,
      boardSize: [7.6, 4.3]
    }
  };

  const GALLERY_ARTWORKS = [
    { title: '창조의 빛 (창세기 1:3)', desc: '하나님이 이르시되 빛이 있으라 하시니 빛이 있었고 — 혼돈과 어둠 위에 임한 첫 창조의 광명', color1: '#1e293b', color2: '#d97706' },
    { title: '선한 목자 (시편 23:1-2)', desc: '여호와는 나의 목자시니 내게 부족함이 없으리로다 그가 나를 푸른 풀밭과 쉴 만한 물 가로 인도하시는도다', color1: '#143829', color2: '#a3b18a' },
    { title: '광야의 불기둥 (출애굽기 13:21)', desc: '밤에는 불기둥을 비추사 주야로 진행하게 하시니 — 인생의 밤길을 밝히시는 임마누엘 하나님', color1: '#3b180c', color2: '#ea580c' },
    { title: '겟세마네의 기도 (누가복음 22:42)', desc: '내 원대로 마시옵고 아버지의 원대로 되기를 원하나이다 — 순종의 기도', color1: '#171a36', color2: '#6366f1' },
    { title: '갈보리 언덕의 사랑 (로마서 5:8)', desc: '우리가 아직 죄인 되었을 때에 그리스도께서 우리를 위하여 죽으심으로 사랑을 확증하셨느니라', color1: '#3f0d1c', color2: '#e11d48' },
    { title: '부활의 새벽 (요한복음 11:25)', desc: '나는 부활이요 생명이니 나를 믿는 자는 죽어도 살겠고 영원히 죽지 아니하리니', color1: '#1e3a5f', color2: '#facc15' }
  ];

  class ChapelWorld3D {
    constructor(opts) {
      this.canvas = opts.canvas;
      this.overlayContainer = opts.overlayContainer;
      this.boardCanvas = opts.boardCanvas;
      this.onInteract = opts.onInteract || (() => {});
      this.onProximityChange = opts.onProximityChange || (() => {});
      this.onPortalEnter = opts.onPortalEnter || (() => {});
      this.onLocalMove = opts.onLocalMove || (() => {});

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.2, 480);
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      if (THREE.sRGBEncoding) this.renderer.outputEncoding = THREE.sRGBEncoding;

      this.pbr = new window.ArchitecturalPBR(this.renderer);
      this.scene.environment = this.pbr.envMap;

      this.roomGroup = new THREE.Group();
      this.avatarGroup = new THREE.Group();
      this.scene.add(this.roomGroup);
      this.scene.add(this.avatarGroup);

      this.boardTexture = new THREE.CanvasTexture(this.boardCanvas);
      this.boardTexture.minFilter = THREE.LinearFilter;
      if (THREE.sRGBEncoding) this.boardTexture.encoding = THREE.sRGBEncoding;
      this.boardMesh = null;

      const ringGeo = new THREE.RingGeometry(0.38, 0.52, 32);
      ringGeo.rotateX(-Math.PI / 2);
      this.walkRing = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
      );
      this.walkRing.position.y = 0.05;
      this.scene.add(this.walkRing);

      this.raycaster = new THREE.Raycaster();
      this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

      this.currentZone = 'garden';
      this.lightingDimmed = false;
      this.hemiLight = null;
      this.mainDirLight = null;

      // 루프탑 사계절·날씨 실사 배경 상태 ('auto' | 'spring' | 'summer' | 'autumn' | 'winter' | 'rain' | 'night')
      this.rooftopSeasonMode = 'auto';
      this.oceanMesh = null;
      this.weatherSystem = null;

      this.cameraMode = 'follow';
      this.camYaw = 0;
      this.camPitch = 0.28;
      this.camDist = 7.4;
      this.panoYaw = 0;
      this.panoPitch = 0.28;
      this.panoDist = 32;

      this.keys = {};
      this.joyVec = { x: 0, y: 0 };
      this.interactables = [];
      this.portals = [];
      this.candleGroup = null;
      this.nearestInteractable = null;

      this.avatars = new Map();
      this.myId = 'me';
      this.walkTarget = null;
      this.clock = new THREE.Clock();
      this.lastBroadcastAt = 0;

      this._setupInput();
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    getPresets() {
      return AVATAR_PRESETS.slice(0, 8);
    }

    resolveAvatarConfig(presetId, rawCfg) {
      return resolveAvatarConfig(presetId, rawCfg);
    }

    buildPreviewRig(presetId, rawCfg) {
      return buildStylizedAvatarRig(presetId, rawCfg, '');
    }

    getZoneMeta(zoneId) {
      return ZONE_META[zoneId] || ZONE_META.garden;
    }

    markBoardDirty() {
      if (this.boardTexture) this.boardTexture.needsUpdate = true;
    }

    toggleLightingMood() {
      this.lightingDimmed = !this.lightingDimmed;
      this._applyLightingMood();
      return this.lightingDimmed;
    }

    _applyLightingMood() {
      const resolvedRoof = this.getResolvedRooftopSeason();
      const isOutdoorNight = this.currentZone === 'garden' || (this.currentZone === 'rooftop' && resolvedRoof === 'night');
      if (this.lightingDimmed) {
        this.renderer.toneMappingExposure = 0.72;
        if (this.hemiLight) this.hemiLight.intensity = isOutdoorNight ? 0.38 : 0.42;
        if (this.mainDirLight) this.mainDirLight.intensity = 0.32;
      } else {
        // 과노출(화이트아웃) 없이 CAD 가구·천장 단차·벽면 줄눈·산바다 원경이 선명하게 살아나는 최적 노출값
        this.renderer.toneMappingExposure = this.currentZone === 'rooftop' && resolvedRoof === 'winter' ? 0.94 : 0.98;
        if (this.hemiLight) this.hemiLight.intensity = isOutdoorNight ? 0.62 : 0.74;
        if (this.mainDirLight) this.mainDirLight.intensity = isOutdoorNight ? 0.72 : 0.82;
      }
    }

    getResolvedRooftopSeason() {
      if (this.rooftopSeasonMode && this.rooftopSeasonMode !== 'auto') {
        return this.rooftopSeasonMode;
      }
      const m = new Date().getMonth() + 1; // 1..12
      if (m >= 3 && m <= 5) return 'spring';
      if (m >= 6 && m <= 8) return 'summer';
      if (m >= 9 && m <= 11) return 'autumn';
      return 'winter';
    }

    setRooftopSeason(mode) {
      this.rooftopSeasonMode = mode || 'auto';
      if (this.currentZone === 'rooftop') {
        const me = this.avatars.get(this.myId);
        const keepPos = me ? { x: me.x, z: me.z, rotY: me.rotY } : undefined;
        this.loadZone('rooftop', { spawn: keepPos, preserveCamera: true });
      }
      return this.getResolvedRooftopSeason();
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const w = Math.max(280, rect.width);
      const h = Math.max(260, rect.height);
      this.viewW = w;
      this.viewH = h;
      this.camera.aspect = w / h;
      this.camera.fov = w < h ? 68 : 56;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    }

    setCameraMode(mode) {
      this.cameraMode = mode;
      if (mode === 'panorama') {
        const meta = this.getZoneMeta(this.currentZone);
        const [px, py, pz] = meta.panorama.pos;
        const [lx, ly, lz] = meta.panorama.look;
        const dx = px - lx, dy = py - ly, dz = pz - lz;
        this.panoDist = Math.hypot(dx, dy, dz);
        this.panoYaw = Math.atan2(dx, dz);
        this.panoPitch = Math.asin(Math.max(0.08, Math.min(0.75, dy / this.panoDist)));
      }
    }

    zoomBy(delta) {
      if (this.cameraMode === 'panorama') {
        this.panoDist = Math.max(10, Math.min(54, this.panoDist + delta * 1.8));
      } else {
        this.camDist = Math.max(4.0, Math.min(16, this.camDist + delta));
      }
    }

    setJoystick(jx, jy) {
      this.joyVec.x = jx;
      this.joyVec.y = jy;
    }

    // 실내 방향(+법선)으로만 보이는 단방향 CAD 벽체 생성기 ➔ 벽 뒤에서 카메라가 볼 때 100% 자동 투명화!
    _addInwardWall(width, height, x, y, z, rotY, material) {
      let mat = material;
      if (mat.side !== THREE.FrontSide) {
        mat = material.clone();
        mat.side = THREE.FrontSide;
      }
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
      wall.position.set(x, y, z);
      wall.rotation.y = rotY;
      wall.receiveShadow = true;
      this.roomGroup.add(wall);
      return wall;
    }

    // 4면 실내 모던 벽체 일괄 시공 헬퍼 (모든 벽이 방 안쪽을 향하는 FrontSide 평면이라 어느 각도에서도 카메라를 가리지 않음!)
    _addFourInwardRoomWalls(width, depth, height, zCenter, frontMat, sideMat, backMat) {
      const halfW = width / 2;
      const halfD = depth / 2;
      this._addInwardWall(width, height, 0, height / 2, zCenter - halfD, 0, frontMat);
      this._addInwardWall(width, height, 0, height / 2, zCenter + halfD, Math.PI, backMat || sideMat);
      this._addInwardWall(depth, height, -halfW, height / 2, zCenter, Math.PI / 2, sideMat);
      this._addInwardWall(depth, height, halfW, height / 2, zCenter, -Math.PI / 2, sideMat);
    }

    // -----------------------------------------------------------------------
    // PBR 스타일리시 아바타 생성 (7.5등신 슬림 체형 & 귀여운 캐주얼 체형 모두 지원)
    // -----------------------------------------------------------------------
    createAvatar(id, info) {
      if (this.avatars.has(id)) {
        this.updateAvatarInfo(id, info);
        return this.avatars.get(id);
      }

      const root = new THREE.Group();
      const bodyPivot = new THREE.Group();
      root.add(bodyPivot);

      let myRing = null;
      if (info.isMe) {
        const rg = new THREE.RingGeometry(0.46, 0.56, 32);
        rg.rotateX(-Math.PI / 2);
        myRing = new THREE.Mesh(
          rg,
          new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        );
        myRing.position.y = 0.03;
        root.add(myRing);
      }

      const presetId = info.presetId || 'webtoon_boy';
      const built = buildStylizedAvatarRig(presetId, info.avatarConfig, info.drink || '');
      bodyPivot.add(built.rigGroup);

      const labelEl = document.createElement('div');
      labelEl.className = 'pointer-events-none absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-1 z-10';
      labelEl.innerHTML = `
        <div class="av-cam-wrap hidden w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 ${
          info.isMe ? 'border-amber-400' : 'border-emerald-400'
        } shadow-2xl bg-slate-950 mb-0.5">
          <video autoplay playsinline muted class="av-cam-video w-full h-full object-cover"></video>
        </div>
        <div class="av-bubble hidden px-2.5 py-1 rounded-xl bg-white/95 text-slate-900 border border-amber-400 text-[11px] font-bold shadow-lg max-w-[210px] text-center break-keep"></div>
        <div class="av-tag ${
          info.isMe
            ? 'px-2.5 py-0.5 text-[11px] bg-amber-400 text-slate-950 font-extrabold'
            : info.isNpc
              ? 'px-2 py-0.5 text-[10px] bg-slate-950/75 text-slate-100 border border-white/15 font-bold'
              : 'px-2.5 py-0.5 text-[11px] bg-emerald-500/90 text-slate-950 font-extrabold'
        } rounded-full whitespace-nowrap shadow"></div>
      `;
      this.overlayContainer.appendChild(labelEl);

      const av = {
        id,
        name: info.name || '성도',
        isMe: !!info.isMe,
        isNpc: !!info.isNpc,
        presetId,
        avatarConfig: built.cfg,
        configSig: avatarConfigSignature(presetId, info.avatarConfig),
        pose: info.pose || 'stand',
        drink: info.drink || '',
        sipTimer: 0,
        micWave: false,
        root,
        bodyPivot,
        rigGroup: built.rigGroup,
        headGroup: built.headGroup,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        cupGroup: built.cupGroup,
        faceDecalMat: built.faceDecalMat,
        openFaceTex: built.openFaceTex,
        blinkFaceTex: built.blinkFaceTex,
        blinkOffset: Math.random() * 4.5,
        heightTop: built.heightTop,
        myRing,
        labelEl,
        camWrapEl: labelEl.querySelector('.av-cam-wrap'),
        camVideoEl: labelEl.querySelector('.av-cam-video'),
        camStream: null,
        camMirror: !!info.isMe,
        tagEl: labelEl.querySelector('.av-tag'),
        bubbleEl: labelEl.querySelector('.av-bubble'),
        bubbleTimer: 0,
        x: info.x ?? 0,
        y: info.y ?? 0,
        z: info.z ?? 16,
        rotY: info.rotY ?? Math.PI,
        tx: info.x ?? 0,
        ty: info.y ?? 0,
        tz: info.z ?? 16,
        tRotY: info.rotY ?? Math.PI,
        walkPhase: 0
      };

      root.position.set(av.x, av.y, av.z);
      root.rotation.y = av.rotY;
      this.avatarGroup.add(root);
      this.avatars.set(id, av);
      this._refreshTagText(av);
      if (info.bubble) this.showBubble(id, info.bubble, 4.5);
      return av;
    }

    _refreshTagText(av) {
      const prefix = av.isMe ? (av.micWave ? '🎙️ ' : '★ ') : av.isNpc ? '' : '🟢 ';
      const drinkIcon = av.drink === 'coffee' ? ' ☕' : av.drink === 'water' ? ' 💧' : '';
      av.tagEl.textContent = `${prefix}${av.name}${drinkIcon}`;
    }

    updateAvatarInfo(id, info) {
      const av = this.avatars.get(id);
      if (!av) return;
      if (info.name) av.name = info.name;

      const nextPreset = info.presetId || av.presetId;
      const nextCfgInput = info.avatarConfig !== undefined ? info.avatarConfig : av.avatarConfig;
      const nextSig = avatarConfigSignature(nextPreset, nextCfgInput);

      if (nextSig !== av.configSig) {
        if (av.rigGroup) av.bodyPivot.remove(av.rigGroup);
        const built = buildStylizedAvatarRig(nextPreset, nextCfgInput, info.drink !== undefined ? info.drink : av.drink);
        av.bodyPivot.add(built.rigGroup);
        av.presetId = nextPreset;
        av.avatarConfig = built.cfg;
        av.configSig = nextSig;
        av.rigGroup = built.rigGroup;
        av.headGroup = built.headGroup;
        av.leftLeg = built.leftLeg;
        av.rightLeg = built.rightLeg;
        av.leftArm = built.leftArm;
        av.rightArm = built.rightArm;
        av.cupGroup = built.cupGroup;
        av.faceDecalMat = built.faceDecalMat;
        av.openFaceTex = built.openFaceTex;
        av.blinkFaceTex = built.blinkFaceTex;
        av.heightTop = built.heightTop;
      }

      if (typeof info.x === 'number') av.tx = info.x;
      if (typeof info.y === 'number') av.ty = info.y;
      if (typeof info.z === 'number') av.tz = info.z;
      if (typeof info.rotY === 'number') av.tRotY = info.rotY;
      if (info.pose) av.pose = info.pose;
      if (info.drink !== undefined) {
        av.drink = info.drink;
        if (av.cupGroup) av.cupGroup.visible = !!av.drink;
      }
      if (info.micWave !== undefined) av.micWave = info.micWave;
      this._refreshTagText(av);
    }

    removeAvatar(id) {
      const av = this.avatars.get(id);
      if (!av) return;
      this.avatarGroup.remove(av.root);
      av.labelEl.remove();
      this.avatars.delete(id);
    }

    clearRemoteAvatars(keepNpcs = false) {
      for (const [id, av] of Array.from(this.avatars.entries())) {
        if (av.isMe) continue;
        if (keepNpcs && av.isNpc) continue;
        this.removeAvatar(id);
      }
    }

    showBubble(id, text, seconds = 5) {
      const av = this.avatars.get(id);
      if (!av || !text) return;
      av.bubbleEl.textContent = text;
      av.bubbleEl.classList.remove('hidden');
      av.bubbleTimer = seconds;
    }

    // 3D 아바타 머리 위 실시간 동그란 얼굴 카메라 버블 연결/해제
    setAvatarVideoStream(id, stream, isMirror = false) {
      const av = this.avatars.get(id);
      if (!av || !av.camWrapEl || !av.camVideoEl) return;
      av.camStream = stream || null;
      av.camMirror = isMirror;
      if (stream) {
        av.camVideoEl.style.transform = isMirror ? 'scaleX(-1)' : 'none';
        if (av.camVideoEl.srcObject !== stream) {
          av.camVideoEl.srcObject = stream;
        }
        av.camVideoEl.play().catch(() => {});
        av.camWrapEl.classList.remove('hidden');
      } else {
        av.camVideoEl.srcObject = null;
        av.camWrapEl.classList.add('hidden');
      }
    }

    triggerSip(id) {
      const av = this.avatars.get(id);
      if (av) av.sipTimer = 1.6;
    }

    sitOrPoseMe(pose, x, y, z, rotY) {
      const me = this.avatars.get(this.myId);
      if (!me) return;
      this.walkTarget = null;
      this.walkRing.material.opacity = 0;
      me.pose = pose;
      if (typeof x === 'number') {
        me.x = me.tx = x;
        me.y = me.ty = y || 0;
        me.z = me.tz = z;
      }
      if (typeof rotY === 'number') {
        me.rotY = me.tRotY = rotY;
      }
      this._broadcastMyMove(true);
    }

    // -----------------------------------------------------------------------
    // 7개 현대식 CAD 실사 인테리어 공간 로더
    // -----------------------------------------------------------------------
    loadZone(zoneId, opts = {}) {
      const meta = this.getZoneMeta(zoneId);
      this.currentZone = meta.id;
      this.walkTarget = null;
      this.walkRing.material.opacity = 0;
      this.interactables = [];
      this.portals = [];
      this.boardMesh = null;
      this.candleGroup = null;
      this.oceanMesh = null;
      this.weatherSystem = null;

      while (this.roomGroup.children.length > 0) {
        this.roomGroup.remove(this.roomGroup.children[0]);
      }

      this.scene.background = new THREE.Color(meta.sky);
      this.scene.fog = new THREE.FogExp2(meta.fogColor, meta.fogDensity);

      this.hemiLight = new THREE.HemisphereLight(0xfff8ec, 0x6b6257, 0.72);
      this.roomGroup.add(this.hemiLight);

      this.mainDirLight = new THREE.DirectionalLight(0xfff2db, 0.78);
      this.mainDirLight.position.set(12, 26, 16);
      this.mainDirLight.castShadow = true;
      this.mainDirLight.shadow.mapSize.width = 1024;
      this.mainDirLight.shadow.mapSize.height = 1024;
      this.mainDirLight.shadow.camera.near = 2;
      this.mainDirLight.shadow.camera.far = 85;
      this.mainDirLight.shadow.camera.left = -36;
      this.mainDirLight.shadow.camera.right = 36;
      this.mainDirLight.shadow.camera.top = 36;
      this.mainDirLight.shadow.camera.bottom = -36;
      this.mainDirLight.shadow.bias = -0.0008;
      this.roomGroup.add(this.mainDirLight);

      this._applyLightingMood();

      if (meta.id === 'garden') this._buildGarden();
      else if (meta.id === 'sanctuary') this._buildSanctuary(opts.candles || []);
      else if (meta.id === 'sarangbang') this._buildSarangbang(opts.sarangbangName || '사랑방');
      else if (meta.id === 'bible') this._buildBibleRoom();
      else if (meta.id === 'qt') this._buildQtRoom();
      else if (meta.id === 'prayer') this._buildPrayerGallery();
      else if (meta.id === 'rooftop') this._buildRooftop();

      if (meta.hasBoard) {
        const [bx, by, bz] = meta.boardPos;
        const [bw, bh] = meta.boardSize;
        const bRotY = meta.boardRotY || 0;

        const boardGrp = new THREE.Group();
        boardGrp.position.set(bx, by, bz);
        boardGrp.rotation.y = bRotY;

        const bezel = new THREE.Mesh(
          new THREE.PlaneGeometry(bw + 0.28, bh + 0.28),
          this.pbr.darkSteelMaterial()
        );
        bezel.position.set(0, 0, -0.02);
        boardGrp.add(bezel);

        this.boardMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(bw, bh),
          new THREE.MeshBasicMaterial({ map: this.boardTexture })
        );
        boardGrp.add(this.boardMesh);
        this.roomGroup.add(boardGrp);

        const frontOffX = Math.sin(bRotY) * 4.2;
        const frontOffZ = Math.cos(bRotY) * 4.2;
        this.interactables.push({
          id: 'room-board',
          type: 'board',
          label: '👨‍🏫 칠판·PPT·화면공유 열기',
          x: bx + frontOffX,
          y: 0,
          z: bz + frontOffZ,
          radius: 5.0,
          mesh: this.boardMesh
        });
      }

      const me = this.avatars.get(this.myId);
      const sp = opts.spawn || meta.spawn;
      if (me) {
        if (!opts.preserveCamera) me.pose = 'stand';
        me.x = me.tx = sp.x;
        me.y = me.ty = 0;
        me.z = me.tz = sp.z;
        me.rotY = me.tRotY = sp.rotY ?? Math.PI;
        me.root.position.set(me.x, 0, me.z);
        me.root.rotation.y = me.rotY;
      }
      if (!opts.preserveCamera) {
        this.camYaw = 0;
        if (this.cameraMode === 'panorama') this.setCameraMode('panorama');
        else {
          // 방 입장 첫 프레임에 카메라 위치 즉시 정렬
          this.camera.position.set(sp.x, 3.8, sp.z + 7.2);
          this.camera.lookAt(sp.x, 2.1, sp.z);
        }
      }
      this._broadcastMyMove(true);
    }

    _makePlaqueTexture(title, sub = '', bg = '#27272a', accent = '#fde68a') {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 140;
      const g = c.getContext('2d');
      g.fillStyle = bg;
      g.fillRect(0, 0, 512, 140);
      g.strokeStyle = accent;
      g.lineWidth = 4;
      g.strokeRect(8, 8, 496, 124);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '700 34px "Apple SD Gothic Neo", sans-serif';
      g.fillText(title, 256, sub ? 54 : 70, 468);
      if (sub) {
        g.fillStyle = accent;
        g.font = '600 21px -apple-system, sans-serif';
        g.fillText(sub, 256, 98, 468);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
      return tex;
    }

    // 실내 방향 단방향(FrontSide) 모던 유리·오크 도어 (뒤에서 카메라가 볼 때 시야를 가리지 않음!)
    _addPortalDoor(x, z, rotY, targetZone, title, sub = '') {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);
      grp.rotation.y = rotY;

      const darkFrame = this.pbr.darkSteelMaterial().clone();
      darkFrame.side = THREE.FrontSide;
      const oak = this.pbr.woodPlankMaterial('door_mod_oak', [196, 162, 120], [152, 120, 82], 1, 2, 0.32).clone();
      oak.side = THREE.FrontSide;
      const glass = this.pbr.glassMaterial(0.38, 0xe0f2fe);

      const framePlane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.4), darkFrame);
      framePlane.position.y = 2.2;

      [-0.78, 0.78].forEach((dx) => {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 4.18), oak);
        leaf.position.set(dx, 2.1, 0.02);
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 3.35), glass);
        pane.position.set(dx, 2.2, 0.03);
        grp.add(leaf, pane);
      });

      const signMat = new THREE.MeshStandardMaterial({
        map: this._makePlaqueTexture(title, sub),
        roughness: 0.35,
        side: THREE.FrontSide
      });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.86), signMat);
      sign.position.set(0, 4.92, 0.04);

      grp.add(framePlane, sign);
      this.roomGroup.add(grp);

      const frontX = x + Math.sin(rotY) * 1.45;
      const frontZ = z + Math.cos(rotY) * 1.45;
      const item = {
        id: 'portal-' + targetZone + '-' + x + '-' + z,
        type: 'portal',
        targetZone,
        label: `🚪 ${title} 입장`,
        x: frontX,
        y: 0,
        z: frontZ,
        radius: 2.3,
        mesh: framePlane
      };
      this.portals.push(item);
      this.interactables.push(item);
    }

    _addFurnitureSeat(id, x, y, z, rotY, width, label, style = 'pew') {
      let grp;
      if (style === 'sofa') grp = this.pbr.createLoungeSofa(width);
      else if (style === 'chair') grp = this.pbr.createModernChair();
      else grp = this.pbr.createRealisticPew(width);

      grp.position.set(x, y, z);
      grp.rotation.y = rotY;
      this.roomGroup.add(grp);

      const targetMesh = grp.children[0];
      const offsets = width >= 3.2 && style !== 'chair' ? [-width * 0.26, width * 0.26] : [0];
      offsets.forEach((ox, idx) => {
        const sx = x + Math.cos(rotY) * ox;
        const sz = z - Math.sin(rotY) * ox;
        this.interactables.push({
          id: `${id}_${idx}`,
          type: 'seat',
          label: label || '🪑 착석하기',
          x: sx,
          y,
          z: sz,
          rotY,
          radius: 1.85,
          mesh: targetMesh
        });
      });
    }

    _addModernBollardLight(x, z, height = 1.15) {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, height, 14), this.pbr.darkSteelMaterial());
      body.position.y = height / 2;
      body.castShadow = true;
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.095, 0.22, 14),
        new THREE.MeshBasicMaterial({ color: 0xfffbeb })
      );
      lens.position.y = height - 0.16;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 14), this.pbr.darkSteelMaterial());
      cap.position.y = height;
      grp.add(body, lens, cap);
      this.roomGroup.add(grp);
    }

    // =======================================================================
    // 1) 🏛️ 그레이스 대성전 — 참조 CAD 사진 재현 (FrontSide 벽체로 시야 가림 0%)
    // =======================================================================
    _buildSanctuary(candles) {
      const carpetGrey = this.pbr.carpetTileMaterial(18, 18, [72, 74, 78]);
      const redAisleMat = this.pbr.fabricMaterial('cad_red_aisle', [132, 24, 34], 2, 12);
      const ivoryStageMat = this.pbr.marbleMaterial('ivory_stage', [236, 228, 214], [204, 194, 178], 6, 2, 0.24);
      const frontOakSlat = this.pbr.acousticSlatMaterial(8, 2, true);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(66, 58), carpetGrey);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      // 좌·중·우 3열 개별 의자 구역을 나누는 2줄의 주 복도 & 전·후면 가로 레드카펫 복도
      [-9.6, 9.6].forEach((ax) => {
        const mainAisle = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.022, 39.5), redAisleMat);
        mainAisle.position.set(ax, 0.021, 6.2);
        mainAisle.receiveShadow = true;
        this.roomGroup.add(mainAisle);
      });
      const rearCrossAisle = new THREE.Mesh(new THREE.BoxGeometry(52, 0.021, 2.6), redAisleMat);
      rearCrossAisle.position.set(0, 0.020, 24.8);
      rearCrossAisle.receiveShadow = true;
      const frontCrossAisle = new THREE.Mesh(new THREE.BoxGeometry(48, 0.021, 1.8), redAisleMat);
      frontCrossAisle.position.set(0, 0.020, -12.6);
      frontCrossAisle.receiveShadow = true;
      this.roomGroup.add(rearCrossAisle, frontCrossAisle);

      // 6단 동심원 곡선 우드 루버 천장 + 간접 코브(Cove) 조명 + 매립 타공 다운라이트
      const ceilSlat = this.pbr.ceilingFineSlatMaterial(18, 5);
      const soffitMat = new THREE.MeshStandardMaterial({ color: 0xf4ece0, emissive: 0xffecc0, emissiveIntensity: 0.38, roughness: 0.5 });
      const coveStripMat = new THREE.MeshBasicMaterial({ color: 0xfffdf5 });
      const coveBloomMat = new THREE.MeshBasicMaterial({
        map: this.pbr.coveGlowTex,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide
      });

      const stepRadii = [0, 15, 23.5, 32, 40.5, 49, 62];
      const baseCeilY = 12.0;

      for (let i = 0; i < stepRadii.length - 1; i++) {
        const rIn = stepRadii[i];
        const rOut = stepRadii[i + 1];
        const cy = baseCeilY + i * 0.44;

        const ringGeo = new THREE.RingGeometry(rIn, rOut + 0.2, 60, 1, 0, Math.PI * 2);
        ringGeo.rotateX(Math.PI / 2);
        const ceilBand = new THREE.Mesh(ringGeo, ceilSlat);
        ceilBand.position.set(0, cy, -21);
        this.roomGroup.add(ceilBand);

        if (i > 0) {
          const riserGeo = new THREE.CylinderGeometry(rIn, rIn, 0.46, 60, 1, true);
          const riser = new THREE.Mesh(riserGeo, soffitMat);
          riser.position.set(0, cy - 0.22, -21);
          this.roomGroup.add(riser);

          const ledGeo = new THREE.TorusGeometry(rIn + 0.08, 0.06, 8, 60);
          ledGeo.rotateX(Math.PI / 2);
          const led = new THREE.Mesh(ledGeo, coveStripMat);
          led.position.set(0, cy - 0.06, -21);
          this.roomGroup.add(led);

          const bloomGeo = new THREE.RingGeometry(rIn, rIn + 3.2, 60);
          bloomGeo.rotateX(Math.PI / 2);
          const bloom = new THREE.Mesh(bloomGeo, coveBloomMat);
          bloom.position.set(0, cy - 0.02, -21);
          this.roomGroup.add(bloom);

          const rMid = (rIn + rOut) * 0.5;
          if (rMid < 52) {
            const count = 7 + i * 2;
            for (let d = 0; d < count; d++) {
              const a = -0.78 + (d / (count - 1)) * 1.56;
              const dx = Math.sin(a) * rMid;
              const dz = -21 + Math.cos(a) * rMid;
              if (Math.abs(dx) < 29 && dz < 28 && dz > -22) {
                const dl = this.pbr.createRecessedDownlight(0.28);
                dl.position.set(dx, cy - 0.015, dz);
                this.roomGroup.add(dl);
              }
            }
          }
        }
      }

      // 양쪽 벽면: 실내 쪽만 보이는 단방향(FrontSide) 톱니형 단차 패널 + 수직 매립 간접조명(Wall-Wash)
      const wallWashL = this.pbr.wallWashPanelMaterial('sand', true);
      const wallWashR = this.pbr.wallWashPanelMaterial('sand', false);
      const wallGlowMat = new THREE.MeshBasicMaterial({
        map: this.pbr.coveGlowTex,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide
      });

      [-1, 1].forEach((side) => {
        const bays = 7;
        for (let b = 0; b < bays; b++) {
          const bz = -19 + b * 7.4;
          const bx = side * (29.2 + b * 0.35);
          const inwardRotY = side < 0 ? Math.PI / 2 - 0.08 : -Math.PI / 2 + 0.08;

          this._addInwardWall(7.75, 14.8, bx, 7.4, bz, inwardRotY, side < 0 ? wallWashL : wallWashR);

          const ledX = bx - side * 0.16;
          const ledZ = bz - 3.65;
          const vLed = new THREE.Mesh(new THREE.BoxGeometry(0.08, 14.2, 0.08), coveStripMat);
          vLed.position.set(ledX, 7.1, ledZ);
          this.roomGroup.add(vLed);

          const washPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 14.2), wallGlowMat);
          washPlane.position.set(bx - side * 0.08, 7.1, ledZ + 1.0);
          washPlane.rotation.y = inwardRotY;
          washPlane.rotation.z = side < 0 ? -Math.PI / 2 : Math.PI / 2;
          this.roomGroup.add(washPlane);
        }
      });

      // 후면 마감 벽체 (실내 -Z 방향 FrontSide — 입장 카메라가 뒤에 있을 때 절대 시야를 가리지 않음!)
      this._addInwardWall(66, 15, 0, 7.5, 28.8, Math.PI, wallWashL);

      // 정면 오크 루버 백월 + 상부 다크 어쿠스틱 반사 캐노피
      this._addInwardWall(27.5, 13.5, 0, 6.75, -22.9, 0, frontOakSlat);
      const stageCanopy = new THREE.Mesh(new THREE.BoxGeometry(27.5, 0.65, 3.0), this.pbr.darkSteelMaterial());
      stageCanopy.position.set(0, 11.4, -21.5);
      this.roomGroup.add(stageCanopy);

      // 우측 순백색 전면 발광 십자가 니치 월 & 슬림 다크브론즈 십자가
      const whiteLuminousMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfffaf0,
        emissiveIntensity: 0.55,
        roughness: 0.25,
        side: THREE.FrontSide
      });
      this._addInwardWall(9.2, 12.2, 18.6, 6.1, -22.3, -0.14, whiteLuminousMat);

      const crossGroup = new THREE.Group();
      crossGroup.position.set(18.5, 7.2, -22.15);
      crossGroup.rotation.y = -0.14;
      const darkBronze = new THREE.MeshStandardMaterial({ color: 0x29201b, roughness: 0.35, metalness: 0.6 });
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.6, 0.10), darkBronze);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.10), darkBronze);
      ch.position.y = 0.95;
      crossGroup.add(cv, ch);
      this.roomGroup.add(crossGroup);

      // 좌측 화이트 백라이트 패널 + 보조 서브 스크린
      this._addInwardWall(7.6, 12.2, -17.8, 6.1, -22.3, 0.14, whiteLuminousMat);
      const subBezel = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.7), this.pbr.darkSteelMaterial());
      subBezel.position.set(-17.75, 7.4, -22.15);
      subBezel.rotation.y = 0.14;
      const subScreen = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.5), new THREE.MeshBasicMaterial({ map: this.boardTexture }));
      subScreen.position.set(-17.73, 7.4, -22.12);
      subScreen.rotation.y = 0.14;
      this.roomGroup.add(subBezel, subScreen);

      // 와이드 아이보리 대리석 성단 + 전면 스피커 슬롯
      const mainStage = new THREE.Mesh(new THREE.BoxGeometry(46, 0.92, 7.4), ivoryStageMat);
      mainStage.position.set(2, 0.46, -19.2);
      mainStage.receiveShadow = true;
      this.roomGroup.add(mainStage);

      for (let sx = -14; sx <= 16; sx += 5) {
        const speakerSlot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.36, 0.08), this.pbr.darkSteelMaterial());
        speakerSlot.position.set(sx, 0.46, -15.48);
        this.roomGroup.add(speakerSlot);
      }

      const pulpit = this.pbr.createModernPulpit();
      pulpit.position.set(0, 0.92, -16.4);
      const subPulpit = this.pbr.createModernPulpit();
      subPulpit.scale.set(0.82, 0.88, 0.82);
      subPulpit.position.set(8.5, 0.92, -16.8);
      const piano = this.pbr.createGrandPiano();
      piano.position.set(-10.5, 0.92, -17.6);
      piano.rotation.y = 0.45;
      const palmPlant = this.pbr.createPottedPlant(1.55);
      palmPlant.position.set(24.8, 0, -17.2);
      this.roomGroup.add(pulpit, subPulpit, piano, palmPlant);

      // 성단 앞 벨벳 무릎기도 레일 & 기도 등불 봉헌대
      const kneelCushion = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.16, 1.0), redAisleMat);
      kneelCushion.position.set(0, 0.08, -13.6);
      kneelCushion.receiveShadow = true;
      this.roomGroup.add(kneelCushion);

      [-2.2, 0, 2.2].forEach((kx, idx) => {
        this.interactables.push({
          id: `altar_kneel_${idx}`,
          type: 'kneel',
          label: '🧎 성단 앞 무릎 꿇고 기도하기',
          x: kx,
          y: 0,
          z: -13.6,
          rotY: Math.PI,
          radius: 2.0,
          mesh: kneelCushion
        });
      });

      const candleBar = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.72, 0.8), ivoryStageMat);
      candleBar.position.set(-11.5, 0.36, -14.2);
      this.roomGroup.add(candleBar);
      this.interactables.push({
        id: 'candle-altar',
        type: 'candle_altar',
        label: '🕯️ 중보기도 등불 밝히기',
        x: -11.5,
        y: 0,
        z: -12.9,
        radius: 2.4,
        mesh: candleBar
      });

      this.candleGroup = new THREE.Group();
      this.roomGroup.add(this.candleGroup);
      this.updateCandles(candles);

      // 좌측열 · 중앙열 · 우측열 3열 구역으로 본당을 빈틈없이 가득 채운 1인용 개별 예배 의자 (11줄 × 39석 = 총 429석!)
      const sectionSpecs = [
        { key: 'left',   name: '좌측열', centerX: -18.2, yaw: Math.PI - 0.14, count: 12 },
        { key: 'center', name: '중앙열', centerX: 0.0,   yaw: Math.PI,        count: 15 },
        { key: 'right',  name: '우측열', centerX: 18.2,  yaw: Math.PI + 0.14, count: 12 }
      ];
      const chairSpacing = 0.74;

      for (let rIdx = 0; rIdx < 11; rIdx++) {
        const rz = -10.0 + rIdx * 2.92; // -10.0m(1줄 맨앞) ~ +19.2m(11줄 뒷자리)까지 본당 가득 채움
        sectionSpecs.forEach((sec) => {
          const rowGrp = this.pbr.createSanctuaryChairRow(sec.count, chairSpacing);
          rowGrp.position.set(sec.centerX, 0, rz);
          rowGrp.rotation.y = sec.yaw;
          this.roomGroup.add(rowGrp);

          // 각 줄의 개별 의자들 중 대표 좌석들에 착석 상호작용 연결 (어느 구역·어느 줄이든 착석 가능)
          const startLocalX = -((sec.count - 1) * chairSpacing) / 2;
          for (let cIdx = 0; cIdx < sec.count; cIdx += 2) {
            const localX = startLocalX + cIdx * chairSpacing;
            const wx = sec.centerX + Math.cos(sec.yaw) * localX;
            const wz = rz - Math.sin(sec.yaw) * localX;
            const chairObj = rowGrp.children[cIdx];
            const seatMesh = chairObj && chairObj.children ? chairObj.children[1] : null;
            this.interactables.push({
              id: `chair_${sec.key}_${rIdx}_${cIdx}`,
              type: 'seat',
              label: `🪑 ${sec.name} ${rIdx + 1}줄 개별의자 착석`,
              x: wx,
              y: 0,
              z: wz,
              rotY: sec.yaw,
              radius: 1.45,
              mesh: seatMesh
            });
          }
        });
      }

      const stageLight = new THREE.PointLight(0xfff4de, 0.65, 38);
      stageLight.position.set(0, 10.5, -14);
      this.roomGroup.add(stageLight);

      this._addPortalDoor(-9.5, 28.6, Math.PI, 'garden', '🌿 앞마당 광장', '야외 출구');
      this._addPortalDoor(9.5, 28.6, Math.PI, 'rooftop', '☕ 루프탑 카페', '옥상 라운지');
      this._addPortalDoor(-28.8, -6, Math.PI / 2, 'sarangbang', '🏠 사랑방 센터', '모던 소그룹실');
      this._addPortalDoor(-28.8, 8, Math.PI / 2, 'prayer', '🕯️ 기도·갤러리실', '성화·개인기도');
      this._addPortalDoor(28.8, -6, -Math.PI / 2, 'bible', '📖 성경통독방', '모던 북라운지');
      this._addPortalDoor(28.8, 8, -Math.PI / 2, 'qt', '✏️ 큐티방', '세미나·나눔실');
    }

    updateCandles(candles = []) {
      if (!this.candleGroup) return;
      while (this.candleGroup.children.length > 0) {
        this.candleGroup.remove(this.candleGroup.children[0]);
      }
      const glassMat = this.pbr.glassMaterial(0.55, 0xfef3c7);
      const count = Math.min(candles.length, 10);
      for (let i = 0; i < count; i++) {
        const ox = -15.0 + i * 0.76;
        const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.26, 12), glassMat);
        holder.position.set(ox, 0.86, -14.2);
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
        flame.scale.set(0.8, 1.5, 0.8);
        flame.position.set(ox, 1.02, -14.2);
        this.candleGroup.add(holder, flame);
      }
    }

    // =======================================================================
    // 2) 🏠 사랑방 — 현대식 모던 라운지 소그룹실 (FrontSide 벽체로 시야 가림 완전 해결!)
    // =======================================================================
    _buildSarangbang(roomTitle) {
      const lightOakFloor = this.pbr.woodPlankMaterial('mod_sarang_oak', [198, 166, 124], [158, 126, 86], 7, 7, 0.32);
      const wallWash = this.pbr.wallWashPanelMaterial('white', true);
      const oakSlat = this.pbr.acousticSlatMaterial(5, 1, true);
      const travertine = this.pbr.marbleMaterial('sarang_trav', [240, 235, 226], [204, 196, 182], 1, 1, 0.22);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 29), lightOakFloor);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      this.roomGroup.add(this.pbr.createModernRoomCeiling(32, 29, 8.8, 4, 4));

      const rug = new THREE.Mesh(new THREE.CircleGeometry(6.4, 40), this.pbr.modernRugMaterial());
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.02, 0.2);
      rug.receiveShadow = true;
      this.roomGroup.add(rug);

      // 4면 단방향(FrontSide) 벽체 ➔ 입장 즉시 소파·테이블·칠판이 100% 선명하게 보임!
      this._addFourInwardRoomWalls(31.6, 28.0, 8.8, 0.5, oakSlat, wallWash, wallWash);

      const signMat = new THREE.MeshStandardMaterial({
        map: this._makePlaqueTexture(`🏠 ${roomTitle}`, '모던 소그룹 교제 라운지'),
        roughness: 0.35,
        side: THREE.FrontSide
      });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.02), signMat);
      sign.position.set(0, 8.0, -13.42);
      this.roomGroup.add(sign);

      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.08, 32), travertine);
      tableTop.position.set(0, 0.58, 0.2);
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.54, 28), oakSlat);
      tableBase.position.set(0, 0.27, 0.2);
      const bibleProp = this.pbr.createOpenBibleProp();
      bibleProp.position.set(-0.4, 0.63, 0.2);
      this.roomGroup.add(tableTop, tableBase, bibleProp);

      this.interactables.push({
        id: 'sarang-switcher',
        type: 'sarang_menu',
        label: '🏠 다른 사랑방 선택 / +새 방 개설',
        x: 0,
        y: 0,
        z: 0.2,
        radius: 3.1,
        mesh: tableTop
      });

      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        if (Math.abs(Math.sin(ang)) < 0.36 && Math.cos(ang) < -0.7) continue;
        const sx = Math.sin(ang) * 4.8;
        const sz = 0.2 + Math.cos(ang) * 4.8;
        const faceCenter = Math.atan2(-sx, 0.2 - sz);
        this._addFurnitureSeat(`sofa_${i}`, sx, 0, sz, faceCenter, 2.3, '🛋️ 모듈형 라운지 소파 착석', 'sofa');
      }

      const shelf = this.pbr.createRealisticBookshelf(4.4, 6.0);
      shelf.position.set(-15.0, 0, -5);
      shelf.rotation.y = Math.PI / 2;
      this.roomGroup.add(shelf);

      [[-13.5, -10.5], [13.5, -10.5], [13.5, 10.5]].forEach(([px, pz]) => {
        const p = this.pbr.createPottedPlant(1.2);
        p.position.set(px, 0, pz);
        this.roomGroup.add(p);
      });

      this._addPortalDoor(-9.5, 14.4, Math.PI, 'sanctuary', '🏛️ 대성전 복귀', '');
      this._addPortalDoor(9.5, 14.4, Math.PI, 'qt', '✏️ 큐티방 이동', '');
    }

    // =======================================================================
    // 3) 📖 성경통독방 — 현대식 모던 북라운지
    // =======================================================================
    _buildBibleRoom() {
      const carpetMat = this.pbr.carpetTileMaterial(14, 14, [82, 85, 90]);
      const whiteWall = this.pbr.wallWashPanelMaterial('white', true);
      const oakSlat = this.pbr.acousticSlatMaterial(6, 1, true);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 33), carpetMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      this.roomGroup.add(this.pbr.createModernRoomCeiling(36, 33, 9.2, 4, 5));
      this._addFourInwardRoomWalls(35.0, 31.8, 9.2, 0.5, oakSlat, whiteWall, whiteWall);

      [-16.8, 16.8].forEach((wx) => {
        for (let z = -10.0; z <= 10.0; z += 6.8) {
          const bookcase = this.pbr.createRealisticBookshelf(5.6, 7.0);
          bookcase.position.set(wx, 0, z);
          bookcase.rotation.y = wx > 0 ? -Math.PI / 2 : Math.PI / 2;
          this.roomGroup.add(bookcase);
        }
      });

      const deskRows = [-5.2, 2.4];
      const deskCols = [-7.2, 0, 7.2];
      deskRows.forEach((dz, rIdx) => {
        deskCols.forEach((dx, cIdx) => {
          const desk = this.pbr.createModernStudyDesk(3.8);
          desk.position.set(dx, 0, dz);
          this.roomGroup.add(desk);

          this._addFurnitureSeat(`bdesk_${rIdx}_${cIdx}`, dx, 0, dz + 1.25, Math.PI, 1.0, '📖 모던 통독석에 앉아 성경 펴기', 'chair');
          this.interactables.push({
            id: `bible_open_${rIdx}_${cIdx}`,
            type: 'bible_desk',
            label: '📖 개역개정 성경 66권 펼치기',
            x: dx,
            y: 0,
            z: dz + 1.25,
            rotY: Math.PI,
            radius: 2.2,
            mesh: desk.children[0]
          });
        });
      });

      // 성경통독방 정면 우측: '예스통독' 공동체 통독 인증 현황판 스탠드
      const statusStand = new THREE.Group();
      statusStand.position.set(10.8, 0, -13.2);
      statusStand.rotation.y = -0.22;
      const standPostL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 3.6, 0.10), this.pbr.darkSteelMaterial());
      standPostL.position.set(-1.9, 1.8, 0);
      const standPostR = standPostL.clone();
      standPostR.position.x = 1.9;
      const standBoard = new THREE.Mesh(
        new THREE.BoxGeometry(4.0, 2.1, 0.12),
        new THREE.MeshStandardMaterial({
          map: this._makePlaqueTexture('🙌 예스통독 인증 게시판', '통독 참여 성도 & 읽은 분량 한눈에 보기', '#064e3b', '#fde047'),
          roughness: 0.35
        })
      );
      standBoard.position.set(0, 2.45, 0);
      statusStand.add(standPostL, standPostR, standBoard);
      this.roomGroup.add(statusStand);

      this.interactables.push({
        id: 'bible-yes-board',
        type: 'bible_board',
        label: '🙌 예스통독 인증 게시판 열기',
        x: 10.2,
        y: 0,
        z: -11.4,
        radius: 2.8,
        mesh: standBoard
      });

      this._addPortalDoor(-9.5, 16.3, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(9.5, 16.3, Math.PI, 'qt', '✏️ 큐티방 이동', '세미나·나눔실');
    }

    // =======================================================================
    // 4) ✏️ 큐티방 — 현대식 아카데미 & 세미나 홀
    // =======================================================================
    _buildQtRoom() {
      const lightOakFloor = this.pbr.woodPlankMaterial('qt_mod_floor', [202, 172, 132], [164, 134, 96], 8, 8, 0.32);
      const whiteWall = this.pbr.wallWashPanelMaterial('white', false);
      const oakSlat = this.pbr.acousticSlatMaterial(6, 1, true);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 33), lightOakFloor);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      this.roomGroup.add(this.pbr.createModernRoomCeiling(36, 33, 9.2, 5, 4));
      this._addFourInwardRoomWalls(35.0, 31.8, 9.2, 0.5, oakSlat, whiteWall, whiteWall);

      const podium = this.pbr.createModernPulpit();
      podium.position.set(-6.4, 0, -11.2);
      this.roomGroup.add(podium);

      this.interactables.push({
        id: 'qt-lectern',
        type: 'qt_academy',
        label: '📚 큐티 기초반 강의안 & 나눔 열기',
        x: -6.4,
        y: 0,
        z: -9.5,
        radius: 2.6,
        mesh: podium.children[0]
      });

      [-5.0, 1.4].forEach((dz, rIdx) => {
        [-6.4, 6.4].forEach((dx, cIdx) => {
          const semDesk = this.pbr.createModernStudyDesk(6.2);
          semDesk.position.set(dx, 0, dz);
          this.roomGroup.add(semDesk);

          [-1.6, 1.6].forEach((cxOff, sIdx) => {
            this._addFurnitureSeat(`qtchair_${rIdx}_${cIdx}_${sIdx}`, dx + cxOff, 0, dz + 1.25, Math.PI, 1.0, '✏️ 큐티 세미나석 착석', 'chair');
          });

          this.interactables.push({
            id: `qt_desk_${rIdx}_${cIdx}`,
            type: 'qt_academy',
            label: '📚 큐티 기초반 강의안 & 나눔 열기',
            x: dx,
            y: 0,
            z: dz + 1.25,
            rotY: Math.PI,
            radius: 2.6,
            mesh: semDesk.children[0]
          });
        });
      });

      [[-15.2, -12], [15.2, -12]].forEach(([px, pz]) => {
        const plant = this.pbr.createPottedPlant(1.3);
        plant.position.set(px, 0, pz);
        this.roomGroup.add(plant);
      });

      this._addPortalDoor(-11.2, 16.3, Math.PI, 'bible', '📖 성경통독방', '');
      this._addPortalDoor(-5.0, 16.3, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(11.2, 16.3, Math.PI, 'sarangbang', '🏠 사랑방 이동', '');
    }

    // =======================================================================
    // 5) 🕯️ 기도실 & 말씀갤러리 — 현대 화이트 뮤지엄 회랑 & 루버 개인기도부스
    // =======================================================================
    _buildPrayerGallery() {
      const limestoneFloor = this.pbr.marbleMaterial('gal_floor', [214, 208, 198], [182, 174, 162], 6, 6, 0.24);
      const museumWall = this.pbr.wallWashPanelMaterial('white', true);
      const oakSlat = this.pbr.acousticSlatMaterial(4, 1, true);
      const padMat = this.pbr.fabricMaterial('mod_kneel_pad', [148, 32, 46], 2, 2);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 36), limestoneFloor);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      this.roomGroup.add(this.pbr.createModernRoomCeiling(32, 36, 9.0, 3, 5));
      this._addFourInwardRoomWalls(31.0, 34.4, 9.0, 0.8, oakSlat, museumWall, museumWall);

      GALLERY_ARTWORKS.forEach((art, i) => {
        const isLeft = i < 3;
        const idx = i % 3;
        const az = -8.2 + idx * 8.6;
        const ax = isLeft ? -15.1 : 15.1;
        const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;

        const framed = this.pbr.createFramedSacredPainting(art, i);
        framed.position.set(ax, 4.3, az);
        framed.rotation.y = rotY;
        this.roomGroup.add(framed);

        this.interactables.push({
          id: `art_${i}`,
          type: 'artwork',
          label: `🖼️ '${art.title}' 해설 보기`,
          artwork: art,
          x: isLeft ? -12.4 : 12.4,
          y: 0,
          z: az,
          radius: 3.0,
          mesh: framed.children[1]
        });
      });

      [-6.0, -2.0, 2.0, 6.0].forEach((kx, idx) => {
        const divL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 2.2), oakSlat);
        divL.position.set(kx - 1.85, 1.25, -11.6);
        if (idx === 3) {
          const divR = divL.clone();
          divR.position.x = kx + 1.85;
          this.roomGroup.add(divR);
        }
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.07, 0.55), oakSlat);
        shelf.position.set(kx, 0.90, -12.4);
        const ledCross = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.04), new THREE.MeshBasicMaterial({ color: 0xfff8dc }));
        ledCross.position.set(kx, 1.65, -12.6);
        const ledCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0xfff8dc }));
        ledCrossH.position.set(kx, 1.76, -12.6);

        const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.9), padMat);
        cushion.position.set(kx, 0.07, -11.2);
        this.roomGroup.add(divL, shelf, ledCross, ledCrossH, cushion);

        this.interactables.push({
          id: `prayer_kneel_${idx}`,
          type: 'kneel',
          label: `🧎 ${idx + 1}번 모던 개인기도부스 무릎기도`,
          x: kx,
          y: 0,
          z: -11.2,
          rotY: Math.PI,
          radius: 1.85,
          mesh: cushion
        });
      });

      this._addPortalDoor(-7.5, 17.9, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(7.5, 17.9, Math.PI, 'bible', '📖 성경통독방', '');
    }

    // =======================================================================
    // 6) 🌿 앞마당 캠퍼스 광장 & 7) ☕ 루프탑 글래스 소미카페
    // =======================================================================
    _buildGarden() {
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(96, 96), this.pbr.grassMaterial(14, 14));
      grass.rotation.x = -Math.PI / 2;
      grass.receiveShadow = true;
      this.roomGroup.add(grass);

      const granite = this.pbr.granitePaverMaterial(8, 12);
      const limestone = this.pbr.marbleMaterial('mod_ext_stone', [228, 222, 212], [196, 188, 176], 6, 3, 0.34);

      const mainPlaza = new THREE.Mesh(new THREE.BoxGeometry(13, 0.08, 62), granite);
      mainPlaza.position.set(0, 0.04, 5);
      mainPlaza.receiveShadow = true;
      const crossWalk = new THREE.Mesh(new THREE.BoxGeometry(58, 0.07, 8), granite);
      crossWalk.position.set(0, 0.035, 6);
      crossWalk.receiveShadow = true;
      this.roomGroup.add(mainPlaza, crossWalk);

      const poolBorder = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.42, 7.2), limestone);
      poolBorder.position.set(0, 0.21, 6);
      const water = new THREE.Mesh(
        new THREE.BoxGeometry(6.6, 0.38, 6.6),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.04, metalness: 0.2, envMap: this.pbr.envMap, envMapIntensity: 1.5, transparent: true, opacity: 0.82 })
      );
      water.position.set(0, 0.25, 6);
      this.roomGroup.add(poolBorder, water);

      for (let s = 0; s < 4; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(25 - s * 1.2, 0.22, 2.8), limestone);
        step.position.set(0, 0.11 + s * 0.16, -16.5 - s * 1.5);
        step.receiveShadow = true;
        this.roomGroup.add(step);
      }

      const facade = new THREE.Mesh(new THREE.BoxGeometry(36, 17.5, 3.2), limestone);
      facade.position.set(0, 8.75, -26.5);
      const curtainWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 13.2), this.pbr.glassMaterial(0.52, 0xbae6fd));
      curtainWall.position.set(0, 9.6, -24.85);
      this.roomGroup.add(facade, curtainWall);

      const crossMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.6, 0.28), crossMat);
      cv.position.set(0, 13.4, -24.6);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.42, 0.28), crossMat);
      ch.position.set(0, 14.2, -24.6);
      this.roomGroup.add(cv, ch);

      // 교회 정문 상단 대형 백라이트 입체 간판: 소미 앱 연동 교회명 (기본 '예수인교회')
      const churchDisplayName = (typeof window !== 'undefined' && window.SOMY_CHURCH_NAME) ? String(window.SOMY_CHURCH_NAME) : '예수인교회';
      const churchEnglishSub = churchDisplayName === '예수인교회' ? 'JESUS-IN CHURCH' : 'ONLINE 3D CHAPEL';
      const churchSignTex = (() => {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 220;
        const g = c.getContext('2d');
        g.fillStyle = '#18181b';
        g.fillRect(0, 0, 1024, 220);
        g.strokeStyle = '#fde68a';
        g.lineWidth = 6;
        g.strokeRect(10, 10, 1004, 200);
        g.fillStyle = '#ffffff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const fontPx = churchDisplayName.length > 7 ? 68 : 88;
        g.font = `800 ${fontPx}px "Apple SD Gothic Neo", "Pretendard", sans-serif`;
        g.fillText(churchDisplayName, 512, 92);
        g.fillStyle = '#fde68a';
        g.font = '700 32px -apple-system, sans-serif';
        g.fillText(churchEnglishSub, 512, 166);
        const t = new THREE.CanvasTexture(c);
        if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
        return t;
      })();

      const mainChurchSign = new THREE.Mesh(
        new THREE.BoxGeometry(10.8, 2.15, 0.24),
        new THREE.MeshStandardMaterial({
          map: churchSignTex,
          emissive: 0xffffff,
          emissiveMap: churchSignTex,
          emissiveIntensity: 0.35,
          roughness: 0.3
        })
      );
      mainChurchSign.position.set(0, 7.35, -24.55);
      this.roomGroup.add(mainChurchSign);

      // 앞마당 진입로 우측 화강암 교회 입구 표지석(모뉴먼트)
      const monumentBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.38, 1.1), granite);
      monumentBase.position.set(6.2, 0.19, 15.8);
      const monumentStone = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 1.65, 0.45),
        new THREE.MeshStandardMaterial({
          map: churchSignTex,
          roughness: 0.35
        })
      );
      monumentStone.position.set(6.2, 1.20, 15.8);
      this.roomGroup.add(monumentBase, monumentStone);

      this._addPortalDoor(0, -24.5, 0, 'sanctuary', `⛪ ${churchDisplayName}`, '대성전 본당 정문 입장');
      this._addPortalDoor(-25, 2, Math.PI / 2, 'sarangbang', '🏠 사랑방 센터', '모던 소그룹실');
      this._addPortalDoor(25, 2, -Math.PI / 2, 'bible', '📖 성경통독방', '모던 북라운지');
      this._addPortalDoor(25, 11, -Math.PI / 2, 'qt', '✏️ 큐티 아카데미', '세미나·나눔실');

      const cafeRoof = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.24, 5.2), limestone);
      cafeRoof.position.set(-14.5, 3.8, -9);
      const cafeGlass = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.6, 4.6), this.pbr.glassMaterial(0.28, 0xe0f2fe));
      cafeGlass.position.set(-14.5, 1.8, -9);
      const cafeCounter = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.08, 1.0), limestone);
      cafeCounter.position.set(-14.5, 0.54, -8.2);
      const cafeSign = new THREE.Mesh(
        new THREE.BoxGeometry(5.0, 0.85, 0.10),
        new THREE.MeshStandardMaterial({ map: this._makePlaqueTexture('☕ SOMY GLASS CAFE', '스페셜티 커피 나눔', '#18181b', '#34d399') })
      );
      cafeSign.position.set(-14.5, 4.35, -6.5);
      this.roomGroup.add(cafeRoof, cafeGlass, cafeCounter, cafeSign);

      this.interactables.push({
        id: 'garden-cafe',
        type: 'cafe',
        drinkType: 'coffee',
        label: '☕ 글래스 카페에서 커피 받기',
        x: -14.5,
        y: 0,
        z: -6.1,
        radius: 2.8,
        mesh: cafeCounter
      });

      this._addFurnitureSeat('gbench1', -8.8, 0, 13.5, Math.PI / 2, 3.4, '🪑 캠퍼스 벤치에 앉기', 'pew');
      this._addFurnitureSeat('gbench2', 8.8, 0, 13.5, -Math.PI / 2, 3.4, '🪑 캠퍼스 벤치에 앉기', 'pew');

      [[-6.8, 18], [6.8, 18], [-6.8, -6], [6.8, -6], [-16, 6], [16, 6]].forEach(([lx, lz]) => this._addModernBollardLight(lx, lz));
      [[-20, -15], [20, -15], [-21, 18], [21, 18]].forEach(([tx, tz]) => {
        const tree = this.pbr.createRealisticTree(1.15);
        tree.position.set(tx, 0, tz);
        this.roomGroup.add(tree);
      });
    }

    _buildRooftop() {
      const theme = this.getResolvedRooftopSeason();

      // 계절·날씨별 자연 채광 세팅 (원경 사진이 흐려지지 않도록 안개 밀도 최소화)
      const envConfigs = {
        spring: { fog: 0xdbeafe, density: 0.0004, sunColor: 0xfffbeb, sunPos: [-35, 36, -65], hemiSky: 0xe0f2fe, hemiGround: 0x6b7280 },
        summer: { fog: 0xbae6fd, density: 0.0004, sunColor: 0xffffff, sunPos: [15, 48, -55], hemiSky: 0xbae6fd, hemiGround: 0x4b5563 },
        autumn: { fog: 0xfed7aa, density: 0.0005, sunColor: 0xffedd5, sunPos: [-45, 24, -80], hemiSky: 0xffedd5, hemiGround: 0x78350f },
        winter: { fog: 0xe2e8f0, density: 0.0008, sunColor: 0xf8fafc, sunPos: [-25, 28, -60], hemiSky: 0xf1f5f9, hemiGround: 0x94a3b8 },
        rain:   { fog: 0x94a3b8, density: 0.0012, sunColor: 0xcbd5e1, sunPos: [0, 38, -40], hemiSky: 0x94a3b8, hemiGround: 0x334155 },
        night:  { fog: 0x0f172a, density: 0.0008, sunColor: 0xe0f2fe, sunPos: [-30, 34, -85], hemiSky: 0x1e293b, hemiGround: 0x0f172a }
      };
      const cfg = envConfigs[theme] || envConfigs.autumn;
      this.scene.fog = new THREE.FogExp2(cfg.fog, cfg.density);
      if (this.hemiLight) {
        this.hemiLight.color.setHex(cfg.hemiSky);
        this.hemiLight.groundColor.setHex(cfg.hemiGround);
      }
      if (this.mainDirLight) {
        this.mainDirLight.color.setHex(cfg.sunColor);
        this.mainDirLight.position.set(cfg.sunPos[0], cfg.sunPos[1], cfg.sunPos[2]);
      }

      // 1) 만화풍 폴리곤 산맥/바다 대신 실제 DSLR 고해상도 사계절 파노라마 사진 백드롭 시공 (Enscape / V-Ray 실사 방식!)
      const { panoMat, skyCapMat } = this.pbr.rooftopRealPhotoPanorama(theme);

      // 상부 천정 하늘 돔 캡 (실사 사진 최상단 하늘색과 1:1 자동 매칭)
      const skyCap = new THREE.Mesh(new THREE.SphereGeometry(195, 40, 24), skyCapMat);
      this.roomGroup.add(skyCap);

      // 360도 무이음매 실사 파노라마 원통형 사이클로라마 (정면 -X ~ -Z ~ +X 180도 전방에 원본 사진이 정방향 매핑!)
      const panoCylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(142, 142, 92, 96, 1, true),
        panoMat
      );
      panoCylinder.position.set(0, 7.5, 0);
      panoCylinder.scale.x = -1;
      this.roomGroup.add(panoCylinder);

      // 2) 루프탑 테라스 우드 데크 (겨울엔 눈·서리가 내려앉은 실사 데크, 우천 시엔 빗물에 젖은 반사 데크!)
      const baseDeckMat = this.pbr.woodPlankMaterial('mod_roof_deck', [156, 126, 92], [116, 88, 58], 10, 10, 0.38);
      let deckMat = baseDeckMat;
      if (theme === 'winter') {
        deckMat = this.pbr.frostedWoodDeckMaterial();
      } else if (theme === 'rain') {
        deckMat = baseDeckMat.clone();
        deckMat.roughness = 0.07;
        deckMat.metalness = 0.25;
        deckMat.envMapIntensity = 1.55;
      }
      const deck = new THREE.Mesh(new THREE.PlaneGeometry(46, 42), deckMat);
      deck.rotation.x = -Math.PI / 2;
      deck.receiveShadow = true;
      this.roomGroup.add(deck);

      // 테라스 하부 모던 건축 콘크리트 처마 마감
      const slabEdge = new THREE.Mesh(
        new THREE.BoxGeometry(46.6, 2.4, 42.6),
        this.pbr.marbleMaterial('roof_slab', [68, 72, 78], [48, 52, 58], 4, 1, 0.6)
      );
      slabEdge.position.set(0, -1.22, 0);
      this.roomGroup.add(slabEdge);

      // 실사 사진 풍경이 맑게 투과되는 프레임리스 저철분 크리스탈 유리 난간
      const glassRail = this.pbr.glassMaterial(0.14, 0xe0f2fe);
      const steel = this.pbr.darkSteelMaterial();
      const whiteStone = this.pbr.marbleMaterial('roof_terrazzo', [240, 236, 228], [204, 198, 188], 2, 2, 0.22);

      const rBack = new THREE.Mesh(new THREE.BoxGeometry(46, 1.10, 0.04), glassRail);
      rBack.position.set(0, 0.55, -20.2);
      const rTopCap = new THREE.Mesh(new THREE.BoxGeometry(46.1, 0.045, 0.09), steel);
      rTopCap.position.set(0, 1.11, -20.2);
      const rLed = new THREE.Mesh(new THREE.BoxGeometry(46, 0.04, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff8dc }));
      rLed.position.set(0, 0.025, -20.15);
      const rLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.10, 42), glassRail);
      rLeft.position.set(-22.5, 0.55, 0);
      const rRight = rLeft.clone();
      rRight.position.x = 22.5;
      this.roomGroup.add(rBack, rTopCap, rLed, rLeft, rRight);

      // 북쪽 전망대 중앙: 미니멀 건축 전망 망원경
      const scopeGrp = new THREE.Group();
      scopeGrp.position.set(0, 0, -19.0);
      const scopePed = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.18, 1.26, 16), steel);
      scopePed.position.y = 0.63;
      const scopeBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.62, 16), this.pbr.whiteMetalMaterial());
      scopeBarrel.rotation.x = Math.PI / 2 - 0.10;
      scopeBarrel.position.set(0, 1.32, -0.06);
      scopeGrp.add(scopePed, scopeBarrel);
      this.roomGroup.add(scopeGrp);

      this.interactables.push({
        id: 'rooftop-season-spot',
        type: 'rooftop_season',
        label: '🏞️ 루프탑 사계절·날씨 실사 풍경 바꾸기',
        x: 0,
        y: 0,
        z: -17.6,
        radius: 3.0,
        mesh: scopeBarrel
      });

      // 알루미늄 루버 파고라
      [-14.5, 14.5].forEach((px) => {
        [-3.5, 13.5].forEach((pz) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.2, 0.22), steel);
          post.position.set(px, 2.6, pz);
          this.roomGroup.add(post);
        });
      });
      for (let bz = -3.5; bz <= 13.5; bz += 3.4) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(29.4, 0.16, 0.18), steel);
        beam.position.set(0, 5.2, bz);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(28.4, 0.04, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff6d6 }));
        strip.position.set(0, 5.10, bz);
        this.roomGroup.add(beam, strip);
      }

      // 겨울('winter'): 만화 같은 눈사람·동그란 구체 없이 건축 난간·파고라 상단에만 얇고 자연스러운 실사 직선 적설 층 마감
      if (theme === 'winter') {
        const snowMat = this.pbr.snowDriftMaterial();
        const railSnow = new THREE.Mesh(new THREE.BoxGeometry(46.0, 0.04, 0.10), snowMat);
        railSnow.position.set(0, 1.15, -20.2);
        this.roomGroup.add(railSnow);
        for (let bz = -3.5; bz <= 13.5; bz += 3.4) {
          const beamSnow = new THREE.Mesh(new THREE.BoxGeometry(29.3, 0.045, 0.18), snowMat);
          beamSnow.position.set(0, 5.30, bz);
          this.roomGroup.add(beamSnow);
        }
      }

      const barCounter = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.1, 1.05), whiteStone);
      barCounter.position.set(-13.2, 0.55, -9.5);
      const barSign = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 0.88, 0.10),
        new THREE.MeshStandardMaterial({ map: this._makePlaqueTexture('☕ SOMY ROOFTOP TERRACE', '모던 루프탑 커피바') })
      );
      barSign.position.set(-13.2, 3.4, -9.5);
      this.roomGroup.add(barCounter, barSign);

      this.interactables.push({
        id: 'roof-coffee',
        type: 'cafe',
        drinkType: 'coffee',
        label: '☕ 루프탑 커피 받기',
        x: -13.2,
        y: 0,
        z: -7.6,
        radius: 2.8,
        mesh: barCounter
      });

      const waterCounter = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.1, 1.0), whiteStone);
      waterCounter.position.set(13.2, 0.55, -9.5);
      const waterSign = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 0.88, 0.10),
        new THREE.MeshStandardMaterial({ map: this._makePlaqueTexture('💧 REFRESH BAR', '시원한 생수 나눔', '#0f172a', '#38bdf8') })
      );
      waterSign.position.set(13.2, 3.4, -9.5);
      this.roomGroup.add(waterCounter, waterSign);

      this.interactables.push({
        id: 'roof-water',
        type: 'cafe',
        drinkType: 'water',
        label: '💧 시원한 생수 받기',
        x: 13.2,
        y: 0,
        z: -7.6,
        radius: 2.8,
        mesh: waterCounter
      });

      // 바다 전망 로우프로파일 라운지 소파 2개
      this._addFurnitureSeat('roof_view_bench_L', -6.2, 0, -17.6, Math.PI, 3.0, '🏞️ 산·바다 전망석에 앉아 감상하기', 'sofa');
      this._addFurnitureSeat('roof_view_bench_R', 6.2, 0, -17.6, Math.PI, 3.0, '🏞️ 산·바다 전망석에 앉아 감상하기', 'sofa');

      [[-7.5, 2.5], [7.5, 2.5], [-7.5, 11.5], [7.5, 11.5]].forEach(([tx, tz], tIdx) => {
        const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.06, 28), whiteStone);
        top.position.set(tx, 0.76, tz);
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.38, 0.74, 16), steel);
        ped.position.set(tx, 0.37, tz);
        this.roomGroup.add(top, ped);

        for (let c = 0; c < 4; c++) {
          const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
          const cx = tx + Math.sin(a) * 2.2;
          const cz = tz + Math.cos(a) * 2.2;
          this._addFurnitureSeat(`rtbl_${tIdx}_${c}`, cx, 0, cz, Math.atan2(tx - cx, tz - cz), 1.0, `☕ ${tIdx + 1}번 테라스 테이블 착석`, 'chair');
        }
      });

      // 모던 건축 도자기 플랜터 관엽식물 (만화 느낌의 로우폴리 나무 대신 세련된 건축 플랜터 사용)
      [[-19.5, -16.5], [19.5, -16.5], [-19.5, 16], [19.5, 16]].forEach(([tx, tz]) => {
        const plant = this.pbr.createPottedPlant(1.25);
        plant.position.set(tx, 0, tz);
        this.roomGroup.add(plant);
      });

      // 미세하고 사실적인 실사 카메라 보케형 눈송이·빗줄기 대기 효과 (과장된 만화 이펙트 배제)
      if (theme === 'winter' || theme === 'rain') {
        const isRain = theme === 'rain';
        const count = isRain ? 780 : 520;
        const pGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const seeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 64;
          positions[i * 3 + 1] = Math.random() * 26;
          positions[i * 3 + 2] = -28 + Math.random() * 52;
          seeds[i] = Math.random() * Math.PI * 2;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const texKind = isRain ? 'rain' : 'snow';
        const pMat = new THREE.PointsMaterial({
          map: this.pbr.weatherParticleTexture(texKind),
          size: isRain ? 0.45 : 0.22,
          transparent: true,
          opacity: isRain ? 0.48 : 0.72,
          depthWrite: false
        });
        const points = new THREE.Points(pGeo, pMat);
        this.roomGroup.add(points);
        this.weatherSystem = {
          points,
          seeds,
          kind: texKind,
          fallSpeed: isRain ? 24.0 : 2.1,
          driftAmp: isRain ? 0.3 : 1.1
        };
      }

      this._addPortalDoor(-8.0, 19.8, Math.PI, 'sanctuary', '🏛️ 대성전 내려가기', '');
      this._addPortalDoor(8.0, 19.8, Math.PI, 'garden', '🌿 앞마당 광장', '');
    }

    // -----------------------------------------------------------------------
    // 입력 & 프레임 루프
    // -----------------------------------------------------------------------
    _setupInput() {
      window.addEventListener('keydown', (e) => {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        const k = e.key.toLowerCase();
        this.keys[k] = true;
        if (k === 'e' && this.nearestInteractable) {
          this.onInteract(this.nearestInteractable);
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
      });

      const pointers = new Map();
      let moved = false;
      let pinchDist = 0;

      this.canvas.addEventListener('pointerdown', (e) => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) moved = false;
        else if (pointers.size === 2) {
          moved = true;
          const pts = Array.from(pointers.values());
          pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        }
        try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      });

      this.canvas.addEventListener('pointermove', (e) => {
        if (!pointers.has(e.pointerId)) return;
        const prev = pointers.get(e.pointerId);
        const cur = { x: e.clientX, y: e.clientY };
        pointers.set(e.pointerId, cur);

        if (pointers.size === 1) {
          const dx = cur.x - prev.x;
          const dy = cur.y - prev.y;
          if (Math.hypot(dx, dy) > 4) moved = true;
          if (this.cameraMode === 'panorama') {
            this.panoYaw -= dx * 0.0062;
            this.panoPitch = Math.max(0.06, Math.min(0.45, this.panoPitch + dy * 0.0045));
          } else {
            this.camYaw -= dx * 0.0065;
            this.camPitch = Math.max(0.06, Math.min(0.68, this.camPitch + dy * 0.005));
          }
        } else if (pointers.size >= 2) {
          moved = true;
          const pts = Array.from(pointers.values());
          const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          if (pinchDist > 0) {
            this.zoomBy((pinchDist - d) * 0.045);
          }
          pinchDist = d;
        }
      });

      const onPointerEnd = (e) => {
        const singleTap = pointers.size === 1 && !moved;
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinchDist = 0;
        if (singleTap) this._handleTap(e.clientX, e.clientY);
      };

      this.canvas.addEventListener('pointerup', onPointerEnd);
      this.canvas.addEventListener('pointercancel', (e) => {
        pointers.delete(e.pointerId);
        pinchDist = 0;
      });

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.zoomBy(e.deltaY * 0.01);
      }, { passive: false });
    }

    _handleTap(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(ndc, this.camera);

      const meshes = this.interactables.map((it) => it.mesh).filter(Boolean);
      const hits = this.raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const hitMesh = hits[0].object;
        const found = this.interactables.find((it) => it.mesh === hitMesh);
        if (found) {
          const me = this.avatars.get(this.myId);
          if (me && Math.hypot(me.x - found.x, me.z - found.z) <= found.radius + 2.2) {
            this.onInteract(found);
            return;
          }
          this.walkTarget = { x: found.x, z: found.z, pendingInteract: found };
          this.walkRing.position.set(found.x, 0.05, found.z);
          this.walkRing.material.opacity = 0.85;
          if (me) me.pose = 'stand';
          return;
        }
      }

      const pt = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.floorPlane, pt)) {
        const b = this.getZoneMeta(this.currentZone).bounds;
        const tx = Math.max(-b.x, Math.min(b.x, pt.x));
        const tz = Math.max(b.zMin, Math.min(b.zMax, pt.z));
        this.walkTarget = { x: tx, z: tz, pendingInteract: null };
        this.walkRing.position.set(tx, 0.05, tz);
        this.walkRing.material.opacity = 0.85;
        const me = this.avatars.get(this.myId);
        if (me) me.pose = 'stand';
      }
    }

    _broadcastMyMove(force = false) {
      const now = performance.now();
      if (!force && now - this.lastBroadcastAt < 140) return;
      this.lastBroadcastAt = now;
      const me = this.avatars.get(this.myId);
      if (!me) return;
      this.onLocalMove({
        x: Number(me.x.toFixed(2)),
        y: Number(me.y.toFixed(2)),
        z: Number(me.z.toFixed(2)),
        rotY: Number(me.rotY.toFixed(2)),
        pose: me.pose,
        drink: me.drink
      });
    }

    start() {
      const loop = () => {
        const dt = Math.min(0.05, this.clock.getDelta());
        const elapsed = this.clock.elapsedTime;
        this._update(dt, elapsed);
        this.renderer.render(this.scene, this.camera);
        this._updateHtmlOverlays();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    _update(dt, elapsed) {
      const me = this.avatars.get(this.myId);
      const meta = this.getZoneMeta(this.currentZone);

      if (me) {
        let moveF = 0;
        let moveR = 0;
        if (this.keys['w'] || this.keys['arrowup']) moveF += 1;
        if (this.keys['s'] || this.keys['arrowdown']) moveF -= 1;
        if (this.keys['d'] || this.keys['arrowright']) moveR += 1;
        if (this.keys['a'] || this.keys['arrowleft']) moveR -= 1;

        if (Math.hypot(this.joyVec.x, this.joyVec.y) > 0.08) {
          moveR += this.joyVec.x;
          moveF -= this.joyVec.y;
        }

        const manualMoving = Math.hypot(moveF, moveR) > 0.05;
        const speed = 8.4;

        if (manualMoving) {
          this.walkTarget = null;
          this.walkRing.material.opacity = 0;
          me.pose = 'stand';

          const refYaw = this.cameraMode === 'panorama' ? this.panoYaw : this.camYaw;
          const fwdX = -Math.sin(refYaw);
          const fwdZ = -Math.cos(refYaw);
          const rgtX = Math.cos(refYaw);
          const rgtZ = -Math.sin(refYaw);

          let vx = fwdX * moveF + rgtX * moveR;
          let vz = fwdZ * moveF + rgtZ * moveR;
          const vl = Math.hypot(vx, vz) || 1;
          vx /= vl;
          vz /= vl;

          me.x = Math.max(-meta.bounds.x, Math.min(meta.bounds.x, me.x + vx * speed * dt));
          me.z = Math.max(meta.bounds.zMin, Math.min(meta.bounds.zMax, me.z + vz * speed * dt));
          me.tx = me.x;
          me.tz = me.z;
          me.rotY = me.tRotY = Math.atan2(vx, vz);
          me.walkPhase += dt * 11;
          this._broadcastMyMove(false);
        } else if (this.walkTarget) {
          const dx = this.walkTarget.x - me.x;
          const dz = this.walkTarget.z - me.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.35) {
            me.pose = 'stand';
            me.x += (dx / d) * speed * dt;
            me.z += (dz / d) * speed * dt;
            me.tx = me.x;
            me.tz = me.z;
            me.rotY = me.tRotY = Math.atan2(dx, dz);
            me.walkPhase += dt * 11;
            this._broadcastMyMove(false);
          } else {
            const pending = this.walkTarget.pendingInteract;
            this.walkTarget = null;
            this.walkRing.material.opacity = 0;
            this._broadcastMyMove(true);
            if (pending) this.onInteract(pending);
          }
        }

        if (manualMoving) {
          for (const p of this.portals) {
            if (Math.hypot(me.x - p.x, me.z - p.z) < 1.15) {
              this.onPortalEnter(p.targetZone);
              break;
            }
          }
        }

        let best = null;
        let bestD = Infinity;
        for (const it of this.interactables) {
          const d = Math.hypot(me.x - it.x, me.z - it.z);
          if (d <= it.radius && d < bestD) {
            bestD = d;
            best = it;
          }
        }
        if (best !== this.nearestInteractable) {
          this.nearestInteractable = best;
          this.onProximityChange(best);
        }
      }

      for (const av of this.avatars.values()) {
        if (!av.isMe) {
          const dx = av.tx - av.x;
          const dz = av.tz - av.z;
          const dist = Math.hypot(dx, dz);
          av.x += dx * Math.min(1, dt * 8);
          av.y += (av.ty - av.y) * Math.min(1, dt * 8);
          av.z += dz * Math.min(1, dt * 8);
          let dRot = av.tRotY - av.rotY;
          while (dRot > Math.PI) dRot -= Math.PI * 2;
          while (dRot < -Math.PI) dRot += Math.PI * 2;
          av.rotY += dRot * Math.min(1, dt * 10);
          if (dist > 0.04) av.walkPhase += dt * 10;
        }

        av.root.position.set(av.x, av.y, av.z);
        av.root.rotation.y = av.rotY;

        if (av.sipTimer > 0) av.sipTimer = Math.max(0, av.sipTimer - dt);

        // 자연스러운 순정만화 눈 깜빡임 애니메이션 (4.2초 주기로 0.14초 깜빡임)
        if (av.faceDecalMat && av.openFaceTex && av.blinkFaceTex) {
          const blinkCycle = (elapsed + (av.blinkOffset || 0)) % 4.2;
          const shouldBlink = blinkCycle > 4.06;
          const targetTex = shouldBlink ? av.blinkFaceTex : av.openFaceTex;
          if (av.faceDecalMat.map !== targetTex) {
            av.faceDecalMat.map = targetTex;
            av.faceDecalMat.needsUpdate = true;
          }
        }

        const isModelBody = !av.avatarConfig || av.avatarConfig.bodyStyle !== 'cute';
        if (av.pose === 'sit') {
          av.bodyPivot.position.y = isModelBody ? -0.36 : -0.18;
          av.leftLeg.rotation.x = -Math.PI * 0.46;
          av.rightLeg.rotation.x = -Math.PI * 0.46;
          av.leftArm.rotation.x = -0.28;
          av.rightArm.rotation.x = av.sipTimer > 0 ? -1.35 : -0.28;
          av.headGroup.rotation.x = 0;
          av.headGroup.rotation.z = Math.sin(elapsed * 1.2 + (av.blinkOffset || 0)) * 0.03;
        } else if (av.pose === 'kneel') {
          av.bodyPivot.position.y = isModelBody ? -0.44 : -0.32;
          av.leftLeg.rotation.x = 1.38;
          av.rightLeg.rotation.x = 1.38;
          av.leftArm.rotation.x = -0.95;
          av.rightArm.rotation.x = -0.95;
          av.headGroup.rotation.x = 0.25;
          av.headGroup.rotation.z = 0;
        } else {
          av.headGroup.rotation.x = 0;
          av.headGroup.rotation.z = Math.sin(elapsed * 1.3 + (av.blinkOffset || 0)) * 0.025;
          const moving = av.isMe
            ? !!(this.walkTarget || this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d'] || this.keys['arrowup'] || this.keys['arrowdown'] || this.keys['arrowleft'] || this.keys['arrowright'] || Math.hypot(this.joyVec.x, this.joyVec.y) > 0.08)
            : Math.hypot(av.tx - av.x, av.tz - av.z) > 0.04;

          if (moving) {
            const sw = Math.sin(av.walkPhase) * 0.60;
            av.bodyPivot.position.y = Math.abs(Math.sin(av.walkPhase * 2)) * 0.06;
            av.leftLeg.rotation.x = sw;
            av.rightLeg.rotation.x = -sw;
            av.leftArm.rotation.x = -sw * 0.72;
            av.rightArm.rotation.x = av.sipTimer > 0 ? -1.35 : sw * 0.72;
          } else {
            av.bodyPivot.position.y = Math.sin(elapsed * 2 + (av.isMe ? 0 : 1)) * 0.02;
            av.leftLeg.rotation.x *= 0.82;
            av.rightLeg.rotation.x *= 0.82;
            av.leftArm.rotation.x *= 0.82;
            av.rightArm.rotation.x = av.sipTimer > 0 ? -1.35 : av.rightArm.rotation.x * 0.82;
          }
        }

        if (av.myRing) {
          const sc = av.micWave ? 1.18 + Math.sin(elapsed * 14) * 0.16 : 1 + Math.sin(elapsed * 4) * 0.05;
          av.myRing.scale.set(sc, sc, 1);
          av.myRing.material.color.setHex(av.micWave ? 0x10b981 : 0xf59e0b);
        }

        if (av.bubbleTimer > 0) {
          av.bubbleTimer -= dt;
          if (av.bubbleTimer <= 0) av.bubbleEl.classList.add('hidden');
        }
      }

      // 루프탑 바다 잔물결 흐름 & 눈·비·단풍·벚꽃 3D 파티클 애니메이션
      if (this.oceanMesh && this.oceanMesh.material && this.oceanMesh.material.map) {
        this.oceanMesh.material.map.offset.y = (elapsed * 0.035) % 1;
        this.oceanMesh.material.map.offset.x = Math.sin(elapsed * 0.25) * 0.02;
      }
      if (this.weatherSystem && this.weatherSystem.points) {
        const ws = this.weatherSystem;
        const attr = ws.points.geometry.attributes.position;
        const arr = attr.array;
        const n = ws.seeds.length;
        for (let i = 0; i < n; i++) {
          const i3 = i * 3;
          arr[i3 + 1] -= ws.fallSpeed * dt;
          if (ws.kind === 'rain') {
            arr[i3] -= 2.2 * dt;
          } else {
            arr[i3] += Math.sin(elapsed * 1.4 + ws.seeds[i]) * ws.driftAmp * dt;
            arr[i3 + 2] += Math.cos(elapsed * 1.1 + ws.seeds[i]) * (ws.driftAmp * 0.5) * dt;
          }
          if (arr[i3 + 1] < -1.5) {
            arr[i3 + 1] = 27.5;
            arr[i3] = (Math.random() - 0.5) * 68;
            arr[i3 + 2] = -32 + Math.random() * 56;
          }
        }
        attr.needsUpdate = true;
      }

      if (this.cameraMode === 'panorama') {
        const [lx, ly, lz] = meta.panorama.look;
        const cx = lx + Math.sin(this.panoYaw) * Math.cos(this.panoPitch) * this.panoDist;
        const cy = Math.max(2.0, Math.min(11.2, ly + Math.sin(this.panoPitch) * this.panoDist));
        const cz = lz + Math.cos(this.panoYaw) * Math.cos(this.panoPitch) * this.panoDist;
        this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.12);
        this.camera.lookAt(lx, ly, lz);
      } else if (me) {
        const targetY = me.y + 1.80;
        const cx = me.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
        const cy = Math.max(1.2, Math.min(7.8, targetY + Math.sin(this.camPitch) * this.camDist));
        const cz = me.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
        this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.16);
        this.camera.lookAt(me.x, targetY + 0.30, me.z);
      }
    }

    _updateHtmlOverlays() {
      const v = new THREE.Vector3();
      for (const av of this.avatars.values()) {
        const poseDrop = av.pose === 'sit' ? 0.34 : av.pose === 'kneel' ? 0.42 : 0;
        v.set(av.x, av.y + (av.heightTop || 2.16) - poseDrop, av.z);
        v.project(this.camera);
        if (v.z > 1) {
          av.labelEl.style.display = 'none';
          continue;
        }
        const sx = (v.x * 0.5 + 0.5) * this.viewW;
        const sy = (-v.y * 0.5 + 0.5) * this.viewH;
        av.labelEl.style.display = 'flex';
        av.labelEl.style.left = `${sx}px`;
        av.labelEl.style.top = `${sy}px`;
      }
    }
  }

  window.ChapelWorld3D = ChapelWorld3D;
})();
