document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
    let orders = [];
    let products = [];
    const tableBody = document.querySelector('#ordersTable tbody');

    // Fetch Products for dropdowns
    async function fetchProducts() {
        try {
            const resp = await fetch(`${API_BASE}/api/products`);
            if (resp.ok) products = await resp.json();
        } catch(err) { console.error('Error fetching products', err); }
    }

    async function fetchOrders() {
        try {
            const resp = await fetch(`${API_BASE}/api/sales_orders`);
            if (resp.ok) {
                orders = await resp.json();
                updateStats();
                renderTable();
            } else {
                tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Failed to load data.</td></tr>';
            }
        } catch(err) {
            console.error('Connection error fetching orders', err);
            tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Connection error.</td></tr>';
        }
    }

    function updateStats() {
        document.getElementById('soTotalOrders').textContent = `${orders.length} -`;
        const totalItems = orders.reduce((sum, o) => sum + Number(o.items_count), 0);
        document.getElementById('soOrderItems').textContent = `${totalItems} -`;
        const fulfilled = orders.filter(o => o.status === 'COMPLETED').length;
        document.getElementById('soFulfilled').textContent = `${fulfilled} -`;
        document.getElementById('soReturns').textContent = `0 -`;
    }

    function renderTable() {
        tableBody.innerHTML = '';
        if(orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:50px; color:#94A3B8; font-weight:600;">No sales orders found.</td></tr>';
            return;
        }

        orders.forEach(o => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #E2E8F0';
            let statusBadge = o.status === 'COMPLETED' ? 
                '<span style="background:#DCFCE7; color:#15803D; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Fulfilled</span>' :
                '<span style="background:#FEF3C7; color:#D97706; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Pending</span>';

            const d = new Date(o.date);
            const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

            tr.innerHTML = `
                <td style="padding: 15px; text-align: center;"><input type="checkbox"></td>
                <td style="padding: 15px; font-weight: 700; color: #64748B;">${o.order_id}</td>
                <td style="padding: 15px;">${dateStr}</td>
                <td style="padding: 15px; font-weight: 600;">${o.customer}</td>
                <td style="padding: 15px; text-align: center;">Success</td>
                <td style="padding: 15px; font-weight: 600;">Rs. ${Number(o.total).toLocaleString()}</td>
                <td style="padding: 15px;">N/A</td>
                <td style="padding: 15px;">${o.items_count} items</td>
                <td style="padding: 15px; text-align: center;">${statusBadge}</td>
                <td style="padding: 15px; text-align: center;">
                    <button class="action-btn-circle"><i class="fas fa-edit"></i></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // --- MODAL LOGIC ---
    const modal = document.getElementById('orderModal');
    const orderForm = document.getElementById('orderForm');
    const itemList = document.getElementById('itemList');
    const addItemBtn = document.getElementById('addItemBtn');
    const checkStockBtn = document.getElementById('checkStockBtn');
    const saveBtn = document.getElementById('saveBtn');

    window.openAddOrderModal = () => {
        const nextId = 'SO-' + new Date().getFullYear() + '-' + (orders.length + 1).toString().padStart(3, '0');
        document.getElementById('oId').value = nextId;
        document.getElementById('oDate').valueAsDate = new Date();
        itemList.innerHTML = '';
        addItem(); // Start with one item
        modal.classList.add('show');
        saveBtn.disabled = true;
    };

    // Need to trigger openAddOrderModal. I'll add it to the header or sync button? 
    // Actually the user probably wants a "Create" button.
    // I'll add a Create Order button in HTML too.

    function addItem() {
        const div = document.createElement('div');
        div.className = 'item-row';
        div.style = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-end;';
        div.innerHTML = `
            <div class="f-group" style="flex: 2;">
                <label style="font-size: 11px;">Product</label>
                <select class="item-product" required style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #E2E8F0;">
                    <option value="">-- Select --</option>
                    ${products.map(p => `<option value="${p.id}" data-price="${p.sell}">${p.name} (Rs. ${p.sell})</option>`).join('')}
                </select>
            </div>
            <div class="f-group" style="flex: 1;">
                <label style="font-size: 11px;">Qty</label>
                <input type="number" class="item-qty" required min="1" value="1" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #E2E8F0;">
            </div>
            <button type="button" class="remove-item" style="background: #FEE2E2; color: #B91C1C; border: none; padding: 8px; border-radius: 6px; cursor: pointer;"><i class="fas fa-trash"></i></button>
        `;
        div.querySelector('.remove-item').onclick = () => {
            div.remove();
            calculateTotal();
            saveBtn.disabled = true;
        };
        div.querySelector('.item-product').onchange = calculateTotal;
        div.querySelector('.item-qty').oninput = calculateTotal;
        itemList.appendChild(div);
    }

    addItemBtn.onclick = addItem;

    function calculateTotal() {
        let total = 0;
        document.querySelectorAll('.item-row').forEach(row => {
            const product = row.querySelector('.item-product');
            const qty = row.querySelector('.item-qty').value;
            const price = product.options[product.selectedIndex]?.dataset.price || 0;
            total += Number(qty) * Number(price);
        });
        document.getElementById('oTotalLabel').textContent = 'Rs. ' + total.toLocaleString();
        saveBtn.disabled = true; // Must re-check stock if changed
    }

    checkStockBtn.onclick = () => {
        let allOk = true;
        document.querySelectorAll('.item-row').forEach(row => {
            const prodId = row.querySelector('.item-product').value;
            const qty = Number(row.querySelector('.item-qty').value);
            const product = products.find(p => p.id == prodId);
            
            if (!product) {
                allOk = false;
                row.style.border = '1px solid red';
            } else if (product.stock < qty) {
                allOk = false;
                row.style.border = '1px solid red';
                alert(`Not enough stock for ${product.name}. Available: ${product.stock}`);
            } else {
                row.style.border = 'none';
            }
        });
        
        if (allOk) {
            alert('Stock check successful!');
            saveBtn.disabled = false;
        }
    };

    orderForm.onsubmit = async (e) => {
        e.preventDefault();
        const items = [];
        document.querySelectorAll('.item-row').forEach(row => {
            const prodId = row.querySelector('.item-product').value;
            const qty = Number(row.querySelector('.item-qty').value);
            const price = Number(row.querySelector('.item-product').options[row.querySelector('.item-product').selectedIndex].dataset.price);
            items.push({ product_id: prodId, quantity: qty, unit_price: price });
        });

        const orderData = {
            order_id: document.getElementById('oId').value,
            date: document.getElementById('oDate').value,
            customer: document.getElementById('oCustomer').value,
            items: items,
            total: items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0),
            status: 'COMPLETED'
        };

        try {
            const resp = await fetch(`${API_BASE}/api/sales_orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            if (resp.ok) {
                // Diagram says "Display Confirmation Message"
                alert('Sales Order created and inventory updated successfully!');
                modal.classList.remove('show');
                fetchOrders();
                fetchProducts(); // Refresh stock locally
            } else {
                const res = await resp.json();
                alert('Error: ' + res.error);
            }
        } catch(err) {
            alert('Connection error');
        }
    };

    document.getElementById('closeModal').onclick = () => modal.classList.remove('show');
    document.getElementById('cancelBtn').onclick = () => modal.classList.remove('show');

    fetchProducts();
    fetchOrders();
});
