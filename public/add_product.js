document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
    const form = document.getElementById('addProductForm');
    const genSkuBtn = document.getElementById('genSku');
    const skuInput = document.getElementById('sku');
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');

    // Preview Elements
    const costInput = document.getElementById('cost');
    const sellInput = document.getElementById('sell');
    const stockInput = document.getElementById('stock');
    const prevStock = document.getElementById('prevStock');
    const prevValue = document.getElementById('prevValue');
    const prevProfit = document.getElementById('prevProfit');

    // Auto-generate SKU
    genSkuBtn.addEventListener('click', () => {
        const random = Math.floor(1000 + Math.random() * 9000);
        skuInput.value = `SKU-${random}`;
        updatePreview();
    });

    // Image Upload Handling
    imageUploadArea.addEventListener('click', () => imageInput.click());
    
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
                uploadPlaceholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // Real-time Preview Calculation
    const updatePreview = () => {
        const cost = parseFloat(costInput.value) || 0;
        const sell = parseFloat(sellInput.value) || 0;
        const stock = parseInt(stockInput.value) || 0;

        prevStock.textContent = `${stock} units`;
        
        const totalValue = cost * stock;
        prevValue.textContent = `Rs ${totalValue.toLocaleString()}`;

        const profitPerUnit = sell - cost;
        const totalProfit = profitPerUnit * stock;
        const profitMargin = sell > 0 ? ((profitPerUnit / sell) * 100).toFixed(1) : 0;

        prevProfit.innerHTML = `Rs ${totalProfit.toLocaleString()} (${profitMargin}%)`;
    };

    [costInput, sellInput, stockInput].forEach(el => {
        el.addEventListener('input', updatePreview);
    });

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const productData = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${API_BASE}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            const result = await response.json();
            if (response.ok) {
                // Calculate stock value and profit
                const cost = parseFloat(productData.cost) || 0;
                const sell = parseFloat(productData.sell) || 0;
                const stock = parseInt(productData.stock) || 0;
                const totalValue = cost * stock;
                const profitPerUnit = sell - cost;
                const totalProfit = profitPerUnit * stock;
                const margin = sell > 0 ? ((profitPerUnit / sell) * 100).toFixed(1) : 0;
                
                const params = new URLSearchParams({
                    name: productData.name,
                    sku: productData.sku,
                    category: productData.category || 'General',
                    cost: cost,
                    sell: sell,
                    stock: stock,
                    totalValue: totalValue,
                    totalProfit: totalProfit,
                    margin: margin
                });
                
                window.location.href = `product_success.html?${params.toString()}`;
            } else {
                alert('Error adding product: ' + result.error);
            }
        } catch (err) {
            console.error('Submission error:', err);
            alert('Failed to connect to server.');
        }
    });
});
