/**
 * Inventory Module
 * Manages product stock, pricing, and CRUD operations.
 * Refactored to use API.
 */
window.inventory = {
    data: [],

    async init() {
        // Load from API
        try {
            const res = await fetch('/api/inventory');
            this.data = await res.json();
        } catch (e) {
            console.error('Failed to load inventory', e);
        }

        const form = document.getElementById('inventory-form');
        // Clean listeners
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Search filter
        document.getElementById('inventory-search').addEventListener('input', (e) => {
            this.render(e.target.value);
        });

        this.render();
    },

    render(filterText = '') {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const filtered = this.data.filter(p =>
            p.name.toLowerCase().includes(filterText.toLowerCase()) ||
            (p.barcode && p.barcode.includes(filterText))
        );

        filtered.forEach(p => {
            const tr = document.createElement('tr');

            // Quantity styling
            let qtyStyle = '';
            if (p.qty == 0) qtyStyle = 'color: var(--danger); font-weight: bold;';
            else if (p.qty < 5) qtyStyle = 'color: var(--accent); font-weight: bold;';

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 500;">${p.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${p.barcode || ''}</div>
                </td>
                <td style="${qtyStyle}">${p.qty}</td>
                <td>${app.formatMoney(p.price)}</td>
                <td>${app.formatMoney(p.price * p.qty)}</td>
                <td style="font-size: 0.9rem; color: var(--text-secondary);">${p.lastUpdated || '-'}</td>
                <td>
                    <button class="btn btn-secondary" style="padding: 0.25rem 0.75rem;" onclick="inventory.editProduct('${p.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding: 0.25rem 0.75rem;" onclick="inventory.deleteProduct('${p.id}')">×</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No products found</td></tr>';
        }
    },

    openModal() {
        document.getElementById('inventory-modal').classList.add('active');
        document.getElementById('inventory-form').reset();
        document.getElementById('product-id').value = '';
    },

    closeModal() {
        document.getElementById('inventory-modal').classList.remove('active');
    },

    editProduct(id) {
        const p = this.data.find(x => x.id === id);
        if (!p) return;

        document.getElementById('product-id').value = p.id;
        document.getElementById('product-name').value = p.name;
        document.getElementById('product-qty').value = p.qty;
        document.getElementById('product-price').value = p.price;
        document.getElementById('product-barcode').value = p.barcode || '';

        document.getElementById('inventory-modal').classList.add('active');
    },

    async saveProduct() {
        const id = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value;
        const qty = parseInt(document.getElementById('product-qty').value);
        const price = parseFloat(document.getElementById('product-price').value);
        const barcode = document.getElementById('product-barcode').value;

        if (id) {
            // Update
            const index = this.data.findIndex(x => x.id === id);
            if (index > -1) {
                this.data[index] = {
                    ...this.data[index],
                    name, qty, price, barcode,
                    lastUpdated: new Date().toLocaleDateString()
                };
            }
        } else {
            // Create
            this.data.push({
                id: app.generateId(),
                name, qty, price, barcode,
                lastUpdated: new Date().toLocaleDateString()
            });
        }

        await this.persist();
        this.render();
        this.closeModal();
    },

    async deleteProduct(id) {
        if (confirm('Delete this product?')) {
            this.data = this.data.filter(x => x.id !== id);
            await this.persist();
            this.render();
        }
    },

    async persist() {
        try {
            await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.data)
            });
        } catch (e) {
            console.error('Failed to save inventory', e);
            alert('Error saving data. Check connection.');
        }
    }
};

inventory.init();
