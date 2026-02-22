// 1. Initial Intro Animations
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    
    gsap.from(".hero-content", { opacity: 0, y: 30, duration: 1.2, ease: "power4.out" });
    gsap.from(".hero-image", { opacity: 0, scale: 0.9, duration: 1.5, ease: "expo.out", delay: 0.4 });
});

// 2. Mobile Menu Toggle
const menuBtn = document.getElementById('menu_btn');
const mobileMenu = document.getElementById('mobile_menu');
menuBtn.onclick = () => mobileMenu.classList.toggle('hidden');

// 3. Live Transcript Logic
const recordBtn = document.getElementById('record-btn');
const transcriptCont = document.getElementById('transcript-container');
const statusTag = document.getElementById('status-tag');
const statusDot = document.getElementById('status-dot');

const lines = [
    "Initializing Orbit Core...",
    "Listening for audio signal...",
    "Speaker A: 'Let's review the infrastructure plan.'",
    "Speaker B: 'We need to move to a serverless architecture.'",
    "Analyzing keywords: [Infrastructure, Serverless, Q3]",
    "Speaker A: 'Budget approved for the migration phase.'",
    "Generating action item: 'Finalize serverless migration by Oct 1.'",
    "Prompt Geometry applying: 'Executive Summary Mode'",
    "Optimizing intelligence layer output..."
];

let isRecording = false;
let lineIdx = 0;

function streamText() {
    if(!isRecording) return;
    const p = document.createElement('p');
    p.className = "text-white/70 animate-pulse";
    p.innerHTML = `<span class="text-blue-500/50 mr-2">></span> ${lines[lineIdx % lines.length]}`;
    transcriptCont.appendChild(p);
    transcriptCont.scrollTop = transcriptCont.scrollHeight;
    lineIdx++;
    setTimeout(streamText, Math.random() * 2000 + 1000);
}

recordBtn.onclick = () => {
    isRecording = !isRecording;
    if(isRecording) {
        recordBtn.innerHTML = `STOP CAPTURE`;
        recordBtn.classList.replace('bg-blue-600', 'bg-red-600');
        statusTag.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Recording`;
        streamText();
    } else {
        recordBtn.innerHTML = `START CAPTURE`;
        recordBtn.classList.replace('bg-red-600', 'bg-blue-600');
        statusTag.innerText = "Standby";
    }
};

const quotes = [
    {
        text: "Intelligence is no longer about the data we collect, but the speed at which we turn chaos into clarity.",
        author: "Elpie Landoy",
        role: "Founder, DotOrbit",
        initials: "EL"
    },
    {
        text: "The future of work isn't about working harder, it's about building systems that think alongside us.",
        author: "Jayson Nunez",
        role: "Co-Founder, DotOrbit",
        initials: "JN"
    },
    {
        text: "We are bridging the gap between human intuition and machine precision. One orbit at a time.",
        author: "Mark John Matining",
        role: "Co-Founder, DotOrbit",
        initials: "MJ"
    }
];

let quoteIndex = 0;
const quoteElement = document.getElementById('dynamic-quote');
const authorName = document.getElementById('author-name');
const authorRole = document.getElementById('author-role');
const authorAvatar = document.getElementById('author-avatar');

function updateQuote() {
    const q = quotes[quoteIndex];
    
    // Fade Out effect using GSAP
    gsap.to([quoteElement, authorName, authorRole, authorAvatar], {
        opacity: 0,
        y: 10,
        duration: 0.5,
        onComplete: () => {
            // Update Content
            quoteElement.innerText = `"${q.text}"`;
            authorName.innerText = q.author;
            authorRole.innerText = q.role;
            authorAvatar.innerText = q.initials;
            
            // Fade In effect
            gsap.to([quoteElement, authorName, authorRole, authorAvatar], {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out"
            });
        }
    });

    quoteIndex = (quoteIndex + 1) % quotes.length;
}

// Run every 5 seconds
setInterval(updateQuote, 5000);
// Initial Run
updateQuote();

// 1. Mouse Glow Tracking
const glow = document.createElement('div');
glow.className = 'cursor-glow';
document.body.appendChild(glow);

window.onmousemove = (e) => {
    gsap.to(glow, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.8,
        ease: "power2.out"
    });
};

// 2. Parallax Effect on Hero Image
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroImg = document.querySelector('.hero-image');
    if(heroImg) {
        heroImg.style.transform = `translateY(${scrolled * 0.1}px)`;
    }
});

// 3. Update the Contact Submit Button with a "Pulse" when successful
function triggerSuccessEffect() {
    confetti({ // Kung gusto mo ng visual flair (needs external confetti lib)
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#9333ea']
    });
}

function toggleMenu() {
    const menu = document.getElementById('mobile_menu');
    menu.classList.toggle('hidden');
    menu.classList.toggle('flex');
    // Prevents scrolling when menu is open
    document.body.classList.toggle('overflow-hidden');
}