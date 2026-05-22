document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : `http://${window.location.hostname}:5000`;
    const form = document.getElementById('addProductForm');
    const genSkuBtn = document.getElementById('genSku');
    const skuInput = document.getElementById('sku');
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');

    // Stores the base64 image string so it can be sent via JSON
    let selectedImageBase64 = null;

    // Preview Elements
    const costInput = document.getElementById('cost');
    const sellInput = document.getElementById('sell');
    const stockInput = document.getElementById('stock');
    const prevStock = document.getElementById('prevStock');
    const prevValue = document.getElementById('prevValue');
    const prevProfit = document.getElementById('prevProfit');

    // Auto-generate SKU
    if (genSkuBtn) {
        genSkuBtn.addEventListener('click', () => {
            const random = Math.floor(1000 + Math.random() * 9000);
            skuInput.value = `SKU-${random}`;
            updatePreview();
        });
    }

    // Helper: Process and compress an image File object into base64
    function processImageFile(file) {
        const MAX_SIZE_MB = 10; // Allow larger selection, but we will compress it
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            showToast(`Image too large. Max size is ${MAX_SIZE_MB}MB.`, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Compression Logic
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimensions to ensure base64 string isn't massive
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to compressed JPEG (quality 0.7 is great balance)
                selectedImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
                
                imagePreview.src = selectedImageBase64;
                imagePreview.style.display = 'block';
                if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
                
                console.log('Image compressed. Original size ratio saved.');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Image Upload Handling
    if (imageUploadArea && imageInput) {
        // Click to browse
        imageUploadArea.addEventListener('click', (e) => {
            if (e.target !== imageInput) imageInput.click();
        });

        // File input change
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) processImageFile(file);
        });

        // Drag and Drop support
        imageUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUploadArea.style.borderColor = '#6366f1';
            imageUploadArea.style.background = 'rgba(99,102,241,0.05)';
        });
        imageUploadArea.addEventListener('dragleave', () => {
            imageUploadArea.style.borderColor = '';
            imageUploadArea.style.background = '';
        });
        imageUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUploadArea.style.borderColor = '';
            imageUploadArea.style.background = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) processImageFile(file);
        });
    }

    // Real-time Preview Calculation
    const updatePreview = () => {
        if (!costInput || !sellInput || !stockInput) return;
        const cost = parseFloat(costInput.value) || 0;
        const sell = parseFloat(sellInput.value) || 0;
        const stock = parseInt(stockInput.value) || 0;

        if (prevStock) prevStock.textContent = `${stock} units`;
        
        const totalValue = cost * stock;
        if (prevValue) prevValue.textContent = `Rs ${totalValue.toLocaleString()}`;

        const profitPerUnit = sell - cost;
        const totalProfit = profitPerUnit * stock;
        const profitMargin = sell > 0 ? ((profitPerUnit / sell) * 100).toFixed(1) : 0;

        if (prevProfit) prevProfit.innerHTML = `Rs ${totalProfit.toLocaleString()} (${profitMargin}%)`;
    };

    [costInput, sellInput, stockInput].forEach(el => {
        if (el) el.addEventListener('input', updatePreview);
    });

    // Form Submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;

            try {
                // 1. Basic validation
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                // 2. Loading State
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                // 3. Prepare Data — build a plain object (FormData files can't be JSON serialized)
                const productData = {
                    name:        form.querySelector('[name="name"]')?.value.trim(),
                    sku:         form.querySelector('[name="sku"]')?.value.trim(),
                    desc:        form.querySelector('[name="desc"]')?.value.trim(),
                    category:    form.querySelector('[name="category"]')?.value,
                    brand:       form.querySelector('[name="brand"]')?.value.trim(),
                    unit:        form.querySelector('[name="unit"]')?.value,
                    cost:        form.querySelector('[name="cost"]')?.value,
                    sell:        form.querySelector('[name="sell"]')?.value,
                    tax:         form.querySelector('[name="tax"]')?.value,
                    stock:       form.querySelector('[name="stock"]')?.value,
                    reorder_qty: form.querySelector('[name="reorder_qty"]')?.value,
                    location:    form.querySelector('[name="location"]')?.value.trim(),
                    min:         form.querySelector('[name="min"]')?.value,
                    image_url:   selectedImageBase64 || null  // Base64 image included here
                };

                console.log('Sending product data (image included):', { ...productData, image_url: productData.image_url ? '[base64]' : null });

                // 4. API Call
                const response = await fetch(`${API_BASE}/api/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(productData)
                });

                const result = await response.json();

                if (response.ok) {
                    showToast('Product saved successfully!', 'success');
                    
                    // Redirect after a short delay
                    setTimeout(() => {
                        const cost = parseFloat(productData.cost) || 0;
                        const sell = parseFloat(productData.sell) || 0;
                        const stock = parseInt(productData.stock) || 0;
                        const totalValue = cost * stock;
                        const totalProfit = (sell - cost) * stock;
                        const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : 0;

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
                    }, 1000);
                } else {
                    throw new Error(result.error || 'Server rejected the product data');
                }
            } catch (err) {
                console.error('Save Product Error:', err);
                showToast('Error: ' + err.message, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
});
