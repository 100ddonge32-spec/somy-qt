/* =========================================================================
 * 소미 3D 온라인 캠퍼스 — 실사풍 건축 PBR Three.js WebGL 엔진
 * ACES Filmic 톤매핑 + 실시간 소프트 그림자 + 7개 고품격 건축 인테리어 공간
 * ========================================================================= */
(function () {
  const THREE = window.THREE;
  if (!THREE) return;

  const AVATAR_PRESETS = [
    { id: 'david',  label: '다윗 (형제)', hair: 0x241914, outfit: 0x2563eb, pants: 0x1e293b, skin: 0xfce0c8, bag: 0x6b3410, hairType: 'short' },
    { id: 'miriam', label: '미리암 (자매)', hair: 0x432818, outfit: 0xdb2777, pants: 0x334155, skin: 0xffe6d5, bag: 0x831843, hairType: 'bun' },
    { id: 'joseph', label: '요셉 (청년)', hair: 0x18181b, outfit: 0x059669, pants: 0x1f2937, skin: 0xfddfca, bag: 0x365314, hairType: 'short' },
    { id: 'lydia',  label: '루디아 (집사)', hair: 0x58351e, outfit: 0x7c3aed, pants: 0x1e1b4b, skin: 0xffe4d0, bag: 0x581c87, hairType: 'bob' },
    { id: 'somy',   label: '소미 (인도자)', hair: 0x3b2a1e, outfit: 0xd97706, pants: 0x1e293b, skin: 0xffe8d6, bag: 0x92400e, hairType: 'bob' }
  ];

  const ZONE_META = {
    garden: {
      id: 'garden',
      name: '🌿 앞마당 정원',
      subtitle: '화강암 광장 · 에스프레소 파빌리온 · 대성전 입구',
      sky: 0x101829,
      fogColor: 0x162036,
      fogDensity: 0.007,
      spawn: { x: 0, z: 24, rotY: Math.PI },
      panorama: { pos: [0, 24, 41], look: [0, 3.5, -6] },
      bounds: { x: 34, zMin: -28, zMax: 34 },
      hasBoard: false
    },
    sanctuary: {
      id: 'sanctuary',
      name: '🏛️ 그레이스 대성전',
      subtitle: '월넛 루버 아트월 · 트래버틴 대리석 성단 · 그랜드피아노',
      sky: 0x0d1017,
      fogColor: 0x151821,
      fogDensity: 0.0055,
      spawn: { x: 0, z: 25, rotY: Math.PI },
      panorama: { pos: [0, 22, 36], look: [0, 5.2, -10] },
      bounds: { x: 31, zMin: -25, zMax: 29 },
      hasBoard: true,
      boardPos: [0, 8.8, -24.1],
      boardSize: [21.5, 9.2]
    },
    sarangbang: {
      id: 'sarangbang',
      name: '🏠 사랑방 (소그룹실)',
      subtitle: '부클레 라운지 소파 · 대리석 티테이블 · 소그룹 칠판/PPT',
      sky: 0x1c1613,
      fogColor: 0x241c18,
      fogDensity: 0.008,
      spawn: { x: 0, z: 12.5, rotY: Math.PI },
      panorama: { pos: [0, 16, 20], look: [0, 3.0, -3] },
      bounds: { x: 15.5, zMin: -13.5, zMax: 14.5 },
      hasBoard: true,
      boardPos: [0, 5.3, -13.3],
      boardSize: [12.0, 5.8]
    },
    bible: {
      id: 'bible',
      name: '📖 성경통독방',
      subtitle: '클래식 원목 서가 · 브라스 뱅커스 스탠드 · 개역개정 66권',
      sky: 0x191512,
      fogColor: 0x211b17,
      fogDensity: 0.0075,
      spawn: { x: 0, z: 14.5, rotY: Math.PI },
      panorama: { pos: [0, 17, 23], look: [0, 3.5, -4] },
      bounds: { x: 16.5, zMin: -15.5, zMax: 16.5 },
      hasBoard: true,
      boardPos: [0, 5.7, -15.2],
      boardSize: [13.0, 6.2]
    },
    qt: {
      id: 'qt',
      name: '✏️ 큐티방 (아카데미)',
      subtitle: '오크 어쿠스틱 세미나실 · 큐티 기초반 강의안 · 묵상 나눔',
      sky: 0x171920,
      fogColor: 0x1e222d,
      fogDensity: 0.0075,
      spawn: { x: 0, z: 14.5, rotY: Math.PI },
      panorama: { pos: [0, 17, 23], look: [0, 3.6, -4] },
      bounds: { x: 17, zMin: -15.5, zMax: 16.5 },
      hasBoard: true,
      boardPos: [0, 5.7, -15.2],
      boardSize: [13.6, 6.4]
    },
    prayer: {
      id: 'prayer',
      name: '🕯️ 기도실 & 말씀갤러리',
      subtitle: '대리석 성화 회랑 · 원목 개인 기도 부스 · 촛불 중보기도',
      sky: 0x0c0b10,
      fogColor: 0x14121b,
      fogDensity: 0.009,
      spawn: { x: 0, z: 16.5, rotY: Math.PI },
      panorama: { pos: [0, 16, 24], look: [0, 3.2, -4] },
      bounds: { x: 15, zMin: -16.5, zMax: 18 },
      hasBoard: true,
      boardPos: [0, 5.4, -16.2],
      boardSize: [11.2, 5.4]
    },
    rooftop: {
      id: 'rooftop',
      name: '☕ 루프탑 소미카페',
      subtitle: '티크 우드 데크 · 페스툰 가든 조명 · 대리석 비스트로 테이블',
      sky: 0x070c18,
      fogColor: 0x0d1528,
      fogDensity: 0.007,
      spawn: { x: 0, z: 17.5, rotY: Math.PI },
      panorama: { pos: [0, 19, 27], look: [0, 2.5, -2] },
      bounds: { x: 21, zMin: -17.5, zMax: 20 },
      hasBoard: true,
      boardPos: [0, 5.3, -17.1],
      boardSize: [11.2, 5.3]
    }
  };

  const GALLERY_ARTWORKS = [
    { title: '창조의 빛 (창세기 1:3)', desc: '하나님이 이르시되 빛이 있으라 하시니 빛이 있었고 — 혼돈과 어둠 위에 임한 첫 창조의 광명', color1: '#1e293b', color2: '#d97706' },
    { title: '선한 목자 (시편 23:1-2)', desc: '여호와는 나의 목자시니 내게 부족함이 없으리로다 그가 나를 푸른 풀밭과 쉴 만한 물 가로 인도하시는도다', color1: '#143829', color2: '#a3b18a' },
    { title: '광야의 불기둥 (출애굽기 13:21)', desc: '밤에는 불기둥을 비추사 주야로 진행하게 하시니 — 인생의 밤길을 밝히시는 임마누엘 하나님', color1: '#3b180c', color2: '#ea580c' },
    { title: '겟세마네의 기도 (누가복음 22:42)', desc: '아버지여 만일 아버지의 뜻이거든 이 잔을 내게서 옮기시옵소서 그러나 내 원대로 마시옵고 아버지의 원대로 되기를 원하나이다', color1: '#171a36', color2: '#6366f1' },
    { title: '갈보리 언덕의 사랑 (로마서 5:8)', desc: '우리가 아직 죄인 되었을 때에 그리스도께서 우리를 위하여 죽으심으로 하나님께서 우리에 대한 자기의 사랑을 확증하셨느니라', color1: '#3f0d1c', color2: '#e11d48' },
    { title: '부활의 새벽 (요한복음 11:25)', desc: '나는 부활이요 생명이니 나를 믿는 자는 죽어도 살겠고 무릇 살아서 나를 믿는 자는 영원히 죽지 아니하리니', color1: '#1e3a5f', color2: '#facc15' }
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
      this.camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.2, 260);
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.12;
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

      const ringGeo = new THREE.RingGeometry(0.38, 0.54, 32);
      ringGeo.rotateX(-Math.PI / 2);
      this.walkRing = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
      );
      this.walkRing.position.y = 0.05;
      this.scene.add(this.walkRing);

      this.raycaster = new THREE.Raycaster();
      this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

      this.currentZone = 'garden';
      this.cameraMode = 'follow';
      this.camYaw = 0;
      this.camPitch = 0.30;
      this.camDist = 8.8;
      this.panoYaw = 0;
      this.panoPitch = 0.40;
      this.panoDist = 35;

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
      this.camera.fov = w < h ? 66 : 54;
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
        this.camDist = Math.max(4.2, Math.min(22, this.camDist + delta));
      }
    }

    setJoystick(jx, jy) {
      this.joyVec.x = jx;
      this.joyVec.y = jy;
    }

    // -----------------------------------------------------------------------
    // 부드러운 곡면 실루엣 PBR 캐릭터 (각진 박스 느낌 제거, 패브릭 질감·구두·자연스러운 그림자)
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

      const skinMat = new THREE.MeshStandardMaterial({ color: preset.skin, roughness: 0.58 });
      const hairMat = new THREE.MeshStandardMaterial({ color: preset.hair, roughness: 0.72 });
      const outfitMat = new THREE.MeshStandardMaterial({ color: preset.outfit, roughness: 0.68 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: preset.pants, roughness: 0.78 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.42 });
      const bagMat = new THREE.MeshStandardMaterial({ color: preset.bag, roughness: 0.55 });

      let myRing = null;
      if (info.isMe) {
        const rg = new THREE.RingGeometry(0.56, 0.68, 32);
        rg.rotateX(-Math.PI / 2);
        myRing = new THREE.Mesh(
          rg,
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        );
        myRing.position.y = 0.03;
        root.add(myRing);
      }

      // 둥근 원통형 다리 & 구두
      const makeLeg = () => {
        const lg = new THREE.Group();
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.58, 12), pantsMat);
        thigh.position.y = -0.29;
        thigh.castShadow = true;
        const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), shoeMat);
        shoe.scale.set(0.95, 0.65, 1.35);
        shoe.position.set(0, -0.58, 0.04);
        shoe.castShadow = true;
        lg.add(thigh, shoe);
        return lg;
      };

      const leftLeg = makeLeg();
      leftLeg.position.set(-0.17, 0.64, 0);
      const rightLeg = makeLeg();
      rightLeg.position.set(0.17, 0.64, 0);
      bodyPivot.add(leftLeg, rightLeg);

      // 부드러운 곡면 코트/상의 몸통 & 셔츠 카라 & 가죽 백팩
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.36, 0.84, 16), outfitMat);
      torso.scale.set(1.12, 1, 0.78);
      torso.position.y = 1.04;
      torso.castShadow = true;
      bodyPivot.add(torso);

      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), outfitMat);
      shoulder.scale.set(1.15, 0.45, 0.76);
      shoulder.position.y = 1.40;
      bodyPivot.add(shoulder);

      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.20, 0.24, 0.10, 14),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
      );
      collar.position.y = 1.48;
      bodyPivot.add(collar);

      const backpack = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), bagMat);
      backpack.scale.set(0.95, 1.15, 0.55);
      backpack.position.set(0, 1.05, -0.28);
      backpack.castShadow = true;
      bodyPivot.add(backpack);

      // 둥근 팔 & 손 & 커피 테이크아웃 컵
      const makeArm = () => {
        const ag = new THREE.Group();
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.085, 0.54, 12), outfitMat);
        sleeve.position.y = -0.27;
        sleeve.castShadow = true;
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), skinMat);
        hand.position.y = -0.56;
        ag.add(sleeve, hand);
        return ag;
      };

      const leftArm = makeArm();
      leftArm.position.set(-0.44, 1.36, 0);
      const rightArm = makeArm();
      rightArm.position.set(0.44, 1.36, 0);
      bodyPivot.add(leftArm, rightArm);

      const cupGroup = new THREE.Group();
      const cupBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.075, 0.24, 14),
        new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.35 })
      );
      const cupSleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.098, 0.084, 0.10, 14),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 })
      );
      const cupLid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.10, 0.10, 0.03, 14),
        new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.3 })
      );
      cupLid.position.y = 0.13;
      cupGroup.add(cupBody, cupSleeve, cupLid);
      cupGroup.position.set(0, -0.56, 0.15);
      cupGroup.visible = !!info.drink;
      rightArm.add(cupGroup);

      // 자연스러운 비율의 머리 & 헤어
      const headGroup = new THREE.Group();
      headGroup.position.y = 1.92;
      bodyPivot.add(headGroup);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 18), skinMat);
      head.castShadow = true;
      headGroup.add(head);

      const eyeGeo = new THREE.SphereGeometry(0.042, 10, 10);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2 });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.14, -0.01, 0.385);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.14, -0.01, 0.385);
      headGroup.add(leftEye, rightEye);

      const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.448, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
        hairMat
      );
      hairCap.position.y = 0.03;
      hairCap.rotation.x = -0.18;
      hairCap.castShadow = true;
      headGroup.add(hairCap);

      const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.435, 18, 14), hairMat);
      hairBack.position.set(0, 0.01, -0.06);
      headGroup.add(hairBack);

      const bunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), hairMat);
      bunMesh.position.set(0, 0.44, -0.16);
      bunMesh.visible = preset.hairType === 'bun';
      headGroup.add(bunMesh);

      const labelEl = document.createElement('div');
      labelEl.className = 'pointer-events-none absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-1 z-10';
      labelEl.innerHTML = `
        <div class="av-bubble hidden px-2.5 py-1 rounded-xl bg-white/95 text-slate-900 border border-amber-400 text-[11px] font-bold shadow-lg max-w-[210px] text-center break-keep"></div>
        <div class="av-tag px-2.5 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap shadow ${
          info.isMe ? 'bg-amber-400 text-slate-950' : info.isNpc ? 'bg-slate-900/80 text-slate-100 border border-white/15' : 'bg-emerald-500/90 text-slate-950'
        }"></div>
      `;
      this.overlayContainer.appendChild(labelEl);

      const av = {
        id,
        name: info.name || '성도',
        isMe: !!info.isMe,
        isNpc: !!info.isNpc,
        presetId: preset.id,
        pose: info.pose || 'stand',
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
    // 실사 건축 조명 & 7개 테마 인테리어 로더
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

      // 자연스러운 건축 환경광 + 소프트 그림자 주광원
      const hemi = new THREE.HemisphereLight(0xfff8eb, 0x262220, 0.72);
      this.roomGroup.add(hemi);

      const mainLight = new THREE.DirectionalLight(0xfff1d6, 0.95);
      mainLight.position.set(14, 28, 18);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 1024;
      mainLight.shadow.mapSize.height = 1024;
      mainLight.shadow.camera.near = 2;
      mainLight.shadow.camera.far = 85;
      mainLight.shadow.camera.left = -36;
      mainLight.shadow.camera.right = 36;
      mainLight.shadow.camera.top = 36;
      mainLight.shadow.camera.bottom = -36;
      mainLight.shadow.bias = -0.0008;
      this.roomGroup.add(mainLight);

      if (meta.id === 'garden') this._buildGarden();
      else if (meta.id === 'sanctuary') this._buildSanctuary(opts.candles || []);
      else if (meta.id === 'sarangbang') this._buildSarangbang(opts.sarangbangName || '사랑방');
      else if (meta.id === 'bible') this._buildBibleRoom();
      else if (meta.id === 'qt') this._buildQtRoom();
      else if (meta.id === 'prayer') this._buildPrayerGallery();
      else if (meta.id === 'rooftop') this._buildRooftop();

      // 정면 베젤리스 건축형 대형 LED 월 / 스마트 칠판 (브러시드 브론즈 & 황동 트림)
      if (meta.hasBoard) {
        const [bx, by, bz] = meta.boardPos;
        const [bw, bh] = meta.boardSize;

        const bezel = new THREE.Mesh(
          new THREE.BoxGeometry(bw + 0.55, bh + 0.55, 0.28),
          this.pbr.darkSteelMaterial()
        );
        bezel.position.set(bx, by, bz - 0.16);
        const trim = new THREE.Mesh(
          new THREE.BoxGeometry(bw + 0.68, bh + 0.68, 0.14),
          this.pbr.brassMaterial()
        );
        trim.position.set(bx, by, bz - 0.24);
        this.roomGroup.add(trim, bezel);

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

    _makePlaqueTexture(title, sub = '', bg = '#1c1917', gold = '#d4af37') {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 160;
      const g = c.getContext('2d');
      g.fillStyle = bg;
      g.fillRect(0, 0, 512, 160);
      g.strokeStyle = gold;
      g.lineWidth = 6;
      g.strokeRect(10, 10, 492, 140);
      g.fillStyle = '#fafaf9';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '700 36px "Apple SD Gothic Neo", Georgia, sans-serif';
      g.fillText(title, 256, sub ? 62 : 80, 460);
      if (sub) {
        g.fillStyle = '#e5c158';
        g.font = '600 22px -apple-system, sans-serif';
        g.fillText(sub, 256, 112, 460);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
      return tex;
    }

    // 고급 대리석 문설주 & 강화유리·월넛 양개 도어 (포털)
    _addPortalDoor(x, z, rotY, targetZone, title, sub = '') {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);
      grp.rotation.y = rotY;

      const marble = this.pbr.marbleMaterial('door_trav', [224, 214, 198], [168, 152, 132], 1, 2, 0.25);
      const walnut = this.pbr.woodPlankMaterial('door_walnut', [102, 62, 34], [48, 26, 12], 1, 2, 0.28);
      const glass = this.pbr.glassMaterial(0.45, 0xfef3c7);
      const brass = this.pbr.brassMaterial();

      // 대리석 문틀 기둥 & 상인방
      const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 5.2, 0.55), marble);
      jambL.position.set(-1.85, 2.6, 0);
      const jambR = jambL.clone();
      jambR.position.x = 1.85;
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.55, 0.62), marble);
      lintel.position.set(0, 5.35, 0);

      // 양개 원목 도어 + 유리창 + 황동 손잡이 바
      [-0.82, 0.82].forEach((dx) => {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.58, 4.95, 0.16), walnut);
        leaf.position.set(dx, 2.48, 0);
        leaf.castShadow = true;
        const pane = new THREE.Mesh(new THREE.BoxGeometry(0.95, 3.4, 0.20), glass);
        pane.position.set(dx, 2.7, 0);
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 10), brass);
        handle.position.set(dx > 0 ? 0.18 : -0.18, 2.4, 0.14);
        grp.add(leaf, pane, handle);
      });

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(3.7, 1.05, 0.12),
        new THREE.MeshStandardMaterial({ map: this._makePlaqueTexture(title, sub), roughness: 0.35 })
      );
      sign.position.set(0, 6.25, 0.18);

      // 바닥 대리석 문지방 매트
      const threshold = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.04, 1.4), marble);
      threshold.position.set(0, 0.02, 0.85);
      threshold.receiveShadow = true;

      grp.add(jambL, jambR, lintel, sign, threshold);
      this.roomGroup.add(grp);

      const frontX = x + Math.sin(rotY) * 1.5;
      const frontZ = z + Math.cos(rotY) * 1.5;
      const item = {
        id: 'portal-' + targetZone + '-' + x + '-' + z,
        type: 'portal',
        targetZone,
        label: `🚪 ${title} 입장`,
        x: frontX,
        y: 0,
        z: frontZ,
        radius: 2.3,
        mesh: lintel
      };
      this.portals.push(item);
      this.interactables.push(item);
    }

    _addRealisticPewOrChair(id, x, y, z, rotY, width, label, style = 'pew') {
      let grp;
      if (style === 'sofa') {
        grp = this.pbr.createLoungeSofa(width);
      } else {
        grp = this.pbr.createRealisticPew(width);
      }
      grp.position.set(x, y, z);
      grp.rotation.y = rotY;
      this.roomGroup.add(grp);

      const targetMesh = grp.children[0];
      const offsets = width >= 3.2 ? [-width * 0.26, width * 0.26] : [0];
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

    _addArchitecturalLampPost(x, z, height = 4.5) {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);
      const steel = this.pbr.darkSteelMaterial();
      const brass = this.pbr.brassMaterial();

      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.45, 14), steel);
      plinth.position.y = 0.22;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, height, 12), steel);
      pole.position.y = height / 2;
      pole.castShadow = true;
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.10, 0.12, 14), brass);
      collar.position.y = height;
      const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.18, 0.52, 14),
        new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfbbf24, emissiveIntensity: 0.9, roughness: 0.2 })
      );
      lantern.position.y = height + 0.30;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.30, 0.22, 14), steel);
      cap.position.y = height + 0.65;

      grp.add(plinth, pole, collar, lantern, cap);
      this.roomGroup.add(grp);
    }

    // -----------------------------------------------------------------------
    // 1) 🌿 앞마당 정원 (화강암 석재 광장 · 현대식 트래버틴/유리 교회 건축 외관 · 에스프레소 파빌리온)
    // -----------------------------------------------------------------------
    _buildGarden() {
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(96, 96), this.pbr.grassMaterial(14, 14));
      grass.rotation.x = -Math.PI / 2;
      grass.receiveShadow = true;
      this.roomGroup.add(grass);

      const granite = this.pbr.granitePaverMaterial(8, 12);
      const travertine = this.pbr.marbleMaterial('ext_trav', [222, 212, 196], [172, 156, 136], 6, 3, 0.35);

      const mainPlaza = new THREE.Mesh(new THREE.BoxGeometry(12, 0.08, 62), granite);
      mainPlaza.position.set(0, 0.04, 5);
      mainPlaza.receiveShadow = true;
      const crossWalk = new THREE.Mesh(new THREE.BoxGeometry(58, 0.07, 8), granite);
      crossWalk.position.set(0, 0.035, 6);
      crossWalk.receiveShadow = true;
      this.roomGroup.add(mainPlaza, crossWalk);

      // 2단 천연 대리석 분수대 & 반사 수면
      const fOuter = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.62, 32), travertine);
      fOuter.position.set(0, 0.31, 6);
      fOuter.castShadow = true;
      fOuter.receiveShadow = true;
      const fWater = new THREE.Mesh(
        new THREE.CylinderGeometry(3.25, 3.25, 0.54, 32),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.05, metalness: 0.25, envMap: this.pbr.envMap, envMapIntensity: 1.5, transparent: true, opacity: 0.82 })
      );
      fWater.position.set(0, 0.38, 6);
      const fTier2 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.35, 24), travertine);
      fTier2.position.set(0, 0.95, 6);
      this.roomGroup.add(fOuter, fWater, fTier2);

      // 현대식 대성전 화강암 계단 & 트래버틴·커튼월 유리·원목 루버 파사드
      for (let s = 0; s < 4; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(24 - s * 1.2, 0.24, 3.0), travertine);
        step.position.set(0, 0.12 + s * 0.18, -16.5 - s * 1.6);
        step.receiveShadow = true;
        this.roomGroup.add(step);
      }

      const facadeStone = new THREE.Mesh(new THREE.BoxGeometry(34, 17, 3.5), travertine);
      facadeStone.position.set(0, 8.5, -26.8);
      facadeStone.castShadow = true;
      facadeStone.receiveShadow = true;

      const curtainGlass = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), this.pbr.glassMaterial(0.55, 0x93c5fd));
      curtainGlass.position.set(0, 9.5, -24.98);
      this.roomGroup.add(facadeStone, curtainGlass);

      // 외벽 수직 아키텍처 루버 핀 & 브론즈 발광 십자가
      for (let lx = -14; lx <= 14; lx += 2.8) {
        if (Math.abs(lx) < 3.2) continue;
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 16.5, 0.65), this.pbr.woodPlankMaterial('fin_w', [118, 76, 44], [58, 34, 18], 1, 3));
        fin.position.set(lx, 8.25, -24.85);
        fin.castShadow = true;
        this.roomGroup.add(fin);
      }

      const crossMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 0.95, roughness: 0.2 });
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5.2, 0.35), crossMat);
      cv.position.set(0, 11.8, -24.6);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.55, 0.35), crossMat);
      ch.position.set(0, 12.7, -24.6);
      this.roomGroup.add(cv, ch);

      const entryGlow = new THREE.PointLight(0xffedd5, 1.4, 34);
      entryGlow.position.set(0, 8.5, -19);
      this.roomGroup.add(entryGlow);

      this._addPortalDoor(0, -24.5, 0, 'sanctuary', '✧ 그레이스 대성전', '본당 정문 입장');
      this._addPortalDoor(-25, 2, Math.PI / 2, 'sarangbang', '🏠 사랑방 센터', '그룹별 소그룹실');
      this._addPortalDoor(25, 2, -Math.PI / 2, 'bible', '📖 성경통독방', '클래식 통독 도서관');
      this._addPortalDoor(25, 11, -Math.PI / 2, 'qt', '✏️ 큐티 아카데미', '기초반 강의·나눔실');

      // 야외 글래스 & 우드 에스프레소 카페 파빌리온
      const cafeRoof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.32, 5.2), this.pbr.darkSteelMaterial());
      cafeRoof.position.set(-14.5, 3.85, -9);
      cafeRoof.castShadow = true;
      const cafeBack = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.7, 0.4), this.pbr.acousticSlatMaterial(3, 1));
      cafeBack.position.set(-14.5, 1.85, -11.2);
      const cafeCounter = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.12, 1.1), travertine);
      cafeCounter.position.set(-14.5, 0.56, -8.2);
      cafeCounter.castShadow = true;
      const espressoMachine = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.62, 0.58), this.pbr.darkSteelMaterial());
      espressoMachine.position.set(-15.5, 1.42, -8.2);
      const cafeSign = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.95, 0.12),
        new THREE.MeshStandardMaterial({ map: this._makePlaqueTexture('☕ SOMY ESPRESSO BAR', '따뜻한 커피 & 티 나눔', '#18181b', '#34d399') })
      );
      cafeSign.position.set(-14.5, 4.45, -6.5);
      this.roomGroup.add(cafeRoof, cafeBack, cafeCounter, espressoMachine, cafeSign);

      this.interactables.push({
        id: 'garden-cafe',
        type: 'cafe',
        drinkType: 'coffee',
        label: '☕ 에스프레소 바에서 커피 받기',
        x: -14.5,
        y: 0,
        z: -6.2,
        radius: 2.8,
        mesh: cafeCounter
      });

      this._addRealisticPewOrChair('gbench1', -8.8, 0, 13.5, Math.PI / 2, 3.4, '🪑 정원 원목 벤치에 앉기');
      this._addRealisticPewOrChair('gbench2', 8.8, 0, 13.5, -Math.PI / 2, 3.4, '🪑 정원 원목 벤치에 앉기');
      this._addRealisticPewOrChair('gbench3', -8.8, 0, -2.5, Math.PI / 2, 3.4, '🪑 정원 원목 벤치에 앉기');
      this._addRealisticPewOrChair('gbench4', 8.8, 0, -2.5, -Math.PI / 2, 3.4, '🪑 정원 원목 벤치에 앉기');

      [[-6.5, 18], [6.5, 18], [-6.5, -7.5], [6.5, -7.5], [-17, 6], [17, 6]].forEach(([lx, lz]) => this._addArchitecturalLampPost(lx, lz));
      [[-20, -15], [20, -15], [-21, 18], [21, 18], [-15, 25], [15, 25]].forEach(([tx, tz]) => {
        const tree = this.pbr.createRealisticTree(1.15);
        tree.position.set(tx, 0, tz);
        this.roomGroup.add(tree);
      });
    }

    // -----------------------------------------------------------------------
    // 2) 🏛️ 그레이스 대성전 (월넛 어쿠스틱 루버월 + 트래버틴 대리석 기둥 + 그랜드피아노 + 크리스탈 강대상)
    // -----------------------------------------------------------------------
    _buildSanctuary(candles) {
      const floorWood = this.pbr.woodPlankMaterial('sanc_walnut', [108, 72, 46], [56, 34, 20], 10, 10, 0.28);
      const travertine = this.pbr.marbleMaterial('sanc_trav', [232, 222, 206], [178, 160, 138], 4, 2, 0.22);
      const darkMarble = this.pbr.marbleMaterial('sanc_darkm', [48, 42, 38], [118, 96, 72], 4, 2, 0.18);
      const slatMat = this.pbr.acousticSlatMaterial(8, 2);
      const carpetMat = this.pbr.fabricMaterial('royal_carpet', [124, 22, 38], 2, 12);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(74, 64), floorWood);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      const carpet = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.03, 46), carpetMat);
      carpet.position.set(0, 0.015, 6);
      carpet.receiveShadow = true;
      this.roomGroup.add(carpet);

      // 2단 트래버틴 & 다크월넛 원형 성단(강단) + 황동 간접조명 엣지
      const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(12.6, 12.9, 0.56, 48), travertine);
      stage1.position.set(0, 0.28, -18);
      stage1.receiveShadow = true;
      const stage1Trim = new THREE.Mesh(new THREE.CylinderGeometry(12.94, 12.94, 0.08, 48), this.pbr.brassMaterial());
      stage1Trim.position.set(0, 0.54, -18);

      const stage2 = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.8, 0.52, 48), floorWood);
      stage2.position.set(0, 0.82, -19.2);
      stage2.receiveShadow = true;
      this.roomGroup.add(stage1, stage1Trim, stage2);

      // 전면 어쿠스틱 루버 아트월 & 다크 엠페라도르 대리석 중앙 백월
      const frontWall = new THREE.Mesh(new THREE.BoxGeometry(66, 18, 0.9), slatMat);
      frontWall.position.set(0, 9, -24.8);
      frontWall.receiveShadow = true;
      const centerBackdrop = new THREE.Mesh(new THREE.BoxGeometry(26, 18, 1.05), darkMarble);
      centerBackdrop.position.set(0, 9, -24.7);
      this.roomGroup.add(frontWall, centerBackdrop);

      // 양옆 현대 대형교회 어쿠스틱 루버월 + 트래버틴 대리석 필라스터 기둥 + 간접 코브 조명
      [-32.5, 32.5].forEach((wx) => {
        const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.9, 17.5, 58), slatMat);
        sideWall.position.set(wx, 8.75, 2);
        sideWall.receiveShadow = true;
        this.roomGroup.add(sideWall);

        const inward = wx > 0 ? -0.55 : 0.55;
        for (let i = 0; i < 6; i++) {
          const pz = -19 + i * 8.2;
          const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.85, 17.5, 1.55), travertine);
          pilaster.position.set(wx + inward, 8.75, pz);
          pilaster.castShadow = true;
          pilaster.receiveShadow = true;

          // 기둥 옆 매립형 웜화이트 간접 LED 라인 바
          const ledStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 15.5, 0.14),
            new THREE.MeshBasicMaterial({ color: 0xfef3c7 })
          );
          ledStrip.position.set(wx + inward * 1.65, 8.5, pz + 0.88);
          this.roomGroup.add(pilaster, ledStrip);
        }
      });

      // 천장 우드 어쿠스틱 서까래 배플 (시야를 가리지 않는 상단 건축 디테일)
      for (let cz = -20; cz <= 16; cz += 9) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(64, 0.55, 0.65), floorWood);
        beam.position.set(0, 17.4, cz);
        this.roomGroup.add(beam);
      }

      // 브러시드 골드 백라이트 십자가
      const crossMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xf59e0b, emissiveIntensity: 0.85, roughness: 0.2, metalness: 0.6 });
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.52, 5.2, 0.28), crossMat);
      cv.position.set(16.2, 10.4, -24.1);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.52, 0.28), crossMat);
      ch.position.set(16.2, 11.3, -24.1);
      this.roomGroup.add(cv, ch);

      // 실사 크리스탈·월넛 강대상 & 그랜드 피아노 & 강단 화분
      const pulpit = this.pbr.createModernPulpit();
      pulpit.position.set(0, 1.08, -14.8);
      const piano = this.pbr.createGrandPiano();
      piano.position.set(-6.8, 1.08, -16.8);
      piano.rotation.y = 0.42;
      const plantL = this.pbr.createPottedPlant(1.25);
      plantL.position.set(-10.5, 0.56, -15.2);
      const plantR = this.pbr.createPottedPlant(1.25);
      plantR.position.set(10.5, 0.56, -15.2);
      this.roomGroup.add(pulpit, piano, plantL, plantR);

      // 강단 앞 벨벳 무릎기도 방석 레일
      const kneelCushion = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.18, 1.15), carpetMat);
      kneelCushion.position.set(0, 0.09, -5.2);
      kneelCushion.castShadow = true;
      kneelCushion.receiveShadow = true;
      this.roomGroup.add(kneelCushion);

      [-2.3, 0, 2.3].forEach((kx, idx) => {
        this.interactables.push({
          id: `altar_kneel_${idx}`,
          type: 'kneel',
          label: '🧎 성단 앞 무릎 꿇고 기도하기',
          x: kx,
          y: 0,
          z: -5.2,
          rotY: Math.PI,
          radius: 2.0,
          mesh: kneelCushion
        });
      });

      const warmL = new THREE.PointLight(0xffedd5, 1.1, 45);
      warmL.position.set(-16, 12, -6);
      const warmR = new THREE.PointLight(0xffedd5, 1.1, 45);
      warmR.position.set(16, 12, -6);
      this.roomGroup.add(warmL, warmR);

      // 4열 × 4블록 실사 원목·벨벳 장의자 배치
      const radii = [15.5, 20.5, 25.5, 30.5];
      const blocks = [-0.62, -0.23, 0.23, 0.62];
      radii.forEach((r, rIdx) => {
        blocks.forEach((ang, bIdx) => {
          const px = Math.sin(ang) * r;
          const pz = -18 + Math.cos(ang) * r;
          const faceStageYaw = Math.atan2(-px, -18 - pz);
          this._addRealisticPewOrChair(`pew_${rIdx}_${bIdx}`, px, 0, pz, faceStageYaw, 4.5, `🪑 ${rIdx + 1}열 장의자 착석`, 'pew');
        });
      });

      // 단조 철제 & 황동 기도 등불 봉헌대
      const standTop = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.14, 1.1), this.pbr.brassMaterial());
      standTop.position.set(0, 0.88, -8.2);
      const standBody = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.82, 0.95), darkMarble);
      standBody.position.set(0, 0.41, -8.2);
      standBody.castShadow = true;
      this.roomGroup.add(standTop, standBody);

      this.interactables.push({
        id: 'candle-altar',
        type: 'candle_altar',
        label: '🕯️ 기도 등불 밝히기',
        x: 0,
        y: 0,
        z: -6.8,
        radius: 2.5,
        mesh: standBody
      });

      this.candleGroup = new THREE.Group();
      this.roomGroup.add(this.candleGroup);
      this.updateCandles(candles);

      this._addPortalDoor(0, 28.8, Math.PI, 'garden', '🌿 앞마당 정원', '야외 광장 출구');
      this._addPortalDoor(-31.5, -8, Math.PI / 2, 'sarangbang', '🏠 사랑방 (소그룹)', '그룹별 모임방');
      this._addPortalDoor(-31.5, 6, Math.PI / 2, 'prayer', '🕯️ 기도·갤러리실', '성화·골방기도');
      this._addPortalDoor(31.5, -8, -Math.PI / 2, 'bible', '📖 성경통독방', '클래식 도서관');
      this._addPortalDoor(31.5, 6, -Math.PI / 2, 'qt', '✏️ 큐티방', '아카데미·나눔실');
      this._addPortalDoor(17.5, 28.8, Math.PI, 'rooftop', '☕ 루프탑 소미카페', '옥상 정원 라운지');
    }

    updateCandles(candles = []) {
      if (!this.candleGroup) return;
      while (this.candleGroup.children.length > 0) {
        this.candleGroup.remove(this.candleGroup.children[0]);
      }
      const glassMat = this.pbr.glassMaterial(0.5, 0xfef3c7);
      const count = Math.min(candles.length, 14);
      for (let i = 0; i < count; i++) {
        const ox = -4.8 + (i % 14) * 0.74;
        const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.10, 0.30, 12), glassMat);
        holder.position.set(ox, 1.10, -8.2);
        const flame = new THREE.Mesh(
          new THREE.SphereGeometry(0.085, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfde047 })
        );
        flame.scale.set(0.8, 1.5, 0.8);
        flame.position.set(ox, 1.28, -8.2);
        this.candleGroup.add(holder, flame);
      }
    }

    // -----------------------------------------------------------------------
    // 3) 🏠 사랑방 (부티크 거실형 소그룹 라운지: 오크 마루 + 페르시안 러그 + 부클레 소파 + 대리석 티테이블)
    // -----------------------------------------------------------------------
    _buildSarangbang(roomTitle) {
      const oakFloor = this.pbr.woodPlankMaterial('sarang_oak', [156, 112, 72], [96, 64, 38], 7, 7, 0.32);
      const plaster = this.pbr.marbleMaterial('warm_wall', [238, 232, 222], [216, 206, 192], 3, 2, 0.55);
      const slat = this.pbr.acousticSlatMaterial(5, 1);
      const calacatta = this.pbr.marbleMaterial('table_calacatta', [246, 244, 240], [164, 158, 150], 1, 1, 0.15);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 32), oakFloor);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      const rug = new THREE.Mesh(new THREE.CircleGeometry(6.8, 40), this.pbr.persianRugMaterial());
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.02, 0.5);
      rug.receiveShadow = true;
      this.roomGroup.add(rug);

      const bWall = new THREE.Mesh(new THREE.BoxGeometry(34, 10.5, 0.6), slat);
      bWall.position.set(0, 5.25, -13.9);
      bWall.receiveShadow = true;
      const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 10.5, 32), plaster);
      lWall.position.set(-16.5, 5.25, 0.5);
      const rWall = lWall.clone();
      rWall.position.x = 16.5;
      this.roomGroup.add(bWall, lWall, rWall);

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 1.35, 0.14),
        new THREE.MeshStandardMaterial({ map: this._makePlaqueTexture(`🏠 ${roomTitle}`, '말씀과 사랑의 교제가 흐르는 소그룹 라운지') })
      );
      sign.position.set(0, 9.1, -13.45);
      this.roomGroup.add(sign);

      // 칼라카타 대리석 원형 티테이블 + 다기 세트 + 펼쳐진 성경
      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.10, 32), calacatta);
      tableTop.position.set(0, 0.68, 0.5);
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.15, 0.64, 24), this.pbr.woodPlankMaterial('tbase', [92, 58, 34], [48, 28, 14], 1, 1));
      tableBase.position.set(0, 0.32, 0.5);
      const bibleOnTable = this.pbr.createOpenBibleProp();
      bibleOnTable.position.set(-0.45, 0.74, 0.5);
      const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 14), new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.2 }));
      teapot.position.set(0.55, 0.86, 0.45);
      this.roomGroup.add(tableTop, tableBase, bibleOnTable, teapot);

      this.interactables.push({
        id: 'sarang-switcher',
        type: 'sarang_menu',
        label: '🏠 다른 사랑방 선택 / 새 방 만들기',
        x: 0,
        y: 0,
        z: 0.5,
        radius: 3.1,
        mesh: tableTop
      });

      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        if (Math.abs(Math.sin(ang)) < 0.36 && Math.cos(ang) < -0.7) continue;
        const sx = Math.sin(ang) * 5.1;
        const sz = 0.5 + Math.cos(ang) * 5.1;
        const faceCenter = Math.atan2(-sx, 0.5 - sz);
        this._addRealisticPewOrChair(`sofa_${i}`, sx, 0, sz, faceCenter, 2.4, '🛋️ 패브릭 소파에 둘러앉기', 'sofa');
      }

      // 코너 원목 책장 & 올리브 화분 & 스탠드 조명
      const cornerShelf = this.pbr.createRealisticBookshelf(3.6, 5.4);
      cornerShelf.position.set(-15.5, 0, -6);
      cornerShelf.rotation.y = Math.PI / 2;
      this.roomGroup.add(cornerShelf);

      [[-13.5, -11], [13.5, -11], [-13.5, 11], [13.5, 11]].forEach(([px, pz]) => {
        const p = this.pbr.createPottedPlant(1.2);
        p.position.set(px, 0, pz);
        this.roomGroup.add(p);
      });

      const warmLight = new THREE.PointLight(0xffe8cc, 1.15, 30);
      warmLight.position.set(0, 8, 0.5);
      this.roomGroup.add(warmLight);

      this._addPortalDoor(-10, 14.2, Math.PI, 'sanctuary', '🏛️ 대성전 복귀', '');
      this._addPortalDoor(10, 14.2, Math.PI, 'qt', '✏️ 큐티방 이동', '');
    }

    // -----------------------------------------------------------------------
    // 4) 📖 성경통독방 (클래식 월넛 서재 & 가죽장정 성경 서가 & 브라스 뱅커스 램프 열람석)
    // -----------------------------------------------------------------------
    _buildBibleRoom() {
      const walnutFloor = this.pbr.woodPlankMaterial('lib_floor', [118, 76, 44], [62, 36, 18], 8, 8, 0.30);
      const creamWall = this.pbr.marbleMaterial('lib_wall', [236, 228, 214], [198, 186, 168], 4, 2, 0.5);
      const wainscot = this.pbr.woodPlankMaterial('lib_wain', [96, 58, 32], [48, 26, 12], 6, 1, 0.32);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(38, 36), walnutFloor);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      const runner = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.025, 28), this.pbr.persianRugMaterial());
      runner.position.set(0, 0.013, 1);
      runner.receiveShadow = true;
      this.roomGroup.add(runner);

      // 정면 & 좌우 클래식 웨인스코팅 + 크림 플라스터 벽면
      const bWall = new THREE.Mesh(new THREE.BoxGeometry(38, 11.5, 0.6), creamWall);
      bWall.position.set(0, 5.75, -15.8);
      const bWain = new THREE.Mesh(new THREE.BoxGeometry(38, 3.0, 0.72), wainscot);
      bWain.position.set(0, 1.5, -15.75);
      this.roomGroup.add(bWall, bWain);

      [-17.8, 17.8].forEach((wx) => {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(0.6, 11.5, 36), creamWall);
        sw.position.set(wx, 5.75, 1);
        this.roomGroup.add(sw);

        // 양쪽 벽면 정교한 가죽장정 원목 서가 4연속 배치
        for (let z = -10.5; z <= 10.5; z += 7.0) {
          const bookcase = this.pbr.createRealisticBookshelf(5.8, 6.8);
          bookcase.position.set(wx > 0 ? wx - 0.65 : wx + 0.65, 0, z);
          bookcase.rotation.y = wx > 0 ? -Math.PI / 2 : Math.PI / 2;
          this.roomGroup.add(bookcase);
        }
      });

      // 6개 클래식 원목 열람 책상 + 황동 뱅커스 스탠드 + 펼쳐진 성경책
      const deskRows = [-5.2, 3.0];
      const deskCols = [-7.6, 0, 7.6];
      deskRows.forEach((dz, rIdx) => {
        deskCols.forEach((dx, cIdx) => {
          const deskGrp = this.pbr.createLibraryDeskWithLamp(3.9);
          deskGrp.position.set(dx, 0, dz);
          this.roomGroup.add(deskGrp);

          this._addRealisticPewOrChair(`bdesk_${rIdx}_${cIdx}`, dx, 0, dz + 1.45, Math.PI, 1.55, '📖 통독 열람석에 앉아 성경 펴기', 'pew');
          this.interactables.push({
            id: `bible_open_${rIdx}_${cIdx}`,
            type: 'bible_desk',
            label: '📖 개역개정 성경 66권 펼치기',
            x: dx,
            y: 0,
            z: dz + 1.45,
            rotY: Math.PI,
            radius: 2.2,
            mesh: deskGrp.children[0]
          });
        });
      });

      const libLight = new THREE.PointLight(0xffe8c2, 1.15, 34);
      libLight.position.set(0, 9, -1);
      this.roomGroup.add(libLight);

      this._addPortalDoor(-10.5, 16.2, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(10.5, 16.2, Math.PI, 'qt', '✏️ 큐티방 이동', '기초반 강의·나눔');
    }

    // -----------------------------------------------------------------------
    // 5) ✏️ 큐티방 (모던 오크 루버 & 트래버틴 아카데미 세미나실)
    // -----------------------------------------------------------------------
    _buildQtRoom() {
      const lightOak = this.pbr.woodPlankMaterial('qt_oak', [176, 134, 88], [116, 82, 48], 8, 8, 0.30);
      const travWall = this.pbr.marbleMaterial('qt_trav', [240, 235, 226], [196, 186, 172], 4, 2, 0.40);
      const slat = this.pbr.acousticSlatMaterial(6, 1);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(38, 36), lightOak);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      const bWall = new THREE.Mesh(new THREE.BoxGeometry(38, 11.5, 0.6), slat);
      bWall.position.set(0, 5.75, -15.8);
      const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 11.5, 36), travWall);
      lWall.position.set(-18, 5.75, 1);
      const rWall = lWall.clone();
      rWall.position.x = 18;
      this.roomGroup.add(bWall, lWall, rWall);

      // 강사용 모던 강연대
      const podium = this.pbr.createModernPulpit();
      podium.position.set(-6.2, 0, -11.2);
      this.roomGroup.add(podium);

      this.interactables.push({
        id: 'qt-lectern',
        type: 'qt_academy',
        label: '📚 큐티 기초반 강의안 & 나눔 열기',
        x: -6.2,
        y: 0,
        z: -9.5,
        radius: 2.6,
        mesh: podium.children[0]
      });

      // 아카데미 원목 세미나 데스크 + 스탠드 + 성경 노트 세트
      [-5.0, 1.6].forEach((dz, rIdx) => {
        [-6.6, 6.6].forEach((dx, cIdx) => {
          const semDesk = this.pbr.createLibraryDeskWithLamp(6.4);
          semDesk.position.set(dx, 0, dz);
          this.roomGroup.add(semDesk);

          this._addRealisticPewOrChair(`qtseat_${rIdx}_${cIdx}`, dx, 0, dz + 1.5, Math.PI, 4.4, '✏️ 큐티 세미나석 착석', 'pew');
          this.interactables.push({
            id: `qt_desk_${rIdx}_${cIdx}`,
            type: 'qt_academy',
            label: '📚 큐티 기초반 강의안 & 나눔 열기',
            x: dx,
            y: 0,
            z: dz + 1.5,
            rotY: Math.PI,
            radius: 2.5,
            mesh: semDesk.children[0]
          });
        });
      });

      [[-15.5, -12], [15.5, -12]].forEach(([px, pz]) => {
        const plant = this.pbr.createPottedPlant(1.3);
        plant.position.set(px, 0, pz);
        this.roomGroup.add(plant);
      });

      this._addPortalDoor(-11, 16.2, Math.PI, 'bible', '📖 성경통독방', '');
      this._addPortalDoor(0, 16.2, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(11, 16.2, Math.PI, 'sarangbang', '🏠 사랑방 이동', '');
    }

    // -----------------------------------------------------------------------
    // 6) 🕯️ 골방 기도실 & 성화·말씀 갤러리 (다크 대리석 뮤지엄 회랑 + 원목 개인 기도 부스)
    // -----------------------------------------------------------------------
    _buildPrayerGallery() {
      const darkMarbleFloor = this.pbr.marbleMaterial('pray_floor', [54, 48, 46], [122, 104, 84], 5, 5, 0.16);
      const stoneWall = this.pbr.marbleMaterial('pray_wall', [198, 190, 178], [148, 138, 124], 4, 2, 0.45);
      const walnut = this.pbr.woodPlankMaterial('booth_w', [102, 62, 34], [48, 26, 12], 2, 2, 0.30);
      const velvet = this.pbr.fabricMaterial('kneel_velvet', [118, 22, 38], 2, 2);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 38), darkMarbleFloor);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      const bWall = new THREE.Mesh(new THREE.BoxGeometry(34, 11, 0.6), stoneWall);
      bWall.position.set(0, 5.5, -16.8);
      const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 11, 38), stoneWall);
      lWall.position.set(-16, 5.5, 1);
      const rWall = lWall.clone();
      rWall.position.x = 16;
      this.roomGroup.add(bWall, lWall, rWall);

      // 좌·우 금장 조각 액자 성화 6점 전시
      GALLERY_ARTWORKS.forEach((art, i) => {
        const isLeft = i < 3;
        const idx = i % 3;
        const az = -8.5 + idx * 9.2;
        const ax = isLeft ? -15.55 : 15.55;
        const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;

        const framed = this.pbr.createFramedSacredPainting(art, i);
        framed.position.set(ax, 4.4, az);
        framed.rotation.y = rotY;
        this.roomGroup.add(framed);

        this.interactables.push({
          id: `art_${i}`,
          type: 'artwork',
          label: `🖼️ '${art.title}' 성화 묵상하기`,
          artwork: art,
          x: isLeft ? -12.8 : 12.8,
          y: 0,
          z: az,
          radius: 3.0,
          mesh: framed.children[1]
        });
      });

      // 원목 파티션 개인 골방 기도 부스 4칸 (기도 선반 + 십자가 + 벨벳 무릎방석)
      [-6.3, -2.1, 2.1, 6.3].forEach((kx, idx) => {
        const dividerL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 2.2), walnut);
        dividerL.position.set(kx - 1.95, 1.2, -11.8);
        dividerL.castShadow = true;
        if (idx === 3) {
          const dividerR = dividerL.clone();
          dividerR.position.x = kx + 1.95;
          this.roomGroup.add(dividerR);
        }
        const kneelDesk = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.08, 0.55), walnut);
        kneelDesk.position.set(kx, 0.92, -12.55);
        kneelDesk.rotation.x = 0.14;

        const miniBible = this.pbr.createOpenBibleProp();
        miniBible.scale.set(0.75, 0.75, 0.75);
        miniBible.position.set(kx, 0.96, -12.52);

        const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.95), velvet);
        cushion.position.set(kx, 0.09, -11.3);
        cushion.castShadow = true;

        this.roomGroup.add(dividerL, kneelDesk, miniBible, cushion);

        this.interactables.push({
          id: `prayer_kneel_${idx}`,
          type: 'kneel',
          label: `🧎 ${idx + 1}번 개인 골방 기도석 무릎기도`,
          x: kx,
          y: 0,
          z: -11.3,
          rotY: Math.PI,
          radius: 1.9,
          mesh: cushion
        });
      });

      const warmGlow = new THREE.PointLight(0xffd89b, 1.0, 32);
      warmGlow.position.set(0, 7.5, -8);
      this.roomGroup.add(warmGlow);

      this._addPortalDoor(-7.5, 18.2, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(7.5, 18.2, Math.PI, 'bible', '📖 성경통독방', '');
    }

    // -----------------------------------------------------------------------
    // 7) ☕ 루프탑 소미카페 (티크 우드 데크 + 강화유리 난간 + 대리석 비스트로 테이블 + 페스툰 가든 전구)
    // -----------------------------------------------------------------------
    _buildRooftop() {
      const teakDeck = this.pbr.woodPlankMaterial('teak_deck', [124, 86, 56], [68, 44, 26], 10, 10, 0.42);
      const glassRail = this.pbr.glassMaterial(0.38, 0xcbd5e1);
      const steel = this.pbr.darkSteelMaterial();
      const calacatta = this.pbr.marbleMaterial('bistro_m', [245, 242, 236], [168, 160, 150], 1, 1, 0.18);

      const deck = new THREE.Mesh(new THREE.PlaneGeometry(46, 42), teakDeck);
      deck.rotation.x = -Math.PI / 2;
      deck.receiveShadow = true;
      this.roomGroup.add(deck);

      // 강화유리 & 다크스틸 핸드레일 난간
      const rBack = new THREE.Mesh(new THREE.BoxGeometry(46, 1.35, 0.08), glassRail);
      rBack.position.set(0, 0.68, -20.2);
      const rBackTop = new THREE.Mesh(new THREE.BoxGeometry(46, 0.08, 0.14), steel);
      rBackTop.position.set(0, 1.38, -20.2);
      const rLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.35, 42), glassRail);
      rLeft.position.set(-22.5, 0.68, 0);
      const rRight = rLeft.clone();
      rRight.position.x = 22.5;
      this.roomGroup.add(rBack, rBackTop, rLeft, rRight);

      // 밤하늘 별빛
      const starGeo = new THREE.BufferGeometry();
      const pts = [];
      for (let i = 0; i < 200; i++) {
        pts.push((Math.random() - 0.5) * 140, 22 + Math.random() * 38, (Math.random() - 0.5) * 140);
      }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      this.roomGroup.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfef9c3, size: 0.42 })));

      // 상공 페스툰 스트링 가든 전구 라인
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      [-2, 7, 15].forEach((sz) => {
        for (let sx = -16; sx <= 16; sx += 3.2) {
          const sag = Math.cos((sx / 16) * (Math.PI / 2)) * 0.65;
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), bulbMat);
          bulb.position.set(sx, 5.6 - sag, sz);
          this.roomGroup.add(bulb);
        }
      });

      // 루프탑 시더우드 & 대리석 에스프레소 바
      const barRoof = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.28, 4.4), steel);
      barRoof.position.set(-13.2, 3.85, -11);
      const barBack = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.7, 0.45), this.pbr.acousticSlatMaterial(4, 1));
      barBack.position.set(-13.2, 1.85, -12.8);
      const barCounter = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.12, 1.05), calacatta);
      barCounter.position.set(-13.2, 0.56, -9.5);
      barCounter.castShadow = true;
      const barSign = new THREE.Mesh(
        new THREE.BoxGeometry(5.8, 0.95, 0.12),
        new THREE.MeshStandardMaterial({ map: this._makePlaqueTexture('☕ SOMY ROOFTOP LOUNGE', '스페셜티 커피 & 티') })
      );
      barSign.position.set(-13.2, 4.42, -8.8);
      this.roomGroup.add(barRoof, barBack, barCounter, barSign);

      this.interactables.push({
        id: 'roof-coffee',
        type: 'cafe',
        drinkType: 'coffee',
        label: '☕ 루프탑 바에서 따뜻한 커피 받기',
        x: -13.2,
        y: 0,
        z: -7.6,
        radius: 2.8,
        mesh: barCounter
      });

      // 우측 미네랄 워터 & 리프레시먼트 바
      const waterCounter = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.12, 1.0), calacatta);
      waterCounter.position.set(13.2, 0.56, -9.5);
      const waterSign = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, 0.92, 0.12),
        new THREE.MeshStandardMaterial({ map: this._makePlaqueTexture('💧 REFRESHMENT BAR', '시원한 생수 & 음료', '#0f172a', '#38bdf8') })
      );
      waterSign.position.set(13.2, 3.6, -9.5);
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

      // 대리석 원형 비스트로 테이블 4세트 + 테이블 캔들 랜턴
      [[-8, 3], [8, 3], [-8, 12], [8, 12]].forEach(([tx, tz], tIdx) => {
        const top = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.08, 28), calacatta);
        top.position.set(tx, 0.78, tz);
        top.castShadow = true;
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.42, 0.76, 16), steel);
        ped.position.set(tx, 0.38, tz);
        const lantern = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.24, 12),
          new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 0.85 })
        );
        lantern.position.set(tx, 0.94, tz);
        this.roomGroup.add(top, ped, lantern);

        for (let c = 0; c < 4; c++) {
          const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
          const cx = tx + Math.sin(a) * 2.35;
          const cz = tz + Math.cos(a) * 2.35;
          this._addRealisticPewOrChair(`rtbl_${tIdx}_${c}`, cx, 0, cz, Math.atan2(tx - cx, tz - cz), 1.15, `☕ ${tIdx + 1}번 비스트로 테이블 착석`, 'pew');
        }
      });

      [[-18, -2], [18, -2], [-18, 14], [18, 14]].forEach(([lx, lz]) => this._addArchitecturalLampPost(lx, lz, 4.2));
      [[-19.5, -16], [19.5, -16], [-19.5, 17], [19.5, 17]].forEach(([tx, tz]) => {
        const p = this.pbr.createPottedPlant(1.45);
        p.position.set(tx, 0, tz);
        this.roomGroup.add(p);
      });

      this._addPortalDoor(-7.5, 19.5, Math.PI, 'sanctuary', '🏛️ 대성전 내려가기', '');
      this._addPortalDoor(7.5, 19.5, Math.PI, 'garden', '🌿 앞마당 정원', '');
    }

    // -----------------------------------------------------------------------
    // 입력 처리 및 메인 애니메이션 루프
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

        if (av.pose === 'sit') {
          av.bodyPivot.position.y = -0.18;
          av.leftLeg.rotation.x = -Math.PI * 0.45;
          av.rightLeg.rotation.x = -Math.PI * 0.45;
          av.leftArm.rotation.x = -0.32;
          av.rightArm.rotation.x = av.sipTimer > 0 ? -1.35 : -0.32;
        } else if (av.pose === 'kneel') {
          av.bodyPivot.position.y = -0.32;
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
          av.myRing.material.color.setHex(av.micWave ? 0x34d399 : 0xfbbf24);
        }

        if (av.bubbleTimer > 0) {
          av.bubbleTimer -= dt;
          if (av.bubbleTimer <= 0) av.bubbleEl.classList.add('hidden');
        }
      }

      if (this.cameraMode === 'panorama') {
        const [lx, ly, lz] = meta.panorama.look;
        const cx = lx + Math.sin(this.panoYaw) * Math.cos(this.panoPitch) * this.panoDist;
        const cy = Math.max(2.5, ly + Math.sin(this.panoPitch) * this.panoDist);
        const cz = lz + Math.cos(this.panoYaw) * Math.cos(this.panoPitch) * this.panoDist;
        this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.12);
        this.camera.lookAt(lx, ly, lz);
      } else if (me) {
        const targetY = me.y + 1.80;
        const cx = me.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
        const cy = Math.max(1.2, targetY + Math.sin(this.camPitch) * this.camDist);
        const cz = me.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
        this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.16);
        this.camera.lookAt(me.x, targetY + 0.32, me.z);
      }
    }

    _updateHtmlOverlays() {
      const v = new THREE.Vector3();
      for (const av of this.avatars.values()) {
        v.set(av.x, av.y + 2.62, av.z);
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
