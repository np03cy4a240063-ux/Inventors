document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : `http://${window.location.hostname}:5000`;
    let products = [];
    let cart = []; // { id, name, qty, cost, supplier }

    const lowStockTable = document.getElementById('lowStockTable');
    const purchaseItemsTable = document.getElementById('purchaseItemsTable');
    const addManualItemForm = document.getElementById('addManualItemForm');
    
    // Fetch products
    async function loadProducts() {
        try {
            const resp = await fetch(`${API_BASE}/api/products`);
            if (resp.ok) {
                products = await resp.json();
                renderLowStock();
                populateProductSelect();
            }
        } catch (err) {
            console.error('Error fetching products:', err);
            lowStockTable.innerHTML = '<tr><td colspan="6" style="padding:15px;text-align:center;">Failed to load products.</td></tr>';
        }
    }

    function renderLowStock() {
        lowStockTable.innerHTML = '';
        const lowStock = products.filter(p => Number(p.stock) <= Number(p.min));
        
        if (lowStock.length === 0) {
            lowStockTable.innerHTML = '<tr><td colspan="6" style="padding:15px;text-align:center;">No low stock items!</td></tr>';
            return;
        }

        lowStock.forEach(p => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #CBD5E1';
            
            let statusBadge = '';
            if (Number(p.stock) === 0) {
                statusBadge = '<span style="background:#FEE2E2; color:#B91C1C; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; border: 1px solid #FCA5A5;">OUT OF STOCK</span>';
            } else {
                statusBadge = '<span style="background:#FEF3C7; color:#D97706; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; border: 1px solid #FDE047;">LOW STOCK</span>';
            }

            const defaultReorder = Number(p.min) === 0 ? 10 : Number(p.min) * 2;

            tr.innerHTML = `
                <td style="padding: 12px 15px;"><input type="checkbox" class="ls-checkbox" data-id="${p.id}" style="width:16px;height:16px;"></td>
                <td style="padding: 12px 15px; color: #1E293B; font-weight: 500;">${p.name}</td>
                <td style="padding: 12px 15px; color: #475569;">${p.stock}</td>
                <td style="padding: 12px 15px; color: #475569;">${p.min}</td>
                <td style="padding: 12px 15px;">${statusBadge}</td>
                <td style="padding: 12px 15px;"><input type="number" class="ls-reorder" value="${defaultReorder}" min="1" style="width: 60px; padding: 6px; border: 1px solid #CBD5E1; border-radius: 4px; text-align: center;"></td>
            `;
            lowStockTable.appendChild(tr);

            // Checkbox logic
            const cb = tr.querySelector('.ls-checkbox');
            const ro = tr.querySelector('.ls-reorder');
            cb.addEventListener('change', (e) => {
                const supplier = supplierSelect.value || 'Auto Supplier';
                if (e.target.checked) {
                    addToCart(p.id, p.name, Number(ro.value), Number(p.cost) || 0, supplier);
                } else {
                    removeFromCart(p.id);
                }
            });
            ro.addEventListener('input', (e) => {
                if (cb.checked) {
                    updateCartQty(p.id, Number(e.target.value));
                }
            });
        });
    }

    // Cart logic
    function addToCart(id, name, qty, cost, supplier) {
        const existing = cart.find(c => c.id === id || c.name === name);
        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({ id, name, qty, cost, supplier });
        }
        renderCart();
    }

    function updateCartQty(id, qty) {
        const item = cart.find(c => c.id === id);
        if (item) {
            item.qty = qty;
            renderCart();
        }
    }

    function removeFromCart(id) {
        cart = cart.filter(c => c.id !== id);
        renderCart();
    }

    // --- STEP 1: START ORDER ---
    const startOrderBtn = document.getElementById('startOrderBtn');
    const supplierSelect = document.getElementById('mSupplier');
    const step1 = document.getElementById('purchaseStep1');
    const step2 = document.getElementById('purchaseStep2');
    const selectedSupplierName = document.getElementById('selectedSupplierName');

    startOrderBtn.addEventListener('click', () => {
        const supplier = supplierSelect.value;
        if (!supplier) return showToast('Please select a supplier first.', 'error');

        selectedSupplierName.textContent = supplier;
        step1.style.display = 'none';
        step2.style.display = 'flex';
        
        // Lock the supplier for low stock checkboxes too
        renderLowStock();
    });

    function populateProductSelect() {
        const select = document.getElementById('mProductSelect');
        if (!select) return;
        select.innerHTML = '<option value="">-- Select Product --</option>' + 
            products.map(p => `<option value="${p.id}" data-name="${p.name}" data-cost="${p.cost}">${p.name} (SKU: ${p.sku})</option>`).join('');
        
        select.onchange = (e) => {
            const opt = e.target.options[e.target.selectedIndex];
            if (opt.value) {
                document.getElementById('mCost').value = opt.dataset.cost || 0;
            }
        };
    }

    // Manual Add Form
    addManualItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const supplier = supplierSelect.value;
        const select = document.getElementById('mProductSelect');
        const opt = select.options[select.selectedIndex];
        
        const id = select.value;
        const name = opt.dataset.name;
        const qty = Number(document.getElementById('mQty').value);
        const cost = Number(document.getElementById('mCost').value);
        
        if (!id) return showToast('Please select a product', 'error');
        
        addToCart(id, name, qty, cost, supplier);
        addManualItemForm.reset();
    });

    function renderCart() {
        purchaseItemsTable.innerHTML = '';
        if (cart.length === 0) {
            purchaseItemsTable.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:#94A3B8;">No items added yet.</td></tr>';
            updateSummary();
            return;
        }

        cart.forEach(item => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #E2E8F0';
            const total = item.qty * item.cost;
            tr.innerHTML = `
                <td style="padding: 12px 15px; color: #1E293B; font-weight: 500;">${item.name}</td>
                <td style="padding: 12px 15px; color: #475569;">${item.qty}</td>
                <td style="padding: 12px 15px; color: #475569;">${item.cost.toLocaleString()}</td>
                <td style="padding: 12px 15px; color: #1E293B; font-weight: 600;">${total.toLocaleString()}</td>
            `;
            purchaseItemsTable.appendChild(tr);
        });
        updateSummary();
    }

    function updateSummary() {
        const itemsCount = cart.length;
        const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
        const subtotal = cart.reduce((sum, item) => sum + (item.qty * item.cost), 0);
        const tax = 0; // Keeping 0 as per UI
        const total = subtotal + tax;

        document.getElementById('sumItems').textContent = itemsCount;
        document.getElementById('sumQty').textContent = totalQty;
        document.getElementById('sumSubtotal').textContent = subtotal.toLocaleString();
        document.getElementById('sumTax').textContent = tax;
        document.getElementById('sumTotal').textContent = total.toLocaleString();

        const summaryPopup = document.getElementById('summaryPopup');
        if (itemsCount > 0) {
            summaryPopup.style.display = 'block';
        } else {
            summaryPopup.style.display = 'none';
        }
    }

    // Toggle Summary Button
    document.getElementById('toggleSummaryBtn').addEventListener('click', () => {
        const summaryPopup = document.getElementById('summaryPopup');
        if (summaryPopup.style.display === 'none') {
            summaryPopup.style.display = 'block';
        } else {
            summaryPopup.style.display = 'none';
        }
    });

    // Submit Purchase Order
    document.getElementById('createPoBtn').addEventListener('click', async () => {
        if (cart.length === 0) return showToast('Please add items to purchase order.', 'error');

        const btn = document.getElementById('createPoBtn');
        btn.textContent = 'Processing...';
        btn.disabled = true;

        const subtotal = cart.reduce((sum, item) => sum + (item.qty * item.cost), 0);
        const supplier = document.getElementById('mSupplier').value || 'General Supplier';
        
        const payload = {
            order_id: 'PO-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
            date: new Date().toISOString().split('T')[0],
            supplier: supplier,
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.qty,
                unit_price: item.cost
            })),
            total: subtotal,
            status: 'COMPLETED'
        };

        try {
            const resp = await fetch(`${API_BASE}/api/purchase_orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                showToast('Purchase Order Created Successfully!', 'success');
                window.location.href = 'dashboard.html';
            } else {
                const res = await resp.json();
                showToast('Failed to create Purchase Order: ' + (res.error || 'Unknown error'), 'error');
            }
        } catch (err) {
            console.error('Submit PO error', err);
            showToast('Connection error.', 'error');
        } finally {
            btn.textContent = 'Create Purchase Order';
            btn.disabled = false;
        }
    });

    document.getElementById('cancelPoBtn').addEventListener('click', () => {
        cart = [];
        renderCart();
        // Uncheck all checkboxes
        document.querySelectorAll('.ls-checkbox').forEach(cb => cb.checked = false);
    });

    loadProducts();
});
