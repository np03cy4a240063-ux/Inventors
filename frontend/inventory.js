document.addEventListener('DOMContentLoaded', () => {
    let products = JSON.parse(localStorage.getItem('reinvent_products')) || [];

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderInventory(e.target.value.toLowerCase());
        });
    }

    renderInventory();
    
    window.addItem = function() {
        const name = prompt('Enter Product Name:');
        if (!name) return;
        const stock = parseInt(prompt('Enter Stock Quantity:')) || 0;
        const min = parseInt(prompt('Enter Min Threshold:')) || 10;
        
        products.push({
            id: Date.now(),
            name: name,
            sku: 'SKU-' + Math.floor(Math.random() * 1000),
            category: 'General',
            stock: stock,
            min: min,
            movement: 0,
            icon: 'fa-box',
            lastSold: 'Never'
        });
        saveAndRender();
    };

    window.sellItem = function(id) {
        const prod = products.find(p => p.id === id);
        if (prod && prod.stock > 0) {
            prod.stock -= 1;
            prod.movement += 1;
            prod.lastSold = 'Just now';
            saveAndRender();
        } else {
            alert('Out of stock!');
        }
    };

    window.addStock = function(id) {
        const amount = parseInt(prompt('Amount to add:'));
        if (amount) {
            const prod = products.find(p => p.id === id);
            if (prod) {
                prod.stock += amount;
                saveAndRender();
            }
        }
    };

    window.removeItem = function(id) {
        if(confirm('Are you sure you want to remove this item?')) {
            products = products.filter(p => p.id !== id);
            saveAndRender();
        }
    };

    function saveAndRender() {
        localStorage.setItem('reinvent_products', JSON.stringify(products));
        renderInventory(searchInput ? searchInput.value.toLowerCase() : '');
    }

    function renderInventory(filter = '') {
        const tbody = document.querySelector('#mainInventoryTable tbody');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        const filtered = products.filter(p => p.name.toLowerCase().includes(filter) || p.sku.toLowerCase().includes(filter));
        
        filtered.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.id}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.sku}</td>
                <td>${p.category}</td>
                <td><strong>${p.stock}</strong></td>
                <td>${p.min}</td>
                <td>
                    <button class="outline-btn" style="padding: 4px 8px; font-size: 0.75rem;" onclick="sellItem(${p.id})">Sell 1</button>
                    <button class="outline-btn" style="padding: 4px 8px; font-size: 0.75rem; color: #2ECC71;" onclick="addStock(${p.id})">Restock</button>
                    <button class="outline-btn" style="padding: 4px 8px; font-size: 0.75rem; color: #E74C3C;" onclick="removeItem(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
});
