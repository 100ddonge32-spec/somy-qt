/* =========================================================================
 * 소미 3D 온라인 캠퍼스 (그레이스 월드) — Three.js WebGL 3D 엔진
 * 7개 테마 공간 + 3인칭 추적/전체 파노라마 카메라 + 3D 치비 아바타 + 3D 스마트 칠판
 * ========================================================================= */
(function () {
  const THREE = window.THREE;
  if (!THREE) {
    console.error('Three.js not loaded');
    return;
  }

  const AVATAR_PRESETS = [
    { id: 'david',  label: '다윗 (형제)', hair: 0x261a15, outfit: 0x3b82f6, pants: 0x1e293b, skin: 0xffe0c8, bag: 0x78350f, hairType: 'short' },
    { id: 'miriam', label: '미리암 (자매)', hair: 0x4a2c18, outfit: 0xf472b6, pants: 0x334155, skin: 0xffe6d5, bag: 0x9d174d, hairType: 'bun' },
    { id: 'joseph', label: '요셉 (청년)', hair: 0x18181b, outfit: 0x10b981, pants: 0x1f2937, skin: 0xffdfca, bag: 0x3f6212, hairType: 'short' },
    { id: 'lydia',  label: '루디아 (집사)', hair: 0x5c3a21, outfit: 0xa855f7, pants: 0x312e81, skin: 0xffe4d0, bag: 0x6b21a8, hairType: 'bob' },
    { id: 'somy',   label: '소미 (인도자)', hair: 0x3f2e21, outfit: 0xf59e0b, pants: 0x1e293b, skin: 0xffe8d6, bag: 0xb45309, hairType: 'bob' }
  ];

  const ZONE_META = {
    garden: {
      id: 'garden',
      name: '🌿 앞마당 정원',
      subtitle: '산책로 · 소미카페 · 대성전 입구 계단',
      sky: 0x0f172a,
      fogColor: 0x131d35,
      fogDensity: 0.008,
      spawn: { x: 0, z: 24, rotY: Math.PI },
      panorama: { pos: [0, 26, 42], look: [0, 3, -6] },
      bounds: { x: 34, zMin: -28, zMax: 34 },
      hasBoard: false
    },
    sanctuary: {
      id: 'sanctuary',
      name: '🏛️ 그레이스 대성전',
      subtitle: '원형 극장석 · 대형 와이드스크린 · 제단 무릎기도',
      sky: 0x0b0f1d,
      fogColor: 0x11172b,
      fogDensity: 0.0065,
      spawn: { x: 0, z: 26, rotY: Math.PI },
      panorama: { pos: [0, 25, 38], look: [0, 5, -10] },
      bounds: { x: 32, zMin: -26, zMax: 30 },
      hasBoard: true,
      boardPos: [0, 8.8, -24.2],
      boardSize: [22, 9.2]
    },
    sarangbang: {
      id: 'sarangbang',
      name: '🏠 사랑방 (소그룹실)',
      subtitle: '그룹별 독립 모임방 · 원형 소파 교제 · 소그룹 칠판/PPT',
      sky: 0x181210,
      fogColor: 0x211815,
      fogDensity: 0.009,
      spawn: { x: 0, z: 13, rotY: Math.PI },
      panorama: { pos: [0, 17, 21], look: [0, 3.2, -3] },
      bounds: { x: 16, zMin: -14, zMax: 15 },
      hasBoard: true,
      boardPos: [0, 5.4, -13.4],
      boardSize: [12.5, 6.0]
    },
    bible: {
      id: 'bible',
      name: '📖 성경통독방',
      subtitle: '개역개정 성경 66권 열람 · 통독 책상 · 성경 세미나 보드',
      sky: 0x121620,
      fogColor: 0x171d2b,
      fogDensity: 0.0085,
      spawn: { x: 0, z: 15, rotY: Math.PI },
      panorama: { pos: [0, 18, 24], look: [0, 3.5, -4] },
      bounds: { x: 18, zMin: -16, zMax: 17 },
      hasBoard: true,
      boardPos: [0, 5.8, -15.3],
      boardSize: [13.5, 6.4]
    },
    qt: {
      id: 'qt',
      name: '✏️ 큐티방 (강의·나눔실)',
      subtitle: '관리자 큐티 기초반 강의안 · 오늘의 큐티 · 실시간 묵상 나눔',
      sky: 0x111827,
      fogColor: 0x172033,
      fogDensity: 0.0085,
      spawn: { x: 0, z: 15, rotY: Math.PI },
      panorama: { pos: [0, 18, 24], look: [0, 3.8, -4] },
      bounds: { x: 18, zMin: -16, zMax: 17 },
      hasBoard: true,
      boardPos: [0, 5.8, -15.3],
      boardSize: [14.0, 6.6]
    },
    prayer: {
      id: 'prayer',
      name: '🕯️ 기도실 & 말씀갤러리',
      subtitle: '성경 명화·말씀 액자 산책 · 골방 촛불 무릎기도',
      sky: 0x090b14,
      fogColor: 0x0f1322,
      fogDensity: 0.01,
      spawn: { x: 0, z: 17, rotY: Math.PI },
      panorama: { pos: [0, 17, 25], look: [0, 3.2, -4] },
      bounds: { x: 16, zMin: -17, zMax: 19 },
      hasBoard: true,
      boardPos: [0, 5.5, -16.3],
      boardSize: [11.5, 5.5]
    },
    rooftop: {
      id: 'rooftop',
      name: '☕ 루프탑 소미카페',
      subtitle: '별빛 야경 정원 · 커피/음료 마시기 · 4인 교제 테이블',
      sky: 0x070b19,
      fogColor: 0x0c1329,
      fogDensity: 0.0075,
      spawn: { x: 0, z: 18, rotY: Math.PI },
      panorama: { pos: [0, 20, 28], look: [0, 2.5, -2] },
      bounds: { x: 22, zMin: -18, zMax: 21 },
      hasBoard: true,
      boardPos: [0, 5.4, -17.2],
      boardSize: [11.5, 5.4]
    }
  };

  const GALLERY_ARTWORKS = [
    { title: '창조의 빛 (창세기 1:3)', desc: '하나님이 이르시되 빛이 있으라 하시니 빛이 있었고 — 어둠 위에 임한 첫 은혜의 빛', color1: '#0f172a', color2: '#fbbf24' },
    { title: '선한 목자 (시편 23:1-2)', desc: '여호와는 나의 목자시니 내게 부족함이 없으리로다 그가 나를 푸른 풀밭에 누이시며', color1: '#064e3b', color2: '#6ee7b7' },
    { title: '광야의 기둥 (출애굽기 13:21)', desc: '낮에는 구름 기둥, 밤에는 불 기둥으로 자기 백성 앞길을 인도하시는 신실하신 주님', color1: '#431407', color2: '#fb923c' },
    { title: '겟세마네의 기도 (누가복음 22:42)', desc: '내 원대로 마시옵고 아버지의 원대로 되기를 원하나이다 — 순종의 무릎', color1: '#1e1b4b', color2: '#818cf8' },
    { title: '갈보리 십자가 사랑 (로마서 5:8)', desc: '우리가 아직 죄인 되었을 때에 그리스도께서 우리를 위하여 죽으심으로 확증하신 사랑', color1: '#4c0519', color2: '#fda4af' },
    { title: '부활과 소망 (요한복음 11:25)', desc: '나는 부활이요 생명이니 나를 믿는 자는 죽어도 살겠고 — 영원한 생명의 아침', color1: '#1e3a8a', color2: '#fef08a' }
  ];

  class ChapelWorld3D {
    constructor(opts) {
      this.canvas = opts.canvas;
      this.overlayContainer = opts.overlayContainer;
      this.boardCanvas = opts.boardCanvas; // 공용 2D 칠판/슬라이드 오프스크린 캔버스
      this.onInteract = opts.onInteract || (() => {});
      this.onProximityChange = opts.onProximityChange || (() => {});
      this.onPortalEnter = opts.onPortalEnter || (() => {});
      this.onLocalMove = opts.onLocalMove || (() => {});

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.2, 260);
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      this.roomGroup = new THREE.Group();
      this.avatarGroup = new THREE.Group();
      this.scene.add(this.roomGroup);
      this.scene.add(this.avatarGroup);

      this.boardTexture = new THREE.CanvasTexture(this.boardCanvas);
      this.boardTexture.minFilter = THREE.LinearFilter;
      this.boardMesh = null;

      // 걸어서 이동할 때 바닥 타겟 링
      const ringGeo = new THREE.RingGeometry(0.42, 0.62, 28);
      ringGeo.rotateX(-Math.PI / 2);
      this.walkRing = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
      );
      this.walkRing.position.y = 0.06;
      this.scene.add(this.walkRing);

      this.raycaster = new THREE.Raycaster();
      this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

      this.currentZone = 'garden';
      this.cameraMode = 'follow'; // 'follow' | 'panorama'
      this.camYaw = 0;
      this.camPitch = 0.34;
      this.camDist = 9.5;
      this.panoYaw = 0;
      this.panoPitch = 0.42;
      this.panoDist = 36;

      this.keys = {};
      this.joyVec = { x: 0, y: 0 };
      this.interactables = []; // { id, type, label, x, y, z, radius, rotY, payload, mesh }
      this.portals = [];
      this.candleGroup = null;
      this.nearestInteractable = null;

      this.avatars = new Map(); // id -> avatarObj
      this.myId = 'me';
      this.walkTarget = null;
      this.clock = new THREE.Clock();
      this.lastBroadcastAt = 0;

      this._setupInput();
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    getPresets() {
      return AVATAR_PRESETS;
    }

    getZoneMeta(zoneId) {
      return ZONE_META[zoneId] || ZONE_META.garden;
    }

    markBoardDirty() {
      if (this.boardTexture) this.boardTexture.needsUpdate = true;
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const w = Math.max(280, rect.width);
      const h = Math.max(260, rect.height);
      this.viewW = w;
      this.viewH = h;
      this.camera.aspect = w / h;
      // 모바일 세로 화면에서도 좌우 시야가 답답하지 않도록 세로 비율일 때 수직 FOV 자동 확장
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
        this.panoPitch = Math.asin(Math.max(0.15, Math.min(0.85, dy / this.panoDist)));
      }
    }

    zoomBy(delta) {
      if (this.cameraMode === 'panorama') {
        this.panoDist = Math.max(12, Math.min(68, this.panoDist + delta * 2.2));
      } else {
        this.camDist = Math.max(4.5, Math.min(22, this.camDist + delta));
      }
    }

    setJoystick(jx, jy) {
      this.joyVec.x = jx;
      this.joyVec.y = jy;
    }

    // -----------------------------------------------------------------------
    // 귀여운 3D 치비 아바타 생성 (팔다리 관절, 배낭, 헤어스타일, 커피컵, 기도/착석 포즈)
    // -----------------------------------------------------------------------
    createAvatar(id, info) {
      if (this.avatars.has(id)) {
        this.updateAvatarInfo(id, info);
        return this.avatars.get(id);
      }

      const preset = AVATAR_PRESETS.find((p) => p.id === info.presetId) || AVATAR_PRESETS[0];
      const root = new THREE.Group();

      const bodyPivot = new THREE.Group();
      root.add(bodyPivot);

      const skinMat = new THREE.MeshLambertMaterial({ color: preset.skin });
      const hairMat = new THREE.MeshLambertMaterial({ color: preset.hair });
      const outfitMat = new THREE.MeshLambertMaterial({ color: preset.outfit });
      const pantsMat = new THREE.MeshLambertMaterial({ color: preset.pants });
      const bagMat = new THREE.MeshLambertMaterial({ color: preset.bag });

      // 발밑 그림자 & 내 캐릭터 링
      const shadowMesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.58, 20),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 })
      );
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.03;
      root.add(shadowMesh);

      let myRing = null;
      if (info.isMe) {
        const rg = new THREE.RingGeometry(0.64, 0.78, 28);
        rg.rotateX(-Math.PI / 2);
        myRing = new THREE.Mesh(
          rg,
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
        );
        myRing.position.y = 0.04;
        root.add(myRing);
      }

      // 다리 (좌/우 관절)
      const legGeo = new THREE.BoxGeometry(0.28, 0.62, 0.30);
      legGeo.translate(0, -0.31, 0);
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.19, 0.62, 0);
      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.19, 0.62, 0);
      bodyPivot.add(leftLeg, rightLeg);

      // 몸통 & 흰 카라 & 작은 배낭 (작은빛 감성!)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.82, 0.48), outfitMat);
      torso.position.y = 1.02;
      bodyPivot.add(torso);

      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 0.10, 14),
        new THREE.MeshLambertMaterial({ color: 0xf8fafc })
      );
      collar.position.y = 1.44;
      bodyPivot.add(collar);

      const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.56, 0.24), bagMat);
      backpack.position.set(0, 1.02, -0.32);
      bodyPivot.add(backpack);

      // 팔 (좌/우 관절) + 오른손 커피/생수 컵
      const armGeo = new THREE.BoxGeometry(0.22, 0.64, 0.24);
      armGeo.translate(0, -0.28, 0);
      const leftArm = new THREE.Mesh(armGeo, outfitMat);
      leftArm.position.set(-0.50, 1.34, 0);
      const rightArm = new THREE.Mesh(armGeo, outfitMat);
      rightArm.position.set(0.50, 1.34, 0);
      bodyPivot.add(leftArm, rightArm);

      const cupGroup = new THREE.Group();
      const cupBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.085, 0.26, 12),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
      );
      const cupSleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.113, 0.095, 0.11, 12),
        new THREE.MeshLambertMaterial({ color: 0xb45309 })
      );
      cupGroup.add(cupBody, cupSleeve);
      cupGroup.position.set(0, -0.54, 0.18);
      cupGroup.visible = !!info.drink;
      rightArm.add(cupGroup);

      // 머리 & 얼굴(눈, 볼터치) & 헤어
      const headGroup = new THREE.Group();
      headGroup.position.y = 1.92;
      bodyPivot.add(headGroup);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 16), skinMat);
      headGroup.add(head);

      const eyeGeo = new THREE.SphereGeometry(0.055, 10, 10);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.17, -0.02, 0.47);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.17, -0.02, 0.47);
      headGroup.add(leftEye, rightEye);

      const blushGeo = new THREE.CircleGeometry(0.075, 12);
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.45 });
      const leftBlush = new THREE.Mesh(blushGeo, blushMat);
      leftBlush.position.set(-0.27, -0.11, 0.46);
      leftBlush.rotation.y = -0.35;
      const rightBlush = new THREE.Mesh(blushGeo, blushMat);
      rightBlush.position.set(0.27, -0.11, 0.46);
      rightBlush.rotation.y = 0.35;
      headGroup.add(leftBlush, rightBlush);

      const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.555, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
        hairMat
      );
      hairCap.position.y = 0.04;
      hairCap.rotation.x = -0.18;
      headGroup.add(hairCap);

      const hairBack = new THREE.Mesh(
        new THREE.SphereGeometry(0.54, 16, 14),
        hairMat
      );
      hairBack.position.set(0, 0.02, -0.08);
      headGroup.add(hairBack);

      const bunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), hairMat);
      bunMesh.position.set(0, 0.56, -0.18);
      bunMesh.visible = preset.hairType === 'bun';
      headGroup.add(bunMesh);

      // HTML 이름표 + 말풍선 DOM 오버레이
      const labelEl = document.createElement('div');
      labelEl.className = 'pointer-events-none absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-1 z-10';
      labelEl.innerHTML = `
        <div class="av-bubble hidden px-2.5 py-1 rounded-xl bg-white/95 text-slate-900 border border-amber-400 text-[11px] font-bold shadow-lg max-w-[210px] text-center break-keep"></div>
        <div class="av-tag px-2 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap shadow ${
          info.isMe ? 'bg-amber-400 text-slate-950' : info.isNpc ? 'bg-slate-800/80 text-slate-200 border border-white/10' : 'bg-emerald-500/90 text-slate-950'
        }"></div>
      `;
      this.overlayContainer.appendChild(labelEl);

      const av = {
        id,
        name: info.name || '성도',
        isMe: !!info.isMe,
        isNpc: !!info.isNpc,
        presetId: preset.id,
        pose: info.pose || 'stand', // 'stand' | 'sit' | 'kneel'
        drink: info.drink || '',
        sipTimer: 0,
        micWave: false,
        root,
        bodyPivot,
        headGroup,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        cupGroup,
        bunMesh,
        skinMat,
        hairMat,
        outfitMat,
        pantsMat,
        bagMat,
        myRing,
        labelEl,
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
      if (info.presetId && info.presetId !== av.presetId) {
        const pr = AVATAR_PRESETS.find((p) => p.id === info.presetId) || AVATAR_PRESETS[0];
        av.presetId = pr.id;
        av.skinMat.color.setHex(pr.skin);
        av.hairMat.color.setHex(pr.hair);
        av.outfitMat.color.setHex(pr.outfit);
        av.pantsMat.color.setHex(pr.pants);
        av.bagMat.color.setHex(pr.bag);
        av.bunMesh.visible = pr.hairType === 'bun';
      }
      if (typeof info.x === 'number') av.tx = info.x;
      if (typeof info.y === 'number') av.ty = info.y;
      if (typeof info.z === 'number') av.tz = info.z;
      if (typeof info.rotY === 'number') av.tRotY = info.rotY;
      if (info.pose) av.pose = info.pose;
      if (info.drink !== undefined) {
        av.drink = info.drink;
        av.cupGroup.visible = !!av.drink;
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
    // 7개 3D 공간(맵) 지오메트리 빌더
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

      while (this.roomGroup.children.length > 0) {
        this.roomGroup.remove(this.roomGroup.children[0]);
      }

      this.scene.background = new THREE.Color(meta.sky);
      this.scene.fog = new THREE.FogExp2(meta.fogColor, meta.fogDensity);

      // 공통 기본 조명
      const hemi = new THREE.HemisphereLight(0xfffbeb, 0x1e293b, 0.78);
      this.roomGroup.add(hemi);
      const dir = new THREE.DirectionalLight(0xfff4d6, 0.72);
      dir.position.set(16, 34, 22);
      this.roomGroup.add(dir);

      // 공간별 디테일 건축물 배치
      if (meta.id === 'garden') this._buildGarden();
      else if (meta.id === 'sanctuary') this._buildSanctuary(opts.candles || []);
      else if (meta.id === 'sarangbang') this._buildSarangbang(opts.sarangbangName || '사랑방');
      else if (meta.id === 'bible') this._buildBibleRoom();
      else if (meta.id === 'qt') this._buildQtRoom();
      else if (meta.id === 'prayer') this._buildPrayerGallery();
      else if (meta.id === 'rooftop') this._buildRooftop();

      // 정면 3D 스마트 칠판 / 대형 와이드 스크린 생성
      if (meta.hasBoard) {
        const [bx, by, bz] = meta.boardPos;
        const [bw, bh] = meta.boardSize;

        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(bw + 0.7, bh + 0.7, 0.35),
          new THREE.MeshLambertMaterial({ color: 0xd97706 })
        );
        frame.position.set(bx, by, bz - 0.2);
        this.roomGroup.add(frame);

        this.boardMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(bw, bh),
          new THREE.MeshBasicMaterial({ map: this.boardTexture })
        );
        this.boardMesh.position.set(bx, by, bz);
        this.roomGroup.add(this.boardMesh);

        this.interactables.push({
          id: 'room-board',
          type: 'board',
          label: '👨‍🏫 칠판·PPT·화면공유 열기',
          x: bx,
          y: 0,
          z: bz + 4.5,
          radius: 5.0,
          mesh: this.boardMesh
        });
      }

      // 내 아바타 스폰 위치 이동
      const me = this.avatars.get(this.myId);
      const sp = opts.spawn || meta.spawn;
      if (me) {
        me.pose = 'stand';
        me.x = me.tx = sp.x;
        me.y = me.ty = 0;
        me.z = me.tz = sp.z;
        me.rotY = me.tRotY = sp.rotY ?? Math.PI;
        me.root.position.set(me.x, 0, me.z);
        me.root.rotation.y = me.rotY;
      }
      this.camYaw = 0;
      if (this.cameraMode === 'panorama') this.setCameraMode('panorama');
      this._broadcastMyMove(true);
    }

    _makeSignTexture(title, sub = '', bg = '#1e293b', border = '#fbbf24') {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 160;
      const g = c.getContext('2d');
      g.fillStyle = bg;
      g.fillRect(0, 0, 512, 160);
      g.strokeStyle = border;
      g.lineWidth = 8;
      g.strokeRect(6, 6, 500, 148);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '800 40px -apple-system, sans-serif';
      g.fillText(title, 256, sub ? 62 : 80, 468);
      if (sub) {
        g.fillStyle = '#fde047';
        g.font = '700 24px -apple-system, sans-serif';
        g.fillText(sub, 256, 114, 468);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      return tex;
    }

    _addPortalDoor(x, z, rotY, targetZone, title, sub = '') {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);
      grp.rotation.y = rotY;

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 5.2, 0.45),
        new THREE.MeshLambertMaterial({ color: 0x78350f })
      );
      frame.position.y = 2.6;
      grp.add(frame);

      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 4.4),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
      );
      glow.position.set(0, 2.4, 0.25);
      grp.add(glow);

      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.8, 1.2),
        new THREE.MeshBasicMaterial({ map: this._makeSignTexture(title, sub) })
      );
      sign.position.set(0, 5.95, 0.26);
      grp.add(sign);

      // 바닥 앞 발판 매트
      const mat = new THREE.Mesh(
        new THREE.CircleGeometry(1.4, 24),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35 })
      );
      mat.rotation.x = -Math.PI / 2;
      mat.position.set(0, 0.04, 1.5);
      grp.add(mat);

      this.roomGroup.add(grp);

      const frontX = x + Math.sin(rotY) * 1.6;
      const frontZ = z + Math.cos(rotY) * 1.6;
      const item = {
        id: 'portal-' + targetZone + '-' + x + '-' + z,
        type: 'portal',
        targetZone,
        label: `🚪 ${title} 이동`,
        x: frontX,
        y: 0,
        z: frontZ,
        radius: 2.3,
        mesh: frame
      };
      this.portals.push(item);
      this.interactables.push(item);
    }

    _addBenchOrChair(id, x, y, z, rotY, width, label) {
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      grp.rotation.y = rotY;

      const wood = new THREE.MeshLambertMaterial({ color: 0x92582a });
      const dark = new THREE.MeshLambertMaterial({ color: 0x452712 });

      const seat = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, 0.9), wood);
      seat.position.y = 0.62;
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, 0.85, 0.18), wood);
      back.position.set(0, 1.12, -0.38);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.82), dark);
      legL.position.set(-width / 2 + 0.2, 0.31, 0);
      const legR = legL.clone();
      legR.position.x = width / 2 - 0.2;

      grp.add(seat, back, legL, legR);
      this.roomGroup.add(grp);

      // 벤치 길이에 따라 착석 포인트 1~2개 생성
      const offsets = width >= 3.2 ? [-width * 0.26, width * 0.26] : [0];
      offsets.forEach((ox, idx) => {
        const sx = x + Math.cos(rotY) * ox;
        const sz = z - Math.sin(rotY) * ox;
        this.interactables.push({
          id: `${id}_${idx}`,
          type: 'seat',
          label: label || '🪑 의자에 앉기',
          x: sx,
          y,
          z: sz,
          rotY,
          radius: 1.75,
          mesh: seat
        });
      });
    }

    _addLampPost(x, z, height = 4.6) {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.13, height, 10),
        new THREE.MeshLambertMaterial({ color: 0x1e293b })
      );
      pole.position.y = height / 2;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      bulb.position.y = height + 0.2;
      grp.add(pole, bulb);
      this.roomGroup.add(grp);
    }

    _addTree(x, z, sc = 1) {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25 * sc, 0.36 * sc, 2.2 * sc, 8),
        new THREE.MeshLambertMaterial({ color: 0x5c3a21 })
      );
      trunk.position.y = 1.1 * sc;
      const leafMat = new THREE.MeshLambertMaterial({ color: 0x166534 });
      const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.45 * sc, 12, 10), leafMat);
      c1.position.y = 2.8 * sc;
      const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.05 * sc, 12, 10), leafMat);
      c2.position.set(0.7 * sc, 2.3 * sc, 0.3 * sc);
      const c3 = new THREE.Mesh(new THREE.SphereGeometry(1.0 * sc, 12, 10), leafMat);
      c3.position.set(-0.65 * sc, 2.4 * sc, -0.25 * sc);
      grp.add(trunk, c1, c2, c3);
      this.roomGroup.add(grp);
    }

    // 1) 🌿 앞마당 정원 (야외 광장 & 대성전 입구 계단 & 카페 & 각 방 포털)
    _buildGarden() {
      const grass = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 90),
        new THREE.MeshLambertMaterial({ color: 0x1b3b28 })
      );
      grass.rotation.x = -Math.PI / 2;
      this.roomGroup.add(grass);

      // 중앙 석재 산책로 & 광장
      const path = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.08, 62),
        new THREE.MeshLambertMaterial({ color: 0x8b8579 })
      );
      path.position.set(0, 0.04, 5);
      this.roomGroup.add(path);

      const crossPath = new THREE.Mesh(
        new THREE.BoxGeometry(58, 0.07, 7),
        new THREE.MeshLambertMaterial({ color: 0x7c766b })
      );
      crossPath.position.set(0, 0.035, 6);
      this.roomGroup.add(crossPath);

      // 중앙 분수대
      const fountainBase = new THREE.Mesh(
        new THREE.CylinderGeometry(3.4, 3.7, 0.65, 24),
        new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
      );
      fountainBase.position.set(0, 0.32, 6);
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(3.0, 3.0, 0.55, 24),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72 })
      );
      water.position.set(0, 0.42, 6);
      this.roomGroup.add(fountainBase, water);

      // 정면 대성전 외벽 파사드 & 계단 (작은빛 감성 + 현대식 대형교회)
      for (let s = 0; s < 4; s++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(22 - s * 1.4, 0.28, 3.2),
          new THREE.MeshLambertMaterial({ color: 0xa8a29e })
        );
        step.position.set(0, 0.14 + s * 0.2, -16 - s * 1.6);
        this.roomGroup.add(step);
      }

      const facade = new THREE.Mesh(
        new THREE.BoxGeometry(30, 16, 4),
        new THREE.MeshLambertMaterial({ color: 0x292524 })
      );
      facade.position.set(0, 8, -26.5);
      this.roomGroup.add(facade);

      // 외벽 발광 십자가
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      crossV.position.set(0, 12.2, -24.3);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 0.4), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      crossH.position.set(0, 13.1, -24.3);
      this.roomGroup.add(crossV, crossH);

      const warmLight = new THREE.PointLight(0xfbbf24, 1.4, 38);
      warmLight.position.set(0, 9, -18);
      this.roomGroup.add(warmLight);

      // 포털 도어들
      this._addPortalDoor(0, -24.2, 0, 'sanctuary', '✧ 그레이스 대성전', '정문 입장');
      this._addPortalDoor(-24, 2, Math.PI / 2, 'sarangbang', '🏠 사랑방 센터', '그룹별 소그룹실');
      this._addPortalDoor(24, 2, -Math.PI / 2, 'bible', '📖 성경통독방', '66권 말씀 읽기');
      this._addPortalDoor(24, 11, -Math.PI / 2, 'qt', '✏️ 큐티 아카데미', '기초반 강의·나눔');

      // 야외 소미 카페 부스
      const cafeBox = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, 3.8, 4.2),
        new THREE.MeshLambertMaterial({ color: 0x451a03 })
      );
      cafeBox.position.set(-14, 1.9, -9);
      const cafeSign = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 1.1),
        new THREE.MeshBasicMaterial({ map: this._makeSignTexture('☕ SOMY CAFE', '무료 커피 & 생수 나눔', '#292524', '#34d399') })
      );
      cafeSign.position.set(-14, 4.25, -6.8);
      this.roomGroup.add(cafeBox, cafeSign);

      this.interactables.push({
        id: 'garden-cafe',
        type: 'cafe',
        label: '☕ 따뜻한 커피 받기',
        drinkType: 'coffee',
        x: -14,
        y: 0,
        z: -5.5,
        radius: 2.8,
        mesh: cafeBox
      });

      // 정원 벤치 & 가로등 & 나무
      this._addBenchOrChair('gbench1', -8.5, 0, 13, Math.PI / 2, 3.6, '🪑 정원 벤치에 앉기');
      this._addBenchOrChair('gbench2', 8.5, 0, 13, -Math.PI / 2, 3.6, '🪑 정원 벤치에 앉기');
      this._addBenchOrChair('gbench3', -8.5, 0, -2, Math.PI / 2, 3.6, '🪑 정원 벤치에 앉기');
      this._addBenchOrChair('gbench4', 8.5, 0, -2, -Math.PI / 2, 3.6, '🪑 정원 벤치에 앉기');

      [[-6, 18], [6, 18], [-6, -8], [6, -8], [-16, 6], [16, 6]].forEach(([lx, lz]) => this._addLampPost(lx, lz));
      [[-20, -16], [20, -16], [-22, 18], [22, 18], [-16, 24], [16, 24]].forEach(([tx, tz]) => this._addTree(tx, tz, 1.15));
    }

    // 2) 🏛️ 그레이스 대성전 (원형 스타디움 장의자 + 조각 조명벽 + 와이드스크린 + 제단 무릎기도)
    _buildSanctuary(candles) {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(76, 66),
        new THREE.MeshLambertMaterial({ color: 0x352720 })
      );
      floor.rotation.x = -Math.PI / 2;
      this.roomGroup.add(floor);

      // 중앙 레드카펫 통로
      const carpet = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.05, 48),
        new THREE.MeshLambertMaterial({ color: 0x881d2f })
      );
      carpet.position.set(0, 0.025, 6);
      this.roomGroup.add(carpet);

      // 2단 원형 강단 무대
      const stage1 = new THREE.Mesh(
        new THREE.CylinderGeometry(12.5, 13.0, 0.7, 32),
        new THREE.MeshLambertMaterial({ color: 0x5c3a24 })
      );
      stage1.position.set(0, 0.35, -18);
      const stage2 = new THREE.Mesh(
        new THREE.CylinderGeometry(9.6, 10.0, 0.6, 32),
        new THREE.MeshLambertMaterial({ color: 0x784b2e })
      );
      stage2.position.set(0, 1.0, -19.2);
      this.roomGroup.add(stage1, stage2);

      // 전면 백월 & 양옆 골드 기둥 & 발광 십자가
      const frontWall = new THREE.Mesh(
        new THREE.BoxGeometry(68, 18, 1.2),
        new THREE.MeshLambertMaterial({ color: 0x18141c })
      );
      frontWall.position.set(0, 9, -25.2);
      this.roomGroup.add(frontWall);

      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.65, 5.2, 0.35), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      crossV.position.set(16.5, 10.2, -24.3);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.65, 0.35), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      crossH.position.set(16.5, 11.1, -24.3);
      this.roomGroup.add(crossV, crossH);

      // 크리스탈 강대상 & 그랜드 피아노
      const pulpit = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 2.2, 1.2),
        new THREE.MeshLambertMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.85 })
      );
      pulpit.position.set(0, 2.4, -14.8);
      const piano = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.5, 2.6),
        new THREE.MeshLambertMaterial({ color: 0x0f172a })
      );
      piano.position.set(-6.8, 2.0, -16.8);
      this.roomGroup.add(pulpit, piano);

      // 제단 앞 무릎 기도 매트 구역 (작은빛 제단 무릎기도 감성!)
      const kneelMat = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 0.14, 1.4),
        new THREE.MeshLambertMaterial({ color: 0x9f1239 })
      );
      kneelMat.position.set(0, 0.07, -5.2);
      this.roomGroup.add(kneelMat);
      [-2.2, 0, 2.2].forEach((kx, idx) => {
        this.interactables.push({
          id: `altar_kneel_${idx}`,
          type: 'kneel',
          label: '🧎 강단 앞 무릎 꿇고 기도하기',
          x: kx,
          y: 0,
          z: -5.2,
          rotY: Math.PI,
          radius: 2.0,
          mesh: kneelMat
        });
      });

      // 양옆 다이아몬드 입체 조각 아트월 & 골드 조명
      [-33, 33].forEach((wx) => {
        const sWall = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 17, 58),
          new THREE.MeshLambertMaterial({ color: 0x29211e })
        );
        sWall.position.set(wx, 8.5, 2);
        this.roomGroup.add(sWall);

        for (let i = 0; i < 6; i++) {
          const pz = -18 + i * 8;
          const diamond = new THREE.Mesh(
            new THREE.OctahedronGeometry(2.3, 0),
            new THREE.MeshLambertMaterial({ color: 0xd9a05b })
          );
          diamond.scale.set(0.35, 1.85, 1.1);
          diamond.position.set(wx > 0 ? wx - 0.5 : wx + 0.5, 8.5, pz);
          this.roomGroup.add(diamond);
        }
      });

      const spotL = new THREE.PointLight(0xfbbf24, 1.25, 48);
      spotL.position.set(-18, 12, -4);
      const spotR = new THREE.PointLight(0xfbbf24, 1.25, 48);
      spotR.position.set(18, 12, -4);
      this.roomGroup.add(spotL, spotR);

      // 원형 부채꼴 장의자 4열 × 4블록 배치
      const radii = [15.5, 20.5, 25.5, 30.5];
      const blocks = [-0.62, -0.24, 0.24, 0.62];
      radii.forEach((r, rIdx) => {
        blocks.forEach((ang, bIdx) => {
          const px = Math.sin(ang) * r;
          const pz = -18 + Math.cos(ang) * r;
          const faceStageYaw = Math.atan2(-px, -18 - pz);
          this._addBenchOrChair(
            `pew_${rIdx}_${bIdx}`,
            px,
            0,
            pz,
            faceStageYaw,
            4.6,
            `🪑 ${rIdx + 1}열 장의자 착석`
          );
        });
      });

      // 기도 등불 봉헌대
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(11, 0.9, 1.2),
        new THREE.MeshLambertMaterial({ color: 0x6e4427 })
      );
      stand.position.set(0, 0.45, -8.2);
      this.roomGroup.add(stand);
      this.interactables.push({
        id: 'candle-altar',
        type: 'candle_altar',
        label: '🕯️ 기도 등불 밝히기',
        x: 0,
        y: 0,
        z: -6.8,
        radius: 2.5,
        mesh: stand
      });

      this.candleGroup = new THREE.Group();
      this.roomGroup.add(this.candleGroup);
      this.updateCandles(candles);

      // 다른 방으로 연결되는 포털 문들
      this._addPortalDoor(0, 29.5, Math.PI, 'garden', '🌿 앞마당 정원', '야외 출구');
      this._addPortalDoor(-31.8, -8, Math.PI / 2, 'sarangbang', '🏠 사랑방 (소그룹)', '그룹별 모임방');
      this._addPortalDoor(-31.8, 6, Math.PI / 2, 'prayer', '🕯️ 기도·갤러리실', '성화·골방기도');
      this._addPortalDoor(31.8, -8, -Math.PI / 2, 'bible', '📖 성경통독방', '성경 66권 읽기');
      this._addPortalDoor(31.8, 6, -Math.PI / 2, 'qt', '✏️ 큐티방', '기초반 강의·나눔');
      this._addPortalDoor(18, 29.5, Math.PI, 'rooftop', '☕ 루프탑 소미카페', '옥상 정원 교제');
    }

    updateCandles(candles = []) {
      if (!this.candleGroup) return;
      while (this.candleGroup.children.length > 0) {
        this.candleGroup.remove(this.candleGroup.children[0]);
      }
      const count = Math.min(candles.length, 14);
      for (let i = 0; i < count; i++) {
        const ox = -4.8 + (i % 14) * 0.74;
        const wax = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.34, 8),
          new THREE.MeshBasicMaterial({ color: 0xfef3c7 })
        );
        wax.position.set(ox, 1.06, -8.2);
        const flame = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        flame.position.set(ox, 1.32, -8.2);
        this.candleGroup.add(wax, flame);
      }
    }

    // 3) 🏠 사랑방 (그룹별 소그룹실 — 원형 거실 소파 + 티테이블 + 소그룹 화이트보드/PPT)
    _buildSarangbang(roomTitle) {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(36, 34),
        new THREE.MeshLambertMaterial({ color: 0x4a3325 })
      );
      floor.rotation.x = -Math.PI / 2;
      this.roomGroup.add(floor);

      const rug = new THREE.Mesh(
        new THREE.CircleGeometry(7.2, 32),
        new THREE.MeshLambertMaterial({ color: 0x7c2d12 })
      );
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.03, 0);
      this.roomGroup.add(rug);

      // 벽면 3면 & 그룹 현판
      const bWall = new THREE.Mesh(new THREE.BoxGeometry(36, 11, 0.8), new THREE.MeshLambertMaterial({ color: 0x2e231f }));
      bWall.position.set(0, 5.5, -14.2);
      const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 11, 34), new THREE.MeshLambertMaterial({ color: 0x362924 }));
      lWall.position.set(-17, 5.5, 0);
      const rWall = lWall.clone();
      rWall.position.x = 17;
      this.roomGroup.add(bWall, lWall, rWall);

      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(8.5, 1.7),
        new THREE.MeshBasicMaterial({ map: this._makeSignTexture(`🏠 ${roomTitle}`, '사랑과 말씀이 흐르는 소그룹방', '#431407', '#fbbf24') })
      );
      banner.position.set(0, 9.4, -13.6);
      this.roomGroup.add(banner);

      // 중앙 원형 티테이블 & 성경책/찻잔 소품
      const table = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.4, 0.72, 24),
        new THREE.MeshLambertMaterial({ color: 0x9a5b2d })
      );
      table.position.set(0, 0.36, 0.5);
      this.roomGroup.add(table);

      this.interactables.push({
        id: 'sarang-switcher',
        type: 'sarang_menu',
        label: '🏠 다른 사랑방 선택 / 새 방 만들기',
        x: 0,
        y: 0,
        z: 0.5,
        radius: 3.1,
        mesh: table
      });

      // 원형으로 둘러앉는 소파 좌석 8석
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        if (Math.abs(Math.sin(ang)) < 0.35 && Math.cos(ang) < -0.7) continue; // 칠판 정면 시야 확보
        const sx = Math.sin(ang) * 5.2;
        const sz = 0.5 + Math.cos(ang) * 5.2;
        const faceCenter = Math.atan2(-sx, 0.5 - sz);
        this._addBenchOrChair(`sofa_${i}`, sx, 0, sz, faceCenter, 2.4, '🛋️ 사랑방 소파에 둘러앉기');
      }

      const warm = new THREE.PointLight(0xffedd5, 1.35, 32);
      warm.position.set(0, 8.5, 0);
      this.roomGroup.add(warm);

      this._addLampPost(-12, -9, 3.8);
      this._addLampPost(12, -9, 3.8);

      this._addPortalDoor(-11, 14.5, Math.PI, 'sanctuary', '🏛️ 대성전 복귀', '');
      this._addPortalDoor(11, 14.5, Math.PI, 'qt', '✏️ 큐티방 이동', '');
    }

    // 4) 📖 성경통독방 (도서관 서가 + 통독 책상 + 개역개정 성경 리더 연동)
    _buildBibleRoom() {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 38),
        new THREE.MeshLambertMaterial({ color: 0x3b2a1e })
      );
      floor.rotation.x = -Math.PI / 2;
      this.roomGroup.add(floor);

      const bWall = new THREE.Mesh(new THREE.BoxGeometry(40, 12, 0.8), new THREE.MeshLambertMaterial({ color: 0x1e2433 }));
      bWall.position.set(0, 6, -16.2);
      this.roomGroup.add(bWall);

      // 양쪽 대형 원목 책장(서가) 8개
      const shelfMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });
      const bookColors = [0xb91c1c, 0x1d4ed8, 0x047857, 0xd97706, 0x6d28d9];
      [-17.2, 17.2].forEach((sx) => {
        for (let z = -11; z <= 11; z += 5.5) {
          const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.8, 4.4), shelfMat);
          shelf.position.set(sx, 3.4, z);
          this.roomGroup.add(shelf);

          for (let r = 0; r < 4; r++) {
            const books = new THREE.Mesh(
              new THREE.BoxGeometry(1.5, 0.85, 3.8),
              new THREE.MeshLambertMaterial({ color: bookColors[(r + Math.abs(z)) % bookColors.length] })
            );
            books.position.set(sx, 1.2 + r * 1.5, z);
            this.roomGroup.add(books);
          }
        }
      });

      // 성경 통독 열람 책상 6개 + 녹색 뱅커 스탠드
      const deskRows = [-5, 3];
      const deskCols = [-7.5, 0, 7.5];
      deskRows.forEach((dz, rIdx) => {
        deskCols.forEach((dx, cIdx) => {
          const desk = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 1.1, 1.8),
            new THREE.MeshLambertMaterial({ color: 0x784724 })
          );
          desk.position.set(dx, 0.55, dz);
          const lamp = new THREE.Mesh(
            new THREE.ConeGeometry(0.32, 0.28, 12),
            new THREE.MeshBasicMaterial({ color: 0x34d399 })
          );
          lamp.position.set(dx + 1.2, 1.45, dz - 0.3);
          const bibleBook = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.12, 0.62),
            new THREE.MeshLambertMaterial({ color: 0xfef3c7 })
          );
          bibleBook.position.set(dx, 1.16, dz);
          this.roomGroup.add(desk, lamp, bibleBook);

          this._addBenchOrChair(`bdesk_${rIdx}_${cIdx}`, dx, 0, dz + 1.5, Math.PI, 1.8, '📖 통독 책상에 앉아 성경 펴기');
          this.interactables.push({
            id: `bible_open_${rIdx}_${cIdx}`,
            type: 'bible_desk',
            label: '📖 성경 66권 통독 리더 열기',
            x: dx,
            y: 0,
            z: dz + 1.5,
            rotY: Math.PI,
            radius: 2.2,
            mesh: desk
          });
        });
      });

      this._addPortalDoor(-11, 16.5, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(11, 16.5, Math.PI, 'qt', '✏️ 큐티방 이동', '기초반 강의·나눔');
    }

    // 5) ✏️ 큐티방 (관리자 큐티 기초반 강의안 + 세미나 책상 + 실시간 큐티 나눔)
    _buildQtRoom() {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 38),
        new THREE.MeshLambertMaterial({ color: 0x2c3444 })
      );
      floor.rotation.x = -Math.PI / 2;
      this.roomGroup.add(floor);

      const bWall = new THREE.Mesh(new THREE.BoxGeometry(40, 12, 0.8), new THREE.MeshLambertMaterial({ color: 0x1b2232 }));
      bWall.position.set(0, 6, -16.2);
      this.roomGroup.add(bWall);

      // 강사 강연대
      const lectern = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 2.0, 1.2),
        new THREE.MeshLambertMaterial({ color: 0xb45309 })
      );
      lectern.position.set(-5.8, 1.0, -11.5);
      this.roomGroup.add(lectern);

      this.interactables.push({
        id: 'qt-lectern',
        type: 'qt_academy',
        label: '📚 큐티 기초반 강의안 & 나눔 열기',
        x: -5.8,
        y: 0,
        z: -9.8,
        radius: 2.6,
        mesh: lectern
      });

      // 아카데미 세미나 테이블 2열 × 2블록
      [-5.2, 1.2].forEach((dz, rIdx) => {
        [-6.5, 6.5].forEach((dx, cIdx) => {
          const table = new THREE.Mesh(
            new THREE.BoxGeometry(6.8, 1.05, 1.7),
            new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
          );
          table.position.set(dx, 0.52, dz);
          this.roomGroup.add(table);

          this._addBenchOrChair(`qtseat_${rIdx}_${cIdx}`, dx, 0, dz + 1.55, Math.PI, 4.4, '✏️ 큐티 강의석 착석');
          this.interactables.push({
            id: `qt_desk_${rIdx}_${cIdx}`,
            type: 'qt_academy',
            label: '📚 큐티 기초반 강의안 & 나눔 열기',
            x: dx,
            y: 0,
            z: dz + 1.55,
            rotY: Math.PI,
            radius: 2.5,
            mesh: table
          });
        });
      });

      this._addPortalDoor(-11, 16.5, Math.PI, 'bible', '📖 성경통독방', '');
      this._addPortalDoor(0, 16.5, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(11, 16.5, Math.PI, 'sarangbang', '🏠 사랑방 이동', '');
    }

    // 6) 🕯️ 골방 기도실 & 성화·말씀 갤러리
    _buildPrayerGallery() {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(36, 40),
        new THREE.MeshLambertMaterial({ color: 0x231d28 })
      );
      floor.rotation.x = -Math.PI / 2;
      this.roomGroup.add(floor);

      const aisle = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.05, 36),
        new THREE.MeshLambertMaterial({ color: 0x4c1d95 })
      );
      aisle.position.set(0, 0.025, 1);
      this.roomGroup.add(aisle);

      const bWall = new THREE.Mesh(new THREE.BoxGeometry(36, 11, 0.8), new THREE.MeshLambertMaterial({ color: 0x16121d }));
      bWall.position.set(0, 5.5, -17.2);
      const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 11, 40), new THREE.MeshLambertMaterial({ color: 0x1d1826 }));
      lWall.position.set(-16.5, 5.5, 1);
      const rWall = lWall.clone();
      rWall.position.x = 16.5;
      this.roomGroup.add(bWall, lWall, rWall);

      // 좌·우 6점 성화/말씀 액자 전시 (다가가면 해설 & 성경 구절 보기)
      GALLERY_ARTWORKS.forEach((art, i) => {
        const isLeft = i < 3;
        const idx = i % 3;
        const az = -9 + idx * 9.5;
        const ax = isLeft ? -15.9 : 15.9;
        const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;

        const c = document.createElement('canvas');
        c.width = 384;
        c.height = 256;
        const g = c.getContext('2d');
        const grd = g.createLinearGradient(0, 0, 384, 256);
        grd.addColorStop(0, art.color1);
        grd.addColorStop(1, art.color2);
        g.fillStyle = grd;
        g.fillRect(0, 0, 384, 256);
        g.strokeStyle = '#fde047';
        g.lineWidth = 10;
        g.strokeRect(8, 8, 368, 240);
        g.fillStyle = '#ffffff';
        g.font = '800 24px -apple-system, sans-serif';
        g.textAlign = 'center';
        g.fillText(art.title, 192, 130, 330);

        const painting = new THREE.Mesh(
          new THREE.PlaneGeometry(5.2, 3.5),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })
        );
        painting.position.set(ax, 4.5, az);
        painting.rotation.y = rotY;
        this.roomGroup.add(painting);

        this.interactables.push({
          id: `art_${i}`,
          type: 'artwork',
          label: `🖼️ '${art.title}' 해설 보기`,
          artwork: art,
          x: isLeft ? -13.2 : 13.2,
          y: 0,
          z: az,
          radius: 3.0,
          mesh: painting
        });
      });

      // 골방 무릎 기도 쿠션 4개
      [-6, -2, 2, 6].forEach((kx, idx) => {
        const cushion = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.22, 1.3),
          new THREE.MeshLambertMaterial({ color: 0x9f1239 })
        );
        cushion.position.set(kx, 0.11, -11.5);
        this.roomGroup.add(cushion);
        this._addLampPost(kx, -13.2, 2.2);

        this.interactables.push({
          id: `prayer_kneel_${idx}`,
          type: 'kneel',
          label: '🧎 골방 기도석에서 무릎 기도하기',
          x: kx,
          y: 0,
          z: -11.5,
          rotY: Math.PI,
          radius: 1.9,
          mesh: cushion
        });
      });

      this._addPortalDoor(-8, 18.5, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(8, 18.5, Math.PI, 'bible', '📖 성경통독방', '');
    }

    // 7) ☕ 루프탑 소미카페 (별빛 야경 + SOMY CAFE + 4인 교제 테이블)
    _buildRooftop() {
      const deck = new THREE.Mesh(
        new THREE.PlaneGeometry(48, 44),
        new THREE.MeshLambertMaterial({ color: 0x3b2f28 })
      );
      deck.rotation.x = -Math.PI / 2;
      this.roomGroup.add(deck);

      // 옥상 유리/우드 안전 난간
      const railMat = new THREE.MeshLambertMaterial({ color: 0x64748b, transparent: true, opacity: 0.55 });
      const rBack = new THREE.Mesh(new THREE.BoxGeometry(48, 1.6, 0.3), railMat);
      rBack.position.set(0, 0.8, -21);
      const rLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 44), railMat);
      rLeft.position.set(-23.5, 0.8, 0);
      const rRight = rLeft.clone();
      rRight.position.x = 23.5;
      this.roomGroup.add(rBack, rLeft, rRight);

      // 밤하늘 별빛 입자
      const starGeo = new THREE.BufferGeometry();
      const pts = [];
      for (let i = 0; i < 180; i++) {
        pts.push((Math.random() - 0.5) * 140, 22 + Math.random() * 38, (Math.random() - 0.5) * 140);
      }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfef9c3, size: 0.45 }));
      this.roomGroup.add(stars);

      // 루프탑 카페 부스 & 생수 부스
      const cafe = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 3.8, 4.0),
        new THREE.MeshLambertMaterial({ color: 0x27272a })
      );
      cafe.position.set(-13.5, 1.9, -11);
      const cSign = new THREE.Mesh(
        new THREE.PlaneGeometry(6.0, 1.25),
        new THREE.MeshBasicMaterial({ map: this._makeSignTexture('☕ SOMY ROOFTOP CAFE', '따뜻한 커피 나눔', '#18181b', '#fbbf24') })
      );
      cSign.position.set(-13.5, 4.3, -8.9);
      this.roomGroup.add(cafe, cSign);

      this.interactables.push({
        id: 'roof-coffee',
        type: 'cafe',
        drinkType: 'coffee',
        label: '☕ 루프탑 커피 받기',
        x: -13.5,
        y: 0,
        z: -7.5,
        radius: 2.8,
        mesh: cafe
      });

      const store = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 3.5, 3.8),
        new THREE.MeshLambertMaterial({ color: 0x0f172a })
      );
      store.position.set(13.5, 1.75, -11);
      const sSign = new THREE.Mesh(
        new THREE.PlaneGeometry(4.8, 1.15),
        new THREE.MeshBasicMaterial({ map: this._makeSignTexture('💧 은혜샘 편의점', '시원한 생수 나눔', '#0c4a6e', '#38bdf8') })
      );
      sSign.position.set(13.5, 4.0, -9.0);
      this.roomGroup.add(store, sSign);

      this.interactables.push({
        id: 'roof-water',
        type: 'cafe',
        drinkType: 'water',
        label: '💧 시원한 생수 받기',
        x: 13.5,
        y: 0,
        z: -7.5,
        radius: 2.8,
        mesh: store
      });

      // 4인 원형 카페 테이블 4세트
      [[-8, 3], [8, 3], [-8, 12], [8, 12]].forEach(([tx, tz], tIdx) => {
        const tbl = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5, 1.3, 0.85, 18),
          new THREE.MeshLambertMaterial({ color: 0xd6d3d1 })
        );
        tbl.position.set(tx, 0.42, tz);
        this.roomGroup.add(tbl);

        for (let c = 0; c < 4; c++) {
          const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
          const cx = tx + Math.sin(a) * 2.35;
          const cz = tz + Math.cos(a) * 2.35;
          this._addBenchOrChair(`rtbl_${tIdx}_${c}`, cx, 0, cz, Math.atan2(tx - cx, tz - cz), 1.2, `☕ ${tIdx + 1}번 카페 테이블 착석`);
        }
      });

      [[-18, -2], [18, -2], [-18, 14], [18, 14], [0, -6]].forEach(([lx, lz]) => this._addLampPost(lx, lz, 4.2));
      [[-20, -16], [20, -16], [-20, 18], [20, 18]].forEach(([tx, tz]) => this._addTree(tx, tz, 0.95));

      this._addPortalDoor(-8, 20.2, Math.PI, 'sanctuary', '🏛️ 대성전 내려가기', '');
      this._addPortalDoor(8, 20.2, Math.PI, 'garden', '🌿 앞마당 정원', '');
    }

    // -----------------------------------------------------------------------
    // 키보드(WASD/방향키) + 마우스 클릭 이동 + 모바일 멀티터치/핀치 줌
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
            this.panoYaw -= dx * 0.0065;
            this.panoPitch = Math.max(0.14, Math.min(0.86, this.panoPitch + dy * 0.005));
          } else {
            this.camYaw -= dx * 0.0065;
            this.camPitch = Math.max(0.08, Math.min(0.82, this.camPitch + dy * 0.005));
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

        if (singleTap) {
          this._handleTap(e.clientX, e.clientY);
        }
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

      // 1순위: 상호작용 오브젝트(문, 의자, 칠판, 카페 등) 클릭 판정
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
          // 멀리 있으면 해당 오브젝트 앞으로 걸어가서 자동 실행!
          this.walkTarget = { x: found.x, z: found.z, pendingInteract: found };
          this.walkRing.position.set(found.x, 0.06, found.z);
          this.walkRing.material.opacity = 0.85;
          if (me) me.pose = 'stand';
          return;
        }
      }

      // 2순위: 바닥 클릭 이동
      const pt = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.floorPlane, pt)) {
        const b = this.getZoneMeta(this.currentZone).bounds;
        const tx = Math.max(-b.x, Math.min(b.x, pt.x));
        const tz = Math.max(b.zMin, Math.min(b.zMax, pt.z));
        this.walkTarget = { x: tx, z: tz, pendingInteract: null };
        this.walkRing.position.set(tx, 0.06, tz);
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

    // -----------------------------------------------------------------------
    // 메인 프레임 업데이트 & 렌더링 루프
    // -----------------------------------------------------------------------
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

        // 포털 문 앞에 직접 걸어가서 닿으면 자동 공간 이동!
        if (manualMoving) {
          for (const p of this.portals) {
            if (Math.hypot(me.x - p.x, me.z - p.z) < 1.15) {
              this.onPortalEnter(p.targetZone);
              break;
            }
          }
        }

        // 가장 가까운 상호작용 오브젝트 탐색
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

      // 모든 아바타 애니메이션 & 보간 업데이트
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

        if (av.pose === 'sit') {
          av.bodyPivot.position.y = -0.22;
          av.leftLeg.rotation.x = -Math.PI * 0.46;
          av.rightLeg.rotation.x = -Math.PI * 0.46;
          av.leftArm.rotation.x = -0.35;
          av.rightArm.rotation.x = av.sipTimer > 0 ? -1.35 : -0.35;
        } else if (av.pose === 'kneel') {
          av.bodyPivot.position.y = -0.34;
          av.leftLeg.rotation.x = 1.35;
          av.rightLeg.rotation.x = 1.35;
          av.leftArm.rotation.x = -0.95;
          av.rightArm.rotation.x = -0.95;
          av.headGroup.rotation.x = 0.25;
        } else {
          av.headGroup.rotation.x = 0;
          const moving = av.isMe
            ? !!(this.walkTarget || this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d'] || this.keys['arrowup'] || this.keys['arrowdown'] || this.keys['arrowleft'] || this.keys['arrowright'] || Math.hypot(this.joyVec.x, this.joyVec.y) > 0.08)
            : Math.hypot(av.tx - av.x, av.tz - av.z) > 0.04;

          if (moving) {
            const sw = Math.sin(av.walkPhase) * 0.65;
            av.bodyPivot.position.y = Math.abs(Math.sin(av.walkPhase * 2)) * 0.08;
            av.leftLeg.rotation.x = sw;
            av.rightLeg.rotation.x = -sw;
            av.leftArm.rotation.x = -sw * 0.75;
            av.rightArm.rotation.x = av.sipTimer > 0 ? -1.35 : sw * 0.75;
          } else {
            av.bodyPivot.position.y = Math.sin(elapsed * 2 + (av.isMe ? 0 : 1)) * 0.025;
            av.leftLeg.rotation.x *= 0.82;
            av.rightLeg.rotation.x *= 0.82;
            av.leftArm.rotation.x *= 0.82;
            av.rightArm.rotation.x = av.sipTimer > 0 ? -1.35 : av.rightArm.rotation.x * 0.82;
          }
        }

        if (av.myRing) {
          const sc = av.micWave ? 1.18 + Math.sin(elapsed * 14) * 0.16 : 1 + Math.sin(elapsed * 4) * 0.05;
          av.myRing.scale.set(sc, sc, 1);
          av.myRing.material.color.setHex(av.micWave ? 0x34d399 : 0xfbbf24);
        }

        if (av.bubbleTimer > 0) {
          av.bubbleTimer -= dt;
          if (av.bubbleTimer <= 0) av.bubbleEl.classList.add('hidden');
        }
      }

      // 카메라 추적(3인칭) 또는 전체 파노라마 뷰 업데이트
      if (this.cameraMode === 'panorama') {
        const [lx, ly, lz] = meta.panorama.look;
        const cx = lx + Math.sin(this.panoYaw) * Math.cos(this.panoPitch) * this.panoDist;
        const cy = Math.max(2.5, ly + Math.sin(this.panoPitch) * this.panoDist);
        const cz = lz + Math.cos(this.panoYaw) * Math.cos(this.panoPitch) * this.panoDist;
        this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.12);
        this.camera.lookAt(lx, ly, lz);
      } else if (me) {
        const targetY = me.y + 1.85;
        const cx = me.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
        const cy = Math.max(1.2, targetY + Math.sin(this.camPitch) * this.camDist);
        const cz = me.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
        this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.16);
        this.camera.lookAt(me.x, targetY + 0.35, me.z);
      }
    }

    _updateHtmlOverlays() {
      const v = new THREE.Vector3();
      for (const av of this.avatars.values()) {
        v.set(av.x, av.y + 2.75, av.z);
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
