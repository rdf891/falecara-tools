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

    // 1. Cria o link ANTES de tudo (para garantir que existe)
    // Usa api.whatsapp.com que é universal
    const linkZap = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoFinal)}`;

    // 2. Detecção de Mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 3. Tenta o nativo APENAS se for mobile E suportado
    if (isMobile && navigator.share) {
        navigator.share({
            title: 'FaleCara Tools',
            text: textoFinal
        })
        .catch((error) => {
            console.log('Compartilhamento nativo falhou, usando fallback:', error);
            // SE FALHAR (ex: permissão negada), ABRE O LINK NA MARRA
            window.open(linkZap, '_blank');
        });
    } else {
        // 4. Se for PC, abre direto
        window.open(linkZap, '_blank');
    }
}
