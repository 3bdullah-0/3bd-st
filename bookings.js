/**
 * Bookings Module
 * Manages appointment schedule, data storage, and rendering.
 * Refactored to use API.
 */
window.bookings = {
    data: [],
    currentWeekStart: new Date(),

    async init() {
        // Load data from API
        try {
            const res = await fetch('/api/bookings');
            this.data = await res.json();
        } catch (e) {
            console.error('Failed to load bookings', e);
        }

        // Align start date to most recent Sunday
        const day = this.currentWeekStart.getDay();
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() - day);

        // Setup modal close handler
        const deleteBtn = document.getElementById('btn-delete-booking');
        // Remove old listeners to avoid duplicates if re-inited (though init runs once)
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener('click', () => this.deleteBooking());

        const form = document.getElementById('booking-form');
        // Remove old listeners
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBooking();
        });

        // Initialize time slots in modal
        this.populateTimeSlots();
        this.render();
    },

    render() {
        this.renderCalendar();
    },

    populateTimeSlots() {
        const select = document.getElementById('booking-time');
        select.innerHTML = '';

        // 12:00 PM to 10:00 PM
        for (let hour = 12; hour <= 22; hour++) {
            const timeString = hour <= 12 ? `${hour}:00 PM` : `${hour - 12}:00 PM`;
            const opt = document.createElement('option');
            opt.value = hour; // Store as 24h int for simplicity
            opt.textContent = timeString;
            select.appendChild(opt);
        }
    },

    renderCalendar() {
        const container = document.getElementById('bookings-calendar');
        const headerLabel = document.getElementById('calendar-week-label');

        if (!container) return;

        // Update header label
        const endWeek = new Date(this.currentWeekStart);
        endWeek.setDate(endWeek.getDate() + 6);
        headerLabel.textContent = `${this.formatDateShort(this.currentWeekStart)} - ${this.formatDateShort(endWeek)}`;

        // Build Table Structure
        let html = '<table><thead><tr><th>Time</th>';

        // Header Row (Sun - Sat)
        for (let i = 0; i < 7; i++) {
            const d = new Date(this.currentWeekStart);
            d.setDate(d.getDate() + i);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = d.getDate();
            const isToday = this.isToday(d) ? 'style="color: var(--accent);"' : '';
            html += `<th ${isToday}>${dayName} ${dayNum}</th>`;
        }
        html += '</tr></thead><tbody>';

        // Body Rows (Hours 12-22)
        for (let hour = 12; hour < 22; hour++) {
            const timeLabel = hour <= 12 ? `${hour} PM` : `${hour - 12} PM`;
            html += `<tr><td style="width: 80px; font-weight: bold;">${timeLabel}</td>`;

            for (let i = 0; i < 7; i++) {
                const d = new Date(this.currentWeekStart);
                d.setDate(d.getDate() + i);
                const dateKey = d.toISOString().split('T')[0];

                // Check if booked
                const booking = this.data.find(b => b.date === dateKey && parseInt(b.time) === hour);

                if (booking) {
                    html += `
                        <td class="booked-slot" 
                            style="background-color: rgba(239, 68, 68, 0.2); border-left: 3px solid var(--danger); cursor: pointer;"
                            onclick="bookings.openModal('${booking.id}')">
                            <div style="font-size: 0.85rem; font-weight: bold;">${booking.customer}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${booking.service}</div>
                            ${booking.source === 'instagram' ? '<div style="font-size:0.7rem; color: var(--accent);">📸 Insta</div>' : ''}
                        </td>`;
                } else {
                    html += `
                        <td class="available-slot" 
                            style="cursor: pointer;"
                            onclick="bookings.openModal(null, '${dateKey}', ${hour})">
                            <span style="display:none;">+</span>
                        </td>`;
                }
            }
            html += '</tr>';
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    },

    openModal(id = null, dateStr = null, time = null) {
        const modal = document.getElementById('booking-modal');
        const form = document.getElementById('booking-form');
        const delBtn = document.getElementById('btn-delete-booking');

        form.reset();

        if (id) {
            // Edit Mode
            const booking = this.data.find(b => b.id === id);
            if (!booking) return;

            document.getElementById('booking-id').value = booking.id;
            document.getElementById('booking-customer').value = booking.customer;
            document.getElementById('booking-service').value = booking.service;
            document.getElementById('booking-date').value = booking.date;
            document.getElementById('booking-time').value = booking.time;

            delBtn.style.display = 'block';
        } else {
            // New Booking Mode
            document.getElementById('booking-id').value = '';
            delBtn.style.display = 'none';

            if (dateStr) document.getElementById('booking-date').value = dateStr;
            if (time) document.getElementById('booking-time').value = time;
        }

        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('booking-modal').classList.remove('active');
    },

    async saveBooking() {
        const id = document.getElementById('booking-id').value;
        const customer = document.getElementById('booking-customer').value;
        const service = document.getElementById('booking-service').value;
        const date = document.getElementById('booking-date').value;
        const time = document.getElementById('booking-time').value;

        // Check for double booking
        const existing = this.data.find(b => b.date === date && b.time == time && b.id !== id);
        if (existing) {
            alert('This time slot is already booked!');
            return;
        }

        if (id) {
            // Update
            const index = this.data.findIndex(b => b.id === id);
            if (index > -1) {
                this.data[index] = { ...this.data[index], customer, service, date, time };
            }
        } else {
            // Create
            const newBooking = {
                id: app.generateId(),
                customer,
                service,
                date,
                time,
                source: 'manual'
            };
            this.data.push(newBooking);
        }

        await this.persist();
        this.render();
        this.closeModal();
    },

    async deleteBooking() {
        const id = document.getElementById('booking-id').value;
        if (confirm('Are you sure you want to cancel this booking?')) {
            this.data = this.data.filter(b => b.id !== id);
            await this.persist();
            this.render();
            this.closeModal();
        }
    },

    prevWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
        this.render();
    },

    nextWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        this.render();
    },

    async persist() {
        try {
            await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.data)
            });
        } catch (e) {
            console.error('Failed to save bookings', e);
            alert('Error saving data to server. Check connection.');
        }
    },

    // Helpers
    formatDateShort(d) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    isToday(d) {
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    }
};

// Initialize manually since it's loaded after app.js
bookings.init();
