// Main App Login & SW Registration

// Toggle Hamburger Menu
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        const icon = navToggle.querySelector('i');
        if (navLinks.classList.contains('open')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker Registered with scope:', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

console.log('FaleCara Tools Loaded');

function compartilharZap(mensagemBase) {
    const urlSite = 'https://rdf891.github.io/falecara-tools/';
    const textoFinal = `${mensagemBase} ${urlSite}`;

    // Detecção simples de dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
        // Nativo apenas no mobile
        navigator.share({
            title: 'FaleCara Tools',
            text: textoFinal
        }).catch(err => console.log('Erro ao compartilhar ou cancelado:', err));
    } else {
        // Desktop ou fallback -> WhatsApp Web
        const linkZap = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoFinal)}`;
        window.open(linkZap, '_blank');
    }
}
