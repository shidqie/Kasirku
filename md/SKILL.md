---
name: soft-pos-ui
description: Build a point-of-sale (POS / kasir) web app in the soft, rounded, airy dashboard style (white cards on light-gray canvas, pill buttons, big tight numbers, green/red badges), including the full set of pop-ups (product options, payment with cash/QRIS/card, receipt, customer picker, clear-cart confirm, order-history drawer, toasts). Make sure to use this skill whenever the user asks for a POS, kasir, cashier screen, checkout, order-taking UI, cafe/restaurant/retail sales terminal, or asks to add modals, pop-ups, dialogs, drawers or toasts to such a screen, even if they only say "bikin kasir", "prototype POS", "pop up pembayaran", or "samakan seperti dashboard referensi". Builds on the soft-dashboard-ui look; if that skill is also available, read it first for the full token set.
---

# Soft POS UI

A cashier app that looks like the reference dashboard (calm, rounded, low-contrast, one green accent) and behaves like a real POS: pick menu, customize, build an order, pay, get a receipt. Deliver it as **one self-contained HTML file** with inline CSS and JS (no frameworks required) so it can be previewed or published directly.

## Workflow

1. Define CSS variables (tokens below) before any component.
2. Build the layout: logo + header, sidebar, main (stats + menu), cart column.
3. Implement state and logic (cart lines, stock, totals, payment) before polishing UI.
4. Add every pop-up from the **Pop-up catalogue** using the single shared overlay.
5. Add dark mode, responsive rules, focus states, reduced-motion.
6. Run the **Checklist** at the bottom.

## Tokens (same as soft-dashboard-ui)

```css
:root{
 --canvas:#E8E8E9; --shell:#F3F3F3; --card:#FAFAFA; --raised:#FFF; --inset:#F1F1F1;
 --text:#151515; --text2:#6B6B6B; --text3:#A3A3A3; --border:#E6E6E6; --soft:rgba(0,0,0,.04);
 --green:#34C759; --gs:#1FA45B; --gbg:#E8F7EE; --gb:#CDEED9;
 --red:#E5544B; --rbg:#FDECEB; --rb:#F8D4D1; --dark:#2A2A2A; --ondark:#fff;
 --sh-shell:0 40px 80px -20px rgba(0,0,0,.18),0 8px 24px rgba(0,0,0,.06);
 --sh-card:0 1px 0 rgba(255,255,255,.9) inset,0 8px 24px rgba(0,0,0,.04);
 --sh-raised:0 2px 6px rgba(0,0,0,.05),0 12px 28px rgba(0,0,0,.06);
 --sh-nav:0 1px 2px rgba(0,0,0,.06),0 6px 14px rgba(0,0,0,.05);
}
:root[data-theme="dark"]{
 --canvas:#0E0E0F; --shell:#161617; --card:#1C1C1E; --raised:#262628; --inset:#19191B;
 --text:#F5F5F5; --text2:#A0A0A5; --text3:#6A6A70; --border:#2C2C2F; --soft:rgba(255,255,255,.05);
 --gbg:rgba(52,199,89,.14); --gb:rgba(52,199,89,.25); --rbg:rgba(229,84,75,.14); --rb:rgba(229,84,75,.25);
 --dark:#F5F5F5; --ondark:#151515; --sh-card:none; --sh-raised:0 8px 24px rgba(0,0,0,.4); --sh-nav:0 4px 12px rgba(0,0,0,.4);
}
```

- Font: Inter (Google Fonts, weights 400/500/600) with `system-ui` fallback. Hierarchy comes from weight and size: 600 titles, 500 numbers (letter-spacing -.04em), 400 gray meta.
- Radii: shell 44px, cards 40px, inset 36px, tiles 28px, product cards 28px, thumbs 20px, everything interactive pill (999px).
- Shadows only on raised/active elements; no hard dark borders. Green = positive/active/in stock; red = negative/out of stock. Nothing else is colored.
- Theme: set `data-theme` from `prefers-color-scheme` at load; offer a moon/sun toggle at the bottom of the sidebar.

## Layout

```
shell (max-width ~1400, radius 44, padding 28, grid gap 24)
 columns: 230px | 1fr | 390px
 areas:  "logo head head"
         "side main cart"
```
- **Header**: page title (34px/600), search pill (filters the menu live), dark "Pesanan baru" pill, avatar circle.
- **Sidebar**: Kasir, Menu, Pesanan, Pelanggan, Laporan, Pengaturan. Active item = white raised pill. "Pesanan" opens the history drawer instead of switching page. Theme toggle at the bottom.
- **Main**: (1) stat card: inset panel with 3 tiles (Penjualan hari ini, Transaksi, Rata-rata struk), first tile raised, each with a green/red delta badge and "vs kemarin". (2) Menu card: category pills (Semua + categories; active = dark pill) and a responsive grid `repeat(auto-fill,minmax(190px,1fr))`.
- **Cart column**: one tall card with title "Pesanan" + order number, customer chip, scrollable lines, summary, total, "Bayar" button.
- Breakpoints: ≤1200px cart moves under main; ≤820px single column, sidebar becomes a wrapping row, hide theme toggle, stats stack.
- Add `viewport-fit=cover` and safe-area padding on `:root`.

## Components

**Product card**: borderless until hover (then raised white + shadow). Image area `aspect-ratio:1.25`, rounded 20px, gradient background with emoji (or real image) and a top-right stock badge (green "Stok 24" / red "Habis"). Name 17px/600, price in `--text2`. Out-of-stock cards are `disabled` at 50% opacity.

**Cart line**: 52px rounded thumb, name (600) + small gray line with chosen options and price, pill quantity stepper (inset background, round − / + buttons).

**Summary**: Subtotal, Diskon with 0/5/10% mini pills (active = dark), PPN 11%, then Total as a 38px/500 tight number. "Bayar" = 60px dark pill, disabled (35% opacity) when the cart is empty.

**Customer chip**: full-width outlined pill above the lines: icon, "Pelanggan", current name right-aligned in 600.

**Badges**: pill, 1px border, `up` (green) / `dn` (red) variants, e.g. "Lunas", "Dipilih", stock.

**Toast**: dark pill, bottom-center, fades up for ~2.2s, `role="status"`.

## Pop-up catalogue

Use **one** overlay element and **one** dialog container. A `show(html, variant)` function fills the container and a `close()` hides it. Variants: default (centered text, e.g. receipt/confirm), `l` (left-aligned form modal), `dw` (right-side drawer, full height). Overlay: `rgba(0,0,0,.35)`, centered grid, `role="dialog" aria-modal="true"`. Close on backdrop click, on Esc, and via a round × button (44px, outlined) in the header of every form modal. Dialog: `--card` background, radius 36px, padding 28-34px, width `min(420px,100%)`, `max-height:calc(100vh - 40px)` with scroll. Use event delegation with `data-act` attributes.

1. **Product options** (click a product card). Header: thumb, name, price, ×. Option groups depend on category, shown as chip rows (active chip = dark pill, extra cost in label like "Besar (+Rp4.000)"):
   - Kopi: Ukuran, Gula, Tambahan (Extra shot)
   - Minuman: Ukuran, Es
   - Makanan: Level pedas, Tambahan (Telur, Keju)
   - Dessert: Tambahan (Es krim, Saus cokelat)
   Then a "Catatan" text input, a quantity stepper (1..remaining stock), and a dark button "Tambah, Rp…" showing the live line total.
2. **Payment** (Bayar). Header with order number and customer, big total, tabs Tunai / QRIS / Kartu.
   - Tunai: "Uang diterima" numeric input, quick chips (Uang pas, 50.000, 100.000, 200.000), live "Kembalian" (shows "Kurang Rp…" if short). Confirm button disabled until received ≥ total. Update the change text on `input` without re-rendering, so focus is not lost.
   - QRIS: generated QR (SVG rects on white, 25×25 grid, three finder squares) in a white rounded box, caption "Pindai dengan aplikasi e-wallet atau mobile banking." Button "Simulasikan pembayaran diterima".
   - Kartu: green check-style circle with a card icon, caption about tapping or swiping on the EDC, same simulate button.
   Footer: ghost "Batal" + dark confirm.
3. **Receipt** (after payment, or from history). Green circle with check, "Pembayaran berhasil", total at 44px, meta rows (Nomor pesanan, Pelanggan, Metode, Item, Kembalian if cash, Poin didapat = floor(total/1000) for named customers), buttons "Cetak struk" (toast only) and "Selesai".
4. **Customer picker** (customer chip). Rows with gradient initial avatar, name, points text, "Dipilih" badge on current. First row is "Umum / Tanpa akun". Reset to Umum after each sale.
5. **Clear-order confirm** ("Pesanan baru" when cart is not empty). Title "Kosongkan pesanan?", one explanatory line, buttons "Batal" / "Ya, kosongkan". If the cart is already empty, just toast "Pesanan sudah kosong".
6. **Order history drawer** (sidebar "Pesanan"). Right-side drawer: title, "Hari ini, N transaksi", rows with `#no`, customer, time, item count, method, total, green "Lunas" badge. Clicking a row opens its receipt. New sales are prepended in real time.
7. **Toasts** for: item added, customer chosen, order cleared, receipt sent to printer, insufficient stock.

## State and logic

```js
cart = [{k, i, sel:[…], note, q, pr}]   // k = productIndex|selections|note; same key merges quantities
left(i) = stock[i] - sum(q of cart lines with product i)   // drives badges, disabled cards, stepper limits
calc(): subtotal = Σ pr*q; disc = subtotal*discPct/100; tax = (subtotal-disc)*0.11; total = subtotal-disc+tax
finish(): subtract stock, push order to history, update sales/tx/avg stats, increment order number,
          clear cart, reset customer to Umum, open receipt
```
- Line price `pr` = base price + selected option surcharges.
- Round the payable total to whole rupiah; compare cash received against the rounded total.
- Stats tiles update after each sale: sales as `Rp3,25jt`, transactions as integer, average as `Rp68k`.
- Seed 2-3 past orders in history so the drawer is never empty.

## Content and locale

- Language: Indonesian UI copy, sentence case, active voice ("Tambah", "Bayar", "Simpan"). Name each action consistently across the flow ("Bayar" leads to "Pembayaran berhasil").
- Currency: `Rp` + `toLocaleString('id-ID')` (dots as thousands separators), no decimals.
- Empty states say what to do: "Keranjang kosong. Pilih menu untuk memulai pesanan." / "Menu tidak ditemukan. Coba kata kunci lain."
- Use realistic cafe sample data: Kopi Susu Aren Rp22.000, Americano Rp18.000, Latte Rp25.000, Matcha Latte Rp28.000, Es Teh Manis Rp8.000, Croissant Rp24.000, Nasi Goreng Kampung Rp32.000, Mie Goreng Rp28.000, Brownies Rp18.000, Cheesecake Rp30.000. Include at least one out-of-stock item.
- Adapt categories, options, and names if the user names a different business (retail, resto, barbershop); keep the same structure.

## Technical constraints

- Single `.html` file; JS in a plain `<script>`; no `localStorage` required (keep state in memory; wrap any storage in try/catch if added).
- External resources limited to Google Fonts and CDN scripts from cdnjs/jsDelivr with pinned versions; no remote images (use gradients, emoji or inline SVG, or `data:` URIs).
- Typographic punctuation in visible text (’ “ ”); straight quotes only in code.
- Accessibility: visible focus ring (`2px solid var(--green)`), `aria-label` on icon-only buttons, `role="dialog"`, Esc to close, focus the primary button when the receipt opens, respect `prefers-reduced-motion`.

## Checklist

- [ ] Look matches the soft dashboard (gray canvas, rounded shell, white raised active states, pill controls, one green accent)
- [ ] Menu filters by category and search; out-of-stock items are disabled with a red badge
- [ ] Product click opens options pop-up; identical choices merge, different choices make separate lines
- [ ] Cart totals include discount and 11% PPN; Bayar disabled when empty
- [ ] Payment pop-up works for Tunai (change calculation), QRIS and Kartu
- [ ] Receipt shows after payment; stock, stats and history update
- [ ] Customer picker, clear-order confirm, history drawer and toasts all work
- [ ] Esc, backdrop click and × close pop-ups; focus states visible
- [ ] Dark mode and mobile layout both work; no stray hard-coded colors
