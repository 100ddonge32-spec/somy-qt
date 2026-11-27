/* =========================================================================
 * 소미 3D 온라인 캠퍼스 — CAD / Enscape 실사 건축 인테리어 Three.js 엔진 (v3)
 * [핵심 보강] 외곽 벽체 FrontSide 자동 투과(카메라 시야 가림 원천 차단) + 선명한 CAD 명암비
 * ========================================================================= */
(function () {
  const THREE = window.THREE;
  if (!THREE) return;

  // =========================================================================
  // 🎨 정통 Pixiv VRoid (.vrm) 3D 순정만화 캐릭터 로더 · MToon 염색 · 휴머노이드 모션 엔진
  // =========================================================================
  const VRM_BASE_CDN = 'https://raw.githubusercontent.com/madjin/vrm-samples/master';

  const VRM_MODEL_URLS = {
    fumiriya: `${VRM_BASE_CDN}/vroid/beta/Sakurada_Fumiriya.vrm`,
    sample_c: `${VRM_BASE_CDN}/vroid/stable/AvatarSample_C.vrm`,
    sample_b: `${VRM_BASE_CDN}/vroid/stable/AvatarSample_B.vrm`,
    sample_a: `${VRM_BASE_CDN}/vroid/stable/AvatarSample_A.vrm`,
    shino:    `${VRM_BASE_CDN}/vroid/beta/Sendagaya_Shino.vrm`,
    vita:     `${VRM_BASE_CDN}/vroid/beta/Vita.vrm`
  };

  const AVATAR_PRESETS = [
    {
      id: 'webtoon_boy',
      label: '✨ 순정만화 안경남주 (추천)',
      config: { vrmModel: 'fumiriya', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'amber', expression: 'smile', hairColor: 'black', outfitColor: '#1c1e29', bottomColor: '#1e293b', accessory: 'horn_glasses' }
    },
    {
      id: 'lovely_wave',
      label: '🌸 순정만화 여주 (롱헤어)',
      config: { vrmModel: 'sample_a', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'original', expression: 'smile', hairColor: 'original', outfitColor: 'original', bottomColor: 'original', accessory: 'necklace' }
    },
    {
      id: 'dandy_suit',
      label: '👔 댄디 미소년 (형제)',
      config: { vrmModel: 'sample_c', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'original', expression: 'smile', hairColor: 'original', outfitColor: 'original', bottomColor: 'original', accessory: 'none' }
    },
    {
      id: 'tweed_bob',
      label: '💎 시스루 단발 여주 (자켓)',
      config: { vrmModel: 'sample_b', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'original', expression: 'smile', hairColor: 'original', outfitColor: 'original', bottomColor: 'original', accessory: 'earcuff' }
    },
    {
      id: 'trench_chic',
      label: '🧥 지적인 금테안경 남주',
      config: { vrmModel: 'fumiriya', bodyStyle: 'model', skinTone: 'warm', eyeColor: 'emerald', expression: 'smile', hairColor: 'original', outfitColor: 'original', bottomColor: 'original', accessory: 'wire_glasses' }
    },
    {
      id: 'elder_suit',
      label: '🎩 품격 실버정장 (장로·집사)',
      config: { vrmModel: 'sample_c', bodyStyle: 'model', skinTone: 'warm', eyeColor: 'original', expression: 'smile', hairColor: 'silver', outfitColor: '#1e293b', bottomColor: '#18181b', accessory: 'wire_glasses' }
    },
    {
      id: 'kwonsa_grace',
      label: '🌺 우아한 장발 자매 (시노)',
      config: { vrmModel: 'shino', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'amber', expression: 'smile', hairColor: 'espresso', outfitColor: '#6d28d9', bottomColor: '#1e1b4b', accessory: 'necklace' }
    },
    {
      id: 'cute_somy',
      label: '🧸 귀여운 보브소녀 (비타)',
      config: { vrmModel: 'vita', bodyStyle: 'cute', skinTone: 'porcelain', eyeColor: 'rose', expression: 'joy', hairColor: 'original', outfitColor: 'original', bottomColor: 'original', accessory: 'horn_glasses' }
    },
    // 하위 호환 ID 매핑
    {
      id: 'choir_gown',
      label: '🎵 은혜 성가대 스타일',
      config: { vrmModel: 'sample_a', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'sapphire', expression: 'grace', hairColor: 'ash_brown', outfitColor: '#f1f5f9', bottomColor: '#1e293b', accessory: 'necklace' }
    },
    {
      id: 'david',
      label: '다윗 (형제)',
      config: { vrmModel: 'sample_c', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'original', expression: 'smile', hairColor: 'black', outfitColor: '#1e3a8a', bottomColor: '#18181b', accessory: 'none' }
    },
    {
      id: 'miriam',
      label: '미리암 (자매)',
      config: { vrmModel: 'sample_a', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'original', expression: 'smile', hairColor: 'chestnut', outfitColor: '#be185d', bottomColor: 'original', accessory: 'necklace' }
    },
    {
      id: 'joseph',
      label: '요셉 (청년)',
      config: { vrmModel: 'fumiriya', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'emerald', expression: 'smile', hairColor: 'black', outfitColor: '#047857', bottomColor: '#1e293b', accessory: 'horn_glasses' }
    },
    {
      id: 'lydia',
      label: '루디아 (집사)',
      config: { vrmModel: 'shino', bodyStyle: 'model', skinTone: 'warm', eyeColor: 'original', expression: 'smile', hairColor: 'espresso', outfitColor: '#6d28d9', bottomColor: '#1e1b4b', accessory: 'necklace' }
    },
    {
      id: 'somy',
      label: '소미 (인도자)',
      config: { vrmModel: 'vita', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'amber', expression: 'joy', hairColor: 'original', outfitColor: 'original', bottomColor: 'original', accessory: 'none' }
    }
  ];

  const HAIR_DYE_HEX = {
    black:     '#1d1f2b',
    espresso:  '#3d261e',
    chestnut:  '#7c4b30',
    ash_brown: '#bba082',
    burgundy:  '#852440',
    silver:    '#d1d8e4'
  };

  const EYE_DYE_HEX = {
    amber:    '#f59e0b',
    sapphire: '#38bdf8',
    emerald:  '#34d399',
    amethyst: '#c084fc',
    rose:     '#fb7185'
  };

  const SKIN_MULT_HEX = {
    porcelain: '#ffffff',
    warm:      '#fff3e6',
    natural:   '#f5dec9',
    tan:       '#e2b896'
  };

  function resolveAvatarConfig(presetId, rawCfg) {
    const found = AVATAR_PRESETS.find((p) => p.id === presetId) || AVATAR_PRESETS[0];
    const base = found.config;
    const cfg = rawCfg && typeof rawCfg === 'object' ? rawCfg : {};
    const validModel = VRM_MODEL_URLS[cfg.vrmModel] || cfg.vrmModel === 'custom'
      ? cfg.vrmModel
      : (base.vrmModel || 'fumiriya');

    return {
      vrmModel: validModel,
      bodyStyle: cfg.bodyStyle === 'cute' ? 'cute' : (base.bodyStyle || 'model'),
      skinTone: SKIN_MULT_HEX[cfg.skinTone] ? cfg.skinTone : (base.skinTone || 'porcelain'),
      eyeColor: (cfg.eyeColor === 'original' || EYE_DYE_HEX[cfg.eyeColor]) ? cfg.eyeColor : (base.eyeColor || 'original'),
      expression: cfg.expression || base.expression || 'smile',
      hairColor: (cfg.hairColor === 'original' || HAIR_DYE_HEX[cfg.hairColor]) ? cfg.hairColor : (base.hairColor || 'original'),
      outfitColor: cfg.outfitColor || base.outfitColor || 'original',
      bottomColor: cfg.bottomColor || base.bottomColor || 'original',
      accessory: cfg.accessory || base.accessory || 'none'
    };
  }

  function applySrgbColorSpace(tex) {
    if (!tex) return tex;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // -------------------------------------------------------------------------
  // VRoid 원본 작화 결감(머리카락 한 올·하이라이트·옷주름·단추)을 100% 보존하는 명도 기반 염색기
  // -------------------------------------------------------------------------
  const dyedTexCache = new Map();
  function createLuminanceDyedTexture(origTex, targetHex, strength = 0.92) {
    if (!origTex || !origTex.image) return origTex;
    const key = `${origTex.uuid}|${targetHex}|${strength}`;
    if (dyedTexCache.has(key)) return dyedTexCache.get(key);

    try {
      const img = origTex.image;
      const w = Math.min(512, img.width || 256);
      const h = Math.min(512, img.height || 256);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h);

      const imData = g.getImageData(0, 0, w, h);
      const d = imData.data;
      const tc = new THREE.Color(targetHex);
      const tr = tc.r * 255;
      const tg = tc.g * 255;
      const tb = tc.b * 255;

      // 원본 텍스처 평균 명도를 계산하여 검은 머리도 밝은 실버/금발로, 밝은 머리도 칠흑 블랙으로 자연스럽게 염색!
      let lumSum = 0;
      let lumCnt = 0;
      for (let i = 0; i < d.length; i += 16) {
        if (d[i + 3] > 40) {
          lumSum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
          lumCnt++;
        }
      }
      const avgLum = Math.max(0.18, Math.min(0.85, lumCnt ? lumSum / lumCnt : 0.5));

      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        const lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
        // 원본 명암 대비(결감·엔젤링 하이라이트) 유지 비율
        const rel = Math.max(0.22, Math.min(1.65, lum / avgLum));
        const specBoost = lum > 0.84 ? (lum - 0.84) * 260 : 0;

        const nr = Math.min(255, tr * rel + specBoost);
        const ng = Math.min(255, tg * rel + specBoost);
        const nb = Math.min(255, tb * rel + specBoost);

        d[i]     = r * (1 - strength) + nr * strength;
        d[i + 1] = gg * (1 - strength) + ng * strength;
        d[i + 2] = b * (1 - strength) + nb * strength;
      }
      g.putImageData(imData, 0, 0);

      const newTex = new THREE.CanvasTexture(c);
      newTex.flipY = origTex.flipY;
      newTex.wrapS = origTex.wrapS;
      newTex.wrapT = origTex.wrapT;
      applySrgbColorSpace(newTex);
      dyedTexCache.set(key, newTex);
      return newTex;
    } catch {
      return origTex;
    }
  }

  // -------------------------------------------------------------------------
  // VRM 바이너리 네트워크 중복 다운로드 방지 캐시 & 파서
  // -------------------------------------------------------------------------
  const vrmArrayBufferCache = new Map();
  let customUserVrmBuffer = null;

  function fetchVrmBufferCached(modelKey) {
    if (modelKey === 'custom' && customUserVrmBuffer) {
      return Promise.resolve(customUserVrmBuffer);
    }
    const url = VRM_MODEL_URLS[modelKey] || VRM_MODEL_URLS.fumiriya;
    if (!vrmArrayBufferCache.has(url)) {
      const p = fetch(url, { mode: 'cors' })
        .then((res) => {
          if (!res.ok) throw new Error('VRM HTTP ' + res.status);
          return res.arrayBuffer();
        })
        .catch((err) => {
          vrmArrayBufferCache.delete(url);
          throw err;
        });
      vrmArrayBufferCache.set(url, p);
    }
    return vrmArrayBufferCache.get(url);
  }

  function parseVrmFromBuffer(arrayBuffer) {
    return new Promise((resolve, reject) => {
      if (!window.GLTFLoader || !window.VRMLoaderPlugin) {
        reject(new Error('GLTFLoader / VRMLoaderPlugin not loaded'));
        return;
      }
      const loader = new window.GLTFLoader();
      loader.register((parser) => new window.VRMLoaderPlugin(parser));
      loader.parse(
        arrayBuffer.slice(0),
        '',
        (gltf) => {
          const vrm = gltf.userData && gltf.userData.vrm;
          if (!vrm) {
            reject(new Error('Invalid VRM data'));
            return;
          }
          if (window.VRMUtils) {
            if (window.VRMUtils.removeUnnecessaryVertices) window.VRMUtils.removeUnnecessaryVertices(gltf.scene);
            if (window.VRMUtils.removeUnnecessaryJoints) window.VRMUtils.removeUnnecessaryJoints(gltf.scene);
            // VRM 0.x 모델이 +Z(정면)를 바라보도록 표준화!
            if (window.VRMUtils.rotateVRM0) window.VRMUtils.rotateVRM0(vrm);
          }

          // 재질 원본 스냅샷 기록 & 그림자·절두체 컬링 안전 설정
          const matSnapshots = [];
          const seenMats = new Set();
          vrm.scene.traverse((obj) => {
            if (obj.isMesh) {
              obj.frustumCulled = false;
              obj.castShadow = true;
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              mats.forEach((m) => {
                if (!m || seenMats.has(m)) return;
                seenMats.add(m);
                const mName = String(m.name || '');
                matSnapshots.push({
                  mat: m,
                  name: mName,
                  origMap: m.map || null,
                  origShadeMap: m.shadeMultiplyTexture || null,
                  origColor: m.color ? m.color.clone() : null,
                  origShadeColor: m.shadeColorFactor ? m.shadeColorFactor.clone() : null,
                  isHair: /Hair|FaceBrow/i.test(mName),
                  isEyeIris: /EyeIris/i.test(mName),
                  isSkin: /_SKIN|Face_00|Body_00/i.test(mName),
                  isTop: /Tops|Onepiece|Jacket|Coat|AccessoryNeck/i.test(mName),
                  isBottom: /Bottoms|Skirt|Pants/i.test(mName)
                });
              });
            }
          });

          // 기본 T-포즈 즉시 해제 (자연스러운 순정만화 차렷 스탠딩 자세 초기화)
          const hipsNode = vrm.humanoid && vrm.humanoid.getNormalizedBoneNode('hips');
          const baseHipsY = hipsNode ? hipsNode.position.y : 0.85;
          const lUA = vrm.humanoid && vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
          const rUA = vrm.humanoid && vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
          if (lUA) lUA.rotation.z = -1.22;
          if (rUA) rUA.rotation.z = 1.22;
          vrm.update(0.016);
          vrm.scene.updateMatrixWorld(true);

          // 눈·귀·목 3D 정밀 좌표 자동 계측 (어떤 VRM 모델이든 안경이 콧대·눈 위치에 1mm 오차 없이 장착됨!)
          const headRaw = vrm.humanoid && vrm.humanoid.getRawBoneNode('head');
          const lEyeRaw = vrm.humanoid && vrm.humanoid.getRawBoneNode('leftEye');
          const rEyeRaw = vrm.humanoid && vrm.humanoid.getRawBoneNode('rightEye');
          const neckRaw = vrm.humanoid && vrm.humanoid.getRawBoneNode('neck');

          let eyeBridgeLocal = new THREE.Vector3(0, 0.055, 0.085);
          let eyeHalfSpan = 0.032;

          if (headRaw) {
            const headWorldPos = new THREE.Vector3();
            headRaw.getWorldPosition(headWorldPos);

            if (lEyeRaw && rEyeRaw) {
              const lw = new THREE.Vector3();
              const rw = new THREE.Vector3();
              lEyeRaw.getWorldPosition(lw);
              rEyeRaw.getWorldPosition(rw);
              eyeHalfSpan = Math.max(0.026, Math.min(0.042, lw.distanceTo(rw) * 0.5));
              const midWorld = lw.clone().add(rw).multiplyScalar(0.5);
              // 눈뼈 중심에서 코끝/속눈썹 앞쪽으로 살짝 전진 (+Z 월드 정면 기준)
              const forwardWorld = new THREE.Vector3(0, 0, 1);
              midWorld.addScaledVector(forwardWorld, 0.042);
              eyeBridgeLocal = headRaw.worldToLocal(midWorld.clone());
            }
          }

          const accessoryAnchor = new THREE.Group();
          if (headRaw) headRaw.add(accessoryAnchor);

          const neckAnchor = new THREE.Group();
          if (neckRaw) neckRaw.add(neckAnchor);

          // 오른손 음료 컵 앵커
          const rHandRaw = vrm.humanoid && vrm.humanoid.getRawBoneNode('rightHand');
          const cupGroup = new THREE.Group();
          const cupBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.038, 0.029, 0.11, 14),
            new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.35 })
          );
          const cupSleeve = new THREE.Mesh(
            new THREE.CylinderGeometry(0.040, 0.033, 0.045, 14),
            new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 })
          );
          cupGroup.add(cupBody, cupSleeve);
          cupGroup.visible = false;
          if (rHandRaw) {
            cupGroup.position.set(0, -0.04, 0.04);
            rHandRaw.add(cupGroup);
          }

          const wrapper = new THREE.Group();
          wrapper.add(vrm.scene);

          resolve({
            vrm,
            wrapper,
            matSnapshots,
            baseHipsY,
            headRaw,
            eyeBridgeLocal,
            eyeHalfSpan,
            accessoryAnchor,
            neckAnchor,
            cupGroup,
            appliedStyleKey: ''
          });
        },
        (err) => reject(err)
      );
    });
  }

  // -------------------------------------------------------------------------
  // 이미 로드된 VRM 인스턴스에 헤어·눈동자·피부·의상 컬러·비율·안경을 0ms 즉시 적용!
  // -------------------------------------------------------------------------
  function applyStyleToVrmRecord(rec, cfg) {
    if (!rec || !rec.vrm) return;
    const styleKey = JSON.stringify(cfg);
    if (rec.appliedStyleKey === styleKey) return;
    rec.appliedStyleKey = styleKey;

    const isCute = cfg.bodyStyle === 'cute';
    rec.wrapper.scale.setScalar(isCute ? 0.96 : 1.14);
    const headNorm = rec.vrm.humanoid && rec.vrm.humanoid.getNormalizedBoneNode('head');
    if (headNorm) {
      headNorm.scale.setScalar(isCute ? 1.32 : 1.0);
    }

    const skinMult = new THREE.Color(SKIN_MULT_HEX[cfg.skinTone] || '#ffffff');

    rec.matSnapshots.forEach((snap) => {
      const m = snap.mat;
      if (snap.isHair) {
        if (cfg.hairColor && cfg.hairColor !== 'original' && HAIR_DYE_HEX[cfg.hairColor]) {
          const hex = HAIR_DYE_HEX[cfg.hairColor];
          if (snap.origMap) m.map = createLuminanceDyedTexture(snap.origMap, hex, 0.92);
          if (snap.origShadeMap) m.shadeMultiplyTexture = createLuminanceDyedTexture(snap.origShadeMap, hex, 0.92);
          if (m.color && snap.origColor) m.color.copy(snap.origColor);
          if (m.shadeColorFactor && snap.origShadeColor) m.shadeColorFactor.copy(snap.origShadeColor);
        } else {
          if (snap.origMap) m.map = snap.origMap;
          if (snap.origShadeMap) m.shadeMultiplyTexture = snap.origShadeMap;
          if (m.color && snap.origColor) m.color.copy(snap.origColor);
          if (m.shadeColorFactor && snap.origShadeColor) m.shadeColorFactor.copy(snap.origShadeColor);
        }
        m.needsUpdate = true;
      } else if (snap.isEyeIris) {
        if (cfg.eyeColor && cfg.eyeColor !== 'original' && EYE_DYE_HEX[cfg.eyeColor]) {
          const hex = EYE_DYE_HEX[cfg.eyeColor];
          if (snap.origMap) m.map = createLuminanceDyedTexture(snap.origMap, hex, 0.85);
          if (snap.origShadeMap) m.shadeMultiplyTexture = createLuminanceDyedTexture(snap.origShadeMap, hex, 0.85);
        } else {
          if (snap.origMap) m.map = snap.origMap;
          if (snap.origShadeMap) m.shadeMultiplyTexture = snap.origShadeMap;
        }
        m.needsUpdate = true;
      } else if (snap.isSkin) {
        if (m.color && snap.origColor) {
          m.color.copy(snap.origColor).multiply(skinMult);
        }
      } else if (snap.isTop) {
        if (cfg.outfitColor && cfg.outfitColor !== 'original') {
          if (snap.origMap) m.map = createLuminanceDyedTexture(snap.origMap, cfg.outfitColor, 0.88);
          if (snap.origShadeMap) m.shadeMultiplyTexture = createLuminanceDyedTexture(snap.origShadeMap, cfg.outfitColor, 0.88);
        } else {
          if (snap.origMap) m.map = snap.origMap;
          if (snap.origShadeMap) m.shadeMultiplyTexture = snap.origShadeMap;
        }
        m.needsUpdate = true;
      } else if (snap.isBottom) {
        if (cfg.bottomColor && cfg.bottomColor !== 'original') {
          if (snap.origMap) m.map = createLuminanceDyedTexture(snap.origMap, cfg.bottomColor, 0.88);
          if (snap.origShadeMap) m.shadeMultiplyTexture = createLuminanceDyedTexture(snap.origShadeMap, cfg.bottomColor, 0.88);
        } else {
          if (snap.origMap) m.map = snap.origMap;
          if (snap.origShadeMap) m.shadeMultiplyTexture = snap.origShadeMap;
        }
        m.needsUpdate = true;
      }
    });

    // 안경 · 이어커프 · 십자가 목걸이 갱신
    while (rec.accessoryAnchor.children.length > 0) {
      rec.accessoryAnchor.remove(rec.accessoryAnchor.children[0]);
    }
    while (rec.neckAnchor.children.length > 0) {
      rec.neckAnchor.remove(rec.neckAnchor.children[0]);
    }

    if (cfg.accessory === 'horn_glasses' || cfg.accessory === 'wire_glasses') {
      const isHorn = cfg.accessory === 'horn_glasses';
      const frameMat = new THREE.MeshStandardMaterial({
        color: isHorn ? 0x181924 : 0xd4af37,
        roughness: isHorn ? 0.25 : 0.20,
        metalness: isHorn ? 0.15 : 0.82
      });
      const lensMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const glareMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const gRoot = new THREE.Group();
      // headRaw 로컬 좌표계의 눈 중심점으로 정확히 이동, 월드 +Z 정면과 정렬되도록 쿼터니언 보정
      gRoot.position.copy(rec.eyeBridgeLocal);
      if (rec.headRaw) {
        const headQuat = new THREE.Quaternion();
        rec.headRaw.getWorldQuaternion(headQuat);
        gRoot.quaternion.copy(headQuat.invert());
      }

      const span = rec.eyeHalfSpan || 0.032;
      const fw = span * 1.48;
      const fh = span * 0.96;
      const th = isHorn ? 0.0046 : 0.0024;

      [-1, 1].forEach((side) => {
        const rim = new THREE.Group();
        rim.position.set(side * span * 1.02, -0.002, 0);
        rim.rotation.z = side * -0.03;

        const topB = new THREE.Mesh(new THREE.BoxGeometry(fw + th, th * 1.35, th * 1.1), frameMat);
        topB.position.y = fh * 0.5;
        const botB = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.94, th * (isHorn ? 0.85 : 0.55), th * 0.9), frameMat);
        botB.position.y = -fh * 0.5;
        const outB = new THREE.Mesh(new THREE.BoxGeometry(th, fh, th), frameMat);
        outB.position.x = side * fw * 0.48;
        const inB = new THREE.Mesh(new THREE.BoxGeometry(th * 0.85, fh * 0.92, th * 0.9), frameMat);
        inB.position.x = -side * fw * 0.46;

        const lens = new THREE.Mesh(new THREE.PlaneGeometry(fw * 0.88, fh * 0.88), lensMat);
        const glare = new THREE.Mesh(new THREE.PlaneGeometry(fw * 0.16, fh * 0.76), glareMat);
        glare.position.set(-fw * 0.15, 0, 0.001);
        glare.rotation.z = -0.38;

        const temple = new THREE.Mesh(new THREE.BoxGeometry(th * 0.75, th * 0.85, 0.085), frameMat);
        temple.position.set(side * fw * 0.50, fh * 0.20, -0.042);

        rim.add(topB, botB, outB, inB, lens, glare, temple);
        gRoot.add(rim);
      });

      const bridge = new THREE.Mesh(new THREE.BoxGeometry(span * 0.58, th, th), frameMat);
      bridge.position.set(0, fh * 0.28, 0.001);
      gRoot.add(bridge);
      rec.accessoryAnchor.add(gRoot);
    }

    if (cfg.accessory === 'earcuff' || cfg.accessory === 'horn_glasses') {
      const cuffGroup = new THREE.Group();
      cuffGroup.position.copy(rec.eyeBridgeLocal);
      if (rec.headRaw) {
        const headQuat = new THREE.Quaternion();
        rec.headRaw.getWorldQuaternion(headQuat);
        cuffGroup.quaternion.copy(headQuat.invert());
      }
      const cuffMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.18 });
      const earX = (rec.eyeHalfSpan || 0.032) * 2.55;
      [-0.006, -0.016].forEach((cy) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0065, 0.0016, 8, 14), cuffMat);
        ring.position.set(earX, cy, -0.048);
        ring.rotation.y = Math.PI * 0.42;
        cuffGroup.add(ring);
      });
      rec.accessoryAnchor.add(cuffGroup);
    }

    if (cfg.accessory === 'necklace') {
      const nGroup = new THREE.Group();
      if (rec.neckAnchor.parent) {
        const nq = new THREE.Quaternion();
        rec.neckAnchor.parent.getWorldQuaternion(nq);
        nGroup.quaternion.copy(nq.invert());
      }
      const silverMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.88, roughness: 0.16 });
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.0022, 8, 22, Math.PI), silverMat);
      chain.rotation.x = Math.PI * 0.78;
      chain.position.set(0, -0.055, 0.048);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.028, 0.004), silverMat);
      crossV.position.set(0, -0.102, 0.078);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.006, 0.004), silverMat);
      crossH.position.set(0, -0.096, 0.078);
      nGroup.add(chain, crossV, crossH);
      rec.neckAnchor.add(nGroup);
    }
  }

  // -------------------------------------------------------------------------
  // VRM 페이셜 표정(BlendShape) & 휴머노이드 본(스탠딩·걷기·앉기·무릎기도) 실시간 애니메이터
  // -------------------------------------------------------------------------
  function animateVrmRecord(rec, opts, dt, elapsed) {
    if (!rec || !rec.vrm) return;
    const vrm = rec.vrm;
    const expr = (opts.cfg && opts.cfg.expression) || 'smile';
    const pose = opts.pose || 'stand';
    const moving = !!opts.moving;
    const walkPhase = opts.walkPhase || 0;
    const sipTimer = opts.sipTimer || 0;
    const blinkOffset = opts.blinkOffset || 0;

    // 1) 페이셜 표정 + 자연스러운 눈 깜빡임
    const em = vrm.expressionManager;
    if (em) {
      ['happy', 'relaxed', 'angry', 'sad', 'surprised', 'blink', 'blinkLeft', 'blinkRight'].forEach((k) => {
        try { em.setValue(k, 0); } catch {}
      });

      const autoBlink = ((elapsed + blinkOffset) % 4.3) > 4.16 ? 1.0 : 0.0;

      try {
        if (expr === 'joy') {
          em.setValue('happy', 1.0);
        } else if (expr === 'pray') {
          em.setValue('blink', 1.0);
          em.setValue('relaxed', 0.45);
        } else if (expr === 'grace') {
          em.setValue('surprised', 0.35);
          em.setValue('relaxed', 0.65);
          if (autoBlink) em.setValue('blink', 1.0);
        } else if (expr === 'wink') {
          em.setValue('blinkRight', 1.0);
          em.setValue('relaxed', 0.65);
        } else if (expr === 'calm') {
          if (autoBlink) em.setValue('blink', 1.0);
        } else {
          // 기본 smile: 다정한 순정만화 미소
          em.setValue('relaxed', 0.78);
          em.setValue('happy', 0.16);
          if (autoBlink) em.setValue('blink', 1.0);
        }
      } catch {}
    }

    // 2) 휴머노이드 전신 본 모션
    const h = vrm.humanoid;
    if (h) {
      const hips = h.getNormalizedBoneNode('hips');
      const spine = h.getNormalizedBoneNode('spine');
      const neck = h.getNormalizedBoneNode('neck');
      const head = h.getNormalizedBoneNode('head');
      const lUA = h.getNormalizedBoneNode('leftUpperArm');
      const rUA = h.getNormalizedBoneNode('rightUpperArm');
      const lLA = h.getNormalizedBoneNode('leftLowerArm');
      const rLA = h.getNormalizedBoneNode('rightLowerArm');
      const lUL = h.getNormalizedBoneNode('leftUpperLeg');
      const rUL = h.getNormalizedBoneNode('rightUpperLeg');
      const lLL = h.getNormalizedBoneNode('leftLowerLeg');
      const rLL = h.getNormalizedBoneNode('rightLowerLeg');

      const breathe = Math.sin(elapsed * 2.1 + blinkOffset) * 0.022;

      if (pose === 'sit') {
        if (hips) hips.position.y = rec.baseHipsY - 0.34;
        if (spine) spine.rotation.set(0.03 + breathe * 0.4, 0, 0);
        if (neck) neck.rotation.set(0, 0, Math.sin(elapsed * 1.1 + blinkOffset) * 0.03);
        if (head) head.rotation.set(0, 0, 0);
        if (lUL) lUL.rotation.set(1.42, 0.06, 0);
        if (rUL) rUL.rotation.set(1.42, -0.06, 0);
        if (lLL) lLL.rotation.set(-1.42, 0, 0);
        if (rLL) rLL.rotation.set(-1.42, 0, 0);
        if (lUA) lUA.rotation.set(0.28, 0, -1.16);
        if (rUA) rUA.rotation.set(sipTimer > 0 ? 1.05 : 0.28, 0, 1.16);
        if (lLA) lLA.rotation.set(0, -0.35, 0);
        if (rLA) rLA.rotation.set(0, sipTimer > 0 ? 1.15 : 0.35, 0);
      } else if (pose === 'kneel') {
        // 강단 앞 무릎 꿇고 두 손 모아 간절히 기도하는 자세
        if (hips) hips.position.y = rec.baseHipsY - 0.42;
        if (spine) spine.rotation.set(-0.14, 0, 0);
        if (neck) neck.rotation.set(-0.26, 0, 0);
        if (head) head.rotation.set(-0.12, 0, 0);
        if (lUL) lUL.rotation.set(0.28, 0.04, 0);
        if (rUL) rUL.rotation.set(0.28, -0.04, 0);
        if (lLL) lLL.rotation.set(-2.18, 0, 0);
        if (rLL) rLL.rotation.set(-2.18, 0, 0);
        if (lUA) lUA.rotation.set(0.68, 0.38, -0.95);
        if (rUA) rUA.rotation.set(0.68, -0.38, 0.95);
        if (lLA) lLA.rotation.set(0, -1.25, 0);
        if (rLA) rLA.rotation.set(0, 1.25, 0);
      } else if (moving) {
        // 경쾌하고 자연스러운 순정만화 워킹 사이클
        const sw = Math.sin(walkPhase) * 0.56;
        if (hips) hips.position.y = rec.baseHipsY + Math.abs(Math.sin(walkPhase * 2)) * 0.032;
        if (spine) spine.rotation.set(-0.04, Math.sin(walkPhase) * 0.06, 0);
        if (neck) neck.rotation.set(0, 0, 0);
        if (head) head.rotation.set(0, 0, 0);
        if (lUL) lUL.rotation.set(sw, 0, 0);
        if (rUL) rUL.rotation.set(-sw, 0, 0);
        if (lLL) lLL.rotation.set(-Math.max(0, -sw) * 0.85 - 0.08, 0, 0);
        if (rLL) rLL.rotation.set(-Math.max(0, sw) * 0.85 - 0.08, 0, 0);
        if (lUA) lUA.rotation.set(-sw * 0.55, 0, -1.18);
        if (rUA) rUA.rotation.set(sipTimer > 0 ? 1.05 : sw * 0.55, 0, 1.18);
        if (lLA) lLA.rotation.set(0, -0.22, 0);
        if (rLA) rLA.rotation.set(0, sipTimer > 0 ? 1.15 : 0.22, 0);
      } else {
        // 순정만화 아이들 스탠딩 숨쉬기 & 고개 살랑임
        if (hips) hips.position.y = rec.baseHipsY + breathe * 0.35;
        if (spine) spine.rotation.set(breathe * 0.5, Math.sin(elapsed * 0.9 + blinkOffset) * 0.025, 0);
        if (neck) neck.rotation.set(0, Math.sin(elapsed * 0.7 + blinkOffset) * 0.035, Math.sin(elapsed * 1.1 + blinkOffset) * 0.028);
        if (head) head.rotation.set(0, 0, 0);
        if (lUL) lUL.rotation.set(0, 0.02, -0.02);
        if (rUL) rUL.rotation.set(0, -0.02, 0.02);
        if (lLL) lLL.rotation.set(0, 0, 0);
        if (rLL) rLL.rotation.set(0, 0, 0);
        if (lUA) lUA.rotation.set(0.04, 0, -1.22 - breathe * 0.4);
        if (rUA) rUA.rotation.set(sipTimer > 0 ? 1.05 : 0.04, 0, 1.22 + breathe * 0.4);
        if (lLA) lLA.rotation.set(0, -0.16, 0);
        if (rLA) rLA.rotation.set(0, sipTimer > 0 ? 1.15 : 0.16, 0);
      }
    }

    // SpringBone 머리카락·옷자락 물리 연산을 포함한 VRM 프레임 업데이트!
    vrm.update(dt);
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
      if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if (THREE.sRGBEncoding) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }

      this.pbr = new window.ArchitecturalPBR(this.renderer);
      this.scene.environment = this.pbr.envMap;

      this.roomGroup = new THREE.Group();
      this.avatarGroup = new THREE.Group();
      this.scene.add(this.roomGroup);
      this.scene.add(this.avatarGroup);

      this.boardTexture = new THREE.CanvasTexture(this.boardCanvas);
      this.boardTexture.minFilter = THREE.LinearFilter;
      applySrgbColorSpace(this.boardTexture);
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

    setCustomUserVrmBuffer(buffer) {
      customUserVrmBuffer = buffer;
    }

    async loadVrmRecordForStudio(presetId, rawCfg) {
      const cfg = resolveAvatarConfig(presetId, rawCfg);
      const buf = await fetchVrmBufferCached(cfg.vrmModel);
      const rec = await parseVrmFromBuffer(buf);
      applyStyleToVrmRecord(rec, cfg);
      return rec;
    }

    applyStyleToStudioVrm(rec, presetId, rawCfg) {
      const cfg = resolveAvatarConfig(presetId, rawCfg);
      applyStyleToVrmRecord(rec, cfg);
    }

    animateStudioVrm(rec, presetId, rawCfg, dt, elapsed) {
      const cfg = resolveAvatarConfig(presetId, rawCfg);
      animateVrmRecord(rec, { cfg, pose: 'stand', moving: false, blinkOffset: 0.5 }, dt, elapsed);
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
    // 정통 Pixiv VRoid (.vrm) 3D 순정만화 아바타 생성 · 로드 · 스타일 동기화
    // -----------------------------------------------------------------------
    _mountVrmOntoAvatar(av) {
      const cfg = av.avatarConfig;
      const targetModel = cfg.vrmModel || 'fumiriya';
      const loadTicket = ++av.vrmLoadTicket;

      if (av.loadedVrmModelKey === targetModel && av.vrmRecord) {
        applyStyleToVrmRecord(av.vrmRecord, cfg);
        av.vrmRecord.cupGroup.visible = !!av.drink;
        av.heightTop = cfg.bodyStyle === 'cute' ? 1.78 : 2.04;
        return;
      }

      fetchVrmBufferCached(targetModel)
        .then((buf) => parseVrmFromBuffer(buf))
        .then((rec) => {
          if (loadTicket !== av.vrmLoadTicket || !this.avatars.has(av.id)) return;
          if (av.vrmRecord && av.vrmRecord.wrapper) {
            av.bodyPivot.remove(av.vrmRecord.wrapper);
          }
          if (av.loadingHolo) {
            av.bodyPivot.remove(av.loadingHolo);
            av.loadingHolo = null;
          }
          av.vrmRecord = rec;
          av.loadedVrmModelKey = targetModel === 'custom' ? `custom_${Date.now()}` : targetModel;
          applyStyleToVrmRecord(rec, av.avatarConfig);
          rec.cupGroup.visible = !!av.drink;
          av.heightTop = av.avatarConfig.bodyStyle === 'cute' ? 1.78 : 2.04;
          av.bodyPivot.add(rec.wrapper);
        })
        .catch((err) => {
          console.warn('[VRM Load Warning]', targetModel, err);
        });
    }

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
        const rg = new THREE.RingGeometry(0.42, 0.52, 32);
        rg.rotateX(-Math.PI / 2);
        myRing = new THREE.Mesh(
          rg,
          new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        );
        myRing.position.y = 0.03;
        root.add(myRing);
      }

      // VRM 로딩 전 0.8초간 보이는 은은한 빛 기둥 실루엣
      const loadingHolo = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.24, 1.55, 16),
        new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.18 })
      );
      loadingHolo.position.y = 0.80;
      bodyPivot.add(loadingHolo);

      const presetId = info.presetId || 'webtoon_boy';
      const resolvedCfg = resolveAvatarConfig(presetId, info.avatarConfig);

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
        avatarConfig: resolvedCfg,
        vrmRecord: null,
        loadedVrmModelKey: '',
        vrmLoadTicket: 0,
        loadingHolo,
        pose: info.pose || 'stand',
        drink: info.drink || '',
        sipTimer: 0,
        micWave: false,
        root,
        bodyPivot,
        blinkOffset: Math.random() * 4.5,
        heightTop: resolvedCfg.bodyStyle === 'cute' ? 1.78 : 2.04,
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
      this._mountVrmOntoAvatar(av);
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

      if (info.presetId !== undefined || info.avatarConfig !== undefined) {
        const nextPreset = info.presetId || av.presetId;
        const nextCfg = resolveAvatarConfig(nextPreset, info.avatarConfig !== undefined ? info.avatarConfig : av.avatarConfig);
        av.presetId = nextPreset;
        av.avatarConfig = nextCfg;
        if (info.forceReloadVrm) av.loadedVrmModelKey = '';
        this._mountVrmOntoAvatar(av);
      }

      if (typeof info.x === 'number') av.tx = info.x;
      if (typeof info.y === 'number') av.ty = info.y;
      if (typeof info.z === 'number') av.tz = info.z;
      if (typeof info.rotY === 'number') av.tRotY = info.rotY;
      if (info.pose) av.pose = info.pose;
      if (info.drink !== undefined) {
        av.drink = info.drink;
        if (av.vrmRecord && av.vrmRecord.cupGroup) {
          av.vrmRecord.cupGroup.visible = !!av.drink;
        }
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

        const moving = av.isMe
          ? !!(this.walkTarget || this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d'] || this.keys['arrowup'] || this.keys['arrowdown'] || this.keys['arrowleft'] || this.keys['arrowright'] || Math.hypot(this.joyVec.x, this.joyVec.y) > 0.08)
          : Math.hypot(av.tx - av.x, av.tz - av.z) > 0.04;

        if (av.vrmRecord) {
          animateVrmRecord(
            av.vrmRecord,
            {
              cfg: av.avatarConfig,
              pose: av.pose,
              moving: av.pose === 'stand' && moving,
              walkPhase: av.walkPhase,
              sipTimer: av.sipTimer,
              blinkOffset: av.blinkOffset
            },
            dt,
            elapsed
          );
        } else if (av.loadingHolo) {
          av.loadingHolo.material.opacity = 0.14 + Math.sin(elapsed * 5) * 0.06;
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
