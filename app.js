/**
 * Main Application Logic
 * Handles global navigation and initialization.
 */
window.app = {
    state: {
        currentView: 'home'
    },

    init() {
        // Set current date in header
        const dateEl = document.getElementById('current-date');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);

        // Initialize 3D Tilt for Cards (if library loaded)
        if (typeof VanillaTilt !== 'undefined') {
            setTimeout(() => {
                VanillaTilt.init(document.querySelectorAll(".card"), {
                    max: 15,
                    speed: 400,
                    glare: true,
                    "max-glare": 0.2,
                    scale: 1.05
                });
            }, 500); // Delay slightly to ensure DOM render
        }

        console.log('App initialized');
    },

    navigate(viewId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(el => {
            el.classList.remove('active');
        });

        // Show target section
        const target = document.getElementById(`${viewId}-section`);
        if (target) {
            target.classList.add('active');
            this.state.currentView = viewId;

            // Trigger specific module refreshes if needed
            if (viewId === 'bookings' && window.bookings) bookings.render();
            if (viewId === 'inventory' && window.inventory) inventory.render();
            if (viewId === 'cameras' && window.cameras) cameras.render();
            if (viewId === 'accounting' && window.accounting) accounting.render();
        } else {
            // Fallback to home
            document.getElementById('home-section').classList.add('active');
        }
    },

    // Helper to format currency
    formatMoney(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    },

    // Helper to generate IDs
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
};
