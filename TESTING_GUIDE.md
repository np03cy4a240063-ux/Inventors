# ReInvent v2 - Testing Guide

## Quick Start

### 1. Start the Server
```bash
cd /opt/lampp/htdocs/Reinvent/v2/integrated
node server.js
```

Expected output:
```
--- DATABASE POOL INITIALIZED ---
Connected to: reinvent_db_v2
ReInvent v2 running on port 5000
```

### 2. Access the Application
- **URL:** `http://localhost/Reinvent/v2/integrated/public/`
- **Splash Page:** `http://localhost/Reinvent/v2/integrated/public/index.html`

---

## Test Scenarios

### Test 1: OTP Signup Flow ✅

**Steps:**
1. Go to signup page
2. Fill in form:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john@example.com`
   - Company: `Acme Corp`
   - Password: `Test@1234` (must have uppercase + special char)
   - Confirm Password: `Test@1234`
   - Accept Terms checkbox
3. Click "Create Account"
4. **Expected:** OTP modal appears with email displayed
5. Check email for 6-digit OTP (or check server console for fallback)
6. Enter OTP in the 6 boxes
7. Click "Verify & Create Account"
8. **Expected:** Success message → Redirect to login page

**Verify:**
- ✅ OTP modal displays correctly
- ✅ Email is shown in modal
- ✅ Resend button works with 60-second timer
- ✅ Back button returns to signup form
- ✅ Account created in database

---

### Test 2: User Data Isolation ✅

**Steps:**
1. Create User A: `userA@test.com` / `Password@123`
2. Create User B: `userB@test.com` / `Password@123`
3. Login as User A
4. Add Product A: `Widget A` with stock 100
5. Logout
6. Login as User B
7. Check inventory

**Expected:**
- ✅ User B sees empty inventory (no Product A)
- ✅ User B can add their own products
- ✅ User A's data is completely isolated

**Verify via API:**
```bash
# Login as User A
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"userA@test.com","password":"Password@123"}' \
  -c cookies.txt

# Get products (should see only User A's products)
curl http://localhost:5000/api/products -b cookies.txt

# Logout
curl -X POST http://localhost:5000/api/logout -b cookies.txt

# Login as User B
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"userB@test.com","password":"Password@123"}' \
  -c cookies.txt

# Get products (should see only User B's products)
curl http://localhost:5000/api/products -b cookies.txt
```

---

### Test 3: Profile Management ✅

**Steps:**
1. Login with any account
2. Go to Profile page
3. Click "Edit" button
4. Modify fields:
   - First Name: `Jane`
   - Last Name: `Smith`
   - Phone: `555-1234`
   - Company: `Tech Corp`
5. Click "Save Changes"
6. **Expected:** Success toast, form locks, data persists

**Verify:**
- ✅ Edit button toggles form lock/unlock
- ✅ Save button updates database
- ✅ Toast notification appears
- ✅ Data persists on page reload
- ✅ Header updates with new name

---

### Test 4: Password Change ✅

**Steps:**
1. On Profile page, scroll to "Change Password"
2. Fill in:
   - Current Password: `Test@1234`
   - New Password: `NewPass@5678`
   - Confirm: `NewPass@5678`
3. Click "Update Password"
4. **Expected:** Success toast
5. Logout
6. Login with new password: `NewPass@5678`
7. **Expected:** Login successful

**Verify:**
- ✅ Password validation works (requires uppercase + special char)
- ✅ Passwords must match
- ✅ Current password must be correct
- ✅ New password works on next login

---

### Test 5: Password Visibility Toggle ✅

**Steps:**
1. Go to Login page
2. Click eye icon next to password field
3. **Expected:** Password becomes visible (text)
4. Click eye icon again
5. **Expected:** Password hidden (dots)

**Also test on:**
- Signup page (both password fields)
- Profile page (change password section)
- Forgot password page

---

### Test 6: Inventory Management ✅

**Steps:**
1. Login and go to Inventory
2. Click "Add Product"
3. Fill in:
   - Name: `Laptop`
   - SKU: `LAP-001`
   - Category: `Electronics`
   - Cost: `500`
   - Sell: `800`
   - Stock: `50`
   - Min: `10`
4. Click "Add Product"
5. **Expected:** Product appears in list

**Verify:**
- ✅ Product added to database
- ✅ Product appears in inventory list
- ✅ Edit functionality works
- ✅ Delete functionality works
- ✅ Stock adjustments work

---

### Test 7: Sales Order with Stock Deduction ✅

**Steps:**
1. Go to Sales Orders
2. Create new order:
   - Order ID: `SO-001`
   - Customer: `ABC Store`
   - Add product: `Laptop` (qty: 5)
   - Total: `4000`
3. Click "Create Order"
4. **Expected:** Order created, stock reduced from 50 to 45

**Verify:**
- ✅ Stock deducted correctly
- ✅ Low stock alert triggered if stock ≤ min
- ✅ Order appears in list
- ✅ Order items tracked correctly

---

### Test 8: Purchase Order with Stock Addition ✅

**Steps:**
1. Go to Purchase Orders
2. Create new order:
   - Order ID: `PO-001`
   - Supplier: `Tech Supplier`
   - Add product: `Laptop` (qty: 20)
   - Total: `10000`
3. Click "Create Order"
4. **Expected:** Order created, stock increased from 45 to 65

**Verify:**
- ✅ Stock added correctly
- ✅ Order appears in list
- ✅ Order items tracked correctly

---

### Test 9: Analytics Data ✅

**Steps:**
1. Go to Analytics page
2. Check metrics:
   - Revenue (from completed sales)
   - Gross Profit (30% of revenue)
   - Units Sold (count of completed sales)
3. Check Stock Health:
   - Healthy (stock > min)
   - Low (stock ≤ min and > 0)
   - Out of Stock (stock = 0)
4. Check Category Breakdown
5. Check Top Products
6. Check Aging Stock

**Verify:**
- ✅ All metrics calculate correctly
- ✅ Data filters by user
- ✅ Charts display properly
- ✅ No dummy data shown

---

### Test 10: Report Export to PDF ✅

**Steps:**
1. Go to Analytics
2. Click "Export Report"
3. Select date range: "Last 30 days"
4. Select data fields (all checked by default)
5. Click "Create Export"
6. **Expected:** PDF downloads to device

**Verify:**
- ✅ PDF file downloads
- ✅ PDF contains correct data
- ✅ Summary cards show correct totals
- ✅ Tables display all records
- ✅ Success message appears

---

### Test 11: Logout Confirmation ✅

**Steps:**
1. Click user profile button (top right)
2. Go to Profile page
3. Scroll to bottom
4. Click "Log Out" button
5. **Expected:** Custom modal appears asking "Are you sure?"
6. Click "Yes, Log Out"
7. **Expected:** Redirect to splash page

**Verify:**
- ✅ Custom modal appears (not browser confirm)
- ✅ Cancel button works
- ✅ Logout clears session
- ✅ Redirects to index.html
- ✅ Cannot access protected pages after logout

---

### Test 12: Notification Preferences ✅

**Steps:**
1. Go to Profile page
2. Scroll to "Notification Preferences"
3. Toggle "Low Stock Alerts" OFF
4. Toggle "Order Updates" OFF
5. Refresh page
6. **Expected:** Toggles remain OFF

**Verify:**
- ✅ Preferences saved to localStorage
- ✅ Preferences persist on page reload
- ✅ No toast notifications (silent save)

---

## Troubleshooting

### Issue: "Connection refused" on startup
**Solution:**
- Ensure MySQL is running: `sudo /opt/lampp/xampp start`
- Check database exists: `mysql -u root -e "SHOW DATABASES;"`

### Issue: OTP not sending
**Solution:**
- Check `.env` file has valid email credentials
- Check server console for email errors
- OTP will be logged to console as fallback: `[LOCAL DEV FALLBACK] OTP for email@test.com is 123456`

### Issue: "Unauthorized" on API calls
**Solution:**
- Ensure you're logged in
- Check session cookie is being sent
- Clear browser cookies and login again

### Issue: Products not appearing in inventory
**Solution:**
- Verify you're logged in as the correct user
- Check database: `SELECT * FROM products WHERE user_id = 1;`
- Ensure product was added to correct user

### Issue: Stock not updating
**Solution:**
- Check order was created successfully
- Verify product exists and is owned by user
- Check database: `SELECT stock FROM products WHERE id = 1;`

---

## Performance Testing

### Load Test: Create 100 Products
```bash
for i in {1..100}; do
  curl -X POST http://localhost:5000/api/products \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d "{\"name\":\"Product $i\",\"sku\":\"SKU-$i\",\"cost\":100,\"sell\":150,\"stock\":50,\"min\":10}"
done
```

### Load Test: Create 50 Sales Orders
```bash
for i in {1..50}; do
  curl -X POST http://localhost:5000/api/sales_orders \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d "{\"order_id\":\"SO-$i\",\"date\":\"2026-05-21\",\"customer\":\"Customer $i\",\"items\":[{\"product_id\":1,\"quantity\":5,\"unit_price\":150}],\"total\":750,\"status\":\"COMPLETED\"}"
done
```

---

## Database Verification

### Check User Isolation
```sql
-- Check products for User 1
SELECT * FROM products WHERE user_id = 1;

-- Check products for User 2
SELECT * FROM products WHERE user_id = 2;

-- Verify no cross-user data
SELECT DISTINCT user_id FROM products;
```

### Check Order Integrity
```sql
-- Check sales orders with items
SELECT so.*, COUNT(oi.id) as item_count
FROM sales_orders so
LEFT JOIN order_items oi ON so.id = oi.order_db_id AND oi.order_type = 'SALES'
GROUP BY so.id;
```

### Check Stock Adjustments
```sql
-- Check all stock adjustments
SELECT sa.*, p.name, p.stock
FROM stock_adjustments sa
JOIN products p ON sa.product_id = p.id
ORDER BY sa.created_at DESC;
```

---

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No database errors
- ✅ All data properly isolated by user
- ✅ All notifications working
- ✅ All calculations correct
- ✅ PDF export working
- ✅ Session management working
- ✅ No data leaks between users

---

**Last Updated:** May 21, 2026
