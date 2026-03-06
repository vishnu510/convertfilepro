document.addEventListener('DOMContentLoaded', () => {
    console.log("Navbar Initialized");

    const navLinksContainer = document.querySelector('.nav-links');
    if (!navLinksContainer) {
        console.warn("Navbar container not found");
        return;
    }

    // Static links
    const tools = '<a href="index.html#tools" class="nav-link">Tools</a>';
    const howItWorks = `<a href="how-it-works.html" class="nav-link">How it works</a>`;

    navLinksContainer.innerHTML = tools + howItWorks;

    // Mobile Menu Logic
    const menuToggle = document.getElementById('menu-toggle');
    const navContainer = document.getElementById('nav-container');

    if (menuToggle && navContainer) {
        menuToggle.addEventListener('click', () => {
            navContainer.classList.toggle('active');
            menuToggle.classList.toggle('nav-active');
        });
    }
});
