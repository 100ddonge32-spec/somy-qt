/* =========================================================================
 * 소미 3D 온라인 캠퍼스 — CAD / Enscape 실사 건축 인테리어 Three.js 엔진
 * 대성전 곡선 단차 간접조명 천장 + 벽면 월워셔 조명 + 7개 전 공간 현대식 모던 인테리어
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
      name: '🌿 앞마당 캠퍼스 광장',
      subtitle: '모던 화강암 광장 · 글래스 카페 파빌리온 · 대성전 커튼월 외관',
      sky: 0x1b2838,
      fogColor: 0x223042,
      fogDensity: 0.0055,
      spawn: { x: 0, z: 24, rotY: Math.PI },
      panorama: { pos: [-18, 16, 36], look: [0, 4, -8] },
      bounds: { x: 34, zMin: -28, zMax: 34 },
      hasBoard: false
    },
    sanctuary: {
      id: 'sanctuary',
      name: '🏛️ 그레이스 대성전',
      subtitle: '곡선 간접조명 루버천장 · 벽면 월워셔 조명 · 화이트 백라이트 십자가홀',
      sky: 0xd8ccb8,
      fogColor: 0xe6dccb,
      fogDensity: 0.0028,
      spawn: { x: 0, z: 23, rotY: Math.PI },
      // 참조 CAD 사진과 동일한 좌측 후면 대각선 실내 파노라마 앵글!
      panorama: { pos: [-22, 9.2, 23], look: [2, 3.8, -14] },
      bounds: { x: 30, zMin: -22, zMax: 28 },
      hasBoard: true,
      boardPos: [0, 6.4, -22.6],
      boardSize: [18.6, 5.8]
    },
    sarangbang: {
      id: 'sarangbang',
      name: '🏠 사랑방 (모던 소그룹실)',
      subtitle: '우물천장 간접조명 · 오트밀 모듈 소파 · 트래버틴 라운지',
      sky: 0xe8e2d7,
      fogColor: 0xf0ebe1,
      fogDensity: 0.003,
      spawn: { x: 0, z: 12.0, rotY: Math.PI },
      panorama: { pos: [-12, 7.6, 13.5], look: [0, 2.6, -4] },
      bounds: { x: 15, zMin: -13, zMax: 14 },
      hasBoard: true,
      boardPos: [0, 4.9, -13.2],
      boardSize: [11.2, 5.2]
    },
    bible: {
      id: 'bible',
      name: '📖 성경통독방 (모던 북라운지)',
      subtitle: '선반 LED 빌트인 서가 · 화이트 스터디 데스크 · 개역개정 66권',
      sky: 0xeae5dc,
      fogColor: 0xf2ede4,
      fogDensity: 0.003,
      spawn: { x: 0, z: 14.0, rotY: Math.PI },
      panorama: { pos: [-13, 8.2, 15.0], look: [0, 3.0, -5] },
      bounds: { x: 16, zMin: -15, zMax: 16 },
      hasBoard: true,
      boardPos: [0, 5.2, -15.1],
      boardSize: [12.4, 5.6]
    },
    qt: {
      id: 'qt',
      name: '✏️ 큐티방 (모던 세미나홀)',
      subtitle: '리니어 LED 우물천장 · 화이트 세미나 데스크 · 큐티 기초반 강의실',
      sky: 0xebeef2,
      fogColor: 0xf1f4f8,
      fogDensity: 0.003,
      spawn: { x: 0, z: 14.0, rotY: Math.PI },
      panorama: { pos: [-13, 8.2, 15.0], look: [0, 3.0, -5] },
      bounds: { x: 16.5, zMin: -15, zMax: 16 },
      hasBoard: true,
      boardPos: [0, 5.2, -15.1],
      boardSize: [13.0, 5.8]
    },
    prayer: {
      id: 'prayer',
      name: '🕯️ 기도실 & 현대 성화갤러리',
      subtitle: '화이트 뮤지엄 월워셔 회랑 · 간접조명 원목 루버 개인기도부스',
      sky: 0xded9cf,
      fogColor: 0xe8e3da,
      fogDensity: 0.0035,
      spawn: { x: 0, z: 16.0, rotY: Math.PI },
      panorama: { pos: [-11, 7.8, 16.5], look: [0, 2.8, -5] },
      bounds: { x: 14.5, zMin: -16, zMax: 17.5 },
      hasBoard: true,
      boardPos: [0, 5.0, -16.1],
      boardSize: [10.6, 5.0]
    },
    rooftop: {
      id: 'rooftop',
      name: '☕ 루프탑 글래스 소미카페',
      subtitle: '알루미늄 루버 파고라 · 테라조 커피바 · 야경 라운지 테라스',
      sky: 0x0b1324,
      fogColor: 0x111c33,
      fogDensity: 0.006,
      spawn: { x: 0, z: 17.0, rotY: Math.PI },
      panorama: { pos: [-16, 12, 24], look: [0, 2.5, -3] },
      bounds: { x: 21, zMin: -17.5, zMax: 20 },
      hasBoard: true,
      boardPos: [0, 5.1, -17.0],
      boardSize: [11.0, 5.2]
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
      this.renderer.toneMappingExposure = 1.18;
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
      this.lightingDimmed = false; // false: 화사한 CAD 본예배 조명, true: 은은한 기도회 간접조명
      this.hemiLight = null;
      this.mainDirLight = null;

      this.cameraMode = 'follow';
      this.camYaw = 0;
      this.camPitch = 0.26;
      this.camDist = 8.4;
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
      return AVATAR_PRESETS;
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
      const isOutdoorNight = this.currentZone === 'garden' || this.currentZone === 'rooftop';
      if (this.lightingDimmed) {
        this.renderer.toneMappingExposure = 0.78;
        if (this.hemiLight) this.hemiLight.intensity = isOutdoorNight ? 0.42 : 0.48;
        if (this.mainDirLight) this.mainDirLight.intensity = 0.35;
      } else {
        this.renderer.toneMappingExposure = isOutdoorNight ? 1.08 : 1.22;
        if (this.hemiLight) this.hemiLight.intensity = isOutdoorNight ? 0.68 : 1.08;
        if (this.mainDirLight) this.mainDirLight.intensity = isOutdoorNight ? 0.72 : 0.88;
      }
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
        this.camDist = Math.max(4.0, Math.min(18, this.camDist + delta));
      }
    }

    setJoystick(jx, jy) {
      this.joyVec.x = jx;
      this.joyVec.y = jy;
    }

    // -----------------------------------------------------------------------
    // PBR 아바타 생성
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
        const rg = new THREE.RingGeometry(0.54, 0.66, 32);
        rg.rotateX(-Math.PI / 2);
        myRing = new THREE.Mesh(
          rg,
          new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        );
        myRing.position.y = 0.03;
        root.add(myRing);
      }

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
      cupGroup.add(cupBody, cupSleeve);
      cupGroup.position.set(0, -0.56, 0.15);
      cupGroup.visible = !!info.drink;
      rightArm.add(cupGroup);

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

      while (this.roomGroup.children.length > 0) {
        this.roomGroup.remove(this.roomGroup.children[0]);
      }

      this.scene.background = new THREE.Color(meta.sky);
      this.scene.fog = new THREE.FogExp2(meta.fogColor, meta.fogDensity);

      // 화사하고 균일한 V-Ray / Enscape 건축 글로벌 조명
      this.hemiLight = new THREE.HemisphereLight(0xfffaf0, 0x9c8f7e, 1.08);
      this.roomGroup.add(this.hemiLight);

      this.mainDirLight = new THREE.DirectionalLight(0xfff5e4, 0.88);
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

      // 정면 베젤리스 초슬림 스마트 LED 월 / 칠판
      if (meta.hasBoard) {
        const [bx, by, bz] = meta.boardPos;
        const [bw, bh] = meta.boardSize;

        const bezel = new THREE.Mesh(
          new THREE.BoxGeometry(bw + 0.24, bh + 0.24, 0.14),
          this.pbr.darkSteelMaterial()
        );
        bezel.position.set(bx, by, bz - 0.08);
        this.roomGroup.add(bezel);

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
          radius: 5.2,
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

    // 모던 건축 슬림 알루미늄 프레임 & 강화유리·라이트오크 도어
    _addPortalDoor(x, z, rotY, targetZone, title, sub = '') {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);
      grp.rotation.y = rotY;

      const darkFrame = this.pbr.darkSteelMaterial();
      const oak = this.pbr.woodPlankMaterial('door_mod_oak', [208, 176, 134], [164, 132, 92], 1, 2, 0.32);
      const glass = this.pbr.glassMaterial(0.38, 0xe0f2fe);

      const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.4, 0.24), darkFrame);
      frameOuter.position.y = 2.2;

      [-0.78, 0.78].forEach((dx) => {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.48, 4.2, 0.12), oak);
        leaf.position.set(dx, 2.1, 0.02);
        const pane = new THREE.Mesh(new THREE.BoxGeometry(1.05, 3.4, 0.15), glass);
        pane.position.set(dx, 2.2, 0.02);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.85, 0.08), darkFrame);
        handle.position.set(dx > 0 ? 0.14 : -0.14, 2.0, 0.10);
        grp.add(leaf, pane, handle);
      });

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.86, 0.08),
        new THREE.MeshStandardMaterial({ map: this._makePlaqueTexture(title, sub), roughness: 0.3 })
      );
      sign.position.set(0, 4.95, 0.08);

      grp.add(frameOuter, sign);
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
        mesh: frameOuter
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
    // 1) 🏛️ 그레이스 대성전 — 참조 CAD 사진 완벽 재현!
    // (곡선 단차 간접조명 루버천장 + 수직 월워셔 벽면 + 우측 화이트 백라이트 십자가월 + 모던 오크 장의자)
    // =======================================================================
    _buildSanctuary(candles) {
      const carpetGrey = this.pbr.carpetTileMaterial(18, 18, [82, 84, 88]);
      const redAisleMat = this.pbr.fabricMaterial('cad_red_aisle', [132, 24, 34], 2, 12);
      const ivoryStageMat = this.pbr.marbleMaterial('ivory_stage', [242, 236, 224], [214, 204, 188], 6, 2, 0.22);
      const frontOakSlat = this.pbr.acousticSlatMaterial(8, 2, true);

      // 1-A) 바닥 다크그레이 카펫 타일 & 방사형 곡선 와인레드 통로 카펫
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(74, 64), carpetGrey);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      // 곡선형 외곽 레드카펫 통로 + 직선형 중앙 서브 통로 (참조 이미지 바닥 패턴!)
      const arcCarpetGeo = new THREE.RingGeometry(28.2, 31.0, 56, 1, -Math.PI * 0.40, Math.PI * 0.80);
      arcCarpetGeo.rotateX(-Math.PI / 2);
      const arcCarpet = new THREE.Mesh(arcCarpetGeo, redAisleMat);
      arcCarpet.rotation.y = Math.PI;
      arcCarpet.position.set(0, 0.02, -20);
      arcCarpet.receiveShadow = true;
      this.roomGroup.add(arcCarpet);

      [-0.44, 0, 0.44].forEach((ang) => {
        const radial = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.022, 36), redAisleMat);
        radial.position.set(Math.sin(ang) * 18, 0.021, -20 + Math.cos(ang) * 26);
        radial.rotation.y = ang;
        radial.receiveShadow = true;
        this.roomGroup.add(radial);
      });

      // 1-B) 천장: 6단 동심원 곡선 우드 루버 단차 천장 + 연속 간접 코브(Cove) 조명 + 매립 타공 다운라이트!
      const ceilSlat = this.pbr.ceilingFineSlatMaterial(18, 5);
      ceilSlat.side = THREE.FrontSide;
      const soffitMat = new THREE.MeshStandardMaterial({ color: 0xf7f2e7, emissive: 0xfff5dc, emissiveIntensity: 0.45, roughness: 0.5 });
      const coveStripMat = new THREE.MeshBasicMaterial({ color: 0xfffdf5 });
      const coveBloomMat = new THREE.MeshBasicMaterial({
        map: this.pbr.coveGlowTex,
        transparent: true,
        opacity: 0.58,
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

        // 곡선 천장 슬랫 면 (아래쪽 -Y를 바라보도록 회전)
        const ringGeo = new THREE.RingGeometry(rIn, rOut + 0.2, 60, 1, 0, Math.PI * 2);
        ringGeo.rotateX(Math.PI / 2);
        const ceilBand = new THREE.Mesh(ringGeo, ceilSlat);
        ceilBand.position.set(0, cy, -21);
        this.roomGroup.add(ceilBand);

        if (i > 0) {
          // 단차 수직 마감면(Soffit) & 코브 간접 발광 라인 & 소프트 천장 빛 번짐(Wash)
          const riserGeo = new THREE.CylinderGeometry(rIn, rIn, 0.46, 60, 1, true);
          const riser = new THREE.Mesh(riserGeo, soffitMat);
          riser.position.set(0, cy - 0.22, -21);
          this.roomGroup.add(riser);

          const ledGeo = new THREE.TorusGeometry(rIn + 0.08, 0.07, 8, 60);
          ledGeo.rotateX(Math.PI / 2);
          const led = new THREE.Mesh(ledGeo, coveStripMat);
          led.position.set(0, cy - 0.06, -21);
          this.roomGroup.add(led);

          const bloomGeo = new THREE.RingGeometry(rIn, rIn + 3.4, 60);
          bloomGeo.rotateX(Math.PI / 2);
          const bloom = new THREE.Mesh(bloomGeo, coveBloomMat);
          bloom.position.set(0, cy - 0.02, -21);
          this.roomGroup.add(bloom);

          // 곡선을 따라 배치된 매립형 원형 다운라이트들
          const rMid = (rIn + rOut) * 0.5;
          if (rMid < 52) {
            const count = 7 + i * 2;
            for (let d = 0; d < count; d++) {
              const a = -0.78 + (d / (count - 1)) * 1.56;
              const dx = Math.sin(a) * rMid;
              const dz = -21 + Math.cos(a) * rMid;
              if (Math.abs(dx) < 30 && dz < 29 && dz > -22) {
                const dl = this.pbr.createRecessedDownlight(0.28);
                dl.position.set(dx, cy - 0.015, dz);
                this.roomGroup.add(dl);
              }
            }
          }
        }
      }

      // 1-C) 좌·우 양쪽 벽면: 톱니형 단차 베이지/오크 어쿠스틱 패널 + 수직 매립 간접조명(Wall-Wash) 효과!
      const wallWashL = this.pbr.wallWashPanelMaterial('sand', true);
      const wallWashR = this.pbr.wallWashPanelMaterial('sand', false);
      const wallGlowMat = new THREE.MeshBasicMaterial({
        map: this.pbr.coveGlowTex,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });

      [-1, 1].forEach((side) => {
        const bays = 7;
        for (let b = 0; b < bays; b++) {
          const bz = -19 + b * 7.4;
          const bx = side * (29.5 + b * 0.45);
          const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 14.8, 7.7),
            side < 0 ? wallWashL : wallWashR
          );
          panel.position.set(bx, 7.4, bz);
          // 톱니형으로 살짝 꺾여 다음 패널 뒤에서 간접 빛이 새어 나오는 구조!
          panel.rotation.y = side * -0.09;
          this.roomGroup.add(panel);

          // 패널 틈새 수직 매립 LED 라인 바 & 벽면 월워셔 빛 번짐
          const ledX = bx - side * 0.32;
          const ledZ = bz - 3.65;
          const vLed = new THREE.Mesh(new THREE.BoxGeometry(0.10, 14.2, 0.12), coveStripMat);
          vLed.position.set(ledX, 7.1, ledZ);
          this.roomGroup.add(vLed);

          const washPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 14.2), wallGlowMat);
          washPlane.position.set(bx - side * 0.28, 7.1, ledZ + 1.1);
          washPlane.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
          washPlane.rotation.z = side < 0 ? -Math.PI / 2 : Math.PI / 2;
          this.roomGroup.add(washPlane);
        }
      });

      // 후면 마감 벽체
      const rearWall = new THREE.Mesh(new THREE.BoxGeometry(68, 15, 0.6), wallWashL);
      rearWall.position.set(0, 7.5, 29.5);
      this.roomGroup.add(rearWall);

      // 1-D) 정면 성단(Stage) 건축 구성 — 참조 사진 그대로!
      // 중앙 오크 루버 백월 + 상부 다크 어쿠스틱 반사 캐노피
      const centerOakWall = new THREE.Mesh(new THREE.BoxGeometry(27, 13, 0.6), frontOakSlat);
      centerOakWall.position.set(0, 6.5, -23.1);
      const stageCanopy = new THREE.Mesh(new THREE.BoxGeometry(27.5, 0.65, 3.2), this.pbr.darkSteelMaterial());
      stageCanopy.position.set(0, 11.4, -21.6);
      this.roomGroup.add(centerOakWall, stageCanopy);

      // 우측 순백색 전면 발광 십자가 니치 월 (White Backlit Luminous Cross Wall!)
      const whiteLuminousMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfffcf5,
        emissiveIntensity: 0.78,
        roughness: 0.25
      });
      const rightCrossWall = new THREE.Mesh(new THREE.BoxGeometry(9.2, 12.2, 0.5), whiteLuminousMat);
      rightCrossWall.position.set(18.8, 6.1, -22.5);
      rightCrossWall.rotation.y = -0.14;

      // 미니멀 슬림 다크브론즈 십자가 (참조 사진 우측 십자가!)
      const crossGroup = new THREE.Group();
      crossGroup.position.set(18.7, 7.2, -22.15);
      crossGroup.rotation.y = -0.14;
      const darkBronze = new THREE.MeshStandardMaterial({ color: 0x29201b, roughness: 0.35, metalness: 0.6 });
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.6, 0.12), darkBronze);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.12), darkBronze);
      ch.position.y = 0.95;
      crossGroup.add(cv, ch);
      this.roomGroup.add(rightCrossWall, crossGroup);

      // 좌측 화이트 백라이트 패널 + 보조 서브 스크린 (메인 칠판과 실시간 미러링!)
      const leftSubWall = new THREE.Mesh(new THREE.BoxGeometry(7.6, 12.2, 0.5), whiteLuminousMat);
      leftSubWall.position.set(-18.0, 6.1, -22.5);
      leftSubWall.rotation.y = 0.14;
      const subBezel = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.7, 0.12), this.pbr.darkSteelMaterial());
      subBezel.position.set(-18.0, 7.4, -22.18);
      subBezel.rotation.y = 0.14;
      const subScreen = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.5), new THREE.MeshBasicMaterial({ map: this.boardTexture }));
      subScreen.position.set(-17.98, 7.4, -22.10);
      subScreen.rotation.y = 0.14;
      this.roomGroup.add(leftSubWall, subBezel, subScreen);

      // 와이드 아이보리 대리석 성단(Stage) + 전면 매립 스피커 그릴 슬롯 + 간접 하부 조명
      const mainStage = new THREE.Mesh(new THREE.BoxGeometry(46, 0.92, 7.6), ivoryStageMat);
      mainStage.position.set(2, 0.46, -19.2);
      mainStage.receiveShadow = true;
      this.roomGroup.add(mainStage);

      for (let sx = -14; sx <= 16; sx += 5) {
        const speakerSlot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.36, 0.08), this.pbr.darkSteelMaterial());
        speakerSlot.position.set(sx, 0.46, -15.38);
        this.roomGroup.add(speakerSlot);
      }

      // 화이트/아크릴 강대상, 그랜드 피아노, 성가대 의자, 우측 대형 화이트 화분 야자나무
      const pulpit = this.pbr.createModernPulpit();
      pulpit.position.set(0, 0.92, -16.4);
      const subPulpit = this.pbr.createModernPulpit();
      subPulpit.scale.set(0.82, 0.88, 0.82);
      subPulpit.position.set(8.5, 0.92, -16.8);
      const piano = this.pbr.createGrandPiano();
      piano.position.set(-10.5, 0.92, -17.6);
      piano.rotation.y = 0.45;

      const palmPlant = this.pbr.createPottedPlant(1.55);
      palmPlant.position.set(25.2, 0, -17.2);
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

      // 1-E) 부채꼴로 정교하게 배열된 밝은 내추럴 오크 모던 장의자 5열 × 4블록
      const radii = [12.5, 17.2, 21.9, 26.2, 32.8];
      const blocks = [-0.62, -0.22, 0.22, 0.62];
      radii.forEach((r, rIdx) => {
        blocks.forEach((ang, bIdx) => {
          const px = Math.sin(ang) * r;
          const pz = -18.5 + Math.cos(ang) * r;
          if (Math.abs(px) > 27 || pz > 25) return;
          const faceStageYaw = Math.atan2(-px, -18.5 - pz);
          this._addFurnitureSeat(`pew_${rIdx}_${bIdx}`, px, 0, pz, faceStageYaw, 4.6, `🪑 ${rIdx + 1}열 모던 장의자 착석`, 'pew');
        });
      });

      // 실내 따뜻한 보조 광원
      const stageLight = new THREE.PointLight(0xfff6e5, 0.85, 42);
      stageLight.position.set(0, 10.5, -14);
      this.roomGroup.add(stageLight);

      // 포털 도어
      this._addPortalDoor(0, 29.1, Math.PI, 'garden', '🌿 앞마당 광장', '야외 출구');
      this._addPortalDoor(-29.2, -6, Math.PI / 2, 'sarangbang', '🏠 사랑방 센터', '모던 소그룹실');
      this._addPortalDoor(-29.2, 8, Math.PI / 2, 'prayer', '🕯️ 기도·갤러리실', '성화·개인기도');
      this._addPortalDoor(29.2, -6, -Math.PI / 2, 'bible', '📖 성경통독방', '모던 북라운지');
      this._addPortalDoor(29.2, 8, -Math.PI / 2, 'qt', '✏️ 큐티방', '세미나·나눔실');
      this._addPortalDoor(16.5, 29.1, Math.PI, 'rooftop', '☕ 루프탑 카페', '옥상 라운지');
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
    // 2) 🏠 사랑방 — 현대식 호텔 라운지 / 모던 소그룹 커뮤니티룸 (우물천장 + 간접 월워셔)
    // =======================================================================
    _buildSarangbang(roomTitle) {
      const lightOakFloor = this.pbr.woodPlankMaterial('mod_sarang_oak', [214, 184, 144], [178, 146, 106], 7, 7, 0.30);
      const wallWash = this.pbr.wallWashPanelMaterial('white', true);
      const oakSlat = this.pbr.acousticSlatMaterial(5, 1, true);
      const travertine = this.pbr.marbleMaterial('sarang_trav', [244, 240, 232], [212, 204, 190], 1, 1, 0.20);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 30), lightOakFloor);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      // 모던 우물천장 + 매립형 다운라이트 16개
      this.roomGroup.add(this.pbr.createModernRoomCeiling(32, 30, 8.8, 4, 4));

      const rug = new THREE.Mesh(new THREE.CircleGeometry(6.4, 40), this.pbr.modernRugMaterial());
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.02, 0.5);
      rug.receiveShadow = true;
      this.roomGroup.add(rug);

      // 4면 모던 벽체 (전면 라이트오크 루버 아트월 + 좌우 간접조명 화이트 월)
      const fWall = new THREE.Mesh(new THREE.BoxGeometry(32, 9.0, 0.5), oakSlat);
      fWall.position.set(0, 4.5, -13.6);
      const rWallBack = new THREE.Mesh(new THREE.BoxGeometry(32, 9.0, 0.5), wallWash);
      rWallBack.position.set(0, 4.5, 14.6);
      const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.0, 30), wallWash);
      lWall.position.set(-15.8, 4.5, 0.5);
      const rWall = lWall.clone();
      rWall.position.x = 15.8;
      this.roomGroup.add(fWall, rWallBack, lWall, rWall);

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(7.6, 1.05, 0.10),
        new THREE.MeshStandardMaterial({ map: this._makePlaqueTexture(`🏠 ${roomTitle}`, '모던 소그룹 교제 라운지') })
      );
      sign.position.set(0, 8.1, -13.25);
      this.roomGroup.add(sign);

      // 트래버틴 라운드 커피 테이블
      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.08, 32), travertine);
      tableTop.position.set(0, 0.58, 0.5);
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.54, 28), oakSlat);
      tableBase.position.set(0, 0.27, 0.5);
      const bibleProp = this.pbr.createOpenBibleProp();
      bibleProp.position.set(-0.4, 0.63, 0.5);
      this.roomGroup.add(tableTop, tableBase, bibleProp);

      this.interactables.push({
        id: 'sarang-switcher',
        type: 'sarang_menu',
        label: '🏠 다른 사랑방 선택 / +새 방 개설',
        x: 0,
        y: 0,
        z: 0.5,
        radius: 3.1,
        mesh: tableTop
      });

      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        if (Math.abs(Math.sin(ang)) < 0.36 && Math.cos(ang) < -0.7) continue;
        const sx = Math.sin(ang) * 4.9;
        const sz = 0.5 + Math.cos(ang) * 4.9;
        const faceCenter = Math.atan2(-sx, 0.5 - sz);
        this._addFurnitureSeat(`sofa_${i}`, sx, 0, sz, faceCenter, 2.35, '🛋️ 모듈형 라운지 소파 착석', 'sofa');
      }

      const shelf = this.pbr.createRealisticBookshelf(4.4, 6.0);
      shelf.position.set(-15.1, 0, -5);
      shelf.rotation.y = Math.PI / 2;
      this.roomGroup.add(shelf);

      [[-13.5, -10.5], [13.5, -10.5], [13.5, 10.5]].forEach(([px, pz]) => {
        const p = this.pbr.createPottedPlant(1.2);
        p.position.set(px, 0, pz);
        this.roomGroup.add(p);
      });

      this._addPortalDoor(-9.5, 14.3, Math.PI, 'sanctuary', '🏛️ 대성전 복귀', '');
      this._addPortalDoor(9.5, 14.3, Math.PI, 'qt', '✏️ 큐티방 이동', '');
    }

    // =======================================================================
    // 3) 📖 성경통독방 — 현대식 모던 북라운지 / 스터디카페 인테리어
    // =======================================================================
    _buildBibleRoom() {
      const carpetMat = this.pbr.carpetTileMaterial(14, 14, [96, 98, 102]);
      const whiteWall = this.pbr.wallWashPanelMaterial('white', true);
      const oakSlat = this.pbr.acousticSlatMaterial(6, 1, true);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 34), carpetMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      this.roomGroup.add(this.pbr.createModernRoomCeiling(36, 34, 9.2, 4, 5));

      const fWall = new THREE.Mesh(new THREE.BoxGeometry(36, 9.4, 0.5), oakSlat);
      fWall.position.set(0, 4.7, -15.5);
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, 9.4, 0.5), whiteWall);
      backWall.position.set(0, 4.7, 16.5);
      const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.4, 34), whiteWall);
      lWall.position.set(-17.5, 4.7, 0.5);
      const rWall = lWall.clone();
      rWall.position.x = 17.5;
      this.roomGroup.add(fWall, backWall, lWall, rWall);

      // 양쪽 벽면 선반 간접 LED가 켜진 빌트인 라이트오크 북월 8동
      [-16.8, 16.8].forEach((wx) => {
        for (let z = -10.5; z <= 10.5; z += 7.0) {
          const bookcase = this.pbr.createRealisticBookshelf(5.8, 7.2);
          bookcase.position.set(wx, 0, z);
          bookcase.rotation.y = wx > 0 ? -Math.PI / 2 : Math.PI / 2;
          this.roomGroup.add(bookcase);
        }
      });

      // 모던 화이트 & 오크 스터디 데스크 6석 + 리니어 LED 스탠드 + 모던 체어
      const deskRows = [-5.0, 3.2];
      const deskCols = [-7.4, 0, 7.4];
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

      this._addPortalDoor(-10, 16.2, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(10, 16.2, Math.PI, 'qt', '✏️ 큐티방 이동', '세미나·나눔실');
    }

    // =======================================================================
    // 4) ✏️ 큐티방 — 현대식 아카데미 & 세미나 홀 (우물천장 + 화이트 세미나 데스크)
    // =======================================================================
    _buildQtRoom() {
      const lightOakFloor = this.pbr.woodPlankMaterial('qt_mod_floor', [218, 190, 152], [184, 154, 114], 8, 8, 0.30);
      const whiteWall = this.pbr.wallWashPanelMaterial('white', false);
      const oakSlat = this.pbr.acousticSlatMaterial(6, 1, true);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 34), lightOakFloor);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      this.roomGroup.add(this.pbr.createModernRoomCeiling(36, 34, 9.2, 5, 4));

      const fWall = new THREE.Mesh(new THREE.BoxGeometry(36, 9.4, 0.5), oakSlat);
      fWall.position.set(0, 4.7, -15.5);
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, 9.4, 0.5), whiteWall);
      backWall.position.set(0, 4.7, 16.5);
      const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.4, 34), whiteWall);
      lWall.position.set(-17.5, 4.7, 0.5);
      const rWall = lWall.clone();
      rWall.position.x = 17.5;
      this.roomGroup.add(fWall, backWall, lWall, rWall);

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

      [-4.8, 1.8].forEach((dz, rIdx) => {
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

      this._addPortalDoor(-11, 16.2, Math.PI, 'bible', '📖 성경통독방', '');
      this._addPortalDoor(0, 16.2, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(11, 16.2, Math.PI, 'sarangbang', '🏠 사랑방 이동', '');
    }

    // =======================================================================
    // 5) 🕯️ 기도실 & 말씀갤러리 — 현대 화이트 뮤지엄 회랑 & 루버 간접조명 개인기도부스
    // =======================================================================
    _buildPrayerGallery() {
      const limestoneFloor = this.pbr.marbleMaterial('gal_floor', [228, 224, 216], [198, 192, 182], 6, 6, 0.22);
      const museumWall = this.pbr.wallWashPanelMaterial('white', true);
      const oakSlat = this.pbr.acousticSlatMaterial(4, 1, true);
      const padMat = this.pbr.fabricMaterial('mod_kneel_pad', [148, 32, 46], 2, 2);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 36), limestoneFloor);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.roomGroup.add(floor);

      this.roomGroup.add(this.pbr.createModernRoomCeiling(32, 36, 9.0, 3, 5));

      const fWall = new THREE.Mesh(new THREE.BoxGeometry(32, 9.2, 0.5), oakSlat);
      fWall.position.set(0, 4.6, -16.5);
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(32, 9.2, 0.5), museumWall);
      backWall.position.set(0, 4.6, 17.8);
      const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.2, 36), museumWall);
      lWall.position.set(-15.5, 4.6, 0.6);
      const rWall = lWall.clone();
      rWall.position.x = 15.5;
      this.roomGroup.add(fWall, backWall, lWall, rWall);

      GALLERY_ARTWORKS.forEach((art, i) => {
        const isLeft = i < 3;
        const idx = i % 3;
        const az = -8.2 + idx * 9.0;
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

      // 간접조명 라이트오크 개인 기도 부스 4칸
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

      this._addPortalDoor(-7.2, 17.5, Math.PI, 'sanctuary', '🏛️ 대성전 이동', '');
      this._addPortalDoor(7.2, 17.5, Math.PI, 'bible', '📖 성경통독방', '');
    }

    // =======================================================================
    // 6) 🌿 앞마당 캠퍼스 광장 & 7) ☕ 루프탑 글래스 소미카페 (현대 건축 익스테리어)
    // =======================================================================
    _buildGarden() {
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(96, 96), this.pbr.grassMaterial(14, 14));
      grass.rotation.x = -Math.PI / 2;
      grass.receiveShadow = true;
      this.roomGroup.add(grass);

      const granite = this.pbr.granitePaverMaterial(8, 12);
      const limestone = this.pbr.marbleMaterial('mod_ext_stone', [236, 232, 224], [206, 198, 186], 6, 3, 0.32);

      const mainPlaza = new THREE.Mesh(new THREE.BoxGeometry(13, 0.08, 62), granite);
      mainPlaza.position.set(0, 0.04, 5);
      mainPlaza.receiveShadow = true;
      const crossWalk = new THREE.Mesh(new THREE.BoxGeometry(58, 0.07, 8), granite);
      crossWalk.position.set(0, 0.035, 6);
      crossWalk.receiveShadow = true;
      this.roomGroup.add(mainPlaza, crossWalk);

      // 현대식 미러 폰드(수공간) 분수대
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

      const facade = new THREE.Mesh(new THREE.BoxGeometry(36, 16.5, 3.2), limestone);
      facade.position.set(0, 8.25, -26.5);
      const curtainWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 12.5), this.pbr.glassMaterial(0.52, 0xbae6fd));
      curtainWall.position.set(0, 9.2, -24.85);
      this.roomGroup.add(facade, curtainWall);

      const crossMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.42, 5.0, 0.28), crossMat);
      cv.position.set(0, 12.0, -24.6);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.42, 0.28), crossMat);
      ch.position.set(0, 12.9, -24.6);
      this.roomGroup.add(cv, ch);

      this._addPortalDoor(0, -24.5, 0, 'sanctuary', '✧ 그레이스 대성전', '본당 정문 입장');
      this._addPortalDoor(-25, 2, Math.PI / 2, 'sarangbang', '🏠 사랑방 센터', '모던 소그룹실');
      this._addPortalDoor(25, 2, -Math.PI / 2, 'bible', '📖 성경통독방', '모던 북라운지');
      this._addPortalDoor(25, 11, -Math.PI / 2, 'qt', '✏️ 큐티 아카데미', '세미나·나눔실');

      // 모던 글래스 박스 카페 파빌리온
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
      const deckMat = this.pbr.woodPlankMaterial('mod_roof_deck', [168, 138, 104], [128, 98, 68], 10, 10, 0.38);
      const glassRail = this.pbr.glassMaterial(0.36, 0xe2e8f0);
      const steel = this.pbr.darkSteelMaterial();
      const whiteStone = this.pbr.marbleMaterial('roof_terrazzo', [246, 244, 240], [210, 206, 198], 2, 2, 0.20);

      const deck = new THREE.Mesh(new THREE.PlaneGeometry(46, 42), deckMat);
      deck.rotation.x = -Math.PI / 2;
      deck.receiveShadow = true;
      this.roomGroup.add(deck);

      // 프레임리스 강화유리 난간 + 하단 간접 LED 채널
      const rBack = new THREE.Mesh(new THREE.BoxGeometry(46, 1.3, 0.06), glassRail);
      rBack.position.set(0, 0.65, -20.2);
      const rLed = new THREE.Mesh(new THREE.BoxGeometry(46, 0.06, 0.10), new THREE.MeshBasicMaterial({ color: 0xfff8dc }));
      rLed.position.set(0, 0.03, -20.15);
      const rLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 42), glassRail);
      rLeft.position.set(-22.5, 0.65, 0);
      const rRight = rLeft.clone();
      rRight.position.x = 22.5;
      this.roomGroup.add(rBack, rLed, rLeft, rRight);

      // 모던 알루미늄 루버 파고라(Pergola) + 리니어 LED 바
      [-14, 14].forEach((px) => {
        [-4, 14].forEach((pz) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.2, 0.24), steel);
          post.position.set(px, 2.6, pz);
          this.roomGroup.add(post);
        });
      });
      for (let bz = -4; bz <= 14; bz += 3.6) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(28.5, 0.18, 0.20), steel);
        beam.position.set(0, 5.2, bz);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(27.5, 0.04, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff6d6 }));
        strip.position.set(0, 5.09, bz);
        this.roomGroup.add(beam, strip);
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

      [[-19, -15], [19, -15], [-19, 16], [19, 16]].forEach(([tx, tz]) => {
        const p = this.pbr.createPottedPlant(1.4);
        p.position.set(tx, 0, tz);
        this.roomGroup.add(p);
      });

      this._addPortalDoor(-7.5, 19.5, Math.PI, 'sanctuary', '🏛️ 대성전 내려가기', '');
      this._addPortalDoor(7.5, 19.5, Math.PI, 'garden', '🌿 앞마당 광장', '');
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
          av.myRing.material.color.setHex(av.micWave ? 0x10b981 : 0xf59e0b);
        }

        if (av.bubbleTimer > 0) {
          av.bubbleTimer -= dt;
          if (av.bubbleTimer <= 0) av.bubbleEl.classList.add('hidden');
        }
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
        const cy = Math.max(1.2, Math.min(8.2, targetY + Math.sin(this.camPitch) * this.camDist));
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
