# ZipBasket — Quick-commerce website starter

A responsive, Blinkit-inspired **original** neighbourhood grocery storefront with product catalog, search/categories, cart, checkout, COD, UPI intent link, order lookup, admin inventory, order status updates and delivery settings.

## Requirements
- Node.js 18 or newer
- A terminal / command prompt

## Run locally
1. Extract the ZIP.
2. Open a terminal in the `quickcart-local` folder.
3. Copy `.env.example` to `.env`.
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`
4. Edit `.env` and set a strong `ADMIN_PASSWORD`, your store name, city, phone and UPI ID.
5. Start the app: `npm start`
6. Open `http://localhost:3000` in your browser.

No npm packages are required; it uses Node's built-in modules. On first start it creates `data.json` with sample products and settings.

## Admin
Click **Admin** on the website and sign in with the password in `.env`. From there you can add/edit/delete products, manage orders and statuses, and update delivery fees, minimum order and UPI ID.

## Payments — important
- **Cash on Delivery** is implemented as an order payment method.
- **UPI** creates a UPI app intent link if a UPI ID is configured. This is not a payment gateway and the site cannot automatically verify whether the customer paid.
- For production payments, integrate a provider such as Razorpay using server-side order creation, signature verification and webhooks. Never put secret API keys in browser JavaScript.
- Do not mark an UPI order paid until you verify the transaction in your provider/bank records.

## Before going live
This is a functional starter for local testing, not a hardened production service. Before accepting real customers:
- Deploy to a host with HTTPS and persistent storage.
- Replace the simple admin login with secure sessions, rate limiting and password hashing.
- Add address/serviceability validation, delivery staff workflow, privacy policy, terms, refund/cancellation rules and customer support.
- Use a database (e.g. PostgreSQL) and backups instead of the JSON file for concurrent orders.
- Integrate a payment gateway and verify webhooks server-side.
- Confirm product quality, prices, taxes and local delivery operations.
- Configure the delivery area in your operations. The city setting currently changes the display label only; it does not enforce a geographic boundary.

## Project structure
- `server.js` — built-in Node HTTP server and API
- `public/index.html` — storefront and modal markup
- `public/styles.css` — responsive design
- `public/app.js` — storefront/cart/checkout/admin interactions
- `.env.example` — environment variable template
