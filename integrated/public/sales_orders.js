document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
    let orders = [];
    const tableBody = document.querySelector('#ordersTable tbody');
    const orderModal = document.getElementById('orderModal');
    const orderForm = document.getElementById('orderForm');

    async function fetchOrders() {
        try {
            const resp = await fetch(`${API_BASE}/api/sales_orders`);
            if (resp.ok) {
                orders = await resp.json();
                renderTable();
            } else {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Failed to load data.</td></tr>';
            }
        } catch(err) {
            console.error('Connection error fetching orders', err);
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Connection error. Is server running?</td></tr>';
        }
    }

    function renderTable() {
        tableBody.innerHTML = '';
        if(orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:50px; color:#94A3B8; font-weight:600;">No sales orders found.</td></tr>';
            return;
        }

        document.getElementById('totalOrdersText').textContent = `${orders.length} total orders tracked`;

        orders.forEach(o => {
            const tr = document.createElement('tr');
            
            // Format status badge
            let statusBadge = '';
            if (o.status === 'PENDING') statusBadge = '<span class="status-badge" style="background:#FEF3C7; color:#D97706;">PENDING</span>';
            else if (o.status === 'COMPLETED') statusBadge = '<span class="status-badge" style="background:#DCFCE7; color:#15803D;">COMPLETED</span>';
            else statusBadge = '<span class="status-badge" style="background:#E0E7FF; color:#4338CA;">' + o.status + '</span>';

            // Format Date
            const d = new Date(o.date);
            const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

            tr.innerHTML = `
                <td style="font-weight:700; color:#3B82F6;">${o.order_id}</td>
                <td style="color:#64748B;">${dateStr}</td>
                <td style="font-weight:600; color:#1E293B;">${o.customer}</td>
                <td style="font-weight:600;">${o.items_count} items</td>
                <td style="font-weight:700;">Rs. ${Number(o.total).toLocaleString()}</td>
                <td>${statusBadge}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Modal behavior
    document.getElementById('openAddModal').onclick = () => {
        orderForm.reset();
        document.getElementById('oId').value = 'SO-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);
        document.getElementById('oDate').valueAsDate = new Date();
        orderModal.classList.add('show');
    };

    document.getElementById('closeModal').onclick = () => orderModal.classList.remove('show');
    document.getElementById('cancelBtn').onclick = () => orderModal.classList.remove('show');

    // Create Order
    orderForm.onsubmit = async (e) => {
        e.preventDefault();
        const oBtn = document.getElementById('saveBtn');
        oBtn.disabled = true;
        oBtn.textContent = 'Saving...';

        const data = {
            order_id: document.getElementById('oId').value,
            date: document.getElementById('oDate').value,
            customer: document.getElementById('oCustomer').value,
            items_count: document.getElementById('oItems').value,
            total: document.getElementById('oTotal').value,
            status: document.getElementById('oStatus').value
        };

        try {
            const resp = await fetch(`${API_BASE}/api/sales_orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (resp.ok) {
                orderModal.classList.remove('show');
                fetchOrders(); // Refresh table
            } else {
                alert('Failed to save order.');
            }
        } catch(err) {
            alert('Connection error.');
        } finally {
            oBtn.disabled = false;
            oBtn.textContent = 'Create Order';
        }
    };

    fetchOrders();
});
