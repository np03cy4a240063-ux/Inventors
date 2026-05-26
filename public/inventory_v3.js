console.log('REINVENT_V2_INVENTORY_V4_ACTIVE');
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '3001' ? '' : 'http://localhost:3001';
    let products = [];
    let currentTab = 'All';
    let searchQuery = '';
    let filterCategory = 'All';
    let filterStatus = 'All';
    let currentSort = 'nameAZ';
    let currentPage = 1;
    let itemsPerPage = 8;

    const tableBody = document.querySelector('#inventoryTableMain tbody');
    const productModal = document.getElementById('productModal');
    const productForm = document.getElementById('productForm');

    async function fetchData() {
        try {
            const resp = await fetch(`${API_BASE}/api/products`);
            if (resp.ok) {
                products = await resp.json();
            } else {
                throw new Error('API Error');
            }
        } catch (err) {
            console.log('Falling back to local storage.');
            const localData = JSON.parse(localStorage.getItem('reinvent_adv_products'));
            if (localData) products = localData;
        }
        updateUI();
    }

    async function syncData() {
        // This is now handled per action, but we'll keep it for bulk updates if needed
        localStorage.setItem('reinvent_adv_products', JSON.stringify(products));
        updateUI();
    }

    function updateUI() {
        updateStats();
        updateCategories();
        renderTable();
    }

    function updateStats() {
        let total = products.length;
        let inStock = products.filter(p => Number(p.stock) > Number(p.min)).length;
        let lowStock = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.min)).length;
        let outStock = products.filter(p => Number(p.stock) === 0).length;
        let totalValue = products.reduce((sum, p) => sum + (Number(p.stock) * Number(p.cost)), 0);

        document.getElementById('stat-total').textContent = total.toLocaleString();
        document.getElementById('stat-instock').textContent = inStock.toLocaleString();
        document.getElementById('stat-low').textContent = lowStock.toLocaleString();
        document.getElementById('stat-out').textContent = outStock.toLocaleString();
        document.getElementById('stat-value').textContent = 'Rs. ' + (totalValue / 1000).toFixed(1) + 'k';

        // Update tab counts
        const tabs = document.querySelectorAll('.inv-tab');
        tabs[0].textContent = `All Products (${total})`;
        tabs[1].textContent = `In Stock (${inStock})`;
        tabs[2].textContent = `Low Stock (${lowStock})`;
        tabs[3].textContent = `Out of Stock (${outStock})`;
        // Aging Stock dummy count
        tabs[4].textContent = `Aging Stock (0)`;

        document.getElementById('lastSyncedText').textContent = `${total} products - Last synced: just now`;
    }

    function updateCategories() {
        const catList = document.getElementById('catList');
        const filterCat = document.getElementById('filterCategory');
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

        catList.innerHTML = categories.map(c => `<option value="${c}">`).join('');

        let currentSel = filterCat.value;
        filterCat.innerHTML = '<option value="All">All Categories</option>' +
            categories.map(c => `<option value="${c}" ${currentSel === c ? 'selected' : ''}>${c}</option>`).join('');
    }

    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        let filtered = products;

        // Apply Tab
        if (currentTab === 'In') filtered = filtered.filter(p => Number(p.stock) > Number(p.min));
        else if (currentTab === 'Low') filtered = filtered.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.min));
        else if (currentTab === 'Out') filtered = filtered.filter(p => Number(p.stock) === 0);

        // Apply Filters
        if (filterCategory !== 'All') filtered = filtered.filter(p => p.category === filterCategory);
        if (filterStatus !== 'All') {
            if (filterStatus === 'In Stock') filtered = filtered.filter(p => Number(p.stock) > Number(p.min));
            else if (filterStatus === 'Low Stock') filtered = filtered.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.min));
            else if (filterStatus === 'Out of Stock') filtered = filtered.filter(p => Number(p.stock) === 0);
        }

        // Apply Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q) ||
                (p.category && p.category.toLowerCase().includes(q))
            );
        }

        // Apply Sort
        filtered.sort((a, b) => {
            if (currentSort === 'nameAZ') return a.name.localeCompare(b.name);
            if (currentSort === 'nameZA') return b.name.localeCompare(a.name);
            if (currentSort === 'stockHigh') return Number(b.stock) - Number(a.stock);
            if (currentSort === 'stockLow') return Number(a.stock) - Number(b.stock);
            return 0;
        });

        // Pagination Calculation
        const totalFiltered = filtered.length;
        const totalPages = Math.ceil(totalFiltered / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIdx = (currentPage - 1) * itemsPerPage;
        const pageItems = filtered.slice(startIdx, startIdx + itemsPerPage);

        if (totalFiltered === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:50px; color:#94A3B8; font-weight:600;">No products found matching your criteria.</td></tr>';
        }

        pageItems.forEach(p => {
            const stock = Number(p.stock) || 0;
            const min = Number(p.min) || 0;
            let statusClass = 'in-stock';
            let statusText = 'IN STOCK';

            if (stock === 0) { statusClass = 'out-of-stock'; statusText = 'OUT OF STOCK'; }
            else if (stock <= min) { statusClass = 'low-stock'; statusText = 'LOW STOCK'; }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="check-cell"><input type="checkbox"></div></td>
                <td>
                    <div class="prod-info-main">
                        <strong>${p.name}</strong>
                        <span>${p.desc || 'No description'}</span>
                    </div>
                </td>
                <td style="font-weight:700; color:#475569;">${p.sku}</td>
                <td>${p.category || 'General'}</td>
                <td style="font-weight:600;">Rs. ${Number(p.cost).toLocaleString()}</td>
                <td style="font-weight:600;">Rs. ${Number(p.sell).toLocaleString()}</td>
                <td style="font-weight:800; font-size:1.1rem; color:#1E293B;">${stock}</td>
                <td style="color:#64748B; font-weight:600;">${min}</td>
                <td><span class="status-label ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn-circle" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                        <button class="action-btn-circle" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        document.getElementById('showingCount').textContent = totalFiltered;
        document.getElementById('totalCount').textContent = products.length;
        renderPagination(totalFiltered);
    }

    function renderPagination(totalItems) {
        const pgContainer = document.getElementById('paginationNumbers');
        if (!pgContainer) return;
        pgContainer.innerHTML = '';

        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

        // Simple pagination: show all if few, or smart show if many
        // For now, let's just show all relevant pages up to a reasonable limit
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `pg-num ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => {
                currentPage = i;
                renderTable();
            };
            pgContainer.appendChild(btn);
        }

        document.getElementById('prevPage').disabled = currentPage === 1;
        document.getElementById('nextPage').disabled = currentPage === totalPages;
    }

    document.getElementById('prevPage').onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    };

    document.getElementById('nextPage').onclick = () => {
        const totalItems = Number(document.getElementById('showingCount').textContent);
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    };

    // Modal Logic
    window.openAddModal = () => {
        document.getElementById('modalTitle').textContent = 'Add New Product';
        document.getElementById('pId').value = '';
        productForm.reset();
        productModal.classList.add('show');
    };

    window.editProduct = (id) => {
        const p = products.find(x => x.id === id);
        if (!p) return;
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('pId').value = p.id;
        document.getElementById('pName').value = p.name;
        document.getElementById('pSku').value = p.sku;
        document.getElementById('pDesc').value = p.desc || '';
        document.getElementById('pCategory').value = p.category || '';
        document.getElementById('pCost').value = p.cost;
        document.getElementById('pSell').value = p.sell;
        document.getElementById('pStock').value = p.stock;
        document.getElementById('pMin').value = p.min;
        productModal.classList.add('show');
    };

    window.deleteProduct = async (id) => {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                console.log(`Attempting to delete product ${id}...`);
                const resp = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
                const result = await resp.json();

                if (resp.ok) {
                    // Success: Update local state and UI
                    products = products.filter(p => p.id !== id);
                    localStorage.setItem('reinvent_adv_products', JSON.stringify(products));
                    updateUI();
                    console.log('Product deleted successfully from DB and local state.');
                } else {
                    // API error (e.g., 404 or 500)
                    console.error('Server deletion failed:', result.error);
                    alert(`Failed to delete product: ${result.error || 'Unknown server error'}`);
                    // Critical: We DO NOT filter products here so the UI stays in sync with DB
                }
            } catch (err) {
                // Network or connection error
                console.error('Network error during deletion:', err);
                alert('Connection error: Could not reach the server to delete product. Please check your connection and try again.');
                // Critical: We DO NOT filter products here for local-only delete
            }
        }
    };

    document.getElementById('closeModal').onclick = () => productModal.classList.remove('show');
    document.getElementById('cancelBtn').onclick = () => productModal.classList.remove('show');

    productForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('pId').value;
        const pData = {
            name: document.getElementById('pName').value,
            sku: document.getElementById('pSku').value,
            desc: document.getElementById('pDesc').value,
            category: document.getElementById('pCategory').value,
            cost: Number(document.getElementById('pCost').value),
            sell: Number(document.getElementById('pSell').value),
            stock: Number(document.getElementById('pStock').value),
            min: Number(document.getElementById('pMin').value)
        };

        try {
            const url = id ? `${API_BASE}/api/products/${id}` : `${API_BASE}/api/products`;
            const method = id ? 'PUT' : 'POST';

            const resp = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pData)
            });

            if (resp.ok) {
                productModal.classList.remove('show');
                productForm.reset();
                fetchData(); // Refresh list
            } else {
                const res = await resp.json();
                alert('Save failed: ' + res.error);
            }
        } catch (err) {
            console.error('Save error:', err);
            alert('Connection error. Could not save product.');
        }
    };

    // --- STOCK ADJUSTMENT LOGIC ---
    const adjustmentModal = document.getElementById('adjustmentModal');
    const adjustmentForm = document.getElementById('adjustmentForm');
    const openAdjustmentModalBtn = document.getElementById('openAdjustmentModal');

    if (openAdjustmentModalBtn) {
        openAdjustmentModalBtn.onclick = () => {
            const select = document.getElementById('adjProduct');
            select.innerHTML = '<option value="">-- Choose Product --</option>' +
                products.map(p => `<option value="${p.id}">${p.name} (Current: ${p.stock})</option>`).join('');
            adjustmentModal.classList.add('show');
        };
    }

    document.getElementById('closeAdjModal').onclick = () => adjustmentModal.classList.remove('show');
    document.getElementById('cancelAdjBtn').onclick = () => adjustmentModal.classList.remove('show');

    adjustmentForm.onsubmit = async (e) => {
        e.preventDefault();
        const adjData = {
            product_id: document.getElementById('adjProduct').value,
            adjustment_type: document.getElementById('adjType').value,
            quantity: Number(document.getElementById('adjQty').value),
            reason: document.getElementById('adjReason').value
        };

        try {
            const resp = await fetch(`${API_BASE}/api/stock_adjustments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adjData)
            });

            if (resp.ok) {
                alert('Stock adjusted successfully');
                adjustmentModal.classList.remove('show');
                adjustmentForm.reset();
                fetchData();
            } else {
                const res = await resp.json();
                // Diagram explicitly mentions "Show Insufficient stock Error"
                if (res.error && res.error.includes('Insufficient stock')) {
                    alert('Error: ' + res.error);
                } else {
                    alert('Adjustment failed: ' + (res.error || 'Check your inputs'));
                }
            }
        } catch (err) {
            console.error('Adjustment error:', err);
            alert('Connection error.');
        }
    };

    // Listeners
    // Removed: document.getElementById('openAddModal').onclick = openAddModal;

    document.querySelectorAll('.inv-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.type;
            renderTable();
        };
    });

    document.getElementById('tableSearch').oninput = (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        renderTable();
    };

    document.getElementById('filterCategory').onchange = (e) => {
        filterCategory = e.target.value;
        currentPage = 1;
        renderTable();
    };

    document.getElementById('filterStatus').onchange = (e) => {
        filterStatus = e.target.value;
        currentPage = 1;
        renderTable();
    };

    document.getElementById('sortAction').onchange = (e) => {
        currentSort = e.target.value;
        currentPage = 1;
        renderTable();
    };

    document.getElementById('clearFilters').onclick = () => {
        document.getElementById('tableSearch').value = '';
        document.getElementById('filterCategory').value = 'All';
        document.getElementById('filterStatus').value = 'All';
        document.getElementById('sortAction').value = 'nameAZ';
        searchQuery = '';
        filterCategory = 'All';
        filterStatus = 'All';
        currentSort = 'nameAZ';
        renderTable();
    };

    const exportInventoryBtn = document.getElementById('exportInventoryBtn');
    if (exportInventoryBtn) {
        exportInventoryBtn.onclick = async () => {
            if (products.length === 0) return alert('No data to export.');

            // Get currently filtered data instead of all products
            let filtered = products;
            if (currentTab === 'In') filtered = filtered.filter(p => Number(p.stock) > Number(p.min));
            else if (currentTab === 'Low') filtered = filtered.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.min));
            else if (currentTab === 'Out') filtered = filtered.filter(p => Number(p.stock) === 0);

            if (filterCategory !== 'All') filtered = filtered.filter(p => p.category === filterCategory);
            if (filterStatus !== 'All') {
                if (filterStatus === 'In Stock') filtered = filtered.filter(p => Number(p.stock) > Number(p.min));
                else if (filterStatus === 'Low Stock') filtered = filtered.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.min));
                else if (filterStatus === 'Out of Stock') filtered = filtered.filter(p => Number(p.stock) === 0);
            }

            const exportData = filtered.map(p => ({
                Name: p.name,
                SKU: p.sku,
                Category: p.category,
                Cost: p.cost,
                Sell: p.sell,
                Stock: p.stock,
                MinThreshold: p.min,
                Status: Number(p.stock) === 0 ? 'OUT OF STOCK' : (Number(p.stock) <= Number(p.min) ? 'LOW STOCK' : 'IN STOCK')
            }));

            const keys = Object.keys(exportData[0]);
            const csvContent = [
                keys.join(','),
                ...exportData.map(row => keys.map(k => `"${String(row[k]).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'Inventory_Export.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Log export
            try {
                await fetch(`${API_BASE}/api/reports/log`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'INVENTORY_FILTERED', format: 'CSV' })
                });
            } catch (e) {
                console.error('Failed to log export');
            }
        };
    }

    // Force DOM elements to match initial variables to fix "sticky" filter on refresh
    document.getElementById('tableSearch').value = '';
    document.getElementById('filterCategory').value = 'All';
    document.getElementById('filterStatus').value = 'All';
    document.getElementById('sortAction').value = 'nameAZ';

    fetchData();
});
