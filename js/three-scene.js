/* ============================================================
   three-scene.js — interactive food-chain origin map
   A procedural 3D scene: living terrain, orbiting origin nodes,
   transparent supply-chain arcs, and cursor/scroll reactivity.
   ============================================================ */

window.addEventListener('load', function () {
  const container = document.querySelector('.hero-canvas');
  if (!container || typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x10151b, 8, 24);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.55, 8.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  container.appendChild(renderer.domElement);

  const group = new THREE.Group();
  group.position.set(1.55, -0.2, 0);
  scene.add(group);

  const palette = {
    milk: 0xf8f3e7,
    sky: 0xbad8ec,
    moss: 0x7b8f65,
    copper: 0xc38452,
    ink: 0x11161c,
  };

  // Terrain suggests origin: fields, mountains, and provenance.
  const terrainGeometry = new THREE.IcosahedronGeometry(2.25, 3);
  const positions = terrainGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const ridge = Math.sin(x * 2.3) * 0.13 + Math.cos(z * 2.8) * 0.12 + Math.sin((x + y) * 1.7) * 0.08;
    positions.setXYZ(i, x * 1.18, y * 0.72 + ridge, z * 1.18);
  }
  terrainGeometry.computeVertexNormals();

  const terrain = new THREE.Mesh(
    terrainGeometry,
    new THREE.MeshStandardMaterial({
      color: palette.moss,
      roughness: 0.82,
      metalness: 0.08,
      flatShading: true,
      transparent: true,
      opacity: 0.88,
    })
  );
  terrain.rotation.set(0.34, -0.56, 0.08);
  group.add(terrain);

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(terrainGeometry),
    new THREE.LineBasicMaterial({ color: palette.sky, transparent: true, opacity: 0.16 })
  );
  terrain.add(wire);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.9, 0.008, 12, 160),
    new THREE.MeshBasicMaterial({ color: palette.milk, transparent: true, opacity: 0.32 })
  );
  halo.rotation.set(1.25, 0.1, -0.22);
  group.add(halo);

  const nodes = [];
  const nodeGeometry = new THREE.SphereGeometry(0.085, 24, 24);
  const nodeColors = [palette.copper, palette.sky, palette.moss, palette.milk, palette.copper, palette.sky];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const radius = 2.95 + (i % 2) * 0.26;
    const node = new THREE.Mesh(
      nodeGeometry,
      new THREE.MeshStandardMaterial({
        color: nodeColors[i],
        emissive: nodeColors[i],
        emissiveIntensity: 0.32,
        roughness: 0.48,
      })
    );
    node.userData = {
      angle,
      radius,
      speed: 0.12 + i * 0.018,
      y: Math.sin(i * 1.45) * 0.72,
    };
    nodes.push(node);
    group.add(node);
  }

  // Curved arcs read as traceability routes through the supply chain.
  const arcs = new THREE.Group();
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i].userData.angle;
    const b = nodes[(i + 2) % nodes.length].userData.angle;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(Math.cos(a) * 2.55, Math.sin(i) * 0.3, Math.sin(a) * 2.55),
      new THREE.Vector3(0, 1.2 + (i % 2) * 0.5, 0),
      new THREE.Vector3(Math.cos(b) * 2.55, Math.cos(i) * 0.3, Math.sin(b) * 2.55)
    );
    const arc = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(42)),
      new THREE.LineBasicMaterial({
        color: i % 2 ? palette.sky : palette.copper,
        transparent: true,
        opacity: 0.15,
      })
    );
    arcs.add(arc);
  }
  group.add(arcs);

  const particles = new THREE.BufferGeometry();
  const particleCount = 420;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 14;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleCloud = new THREE.Points(
    particles,
    new THREE.PointsMaterial({ color: palette.milk, size: 0.018, transparent: true, opacity: 0.42, sizeAttenuation: true })
  );
  scene.add(particleCloud);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(palette.sky, 0.9);
  rim.position.set(-5, 1, -4);
  scene.add(rim);
  const copperLight = new THREE.PointLight(palette.copper, 1.6, 8);
  copperLight.position.set(-2.8, -1.4, 3.2);
  scene.add(copperLight);

  let mouseX = 0;
  let mouseY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let scrollProgress = 0;

  window.addEventListener('pointermove', function (event) {
    mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  window.addEventListener('scroll', function () {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? window.scrollY / max : 0;
  }, { passive: true });

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();

  let running = true;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
  });

  const clock = new THREE.Clock();

  function render() {
    requestAnimationFrame(render);
    if (!running) return;

    const elapsed = clock.getElapsedTime();
    smoothX += (mouseX - smoothX) * 0.055;
    smoothY += (mouseY - smoothY) * 0.055;

    group.rotation.y = elapsed * 0.055 + smoothX * 0.22 + scrollProgress * 0.85;
    group.rotation.x = -0.05 + smoothY * 0.12;
    group.position.y = -0.2 + Math.sin(elapsed * 0.55) * 0.055 - scrollProgress * 0.7;

    terrain.rotation.y += 0.0018;
    halo.rotation.z -= 0.0022;
    arcs.rotation.y += 0.0012;
    particleCloud.rotation.y = elapsed * 0.012;
    particleCloud.rotation.x = smoothY * 0.035;

    nodes.forEach(function (node, index) {
      const data = node.userData;
      const angle = data.angle + elapsed * data.speed;
      node.position.set(
        Math.cos(angle) * data.radius,
        data.y + Math.sin(elapsed * 0.75 + index) * 0.18,
        Math.sin(angle) * data.radius
      );
      const scale = 1 + Math.sin(elapsed * 1.4 + index) * 0.16;
      node.scale.setScalar(scale);
    });

    renderer.render(scene, camera);
  }

  render();
});
