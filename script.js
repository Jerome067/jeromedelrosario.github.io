// Portfolio Constellation
// Content lives in data.json; this file draws the intro, the orbiting
// planets and the section panels.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none)').matches;

let portfolioData = {};

// Fallbacks used when data.json can't be loaded (e.g. opened via file://)
const defaultIntro = {
    phrases: ['Software Engineer', 'Architect of Digital Worlds'],
    status: 'Initializing constellation…'
};

// Icons (24x24 stroke paths)
const icons = {
    skills: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    softSkills: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    education: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><line x1="22" y1="10" x2="22" y2="15"/>',
    projects: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0"/><path d="M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
    miniProjects: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="12" y1="11" x2="12.01" y2="11"/><line x1="16" y1="11" x2="16.01" y2="11"/><line x1="8" y1="15" x2="8.01" y2="15"/><line x1="12" y1="15" x2="12.01" y2="15"/><line x1="16" y1="15" x2="16" y2="18"/><line x1="8" y1="18" x2="12" y2="18"/>',
    certificates: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13L17 22l-5-3-5 3 1.5-9"/>',
    languages: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    involvement: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    contact: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
    github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.4 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.6 16 2.5a13.4 13.4 0 0 0-7 0C6.3.6 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.6 6.4 7A3.4 3.4 0 0 0 9 18.1V22"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    about: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'
};

// Orbit radii (fraction of the outermost orbit)
const orbits = [0.32, 0.52, 0.74, 0.96];

// Planets: one per section. "orbit" indexes into orbits, "angle" is the start position in degrees.
const planets = [
    { id: 'skills', label: 'Skills', color: '#4da3ff', orbit: 0, angle: 200 },
    { id: 'projects', label: 'Projects', color: '#ff3b5c', orbit: 0, angle: 20 },
    { id: 'education', label: 'Education', color: '#ffb347', orbit: 1, angle: 100 },
    { id: 'softSkills', label: 'Soft Skills', color: '#ff5fd2', orbit: 1, angle: 230 },
    { id: 'miniProjects', label: 'Mini Projects', color: '#a77bff', orbit: 1, angle: 340 },
    { id: 'certificates', label: 'Certificates', color: '#ffd84a', orbit: 2, angle: 150 },
    { id: 'languages', label: 'Languages', color: '#2ee6a6', orbit: 2, angle: 270 },
    { id: 'involvement', label: 'Involvement', color: '#36d1ff', orbit: 2, angle: 30 },
    { id: 'contact', label: 'Contact', color: '#ff7a45', orbit: 3, angle: 60 },
    { id: 'github', label: 'GitHub', color: '#e8e4ff', orbit: 3, angle: 190, external: 'github' },
    { id: 'linkedin', label: 'LinkedIn', color: '#3d8bff', orbit: 3, angle: 300, external: 'linkedin' }
];

const sections = {
    about: { label: 'About Me', color: '#ff5fd2', render: renderAbout },
    skills: { render: renderSkills },
    projects: { render: renderProjects },
    education: { render: renderEducation },
    softSkills: { render: renderSoftSkills },
    miniProjects: { render: renderMiniProjects },
    certificates: { label: 'Certificates & Credentials', render: renderCertificates },
    languages: { render: renderLanguages },
    involvement: { label: 'Involvement & Memberships', render: renderInvolvement },
    contact: { label: 'Get In Touch', render: renderContact }
};

planets.forEach(planet => {
    if (sections[planet.id]) {
        sections[planet.id].label = sections[planet.id].label || planet.label;
        sections[planet.id].color = planet.color;
    }
});

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const dataReady = fetch('data.json')
    .then(response => response.json())
    .then(data => {
        portfolioData = data;
        applyPersonalData();
    })
    .catch(error => console.error('Error loading data:', error));

function applyPersonalData() {
    const personal = portfolioData.personal || {};
    if (personal.name) {
        document.getElementById('topName').textContent = personal.name;
    }
    if (personal.title) {
        document.getElementById('topTitle').textContent = personal.title;
    }
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

function iconSVG(id) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[id] || ''}</svg>`;
}

// ---------------------------------------------------------------------------
// Intro / Loading Screen
// ---------------------------------------------------------------------------

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let introSkipped = false;
let resolveSkip;
const skipSignal = new Promise(resolve => { resolveSkip = resolve; });

function skippableWait(ms) {
    return introSkipped ? Promise.resolve() : Promise.race([wait(ms), skipSignal]);
}

function splitName(element) {
    const text = element.textContent;
    element.setAttribute('aria-label', text);
    // Letters animate one by one; words stay together so lines only break between them
    let index = 0;
    element.innerHTML = text.split(' ').map(word =>
        `<span class="word" aria-hidden="true">${[...word].map(char =>
            `<span class="char" style="animation-delay:${index++ * 45}ms">${escapeHTML(char)}</span>`
        ).join('')}</span>${index++ < text.length ? ' ' : ''}`
    ).join('');
    return text.length * 45 + 600;
}

// Shrink the name until it fits on one line inside the loader card.
function fitName(element) {
    element.style.fontSize = '';
    let size = parseFloat(getComputedStyle(element).fontSize);
    while (element.scrollWidth > element.clientWidth && size > 12) {
        size -= 1;
        element.style.fontSize = `${size}px`;
    }
}

async function typeText(element, text, speed) {
    for (const char of text) {
        if (introSkipped) break;
        element.textContent += char;
        await wait(speed);
    }
}

async function eraseText(element, speed) {
    while (element.textContent.length && !introSkipped) {
        element.textContent = element.textContent.slice(0, -1);
        await wait(speed);
    }
}

function fillBar(bar, duration) {
    return new Promise(resolve => {
        const start = performance.now();
        function step(now) {
            const progress = introSkipped ? 1 : Math.min((now - start) / duration, 1);
            // Ease with a small stall near 80% so it feels like real loading
            const eased = progress < 0.8 ? progress * 1.05 : 0.84 + (progress - 0.8) * 0.8;
            bar.style.width = `${Math.min(eased, 1) * 100}%`;
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

async function playIntro(short) {
    const loader = document.getElementById('loader');
    const nameEl = document.getElementById('loaderName');
    const taglineEl = document.getElementById('loaderTagline');
    const statusEl = document.getElementById('loaderStatus');
    const progressEl = loader.querySelector('.loader-progress');
    const bar = document.getElementById('loaderBar');

    function skip() {
        introSkipped = true;
        resolveSkip();
    }

    if (short) {
        skip();
    } else {
        window.addEventListener('keydown', skip, { once: true });
        loader.addEventListener('pointerdown', skip, { once: true });
    }

    await Promise.race([dataReady, wait(1500)]);

    const intro = portfolioData.intro || defaultIntro;
    const phrases = intro.phrases && intro.phrases.length ? intro.phrases : defaultIntro.phrases;
    if (portfolioData.personal && portfolioData.personal.name) {
        nameEl.textContent = portfolioData.personal.name;
    }
    statusEl.textContent = intro.status || defaultIntro.status;

    if (!short) {
        const nameDuration = splitName(nameEl);
        fitName(nameEl);
        window.addEventListener('resize', () => fitName(nameEl));
        await skippableWait(prefersReducedMotion ? 0 : nameDuration);

        // Type each phrase, erasing all but the last
        for (let i = 0; i < phrases.length && !introSkipped; i++) {
            if (prefersReducedMotion) break;
            await typeText(taglineEl, phrases[i], 55);
            if (i < phrases.length - 1) {
                await skippableWait(700);
                await eraseText(taglineEl, 30);
                await skippableWait(200);
            }
        }
        taglineEl.textContent = phrases[phrases.length - 1];

        progressEl.classList.add('show');
        await fillBar(bar, prefersReducedMotion ? 600 : 2200);
        await skippableWait(500);
    }

    await dataReady;
    loader.classList.add('done');
    document.body.classList.remove('is-loading');
}

// ---------------------------------------------------------------------------
// Sky: stars, nebulae and shooting stars (drawn behind the orbit rings)
// ---------------------------------------------------------------------------

const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
let width = 0;
let height = 0;
let dpr = 1;
let stars = [];
let shootingStars = [];

const nebulae = [
    { x: 0.12, y: 0.15, r: 0.35, color: '255, 120, 60', alpha: 0.18, drift: 0.7 },
    { x: 0.88, y: 0.2, r: 0.4, color: '255, 110, 50', alpha: 0.14, drift: 1.1 },
    { x: 0.8, y: 0.85, r: 0.45, color: '140, 60, 255', alpha: 0.2, drift: 0.9 },
    { x: 0.2, y: 0.8, r: 0.4, color: '200, 50, 200', alpha: 0.14, drift: 1.3 },
    { x: 0.5, y: 0.5, r: 0.6, color: '90, 20, 140', alpha: 0.22, drift: 0.5 }
];

function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round((width * height) / 3500);
    stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.5 + 0.5,
        depth: Math.random() * 0.8 + 0.2
    }));
}

function spawnShootingStar() {
    const fromLeft = Math.random() < 0.5;
    shootingStars.push({
        x: fromLeft ? Math.random() * width * 0.5 : width * (0.5 + Math.random() * 0.5),
        y: Math.random() * height * 0.4,
        vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 4),
        vy: 2.5 + Math.random() * 2,
        life: 1
    });
}

function drawSky(time) {
    ctx.fillStyle = '#05030b';
    ctx.fillRect(0, 0, width, height);

    const size = Math.max(width, height);
    nebulae.forEach(n => {
        const x = (n.x + Math.sin(time * 0.00005 * n.drift) * 0.03) * width;
        const y = (n.y + Math.cos(time * 0.00004 * n.drift) * 0.03) * height;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, n.r * size);
        gradient.addColorStop(0, `rgba(${n.color}, ${n.alpha})`);
        gradient.addColorStop(1, `rgba(${n.color}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    });

    // Stars shift slightly with the camera's spin for parallax
    const shift = view.yaw * 40;
    stars.forEach(star => {
        const alpha = 0.45 + Math.sin(time * 0.002 * star.speed + star.twinkle) * 0.35;
        let x = (star.x + shift * star.depth) % width;
        if (x < 0) x += width;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (!prefersReducedMotion && Math.random() < 0.004) {
        spawnShootingStar();
    }
    shootingStars = shootingStars.filter(s => s.life > 0);
    shootingStars.forEach(s => {
        const gradient = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${s.life})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 14, s.y - s.vy * 14);
        ctx.stroke();
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.012;
    });
}

// ---------------------------------------------------------------------------
// Constellation: camera, orbit rings and planets
// ---------------------------------------------------------------------------

// tilt: 0 = edge-on, PI/2 = straight down. roll: rotation of the whole plane on screen.
const view = { tilt: 0.04, roll: -0.45, zoom: 0.5, yaw: 0 };
const target = { tilt: 1.0, roll: -0.12, zoom: 1, yaw: 0 };
let defaultView = { tilt: 1.0, roll: -0.12, zoom: 1 };

let orbitTime = 0;
let timeScale = 1;
let paused = false;
let hovering = false;
let lastFrame = performance.now();
let ready = false;
let unfoldStart = null;
const UNFOLD_MS = prefersReducedMotion ? 1 : 3200;

const stage = document.getElementById('stage');
const planetsEl = document.getElementById('planets');
const core = document.getElementById('core');

function setDefaultView() {
    const portrait = height > width;
    defaultView = portrait
        ? { tilt: 1.22, roll: 0, zoom: 1 }
        : { tilt: 0.86, roll: -0.12, zoom: 1 };
}

function orbitUnit() {
    const portrait = height > width;
    // Fit the outer orbit (plus room for its labels) inside the screen at the default tilt
    const fitHeight = (height / 2 - 90) / (orbits[orbits.length - 1] * Math.sin(defaultView.tilt));
    const base = portrait ? Math.min(width * 0.44, fitHeight) : Math.min(width * 0.4, fitHeight);
    return base * view.zoom;
}

function project(radius, angle) {
    const px = radius * Math.cos(angle);
    const pz = radius * Math.sin(angle);
    const sx = px;
    const sy = pz * Math.sin(view.tilt);
    const cosR = Math.cos(view.roll);
    const sinR = Math.sin(view.roll);
    const unit = orbitUnit();
    return {
        x: width / 2 + (sx * cosR - sy * sinR) * unit,
        y: height / 2 + 20 + (sx * sinR + sy * cosR) * unit,
        depth: pz * Math.cos(view.tilt)
    };
}

function drawOrbits() {
    const unit = orbitUnit();
    const cx = width / 2;
    const cy = height / 2 + 20;
    ctx.save();
    ctx.shadowColor = 'rgba(190, 90, 255, 1)';
    orbits.forEach(radius => {
        const ry = Math.max(radius * unit * Math.sin(view.tilt), 0.5);
        // Wide soft pass for the glow, then a thin bright core
        ctx.shadowBlur = 18;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(150, 70, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius * unit, ry, view.roll, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(200, 150, 255, 0.85)';
        ctx.stroke();
    });
    ctx.restore();
}

function buildPlanets() {
    planetsEl.innerHTML = '';
    planets.forEach((planet, i) => {
        const external = planet.external ? (portfolioData.personal || {})[planet.external] : null;
        const el = document.createElement(external ? 'a' : 'button');
        el.className = 'planet' + (external ? ' external' : '');
        el.style.setProperty('--planet-color', planet.color);
        el.innerHTML = `${iconSVG(planet.id)}<span class="planet-label">${escapeHTML(planet.label)}</span>`;
        if (external) {
            el.href = external;
            el.target = '_blank';
            el.rel = 'noopener';
        } else {
            el.dataset.section = planet.id;
        }
        el.addEventListener('mouseenter', () => { hovering = true; });
        el.addEventListener('mouseleave', () => { hovering = false; });
        planetsEl.appendChild(el);
        planet.el = el;
        planet.revealAt = 600 + i * 120;
    });

    // Section menu mirrors the planets
    const list = document.getElementById('sectionMenuList');
    const menuItems = [{ id: 'about', label: 'About Me', color: sections.about.color }]
        .concat(planets.filter(p => !p.external));
    list.innerHTML = menuItems.map(item => `
        <li><button data-section="${item.id}" style="--planet-color:${item.color}">
            <span style="color:${item.color}">${iconSVG(item.id === 'about' ? 'about' : item.id)}</span>
            ${escapeHTML(item.label)}
        </button></li>
    `).join('');
}

function positionPlanets(sinceUnfold) {
    const coreSize = core.offsetWidth;
    const corePos = project(0, 0);
    core.style.transform = `translate(${corePos.x - coreSize / 2}px, ${corePos.y - coreSize / 2}px)`;
    core.style.zIndex = 50;

    planets.forEach(planet => {
        const radius = orbits[planet.orbit];
        // Inner orbits move faster
        const speed = 0.045 / radius;
        const angle = (planet.angle * Math.PI) / 180 + orbitTime * speed + view.yaw;
        const pos = project(radius, angle);
        const scale = 0.85 + pos.depth * 0.25;
        const el = planet.el;
        el.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -30%) scale(${scale})`;
        el.style.zIndex = Math.round(50 + pos.depth * 40);
        if (sinceUnfold >= planet.revealAt && !el.classList.contains('visible')) {
            el.classList.add('visible');
        }
    });
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function frame(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;

    // Orbits slow down while a planet is hovered or a panel is open
    const wantedScale = paused ? 0 : (hovering || panelOpen ? 0.15 : 1);
    timeScale += (wantedScale - timeScale) * Math.min(dt * 4, 1);
    orbitTime += dt * timeScale * (prefersReducedMotion ? 0.3 : 1);

    if (ready) {
        if (unfoldStart === null) unfoldStart = now;
        const sinceUnfold = now - unfoldStart;
        const t = Math.min(sinceUnfold / UNFOLD_MS, 1);

        if (t < 1) {
            // Unfold from edge-on into the tilted system
            const e = easeOutCubic(t);
            view.tilt = 0.04 + (defaultView.tilt - 0.04) * e;
            view.roll = -0.45 + (defaultView.roll + 0.45) * e;
            view.zoom = 0.5 + (defaultView.zoom - 0.5) * e;
            target.tilt = view.tilt;
            target.roll = view.roll;
            target.zoom = view.zoom;
        } else {
            view.tilt += (target.tilt - view.tilt) * Math.min(dt * 6, 1);
            view.roll += (target.roll - view.roll) * Math.min(dt * 3, 1);
            view.zoom += (target.zoom - view.zoom) * Math.min(dt * 6, 1);
            if (!dragging) {
                target.yaw += yawVelocity;
                yawVelocity *= 0.94;
            }
            view.yaw += (target.yaw - view.yaw) * Math.min(dt * 8, 1);
        }

        drawSky(now);
        drawOrbits();
        positionPlanets(sinceUnfold);
    } else {
        drawSky(now);
    }

    requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Camera controls: drag, pinch, wheel and keyboard
// ---------------------------------------------------------------------------

let dragging = false;
let yawVelocity = 0;
const pointers = new Map();
let pinchDistance = 0;
let dragMoved = 0;

function clampTilt(value) {
    return Math.min(Math.max(value, 0.12), 1.5);
}

function clampZoom(value) {
    return Math.min(Math.max(value, 0.55), 1.8);
}

stage.addEventListener('pointerdown', event => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragMoved = 0;
    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
});

window.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance) {
            target.zoom = clampZoom(target.zoom * (distance / pinchDistance));
        }
        pinchDistance = distance;
        return;
    }

    dragMoved += Math.abs(dx) + Math.abs(dy);
    if (dragMoved > 6) {
        if (!dragging) {
            dragging = true;
            stage.classList.add('dragging');
            stage.setPointerCapture(event.pointerId);
        }
        target.yaw += dx * 0.006;
        yawVelocity = dx * 0.006;
        target.tilt = clampTilt(target.tilt + dy * 0.004);
    }
});

function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    if (pointers.size === 0 && dragging) {
        dragging = false;
        stage.classList.remove('dragging');
    }
}

window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

// A drag that ends on a planet shouldn't count as a click
stage.addEventListener('click', event => {
    if (dragMoved > 6) {
        event.preventDefault();
        event.stopPropagation();
    }
}, true);

stage.addEventListener('wheel', event => {
    event.preventDefault();
    target.zoom = clampZoom(target.zoom * Math.exp(-event.deltaY * 0.0012));
}, { passive: false });

function resetView() {
    target.tilt = defaultView.tilt;
    target.roll = defaultView.roll;
    target.zoom = defaultView.zoom;
    target.yaw = Math.round(target.yaw / (Math.PI * 2)) * Math.PI * 2;
    yawVelocity = 0;
}

window.addEventListener('keydown', event => {
    if (!ready) return;

    if (event.key === 'Escape') {
        if (!controls.hidden) toggleControls(false);
        else if (!menu.hidden) toggleMenu(false);
        else if (panelOpen) closePanel();
        return;
    }

    if (event.target.closest('input, textarea')) return;

    switch (event.key) {
        case '?':
            toggleControls();
            return;
    }

    if (panelOpen) return;

    switch (event.key) {
        case 'ArrowLeft': target.yaw -= 0.25; break;
        case 'ArrowRight': target.yaw += 0.25; break;
        case 'ArrowUp': target.tilt = clampTilt(target.tilt + 0.12); break;
        case 'ArrowDown': target.tilt = clampTilt(target.tilt - 0.12); break;
        case '+':
        case '=': target.zoom = clampZoom(target.zoom * 1.15); break;
        case '-':
        case '_': target.zoom = clampZoom(target.zoom / 1.15); break;
        case '0': resetView(); break;
        case ' ':
            if (event.target.closest('button, a')) return;
            paused = !paused;
            break;
        default: return;
    }
    event.preventDefault();
});

// ---------------------------------------------------------------------------
// Menu, controls help and section panels
// ---------------------------------------------------------------------------

const menu = document.getElementById('sectionMenu');
const menuToggle = document.getElementById('menuToggle');
const controls = document.getElementById('controls');
const panel = document.getElementById('panel');
const panelTitle = document.getElementById('panelTitle');
const panelIcon = document.getElementById('panelIcon');
const panelBody = document.getElementById('panelBody');
let panelOpen = false;
let lastFocus = null;

function toggleMenu(force) {
    const open = force ?? menu.hidden;
    menu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
}

function toggleControls(force) {
    const open = force ?? controls.hidden;
    controls.hidden = !open;
    if (open) document.getElementById('controlsClose').focus();
}

menuToggle.addEventListener('click', () => toggleMenu());
document.getElementById('controlsClose').addEventListener('click', () => toggleControls(false));
document.getElementById('brandButton').addEventListener('click', () => {
    closePanel();
    resetView();
});
document.getElementById('panelClose').addEventListener('click', () => closePanel());

document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-section]');
    if (trigger) {
        toggleMenu(false);
        location.hash = trigger.dataset.section;
        return;
    }
    if (!menu.hidden && !event.target.closest('#sectionMenu, #menuToggle')) {
        toggleMenu(false);
    }
});

function openPanel(id) {
    const section = sections[id];
    if (!section) return;
    if (!panelOpen) lastFocus = document.activeElement;
    panel.style.setProperty('--planet-color', section.color);
    panelIcon.innerHTML = iconSVG(id);
    panelTitle.textContent = section.label;
    panelBody.innerHTML = section.render();
    panelBody.scrollTop = 0;
    panel.hidden = false;
    // Next frame so the slide-in transition runs
    requestAnimationFrame(() => panel.classList.add('open'));
    document.body.classList.add('panel-open');
    panelOpen = true;
    document.getElementById('panelClose').focus({ preventScroll: true });

    const form = panelBody.querySelector('form');
    if (form) form.addEventListener('submit', handleSubmit);
}

function closePanel() {
    if (!panelOpen) return;
    panelOpen = false;
    panel.classList.remove('open');
    document.body.classList.remove('panel-open');
    setTimeout(() => { if (!panelOpen) panel.hidden = true; }, 450);
    if (location.hash) {
        history.pushState(null, '', location.pathname + location.search);
    }
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}

function syncPanelWithHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (sections[id]) {
        openPanel(id);
    } else {
        closePanel();
    }
}

window.addEventListener('hashchange', syncPanelWithHash);

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderAbout() {
    const about = portfolioData.about || {};
    const personal = portfolioData.personal || {};
    return `
        <p class="lead">${escapeHTML(about.description)}</p>
        <p>${escapeHTML(about.extra)}</p>
        <div class="chips">
            <span class="chip">${escapeHTML(personal.title)}</span>
            ${(personal.subtitle || '').split('|').map(s => `<span class="chip">${escapeHTML(s.trim())}</span>`).join('')}
        </div>
    `;
}

function renderSkills() {
    return (portfolioData.skills || []).map(group => `
        <div class="card">
            <h3>${escapeHTML(group.category)}</h3>
            <div class="chips">
                ${group.items.map(item => `<span class="chip">${escapeHTML(item)}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

function renderSoftSkills() {
    return `
        <div class="chips">
            ${(portfolioData.softSkills || []).map(skill => `<span class="chip">${escapeHTML(skill.title)}</span>`).join('')}
        </div>
    `;
}

function renderEducation() {
    return (portfolioData.education || []).map(edu => `
        <div class="card">
            <h3>${escapeHTML(edu.degree)}</h3>
            <p class="sub">${escapeHTML(edu.school)}</p>
            <p>${escapeHTML(edu.program)}</p>
            <p class="meta">${escapeHTML(edu.year)}</p>
            <p>${escapeHTML(edu.description)}</p>
        </div>
    `).join('');
}

function renderProjects() {
    return (portfolioData.projects || []).map(project => `
        <div class="card">
            <div class="emoji" aria-hidden="true">${escapeHTML(project.emoji)}</div>
            <h3>${escapeHTML(project.title)}${project.badge ? ` <span class="badge">${escapeHTML(project.badge)}</span>` : ''}</h3>
            <p>${escapeHTML(project.description)}</p>
            <div class="chips">
                ${(project.tags || []).map(tag => `<span class="chip">${escapeHTML(tag)}</span>`).join('')}
            </div>
            ${project.links ? `<div class="variation-links">
                ${project.links.map(link => {
                    const external = /^https?:/.test(link.url);
                    return `<a href="${escapeHTML(link.url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${escapeHTML(link.label)} ${external ? '↗' : '→'}</a>`;
                }).join('')}
            </div>` : ''}
        </div>
    `).join('');
}

function renderMiniProjects() {
    return (portfolioData.miniProjects || []).map(mini => `
        <div class="card">
            <div class="emoji" aria-hidden="true">${escapeHTML(mini.emoji)}</div>
            <h3>${escapeHTML(mini.title)}</h3>
            <p>${escapeHTML(mini.description)}</p>
            <div class="variation-links">
                ${(mini.variations || []).map(v => `<a href="${escapeHTML(v.link)}">${escapeHTML(v.language)} →</a>`).join('')}
            </div>
        </div>
    `).join('');
}

function renderCertificates() {
    return (portfolioData.certificates || []).map(cert => `
        <div class="card">
            <h3>🏆 ${escapeHTML(cert.title)}</h3>
            <p>${escapeHTML(cert.provider)}</p>
            <p class="meta">${escapeHTML(cert.status)}</p>
        </div>
    `).join('');
}

function renderLanguages() {
    return `
        <div class="grid-2">
            ${(portfolioData.languages || []).map(lang => `
                <div class="card">
                    <h3>${escapeHTML(lang.language)}</h3>
                    <p class="meta">${escapeHTML(lang.proficiency)}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function renderInvolvement() {
    return (portfolioData.involvement || []).map(inv => `
        <div class="card">
            <h3>${escapeHTML(inv.position)}</h3>
            <p class="sub">${escapeHTML(inv.organization)}</p>
            <p class="meta">${escapeHTML(inv.year)}</p>
        </div>
    `).join('');
}

function renderContact() {
    const personal = portfolioData.personal || {};
    const linkedin = personal.linkedin || '';
    const linkedinText = linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    return `
        <ul class="info-list">
            <li><span class="info-label">Email</span><a href="mailto:${escapeHTML(personal.email)}">${escapeHTML(personal.email)}</a></li>
            <li><span class="info-label">Phone</span><span>${escapeHTML(personal.phone)}</span></li>
            <li><span class="info-label">Location</span><span>${escapeHTML(personal.location)}</span></li>
            <li><span class="info-label">LinkedIn</span><a href="${escapeHTML(linkedin)}" target="_blank" rel="noopener">${escapeHTML(linkedinText)}</a></li>
        </ul>
        <form class="contact-form">
            <div class="form-group">
                <label for="name">Name</label>
                <input type="text" id="name" placeholder="Your full name" required>
            </div>
            <div class="form-group">
                <label for="subject">Subject</label>
                <input type="text" id="subject" placeholder="Job opportunity / Collaboration" required>
            </div>
            <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" placeholder="Tell me about your project or opportunity..." required></textarea>
            </div>
            <button type="submit" class="btn-send">Send Message</button>
            <p class="form-note">Opens your email app with the message ready to send.</p>
        </form>
    `;
}

// Contact form: hand the message to the visitor's email app
function handleSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('name').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();
    if (!name || !subject || !message) return;

    const email = (portfolioData.personal || {}).email || '';
    const body = `${message}\n\n— ${name}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

if (isTouch) {
    document.querySelector('.hint-left').textContent = 'Drag to rotate · Pinch to zoom · Tap a planet';
}

window.addEventListener('resize', () => {
    resize();
    setDefaultView();
    if (unfoldStart !== null && performance.now() - unfoldStart > UNFOLD_MS) resetView();
});

resize();
setDefaultView();
requestAnimationFrame(frame);

// Returning from a mini project (or a shared link to a section) skips the long intro
const arrivingWithSection = Boolean(sections[location.hash.slice(1)]);

playIntro(arrivingWithSection).then(() => {
    buildPlanets();
    ready = true;
    document.body.classList.add('is-ready');
    if (arrivingWithSection) {
        setTimeout(syncPanelWithHash, prefersReducedMotion ? 0 : 900);
    }
});
