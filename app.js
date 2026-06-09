import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';

// --- UI Logic ---
const themeToggle = document.getElementById('themeToggle');
const fontToggle = document.getElementById('fontToggle');

let isDark = true;
let isMono = false;

themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    document.body.classList.toggle('light-mode', !isDark);
    themeToggle.textContent = isDark ? "LIGHT DARK" : "LIGHT DARK";
    updateShaderTheme();
});

fontToggle.addEventListener('click', () => {
    isMono = !isMono;
    document.body.classList.toggle('mono-font', isMono);
    fontToggle.textContent = isMono ? "MONOSPACED" : "MONOSPACED";
});

// Update active state in nav based on scroll position (Optional but nice to have since we added the dot)
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav li');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 150) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(li => {
        li.classList.remove('active');
        if (li.querySelector('a').getAttribute('href') === `#${current}`) {
            li.classList.add('active');
        }
    });
});

// --- WebGL Background Logic ---
// We want to mimic the dense, static/film grain dust effect concentrated dynamically.

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // sharper noise
document.body.appendChild(renderer.domElement);

renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '-1';

const geometry = new THREE.PlaneGeometry(2, 2);

const material = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        colorBg: { value: new THREE.Color(0x0f0f0f) }, // Dark background
        colorNoise: { value: new THREE.Color(0xffffff) }, // Light dust
        noiseIntensity: { value: 0.15 } // Max alpha of the noise particles
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        uniform vec3 colorBg;
        uniform vec3 colorNoise;
        uniform float noiseIntensity;
        varying vec2 vUv;

        // Pseudo-random generator for TV static/grain
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        // Noise mask to cluster the grain (like on the right side of the screen)
        float snoise(vec2 v) {
            // Simplified smooth noise for masking
            vec2 i = floor(v);
            vec2 f = fract(v);
            f = f * f * (3.0 - 2.0 * f);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
            // Screen aspect ratio mapping
            vec2 st = gl_FragCoord.xy / resolution.xy;
            
            // Fast changing time variable for static
            float fastTime = floor(time * 60.0); // 60hz random changes
            
            // Raw static grain
            float grain = random(st * 100.0 + fastTime); 

            // Create a gradient/mask that is heavier on the right side and bottom
            // You can tweak this to match the exact shape of the dust curve
            vec2 maskUv = vUv;
            
            // A slow moving noise mask to create waves of density
            float densityMask = snoise(maskUv * 2.0 + time * 0.1) * 0.5 + 0.5;
            
            // Focus heavy on the right with a curve
            float curve = smoothstep(0.1, 1.2, maskUv.x + maskUv.y * 0.2);
            densityMask *= curve;

            // Only show the grain where density mask allows it
            float finalGrainAlpha = step(1.0 - densityMask, grain) * noiseIntensity * grain;

            // Mix the base color with the noise color using the computed alpha
            vec3 finalColor = mix(colorBg, colorNoise, finalGrainAlpha);

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
});

function updateShaderTheme() {
    if (isDark) {
        material.uniforms.colorBg.value = new THREE.Color(0x0f0f0f);
        material.uniforms.colorNoise.value = new THREE.Color(0xffffff);
    } else {
        material.uniforms.colorBg.value = new THREE.Color(0xe5e5e5);
        material.uniforms.colorNoise.value = new THREE.Color(0x000000);
    }
}

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
});

function animate(t) {
    requestAnimationFrame(animate);
    material.uniforms.time.value = t * 0.001;
    renderer.render(scene, camera);
}

animate(0);
