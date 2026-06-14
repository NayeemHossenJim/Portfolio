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

// --- Navigation/Routing logic ---
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav li');

function showSection(sectionId) {
    let activeId = sectionId || 'about';
    
    // Remove active class from all sections
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show active section
    const targetSection = document.getElementById(activeId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update active nav link dot indicator
    navLinks.forEach(li => {
        li.classList.remove('active');
        const anchor = li.querySelector('a');
        if (anchor && anchor.getAttribute('href') === `#${activeId}`) {
            li.classList.add('active');
        }
    });

    // Reset scroll position when switching tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Router Event Listeners
window.addEventListener('hashchange', () => {
    const sectionId = window.location.hash.substring(1);
    showSection(sectionId);
});

// Run once on load to resolve the initial hash
const initialSectionId = window.location.hash.substring(1);
showSection(initialSectionId);

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

// --- Contact Section Interactivity ---


// 2. Auto-expanding Textarea for Message input
const messageTextarea = document.getElementById('form-message');
if (messageTextarea) {
    messageTextarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
}

// 3. Clean Form Submission Simulation
const contactForm = document.getElementById('contact-form');
const submitBtn = document.getElementById('form-submit');
const formStatus = document.getElementById('form-status');

if (contactForm && submitBtn && formStatus) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('form-name');
        const emailInput = document.getElementById('form-email');
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const message = messageTextarea.value.trim();
        
        if (!name || !email || !message) {
            formStatus.className = 'form-status error';
            formStatus.textContent = 'Please fill out all fields.';
            return;
        }
        
        // Disabled State during sending
        submitBtn.disabled = true;
        nameInput.disabled = true;
        emailInput.disabled = true;
        messageTextarea.disabled = true;
        
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = `<span class="btn-text">Sending...</span><span class="btn-icon">⋯</span>`;
        formStatus.className = 'form-status';
        formStatus.textContent = 'Initiating message dispatch...';
        
        // Mock API request delay
        setTimeout(() => {
            submitBtn.disabled = false;
            nameInput.disabled = false;
            emailInput.disabled = false;
            messageTextarea.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
            
            formStatus.className = 'form-status success';
            formStatus.textContent = 'Message sent successfully. Thank you.';
            
            // Clear inputs
            contactForm.reset();
            if (messageTextarea) {
                messageTextarea.style.height = 'auto';
            }
            
            // Clear status after 5 seconds
            setTimeout(() => {
                formStatus.textContent = '';
                formStatus.className = 'form-status';
            }, 5000);
        }, 1800);
    });
}

// 4. Copy Email to Clipboard
const copyBtn = document.getElementById('copy-email-btn');
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const email = 'nayeemhossenjim@gmail.com';
        navigator.clipboard.writeText(email).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy email: ', err);
        });
    });
}
