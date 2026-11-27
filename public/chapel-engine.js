/* =========================================================================
 * 소미 3D 온라인 캠퍼스 — CAD / Enscape 실사 건축 인테리어 Three.js 엔진 (v3)
 * [핵심 보강] 외곽 벽체 FrontSide 자동 투과(카메라 시야 가림 원천 차단) + 선명한 CAD 명암비
 * ========================================================================= */
(function () {
  const THREE = window.THREE;
  if (!THREE) return;

  const AVATAR_PRESETS = [
    {
      id: 'dandy_suit',
      label: '✨ 댄디 수트 (형제)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'warm', faceStyle: 'chic', expression: 'smile', hairStyle: 'dandy', hairColor: 'espresso', outfitStyle: 'suit', outfitColor: '#1e3a8a', bottomColor: '#1e293b', accessory: 'none' }
    },
    {
      id: 'lovely_wave',
      label: '🌸 롱웨이브 원피스 (자매)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'porcelain', faceStyle: 'lovely', expression: 'smile', hairStyle: 'long_wave', hairColor: 'chestnut', outfitStyle: 'onepiece', outfitColor: '#be185d', bottomColor: '#fdf2f8', accessory: 'necklace' }
    },
    {
      id: 'trench_chic',
      label: '🧥 감성 트렌치코트 (청년)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'natural', faceStyle: 'gentle', expression: 'grace', hairStyle: 'short_layered', hairColor: 'black', outfitStyle: 'trench', outfitColor: '#b48352', bottomColor: '#1f2937', accessory: 'wire_glasses' }
    },
    {
      id: 'tweed_bob',
      label: '💎 세련된 단발 셋업 (자매)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'porcelain', faceStyle: 'chic', expression: 'smile', hairStyle: 'bob_c', hairColor: 'espresso', outfitStyle: 'jacket_skirt', outfitColor: '#f8fafc', bottomColor: '#334155', accessory: 'crossbag' }
    },
    {
      id: 'elder_suit',
      label: '👔 품격 정장 (장로·집사)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'natural', faceStyle: 'dignified', expression: 'smile', hairStyle: 'pomade', hairColor: 'silver', outfitStyle: 'suit', outfitColor: '#27272a', bottomColor: '#18181b', accessory: 'wire_glasses' }
    },
    {
      id: 'kwonsa_grace',
      label: '🌺 단아한 올림머리 (권사·집사)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'warm', faceStyle: 'gentle', expression: 'smile', hairStyle: 'low_bun', hairColor: 'espresso', outfitStyle: 'jacket_skirt', outfitColor: '#6d28d9', bottomColor: '#1e1b4b', accessory: 'necklace' }
    },
    {
      id: 'choir_gown',
      label: '🎵 은혜 성가대 가운',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'porcelain', faceStyle: 'lovely', expression: 'grace', hairStyle: 'ponytail', hairColor: 'ash_brown', outfitStyle: 'choir', outfitColor: '#f8fafc', bottomColor: '#1e293b', accessory: 'none' }
    },
    {
      id: 'cute_somy',
      label: '🧸 귀여운 캐주얼 소미핏',
      config: { bodyStyle: 'cute', gender: 'female', skinTone: 'porcelain', faceStyle: 'lovely', expression: 'joy', hairStyle: 'beret_wave', hairColor: 'chestnut', outfitStyle: 'knit_slacks', outfitColor: '#f59e0b', bottomColor: '#334155', accessory: 'crossbag' }
    },
    // 기존 ID 하위 호환용 매핑
    {
      id: 'david',
      label: '다윗 (형제)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'warm', faceStyle: 'gentle', expression: 'smile', hairStyle: 'dandy', hairColor: 'espresso', outfitStyle: 'suit', outfitColor: '#1d4ed8', bottomColor: '#1e293b', accessory: 'none' }
    },
    {
      id: 'miriam',
      label: '미리암 (자매)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'porcelain', faceStyle: 'lovely', expression: 'smile', hairStyle: 'long_wave', hairColor: 'chestnut', outfitStyle: 'onepiece', outfitColor: '#db2777', bottomColor: '#334155', accessory: 'necklace' }
    },
    {
      id: 'joseph',
      label: '요셉 (청년)',
      config: { bodyStyle: 'model', gender: 'male', skinTone: 'natural', faceStyle: 'chic', expression: 'smile', hairStyle: 'short_layered', hairColor: 'black', outfitStyle: 'trench', outfitColor: '#047857', bottomColor: '#1f2937', accessory: 'horn_glasses' }
    },
    {
      id: 'lydia',
      label: '루디아 (집사)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'warm', faceStyle: 'gentle', expression: 'smile', hairStyle: 'low_bun', hairColor: 'espresso', outfitStyle: 'jacket_skirt', outfitColor: '#6d28d9', bottomColor: '#1e1b4b', accessory: 'necklace' }
    },
    {
      id: 'somy',
      label: '소미 (인도자)',
      config: { bodyStyle: 'model', gender: 'female', skinTone: 'porcelain', faceStyle: 'lovely', expression: 'joy', hairStyle: 'bob_c', hairColor: 'ash_brown', outfitStyle: 'knit_slacks', outfitColor: '#d97706', bottomColor: '#1e293b', accessory: 'crossbag' }
    }
  ];

  const SKIN_TONE_HEX = {
    porcelain: '#ffe9dc',
    warm: '#fcdcc5',
    natural: '#eec2a2',
    tan: '#d79e78'
  };

  const HAIR_COLOR_HEX = {
    black: '#19181d',
    espresso: '#342118',
    chestnut: '#5e3a24',
    ash_brown: '#7c5e48',
    burgundy: '#541e2b',
    silver: '#9ca3af'
  };

  function resolveAvatarConfig(presetId, rawCfg) {
    const found = AVATAR_PRESETS.find((p) => p.id === presetId) || AVATAR_PRESETS[0];
    const base = found.config;
    const cfg = rawCfg && typeof rawCfg === 'object' ? rawCfg : {};
    const gender = cfg.gender || base.gender || 'male';
    return {
      bodyStyle: cfg.bodyStyle === 'cute' ? 'cute' : (base.bodyStyle || 'model'),
      gender,
      skinTone: SKIN_TONE_HEX[cfg.skinTone] ? cfg.skinTone : (base.skinTone || 'warm'),
      faceStyle: cfg.faceStyle || base.faceStyle || 'gentle',
      expression: cfg.expression || base.expression || 'smile',
      hairStyle: cfg.hairStyle || base.hairStyle || (gender === 'female' ? 'long_wave' : 'dandy'),
      hairColor: HAIR_COLOR_HEX[cfg.hairColor] ? cfg.hairColor : (base.hairColor || 'espresso'),
      outfitStyle: cfg.outfitStyle || base.outfitStyle || (gender === 'female' ? 'onepiece' : 'suit'),
      outfitColor: cfg.outfitColor || base.outfitColor || '#1e3a8a',
      bottomColor: cfg.bottomColor || base.bottomColor || '#1e293b',
      accessory: cfg.accessory || base.accessory || 'none'
    };
  }

  function avatarConfigSignature(presetId, rawCfg) {
    return JSON.stringify(resolveAvatarConfig(presetId, rawCfg));
  }

  // 고해상도 512x512 얼굴 스타일 · 눈동자 홍채 · 눈썹 · 볼터치 · 표정 텍스처 렌더러
  const faceTextureCache = new Map();
  function createStylizedFaceTexture(cfg) {
    const key = `${cfg.gender}|${cfg.skinTone}|${cfg.faceStyle}|${cfg.expression}|${cfg.hairColor}`;
    if (faceTextureCache.has(key)) return faceTextureCache.get(key);

    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 512, 512);

    const isFemale = cfg.gender === 'female';
    const browColor = HAIR_COLOR_HEX[cfg.hairColor] || '#2b1d14';
    const eyeY = 236;
    const leftX = 172;
    const rightX = 340;

    // 1) 은은한 생기 볼터치 (블러셔)
    const blushAlpha = cfg.faceStyle === 'lovely' || cfg.expression === 'joy' ? 0.28 : (isFemale ? 0.18 : 0.08);
    [leftX - 24, rightX + 24].forEach((bx) => {
      const grad = g.createRadialGradient(bx, eyeY + 56, 4, bx, eyeY + 56, 48);
      grad.addColorStop(0, `rgba(244, 114, 130, ${blushAlpha})`);
      grad.addColorStop(1, 'rgba(244, 114, 130, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(bx, eyeY + 56, 48, 0, Math.PI * 2);
      g.fill();
    });

    // 2) 눈썹 (얼굴 스타일별 디테일)
    g.strokeStyle = browColor;
    g.lineCap = 'round';
    g.lineWidth = isFemale ? 9 : 13;
    const browLift = cfg.expression === 'joy' || cfg.expression === 'grace' ? -8 : 0;

    const drawBrow = (cx, dir) => {
      g.beginPath();
      if (cfg.faceStyle === 'chic') {
        g.moveTo(cx - dir * 42, eyeY - 48 + browLift);
        g.quadraticCurveTo(cx + dir * 6, eyeY - 62 + browLift, cx + dir * 44, eyeY - 50 + browLift);
      } else if (cfg.faceStyle === 'dignified') {
        g.moveTo(cx - dir * 44, eyeY - 46 + browLift);
        g.quadraticCurveTo(cx, eyeY - 54 + browLift, cx + dir * 42, eyeY - 44 + browLift);
      } else {
        g.moveTo(cx - dir * 40, eyeY - 48 + browLift);
        g.quadraticCurveTo(cx, eyeY - 56 + browLift, cx + dir * 42, eyeY - 47 + browLift);
      }
      g.stroke();
    };
    drawBrow(leftX, -1);
    drawBrow(rightX, 1);

    // 3) 눈 & 속눈썹 & 홍채 하이라이트 (표정별 분기)
    const drawOpenEye = (cx, isLeft) => {
      const rx = isFemale ? 33 : 30;
      const ry = cfg.faceStyle === 'chic' ? 22 : (cfg.faceStyle === 'lovely' ? 27 : 24);

      // 흰자위
      g.save();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(cx, eyeY, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.clip();

      // 홍채 그라데이션
      const irisR = ry * 0.88;
      const irisGrad = g.createRadialGradient(cx, eyeY + 2, 4, cx, eyeY, irisR);
      irisGrad.addColorStop(0, '#181311');
      irisGrad.addColorStop(0.55, cfg.faceStyle === 'chic' ? '#3b2820' : '#4a3121');
      irisGrad.addColorStop(1, '#1c1512');
      g.fillStyle = irisGrad;
      g.beginPath();
      g.arc(cx, eyeY + 1, irisR, 0, Math.PI * 2);
      g.fill();

      // 동공
      g.fillStyle = '#0f0d0c';
      g.beginPath();
      g.arc(cx, eyeY + 1, irisR * 0.46, 0, Math.PI * 2);
      g.fill();

      // 듀얼 캐치라이트 (생동감 있는 눈빛)
      const sparkleBoost = cfg.expression === 'grace' ? 1.32 : 1.0;
      g.fillStyle = 'rgba(255,255,255,0.96)';
      g.beginPath();
      g.arc(cx - 7, eyeY - 7, 6.2 * sparkleBoost, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(cx + 8, eyeY + 7, 3.2 * sparkleBoost, 0, Math.PI * 2);
      g.fill();
      g.restore();

      // 쌍꺼풀 라인
      g.strokeStyle = 'rgba(92, 58, 42, 0.42)';
      g.lineWidth = 3.2;
      g.beginPath();
      g.arc(cx, eyeY - 3, rx * 0.96, Math.PI * 1.12, Math.PI * 1.88);
      g.stroke();

      // 윗 아이라인 & 속눈썹
      g.strokeStyle = '#181210';
      g.lineWidth = isFemale ? 7.5 : 6.0;
      g.beginPath();
      g.ellipse(cx, eyeY - 1, rx, ry, 0, Math.PI * 1.06, Math.PI * 1.94);
      g.stroke();

      if (isFemale) {
        const outerDir = isLeft ? -1 : 1;
        g.lineWidth = 4.2;
        g.beginPath();
        g.moveTo(cx + outerDir * (rx - 2), eyeY - 4);
        g.lineTo(cx + outerDir * (rx + 10), eyeY - 11);
        g.stroke();
      }
    };

    const drawClosedArcEye = (cx, upwardSmile) => {
      g.strokeStyle = '#231815';
      g.lineWidth = isFemale ? 7.5 : 6.8;
      g.beginPath();
      if (upwardSmile) {
        g.arc(cx, eyeY + 10, 28, Math.PI * 1.12, Math.PI * 1.88);
      } else {
        g.arc(cx, eyeY - 10, 28, Math.PI * 0.14, Math.PI * 0.86);
      }
      g.stroke();
    };

    if (cfg.expression === 'pray') {
      drawClosedArcEye(leftX, false);
      drawClosedArcEye(rightX, false);
    } else if (cfg.expression === 'joy') {
      drawClosedArcEye(leftX, true);
      drawClosedArcEye(rightX, true);
    } else if (cfg.expression === 'wink') {
      drawOpenEye(leftX, true);
      drawClosedArcEye(rightX, true);
    } else {
      drawOpenEye(leftX, true);
      drawOpenEye(rightX, false);
    }

    // 4) 섬세한 콧방울 음영
    g.strokeStyle = 'rgba(138, 88, 62, 0.38)';
    g.lineWidth = 3.5;
    g.beginPath();
    g.arc(256, 298, 9, Math.PI * 0.18, Math.PI * 0.82);
    g.stroke();

    // 5) 입술 & 표정 입매
    const lipY = 352;
    const lipTint = isFemale
      ? (cfg.faceStyle === 'chic' ? '#be4b58' : '#e06377')
      : '#c56b68';

    if (cfg.expression === 'joy') {
      // 활짝 웃는 기쁨 미소
      g.fillStyle = '#a83847';
      g.beginPath();
      g.moveTo(214, lipY - 4);
      g.quadraticCurveTo(256, lipY + 3, 298, lipY - 4);
      g.quadraticCurveTo(256, lipY + 42, 214, lipY - 4);
      g.fill();

      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(222, lipY - 2);
      g.quadraticCurveTo(256, lipY + 4, 290, lipY - 2);
      g.quadraticCurveTo(256, lipY + 13, 222, lipY - 2);
      g.fill();
    } else if (cfg.expression === 'pray' || cfg.expression === 'calm') {
      // 고요하고 평안한 입술
      g.fillStyle = lipTint;
      g.beginPath();
      g.ellipse(256, lipY + 2, isFemale ? 24 : 22, isFemale ? 8 : 6, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(110, 42, 48, 0.55)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(228, lipY + 2);
      g.quadraticCurveTo(256, lipY + 6, 284, lipY + 2);
      g.stroke();
    } else {
      // 온화하고 세련된 미소 (smile / grace / wink)
      if (isFemale) {
        g.fillStyle = lipTint;
        g.beginPath();
        g.ellipse(256, lipY + 2, 28, 10, 0, 0, Math.PI * 2);
        g.fill();
        // 글로스 하이라이트
        g.fillStyle = 'rgba(255,255,255,0.38)';
        g.beginPath();
        g.ellipse(256, lipY + 5, 13, 3.2, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = isFemale ? '#882938' : '#8b4543';
      g.lineWidth = 4.6;
      g.beginPath();
      g.moveTo(218, lipY - 2);
      g.quadraticCurveTo(256, lipY + 18, 294, lipY - 2);
      g.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    faceTextureCache.set(key, tex);
    return tex;
  }

  // 7.5등신 슬림 모델 체형 & 귀여운 캐주얼 체형 겸용 고품격 3D 캐릭터 빌더
  function buildStylizedAvatarRig(presetId, rawCfg, currentDrink) {
    const cfg = resolveAvatarConfig(presetId, rawCfg);
    const isCute = cfg.bodyStyle === 'cute';
    const isFemale = cfg.gender === 'female';

    const skinMat = new THREE.MeshStandardMaterial({ color: SKIN_TONE_HEX[cfg.skinTone] || '#fcdcc5', roughness: 0.52 });
    const hairMat = new THREE.MeshStandardMaterial({ color: HAIR_COLOR_HEX[cfg.hairColor] || '#342118', roughness: 0.62 });
    const outfitMat = new THREE.MeshStandardMaterial({ color: cfg.outfitColor, roughness: 0.58 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: cfg.bottomColor, roughness: 0.68 });
    const whiteShirtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.72, roughness: 0.25 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.78, roughness: 0.22 });
    const darkLeatherMat = new THREE.MeshStandardMaterial({ color: isFemale ? 0x292524 : 0x18181b, roughness: 0.34 });

    const rigGroup = new THREE.Group();

    // 체형별 정밀 인체 비례 상수 (얼큰이 탈피: model은 머리 반경 0.156m의 늘씬한 7.5등신 비율!)
    const P = isCute
      ? {
          hipY: 0.66,
          legLen: 0.58,
          legSpacing: 0.145,
          torsoH: 0.64,
          torsoTopR: isFemale ? 0.20 : 0.23,
          torsoWaistR: isFemale ? 0.17 : 0.20,
          hipR: isFemale ? 0.21 : 0.20,
          shoulderY: 1.24,
          armX: isFemale ? 0.27 : 0.30,
          armLen: 0.48,
          neckY: 1.34,
          headY: 1.56,
          headR: 0.235,
          heightTop: 2.02
        }
      : {
          hipY: 0.90,
          legLen: 0.84,
          legSpacing: isFemale ? 0.108 : 0.128,
          torsoH: 0.64,
          torsoTopR: isFemale ? 0.175 : 0.218,
          torsoWaistR: isFemale ? 0.132 : 0.176,
          hipR: isFemale ? 0.178 : 0.176,
          shoulderY: 1.48,
          armX: isFemale ? 0.228 : 0.268,
          armLen: 0.60,
          neckY: 1.58,
          headY: 1.75,
          headR: 0.156,
          heightTop: 2.16
        };

    const isSkirtLook = cfg.outfitStyle === 'onepiece' || cfg.outfitStyle === 'jacket_skirt';
    const isChoir = cfg.outfitStyle === 'choir';

    // 1) 다리 (슬랙스 바지 또는 스커트용 각선미 다리 + 세련된 구두/스니커즈)
    const makeLeg = () => {
      const lg = new THREE.Group();
      const upperMat = isSkirtLook ? skinMat : bottomMat;
      const lowerMat = isSkirtLook ? skinMat : bottomMat;

      const thighRTop = isSkirtLook ? 0.072 : 0.086;
      const thighRBot = isSkirtLook ? 0.056 : 0.070;
      const upperH = P.legLen * 0.52;
      const lowerH = P.legLen * 0.48;

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(thighRTop, thighRBot, upperH, 14), upperMat);
      thigh.position.y = -upperH * 0.5;
      thigh.castShadow = true;

      const calf = new THREE.Mesh(new THREE.CylinderGeometry(thighRBot, thighRBot * 0.82, lowerH, 14), lowerMat);
      calf.position.y = -upperH - lowerH * 0.5 + 0.02;
      calf.castShadow = true;

      const shoeMat = cfg.outfitStyle === 'knit_slacks'
        ? whiteShirtMat
        : (cfg.outfitStyle === 'onepiece' ? outfitMat : darkLeatherMat);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 10), shoeMat);
      shoe.scale.set(0.86, 0.55, 1.58);
      shoe.position.set(0, -P.legLen + 0.02, 0.045);
      shoe.castShadow = true;

      lg.add(thigh, calf, shoe);
      return lg;
    };

    const leftLeg = makeLeg();
    leftLeg.position.set(-P.legSpacing, P.hipY, 0);
    const rightLeg = makeLeg();
    rightLeg.position.set(P.legSpacing, P.hipY, 0);
    rigGroup.add(leftLeg, rightLeg);

    // 골반 연결부
    const pelvis = new THREE.Mesh(
      new THREE.SphereGeometry(P.hipR, 16, 12),
      isSkirtLook ? (cfg.outfitStyle === 'onepiece' ? outfitMat : bottomMat) : bottomMat
    );
    pelvis.scale.set(1.06, 0.56, 0.78);
    pelvis.position.y = P.hipY;
    rigGroup.add(pelvis);

    // 2) 상체 & 패션 스타일별 입체 의상 디테일
    const torsoCenterY = P.hipY + P.torsoH * 0.5 - 0.02;
    const upperTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(P.torsoTopR, P.torsoWaistR, P.torsoH * 0.62, 18),
      outfitMat
    );
    upperTorso.scale.set(1.16, 1, 0.72);
    upperTorso.position.y = torsoCenterY + P.torsoH * 0.18;
    upperTorso.castShadow = true;
    rigGroup.add(upperTorso);

    const lowerTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(P.torsoWaistR, P.hipR * 0.98, P.torsoH * 0.44, 18),
      outfitMat
    );
    lowerTorso.scale.set(1.10, 1, 0.74);
    lowerTorso.position.y = P.hipY + P.torsoH * 0.18;
    lowerTorso.castShadow = true;
    rigGroup.add(lowerTorso);

    // 자연스러운 어깨 라인
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(P.torsoTopR * 1.14, 18, 12), outfitMat);
    shoulderCap.scale.set(1.14, 0.36, 0.70);
    shoulderCap.position.y = P.shoulderY;
    rigGroup.add(shoulderCap);

    // 패션별 커스텀 코디 디테일
    if (cfg.outfitStyle === 'suit') {
      // 드레스 셔츠 V존 + 테일러드 라펠 + 넥타이/스카프
      const vZone = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.32, 4), whiteShirtMat);
      vZone.rotation.x = Math.PI;
      vZone.rotation.y = Math.PI * 0.25;
      vZone.scale.set(1.0, 1.0, 0.35);
      vZone.position.set(0, P.shoulderY - 0.12, P.torsoTopR * 0.70);
      rigGroup.add(vZone);

      const tieMat = new THREE.MeshStandardMaterial({ color: isFemale ? 0xfda4af : 0x991b1b, roughness: 0.4 });
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.24, 0.018), tieMat);
      tie.position.set(0, P.shoulderY - 0.15, P.torsoTopR * 0.76);
      rigGroup.add(tie);
    } else if (cfg.outfitStyle === 'knit_slacks') {
      // 레이어드 화이트 셔츠 카라 + 하단 시보리
      const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.018, 10, 20), whiteShirtMat);
      collarRing.rotation.x = Math.PI * 0.5;
      collarRing.position.set(0, P.shoulderY + 0.03, 0.01);
      rigGroup.add(collarRing);
    } else if (cfg.outfitStyle === 'onepiece') {
      // 우아한 A라인 플레어 스커트 + 골드 버클 벨트
      const flareSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(P.torsoWaistR * 1.06, P.hipR * 1.72, P.legLen * 0.56, 24, 1, false),
        outfitMat
      );
      flareSkirt.scale.set(1.06, 1, 0.86);
      flareSkirt.position.y = P.hipY - P.legLen * 0.18;
      flareSkirt.castShadow = true;
      rigGroup.add(flareSkirt);

      const belt = new THREE.Mesh(new THREE.CylinderGeometry(P.torsoWaistR * 1.13, P.torsoWaistR * 1.13, 0.035, 20), darkLeatherMat);
      belt.scale.set(1.08, 1, 0.76);
      belt.position.y = P.hipY + 0.14;
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.042, 0.02), goldMat);
      buckle.position.set(0, P.hipY + 0.14, P.torsoWaistR * 0.86);
      rigGroup.add(belt, buckle);
    } else if (cfg.outfitStyle === 'jacket_skirt') {
      // 모던 H/A라인 미디 스커트 + 트위드 골드 버튼
      const midiSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(P.hipR * 0.98, P.hipR * 1.32, P.legLen * 0.52, 22),
        bottomMat
      );
      midiSkirt.scale.set(1.06, 1, 0.82);
      midiSkirt.position.y = P.hipY - P.legLen * 0.18;
      midiSkirt.castShadow = true;
      rigGroup.add(midiSkirt);

      for (let bi = 0; bi < 3; bi++) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 10), goldMat);
        btn.position.set(0, P.shoulderY - 0.10 - bi * 0.11, P.torsoTopR * 0.76);
        rigGroup.add(btn);
      }
    } else if (cfg.outfitStyle === 'trench') {
      // 멋스러운 롱 트렌치코트 하단 자락 + 이너 니트
      const innerNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.085, 0.18, 14), bottomMat);
      innerNeck.position.set(0, P.shoulderY - 0.02, 0.03);
      const coatHem = new THREE.Mesh(
        new THREE.CylinderGeometry(P.torsoWaistR * 1.12, P.hipR * 1.48, P.legLen * 0.58, 20, 1, true, Math.PI * 0.18, Math.PI * 1.64),
        outfitMat
      );
      coatHem.material = outfitMat.clone();
      coatHem.material.side = THREE.DoubleSide;
      coatHem.rotation.y = Math.PI;
      coatHem.scale.set(1.08, 1, 0.84);
      coatHem.position.y = P.hipY - P.legLen * 0.16;
      rigGroup.add(innerNeck, coatHem);
    } else if (isChoir) {
      // 성가대 찬양 가운 + 골드 V-스톨
      const robeSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(P.torsoWaistR * 1.15, P.hipR * 1.75, P.legLen * 0.82, 24),
        outfitMat
      );
      robeSkirt.scale.set(1.08, 1, 0.86);
      robeSkirt.position.y = P.hipY - P.legLen * 0.34;
      robeSkirt.castShadow = true;

      const stole = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 8, 18), goldMat);
      stole.rotation.x = Math.PI * 0.38;
      stole.scale.set(1.0, 1.35, 0.55);
      stole.position.set(0, P.shoulderY - 0.04, 0.05);
      rigGroup.add(robeSkirt, stole);
    }

    // 3) 팔 & 자연스러운 손
    const makeArm = () => {
      const ag = new THREE.Group();
      const sleeveLen = P.armLen * (cfg.outfitStyle === 'onepiece' ? 0.58 : 0.86);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.046, sleeveLen, 12), outfitMat);
      sleeve.position.y = -sleeveLen * 0.5;
      sleeve.castShadow = true;
      ag.add(sleeve);

      if (sleeveLen < P.armLen) {
        const forearmLen = P.armLen - sleeveLen;
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.036, forearmLen, 12), skinMat);
        forearm.position.y = -sleeveLen - forearmLen * 0.5;
        ag.add(forearm);
      }

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 10), skinMat);
      hand.scale.set(0.85, 1.18, 0.68);
      hand.position.y = -P.armLen - 0.02;
      ag.add(hand);
      return ag;
    };

    const leftArm = makeArm();
    leftArm.position.set(-P.armX, P.shoulderY - 0.02, 0);
    const rightArm = makeArm();
    rightArm.position.set(P.armX, P.shoulderY - 0.02, 0);
    rigGroup.add(leftArm, rightArm);

    // 음료 컵 (오른손 위치 정확히 정렬)
    const cupGroup = new THREE.Group();
    const cupBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.040, 0.14, 14),
      new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.35 })
    );
    const cupSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.054, 0.045, 0.058, 14),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 })
    );
    cupGroup.add(cupBody, cupSleeve);
    cupGroup.position.set(0, -P.armLen - 0.01, 0.085);
    cupGroup.visible = !!currentDrink;
    rightArm.add(cupGroup);

    // 4) 목 & 입체 V라인 얼굴 & 512px 표정 텍스처 & 귀·코
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.14, 14), skinMat);
    neck.position.y = P.neckY;
    rigGroup.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.y = P.headY;
    rigGroup.add(headGroup);

    const R = P.headR;
    const headScaleX = isCute ? 0.96 : (isFemale ? 0.87 : 0.90);
    const headScaleY = isCute ? 1.00 : 1.08;
    const headScaleZ = isCute ? 0.95 : 0.93;

    const head = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 24), skinMat);
    head.scale.set(headScaleX, headScaleY, headScaleZ);
    head.castShadow = true;
    headGroup.add(head);

    // 양쪽 귀
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.19, 10, 10), skinMat);
      ear.scale.set(0.45, 0.95, 0.65);
      ear.position.set(side * R * headScaleX * 0.98, -R * 0.04, -R * 0.05);
      headGroup.add(ear);
    });

    // 섬세한 입체 콧대
    const nose = new THREE.Mesh(new THREE.ConeGeometry(R * 0.075, R * 0.22, 10), skinMat);
    nose.rotation.x = Math.PI * 0.36;
    nose.position.set(0, -R * 0.05, R * headScaleZ * 0.99);
    headGroup.add(nose);

    // 고해상도 얼굴 표정 곡면 데칼 쉘 (+Z 정면 완벽 매핑)
    const faceTex = createStylizedFaceTexture(cfg);
    const faceShellGeo = new THREE.SphereGeometry(
      R * 1.008,
      28,
      24,
      Math.PI * 0.24,
      Math.PI * 0.52,
      Math.PI * 0.22,
      Math.PI * 0.58
    );
    const faceShellMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      transparent: true,
      alphaTest: 0.01,
      roughness: 0.50
    });
    const faceShell = new THREE.Mesh(faceShellGeo, faceShellMat);
    faceShell.scale.set(headScaleX, headScaleY, headScaleZ);
    headGroup.add(faceShell);

    // 5) 8종 입체 헤어스타일 모델링
    const hairGrp = new THREE.Group();
    headGroup.add(hairGrp);

    // 공통 정수리·후두부 볼륨 베이스
    const crownCap = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.06, 26, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    crownCap.scale.set(headScaleX * 1.04, headScaleY * 1.03, headScaleZ * 1.05);
    crownCap.position.set(0, R * 0.05, -R * 0.02);
    crownCap.rotation.x = -0.18;
    crownCap.castShadow = true;
    hairGrp.add(crownCap);

    const napeCap = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.03, 22, 16, Math.PI * 0.95, Math.PI * 1.10, Math.PI * 0.20, Math.PI * 0.62),
      hairMat
    );
    napeCap.scale.set(headScaleX * 1.02, headScaleY, headScaleZ * 1.04);
    hairGrp.add(napeCap);

    if (cfg.hairStyle === 'dandy') {
      // 6:4 가르마 볼륨 앞머리
      const leftBang = new THREE.Mesh(new THREE.SphereGeometry(R * 0.48, 16, 12), hairMat);
      leftBang.scale.set(1.18, 0.62, 0.55);
      leftBang.position.set(-R * 0.26, R * 0.56, R * 0.72);
      leftBang.rotation.z = 0.28;
      const rightBang = new THREE.Mesh(new THREE.SphereGeometry(R * 0.42, 16, 12), hairMat);
      rightBang.scale.set(1.05, 0.58, 0.52);
      rightBang.position.set(R * 0.30, R * 0.58, R * 0.70);
      rightBang.rotation.z = -0.32;
      hairGrp.add(leftBang, rightBang);
    } else if (cfg.hairStyle === 'pomade') {
      // 이마가 시원하게 드러나는 슬릭 포마드 볼륨업
      const quiff = new THREE.Mesh(new THREE.SphereGeometry(R * 0.56, 18, 12), hairMat);
      quiff.scale.set(1.15, 0.52, 0.88);
      quiff.position.set(R * 0.06, R * 0.88, R * 0.32);
      quiff.rotation.x = -0.25;
      quiff.rotation.z = -0.10;
      hairGrp.add(quiff);
    } else if (cfg.hairStyle === 'short_layered') {
      // 내추럴 시스루 덮머리
      const frontFringe = new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.05, 22, 14, Math.PI * 0.26, Math.PI * 0.48, Math.PI * 0.14, Math.PI * 0.26),
        hairMat
      );
      frontFringe.scale.set(headScaleX * 1.02, headScaleY, headScaleZ * 1.03);
      frontFringe.position.y = R * 0.04;
      hairGrp.add(frontFringe);
    } else if (cfg.hairStyle === 'bob_c') {
      // 단정한 C컬 중단발 보브컷
      [-1, 1].forEach((side) => {
        const sideBob = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.32, R * 0.38, R * 1.45, 14), hairMat);
        sideBob.scale.set(0.55, 1, 0.95);
        sideBob.position.set(side * R * 0.76, -R * 0.22, 0);
        sideBob.rotation.z = side * -0.08;
        hairGrp.add(sideBob);
      });
      const backBob = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.82, R * 0.90, R * 1.35, 18, 1, false, Math.PI * 0.65, Math.PI * 1.70), hairMat);
      backBob.scale.set(headScaleX, 1, headScaleZ * 0.95);
      backBob.position.set(0, -R * 0.22, -R * 0.08);
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(R * 0.52, 16, 12), hairMat);
      fringe.scale.set(1.35, 0.46, 0.48);
      fringe.position.set(0, R * 0.62, R * 0.72);
      hairGrp.add(backBob, fringe);
    } else if (cfg.hairStyle === 'long_wave') {
      // 어깨 아래로 흐르는 우아한 여신 롱 웨이브
      const backFlow = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R * 1.08, R * 2.85, 18), hairMat);
      backFlow.scale.set(0.92, 1, 0.52);
      backFlow.position.set(0, -R * 0.92, -R * 0.48);
      hairGrp.add(backFlow);

      [-1, 1].forEach((side) => {
        const waveLock = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.26, R * 0.30, R * 2.35, 14), hairMat);
        waveLock.scale.set(0.68, 1, 0.78);
        waveLock.position.set(side * R * 0.78, -R * 0.68, R * 0.16);
        waveLock.rotation.z = side * -0.06;
        hairGrp.add(waveLock);
      });
      const sideSweep = new THREE.Mesh(new THREE.SphereGeometry(R * 0.50, 16, 12), hairMat);
      sideSweep.scale.set(1.28, 0.48, 0.48);
      sideSweep.position.set(-R * 0.18, R * 0.62, R * 0.72);
      sideSweep.rotation.z = 0.18;
      hairGrp.add(sideSweep);
    } else if (cfg.hairStyle === 'low_bun') {
      // 단아한 로우번 올림머리 + 진주 핀
      const bun = new THREE.Mesh(new THREE.SphereGeometry(R * 0.46, 16, 14), hairMat);
      bun.scale.set(1.08, 0.92, 0.95);
      bun.position.set(0, -R * 0.22, -R * 0.98);
      const pearlPin = new THREE.Mesh(new THREE.SphereGeometry(R * 0.11, 12, 12), whiteShirtMat);
      pearlPin.position.set(R * 0.22, -R * 0.04, -R * 0.88);
      const softFringe = new THREE.Mesh(new THREE.SphereGeometry(R * 0.48, 16, 12), hairMat);
      softFringe.scale.set(1.25, 0.44, 0.45);
      softFringe.position.set(-R * 0.14, R * 0.62, R * 0.70);
      hairGrp.add(bun, pearlPin, softFringe);
    } else if (cfg.hairStyle === 'ponytail') {
      // 발랄한 하이 포니테일
      const tieBand = new THREE.Mesh(new THREE.TorusGeometry(R * 0.20, R * 0.06, 10, 16), outfitMat);
      tieBand.position.set(0, R * 0.36, -R * 0.92);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(R * 0.36, R * 1.95, 16), hairMat);
      tail.rotation.x = Math.PI * 0.82;
      tail.position.set(0, -R * 0.36, -R * 1.24);
      const airyBang = new THREE.Mesh(new THREE.SphereGeometry(R * 0.50, 16, 12), hairMat);
      airyBang.scale.set(1.30, 0.44, 0.46);
      airyBang.position.set(0, R * 0.62, R * 0.72);
      hairGrp.add(tieBand, tail, airyBang);
    } else if (cfg.hairStyle === 'beret_wave') {
      // 감각적인 베레모 + 단발 웨이브
      [-1, 1].forEach((side) => {
        const lock = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.28, R * 0.34, R * 1.45, 14), hairMat);
        lock.scale.set(0.58, 1, 0.88);
        lock.position.set(side * R * 0.76, -R * 0.25, 0.04);
        hairGrp.add(lock);
      });
      const beret = new THREE.Mesh(new THREE.SphereGeometry(R * 1.16, 22, 14), outfitMat);
      beret.scale.set(1.06, 0.42, 1.04);
      beret.position.set(R * 0.12, R * 0.86, -R * 0.06);
      beret.rotation.z = -0.20;
      hairGrp.add(beret);
    }

    // 6) 액세서리 (안경 / 뿔테 / 십자가 목걸이 / 모던 크로스백)
    if (cfg.accessory === 'wire_glasses' || cfg.accessory === 'horn_glasses') {
      const frameMat = cfg.accessory === 'wire_glasses' ? goldMat : darkLeatherMat;
      const thick = cfg.accessory === 'wire_glasses' ? R * 0.028 : R * 0.052;
      const gZ = R * headScaleZ * 0.97;
      const gY = R * 0.06;
      [-1, 1].forEach((side) => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.26, thick, 10, 24), frameMat);
        rim.position.set(side * R * 0.33, gY, gZ);
        headGroup.add(rim);
      });
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(thick * 0.8, thick * 0.8, R * 0.16, 8), frameMat);
      bridge.rotation.z = Math.PI * 0.5;
      bridge.position.set(0, gY + R * 0.03, gZ);
      headGroup.add(bridge);
    } else if (cfg.accessory === 'necklace') {
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.005, 8, 20, Math.PI), silverMat);
      chain.rotation.x = Math.PI * 0.82;
      chain.position.set(0, P.shoulderY + 0.02, 0.08);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.048, 0.008), silverMat);
      crossV.position.set(0, P.shoulderY - 0.05, P.torsoTopR * 0.78);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.011, 0.008), silverMat);
      crossH.position.set(0, P.shoulderY - 0.04, P.torsoTopR * 0.78);
      rigGroup.add(chain, crossV, crossH);
    } else if (cfg.accessory === 'crossbag') {
      const bagLeather = new THREE.MeshStandardMaterial({ color: 0x5c341d, roughness: 0.45 });
      const strap = new THREE.Mesh(new THREE.TorusGeometry(P.torsoTopR * 1.38, 0.014, 8, 24), bagLeather);
      strap.rotation.y = Math.PI * 0.5;
      strap.rotation.x = 0.55;
      strap.scale.set(0.62, 1.25, 1.0);
      strap.position.set(0, P.hipY + P.torsoH * 0.44, 0);
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.20), bagLeather);
      pouch.position.set(P.hipR * 1.12, P.hipY + 0.04, 0.04);
      pouch.castShadow = true;
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

      const presetId = info.presetId || 'dandy_suit';
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

        const isModelBody = !av.avatarConfig || av.avatarConfig.bodyStyle !== 'cute';
        if (av.pose === 'sit') {
          av.bodyPivot.position.y = isModelBody ? -0.36 : -0.18;
          av.leftLeg.rotation.x = -Math.PI * 0.46;
          av.rightLeg.rotation.x = -Math.PI * 0.46;
          av.leftArm.rotation.x = -0.28;
          av.rightArm.rotation.x = av.sipTimer > 0 ? -1.35 : -0.28;
          av.headGroup.rotation.x = 0;
        } else if (av.pose === 'kneel') {
          av.bodyPivot.position.y = isModelBody ? -0.44 : -0.32;
          av.leftLeg.rotation.x = 1.38;
          av.rightLeg.rotation.x = 1.38;
          av.leftArm.rotation.x = -0.95;
          av.rightArm.rotation.x = -0.95;
          av.headGroup.rotation.x = 0.25;
        } else {
          av.headGroup.rotation.x = 0;
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
