/**
 * Cameras Module
 * Displays surveillance camera feeds.
 * Currently uses placeholders, but ready for IP stream URL injection.
 */
window.cameras = {
    // Configuration for cameras (simulated)
    feeds: [
        { id: 1, name: 'Main Entrance' },
        { id: 2, name: 'Barber Area 1' },
        { id: 3, name: 'Barber Area 2' },
        { id: 4, name: 'Cash Register' }
    ],

    init() {
        // Nothing to load from storage for now
    },

    render() {
        const grid = document.getElementById('camera-grid');
        grid.innerHTML = '';

        this.feeds.forEach(cam => {
            const div = document.createElement('div');
            div.className = 'camera-feed';

            // Allow clicking to 'refresh' or simulate interaction
            div.innerHTML = `
                <div class="camera-label">🔴 LIVE - ${cam.name}</div>
                <div style="color: #444; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 0.5rem;" id="icon-${cam.id}">📹</div>
                    <div>Connecting to feed...</div>
                </div>
                <div style="position: absolute; bottom: 10px; right: 10px; font-family: monospace; font-size: 0.8rem; opacity: 0.7;">
                    ${new Date().toLocaleTimeString()}
                </div>
            `;

            grid.appendChild(div);

            // Simulate "connection" after brief delay
            setTimeout(() => {
                const icon = document.getElementById(`icon-${cam.id}`);
                if (icon) {
                    icon.style.color = '#fff';
                    icon.nextElementSibling.textContent = 'Signal Active';
                    // In a real app, we would inject an <iframe src="..."> here
                }
            }, 800 + (cam.id * 200));
        });
    },

    refreshAll() {
        const grid = document.getElementById('camera-grid');
        grid.style.opacity = '0.5';
        setTimeout(() => {
            this.render();
            grid.style.opacity = '1';
        }, 500);
    }
};

cameras.init();
