/**
 * Bot Module
 * Manages Instagram Bot settings and logs.
 */
window.bot = {
    init() {
        console.log('Bot module init');
        this.loadSettings();

        // Settings Form
        const form = document.getElementById('bot-settings-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        // Auto-refresh logs every 10s if on bot screen
        setInterval(() => {
            if (app.state.currentView === 'bot') {
                this.loadLogs();
            }
        }, 10000);
    },

    async loadLogs() {
        try {
            const res = await fetch('/api/bot/logs');
            const logs = await res.json();
            this.renderLogs(logs);
        } catch (e) {
            console.error('Failed to fetch logs', e);
        }
    },

    renderLogs(logs) {
        const tbody = document.getElementById('bot-logs-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        logs.forEach(log => {
            let color = '#fff';
            if (log.type === 'error') color = 'var(--danger)';
            if (log.type === 'success') color = 'var(--success)';
            if (log.type === 'incoming') color = '#3b82f6'; // Blue
            if (log.type === 'outgoing') color = '#a855f7'; // Purple

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color: var(--text-secondary); font-size: 0.8rem;">${new Date(log.timestamp).toLocaleTimeString()}</td>
                <td style="color: ${color}; font-size: 0.9rem;">${log.message}</td>
            `;
            tbody.appendChild(tr);
        });

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">No active logs</td></tr>';
        }
    },

    async loadSettings() {
        try {
            const res = await fetch('/api/bot/settings');
            const settings = await res.json();
            if (settings.accessToken) {
                document.getElementById('bot-token').value = settings.accessToken;
                document.getElementById('bot-connection-status').textContent = 'Token Configured';
                document.getElementById('bot-connection-status').style.color = 'var(--success)';
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    },

    async saveSettings() {
        const token = document.getElementById('bot-token').value;
        try {
            await fetch('/api/bot/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: token })
            });
            alert('Settings Saved! The bot will now use this token.');
            this.loadLogs(); // Refresh
        } catch (e) {
            alert('Error saving settings.');
        }
    }
};

// Init after DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Slight delay to ensure elements exist
    setTimeout(() => bot.init(), 100);
});
