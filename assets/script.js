// ============================================================
// S.I.KEREN — Shared scripts
// Water surface + Rain + Mist (Three.js, light palette)
// ============================================================

(function () {
  'use strict';

  function initCanvas() {
    const canvas = document.getElementById('water-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    // Fog uses pale blue so the white background blends
    scene.fog = new THREE.FogExp2(0xf4f8f6, 0.025);

    const camera = new THREE.PerspectiveCamera(
      55, window.innerWidth / window.innerHeight, 0.1, 200
    );
    camera.position.set(0, 2.5, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // --- Lighting (soft, daylight-like) ---
    scene.add(new THREE.AmbientLight(0xd1e4ee, 0.9));
    const sky = new THREE.DirectionalLight(0xffffff, 0.8);
    sky.position.set(4, 12, 8);
    scene.add(sky);
    const cool = new THREE.PointLight(0x7fb8d6, 1.2, 40);
    cool.position.set(-6, 2, 4);
    scene.add(cool);
    const warm = new THREE.PointLight(0x9ccdbf, 0.9, 40);
    warm.position.set(6, -2, -4);
    scene.add(warm);

    // --- Water surface (semi-transparent, light) ---
    const waterGeom = new THREE.PlaneGeometry(90, 90, 120, 120);
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0xd1e4ee,
      specular: 0xffffff,
      shininess: 90,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.rotation.x = -Math.PI / 2.2;
    water.position.y = -7;
    scene.add(water);

    // Sheen overlay (wireframe hint of ripples)
    const sheenGeom = new THREE.PlaneGeometry(90, 90, 50, 50);
    const sheenMat = new THREE.MeshBasicMaterial({
      color: 0x7fb8d6,
      transparent: true,
      opacity: 0.12,
      wireframe: true,
    });
    const sheen = new THREE.Mesh(sheenGeom, sheenMat);
    sheen.rotation.x = -Math.PI / 2.2;
    sheen.position.y = -6.9;
    scene.add(sheen);

    const waterPositions = waterGeom.attributes.position.array.slice();
    const sheenPositions = sheenGeom.attributes.position.array.slice();

    // --- Rain (fine, dense light blue-white droplets) ---
    const rainCount = 4000;
    const rainGeom = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    const rainVel = new Float32Array(rainCount);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 60;
      rainPos[i * 3 + 1] = Math.random() * 28;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      rainVel[i] = 0.08 + Math.random() * 0.16;
    }
    rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x7fb8d6,
      size: 0.018,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const rain = new THREE.Points(rainGeom, rainMat);
    scene.add(rain);

    // --- Mist (soft floating dust, pale) ---
    const mistCount = 450;
    const mistGeom = new THREE.BufferGeometry();
    const mistPos = new Float32Array(mistCount * 3);
    const mistFloat = new Float32Array(mistCount);
    for (let i = 0; i < mistCount; i++) {
      mistPos[i * 3] = (Math.random() - 0.5) * 45;
      mistPos[i * 3 + 1] = (Math.random() - 0.3) * 18;
      mistPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      mistFloat[i] = Math.random() * Math.PI * 2;
    }
    mistGeom.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
    const mistMat = new THREE.PointsMaterial({
      color: 0x9ccdbf,
      size: 0.08,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const mist = new THREE.Points(mistGeom, mistMat);
    scene.add(mist);

    // --- Mouse / scroll tracking ---
    let mouseX = 0, mouseY = 0;
    let ripplePoints = [];

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('click', (e) => {
      // Click: 3D water ripple at the click point
      const nX = (e.clientX / window.innerWidth) * 2 - 1;
      const nY = -(e.clientY / window.innerHeight) * 2 + 1;
      ripplePoints.push({ x: nX * 12, z: nY * 8, t: 0 });
      if (ripplePoints.length > 24) ripplePoints.shift();
    });

    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; });

    const clock = new THREE.Clock();

    function animate() {
      const t = clock.getElapsedTime();

      // Water ripples
      const pos = waterGeom.attributes.position.array;
      const spos = sheenGeom.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        const ox = waterPositions[i];
        const oz = waterPositions[i + 1];
        let wave =
          Math.sin(ox * 0.22 + t * 0.8) * 0.28 +
          Math.sin(oz * 0.28 + t * 0.65) * 0.24 +
          Math.sin((ox + oz) * 0.14 + t * 1.1) * 0.15;
        for (let r of ripplePoints) {
          const dx = ox - r.x;
          const dz = oz - r.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const falloff = Math.max(0, 1 - dist / 14);
          wave += Math.sin(dist * 1.2 - r.t * 4) * falloff * 0.45;
        }
        pos[i + 2] = wave;
      }
      waterGeom.attributes.position.needsUpdate = true;

      for (let i = 0; i < spos.length; i += 3) {
        const ox = sheenPositions[i];
        const oz = sheenPositions[i + 1];
        spos[i + 2] =
          Math.sin(ox * 0.2 + t * 0.9) * 0.22 +
          Math.sin(oz * 0.24 + t * 0.7) * 0.2;
      }
      sheenGeom.attributes.position.needsUpdate = true;

      ripplePoints.forEach(r => (r.t += 0.03));
      ripplePoints = ripplePoints.filter(r => r.t < 4);

      // Rain
      const rp = rain.geometry.attributes.position.array;
      for (let i = 0; i < rainCount; i++) {
        rp[i * 3 + 1] -= rainVel[i];
        if (rp[i * 3 + 1] < -6.5) {
          rp[i * 3 + 1] = 20;
          rp[i * 3] = (Math.random() - 0.5) * 60;
          rp[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
      }
      rain.geometry.attributes.position.needsUpdate = true;

      // Mist
      const mp = mist.geometry.attributes.position.array;
      for (let i = 0; i < mistCount; i++) {
        mp[i * 3 + 1] += Math.sin(t * 0.3 + mistFloat[i]) * 0.003;
        mp[i * 3] += Math.cos(t * 0.2 + mistFloat[i]) * 0.003;
      }
      mist.geometry.attributes.position.needsUpdate = true;

      // Camera parallax
      camera.position.x += (mouseX * 1.4 - camera.position.x) * 0.03;
      camera.position.y += (2.5 + mouseY * 0.5 - camera.position.y) * 0.03;
      camera.position.y -= Math.min(scrollY * 0.001, 3) * 0.01;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ----------------------------------------------------------
  function initReveal() {
    const selectors = ['.reveal', '.piece', '.process-stage', '.news-card', '.tree-branch', '.card'];
    const items = document.querySelectorAll(selectors.join(','));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const children = el.querySelectorAll('.piece, .tree-leaf, .news-card');
          setTimeout(() => { el.classList.add('visible', 'revealed'); }, 50);
          if (children.length) {
            children.forEach((c, i) => {
              setTimeout(() => c.classList.add('revealed'), 150 + i * 80);
            });
          }
          io.unobserve(el);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });
    items.forEach(i => io.observe(i));
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function initPieceHover() {
    document.querySelectorAll('.piece-image').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty('--mx', x + '%');
        el.style.setProperty('--my', y + '%');
      });
    });
  }

  function initFaq() {
    document.querySelectorAll('.faq-item').forEach(item => {
      const q = item.querySelector('.faq-q');
      const a = item.querySelector('.faq-a');
      if (!q || !a) return;
      a.style.maxHeight = '0px';
      a.style.overflow = 'hidden';
      a.style.transition = 'max-height 0.6s ease, padding 0.4s ease, opacity 0.4s ease';
      a.style.opacity = '0';
      a.style.paddingTop = '0';
      item.classList.add('collapsed');
      q.addEventListener('click', () => {
        if (item.classList.contains('collapsed')) {
          a.style.maxHeight = a.scrollHeight + 'px';
          a.style.opacity = '1';
          a.style.paddingTop = '0.5rem';
          item.classList.remove('collapsed');
        } else {
          a.style.maxHeight = '0px';
          a.style.opacity = '0';
          a.style.paddingTop = '0';
          item.classList.add('collapsed');
        }
      });
    });
  }

  // ----------------------------------------------------------
  // Custom cursor — dot + lagging ring
  // ----------------------------------------------------------
  function initCursor() {
    // Create elements
    const dot  = document.createElement('div');
    const ring = document.createElement('div');
    dot.className  = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    // Cursor position (immediate for dot)
    let cx = window.innerWidth  / 2;
    let cy = window.innerHeight / 2;
    // Ring lags behind
    let rx = cx, ry = cy;

    // Move dot instantly
    window.addEventListener('mousemove', (e) => {
      cx = e.clientX;
      cy = e.clientY;
    });

    // Hover detection on interactive elements
    const interactors = 'a, button, input, textarea, select, label, [role="button"]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactors)) {
        dot.classList.add('is-hovering');
        ring.classList.add('is-hovering');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactors)) {
        dot.classList.remove('is-hovering');
        ring.classList.remove('is-hovering');
      }
    });

    // Click feedback
    document.addEventListener('mousedown', () => {
      ring.classList.add('is-clicking');
    });
    document.addEventListener('mouseup', () => {
      ring.classList.remove('is-clicking');
    });

    // Hide when cursor leaves window, show when it returns
    document.addEventListener('mouseleave', () => {
      dot.style.opacity  = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity  = '1';
      ring.style.opacity = '1';
    });

    // Animation loop — lerp ring toward dot
    const LERP = 0.11; // lower = more lag
    function loop() {
      rx += (cx - rx) * LERP;
      ry += (cy - ry) * LERP;

      dot.style.transform  = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`;
      ring.style.transform = `translate(calc(-50% + ${rx}px), calc(-50% + ${ry}px))`;

      requestAnimationFrame(loop);
    }
    loop();
  }

  // ----------------------------------------------------------
  // Hero reel — load images from data-src, skip if not found
  // ----------------------------------------------------------
  function initReel() {
    document.querySelectorAll('.reel-item[data-src]').forEach(fig => {
      const src = fig.dataset.src;
      const img = document.createElement('img');
      img.alt = '';
      img.onload  = () => fig.appendChild(img);
      img.onerror = () => { /* keep gradient placeholder */ };
      img.src = src;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initReveal();
    initSmoothScroll();
    initPieceHover();
    initFaq();
    initCursor();
    initReel();
  });
})();
