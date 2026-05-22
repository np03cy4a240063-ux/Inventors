console.log('REINVENT_V2_INVENTORY_V4_ACTIVE');
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : `http://${window.location.hostname}:5000`;
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
                console.error('Failed to load products, status:', resp.status);
                products = [];
            }
        } catch (err) {
            console.error('Failed to load products:', err);
            products = [];
        }
        updateUI();
    }

    async function syncData() {
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

            // Product thumbnail: show image if saved, otherwise a grey box icon
            const thumbHtml = p.image_url
                ? `<img src="${p.image_url}" alt="${p.name}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;border:1px solid #E2E8F0;flex-shrink:0;">`
                : `<div style="width:40px;height:40px;border-radius:8px;background:#F1F5F9;border:1px solid #E2E8F0;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-box" style="color:#CBD5E1;font-size:0.95rem;"></i></div>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="check-cell"><input type="checkbox"></div></td>
                <td>
                    <div style="display:flex;align-items:center;gap:12px;">
                        ${thumbHtml}
                        <div class="prod-info-main">
                            <strong style="font-size:0.95rem; color:#1E293B;">${p.name}</strong>
                            <span style="font-size:0.75rem; color:#94A3B8;">${p.brand ? p.brand + ' - ' : ''}${p.desc ? 'Model:' + (p.desc.length > 25 ? p.desc.substring(0,25) : p.desc) : 'No description'}</span>
                        </div>
                    </div>
                </td>
                <td style="font-weight:600; color:#475569; font-size:0.85rem;">${p.sku}</td>
                <td style="color:#475569; font-size:0.85rem;">${p.category || 'General'}</td>
                <td style="color:#475569; font-size:0.85rem;">Rs. ${Number(p.cost).toLocaleString()}</td>
                <td style="color:#475569; font-size:0.85rem;">Rs. ${Number(p.sell).toLocaleString()}</td>
                <td style="font-weight:800; color:${stock === 0 ? '#DC2626' : (stock <= min ? '#D97706' : '#1E293B')}; font-size:1.1rem;">${stock}</td>
                <td style="color:#94A3B8; font-weight:600;">${min}</td>
                <td><span class="status-label ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="table-actions" style="display:flex; align-items:center; gap:8px;">
                        <button class="action-btn-circle" onclick="window.editProduct(${p.id})" title="Edit Product"><i class="fas fa-edit"></i></button>
                        <button class="action-btn-circle" onclick="window.viewProductDetails(${p.id})" title="View Details"><i class="fas fa-eye"></i></button>
                        <button class="action-btn-circle" onclick="window.deleteProduct(${p.id})" title="Delete Product"><i class="fas fa-trash"></i></button>
                        ${stock === 0 ? `<button onclick="window.location.href='purchase_orders.html?sku=${p.sku}'" style="background:#6366F1; color:white; border:none; padding:6px 12px; border-radius:20px; font-size:0.7rem; font-weight:700; cursor:pointer; margin-left:5px; white-space:nowrap;">Order Now</button>` : ''}
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

    window.viewProductDetails = (id) => {
        const p = products.find(x => x.id === id);
        if (!p) return;
        
        const body = document.getElementById('viewProductBody');
        body.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:20px;">
                <div style="position:relative;">
                    ${p.image_url 
                        ? `<img src="${p.image_url}" style="width:100%; height:180px; object-fit:cover; border-radius:16px; border:1px solid #E2E8F0; box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">` 
                        : `<div style="width:100%; height:150px; background:#F8FAFC; border-radius:16px; display:flex; align-items:center; justify-content:center; border:2px dashed #E2E8F0;"><i class="fas fa-box" style="font-size:3rem; color:#CBD5E1;"></i></div>`}
                    <div style="position:absolute; bottom:15px; left:15px; background:rgba(255,255,255,0.9); padding:5px 12px; border-radius:8px; font-size:0.75rem; font-weight:800; color:#4F46E5; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">${p.category || 'GENERAL'}</div>
                </div>
                <div>
                    <h2 style="margin:0; color:#1E293B; font-size:1.5rem;">${p.name}</h2>
                    <p style="color:#94A3B8; font-size:0.9rem; margin-top:4px;">Product SKU: <span style="color:#475569; font-weight:700;">${p.sku}</span></p>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; background:#F8FAFC; padding:20px; border-radius:16px;">
                    <div><label style="font-size:0.65rem; color:#94A3B8; text-transform:uppercase; font-weight:800; display:block; margin-bottom:4px;">Brand / Supplier</label><div style="font-weight:700; color:#1E293B;">${p.brand || 'No Brand'}</div></div>
                    <div><label style="font-size:0.65rem; color:#94A3B8; text-transform:uppercase; font-weight:800; display:block; margin-bottom:4px;">Unit of Measure</label><div style="font-weight:700; color:#1E293B;">${p.unit || 'pcs'}</div></div>
                    <div><label style="font-size:0.65rem; color:#94A3B8; text-transform:uppercase; font-weight:800; display:block; margin-bottom:4px;">Available Stock</label><div style="font-weight:700; color:${p.stock <= p.min ? '#D97706' : '#1E293B'}; font-size:1.1rem;">${p.stock}</div></div>
                    <div><label style="font-size:0.65rem; color:#94A3B8; text-transform:uppercase; font-weight:800; display:block; margin-bottom:4px;">Minimum Stock</label><div style="font-weight:700; color:#1E293B;">${p.min}</div></div>
                    <div><label style="font-size:0.65rem; color:#94A3B8; text-transform:uppercase; font-weight:800; display:block; margin-bottom:4px;">Cost Price</label><div style="font-weight:700; color:#475569;">Rs. ${Number(p.cost).toLocaleString()}</div></div>
                    <div><label style="font-size:0.65rem; color:#94A3B8; text-transform:uppercase; font-weight:800; display:block; margin-bottom:4px;">Selling Price</label><div style="font-weight:700; color:#4F46E5;">Rs. ${Number(p.sell).toLocaleString()}</div></div>
                </div>
                <div style="padding:0 5px;">
                    <label style="font-size:0.65rem; color:#94A3B8; text-transform:uppercase; font-weight:800; display:block; margin-bottom:8px;">Description</label>
                    <p style="margin:0; font-size:0.95rem; color:#475569; line-height:1.6;">${p.desc || 'No additional description provided for this product.'}</p>
                </div>
            </div>
        `;
        document.getElementById('viewProductModal').classList.add('show');
    };

    window.closeViewModal = () => {
        document.getElementById('viewProductModal').classList.remove('show');
    };

    window.closeDeleteModal = () => {
        document.getElementById('deleteConfirmModal').classList.remove('show');
    };

    window.deleteProduct = (id) => {
        const modal = document.getElementById('deleteConfirmModal');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        
        modal.classList.add('show');
        confirmBtn.textContent = 'Okay, Delete';
        confirmBtn.disabled = false;
        
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        
        newBtn.onclick = async () => {
            // Live Update: Optimistically remove from UI
            const productIdx = products.findIndex(p => p.id === id);
            if (productIdx > -1) {
                products.splice(productIdx, 1);
                updateUI(); // Refresh table and stats immediately
            }
            
            // Close modal instantly
            modal.classList.remove('show');

            try {
                // Silent background delete
                await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
                // We don't need to refresh again if we already spliced, 
                // but a silent fetchData() ensures we are in sync with any other changes.
                fetchData(); 
            } catch (err) {
                console.error('Silent deletion error:', err);
                // If it really failed, we might want to fetch again to bring it back
                fetchData();
            }
        };
    };

    window.closeDeleteModal = () => {
        document.getElementById('deleteConfirmModal').classList.remove('show');
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
                showToast('Save failed: ' + res.error, 'error');
            }
        } catch (err) {
            console.error('Save error:', err);
            showToast('Connection error. Could not save product.', 'error');
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
                showToast('Stock adjusted successfully', 'success');
                adjustmentModal.classList.remove('show');
                adjustmentForm.reset();
                fetchData();
            } else {
                const res = await resp.json();
                // Diagram explicitly mentions "Show Insufficient stock Error"
                if (res.error && res.error.includes('Insufficient stock')) {
                    showToast('Error: ' + res.error, 'error');
                } else {
                    showToast('Adjustment failed: ' + (res.error || 'Check your inputs'), 'error');
                }
            }
        } catch (err) {
            console.error('Adjustment error:', err);
            showToast('Connection error.', 'error');
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
            if (products.length === 0) return showToast('No data to export.', 'error');

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
