# Deliverance Church International, Kizito — Website

The official website of **Deliverance Church International, Kizito (DCI Kizito)** in Nairobi, Kenya.
It is a welcoming online home for the church, where visitors can learn about the church, watch
sermons, find events, connect with groups, and give securely by M-Pesa.

## What the website offers

- **Home, About and Contact:** a monthly-themed hero slider, the church's story, service times,
  and a contact form protected by a human check.
- **Sermons and Events:** a sermon library with video, audio and notes, plus a calendar of
  upcoming services and activities.
- **Online giving:** tithes, offerings and special funds in Kenya Shillings, paid with an
  M-Pesa prompt on the donor's phone.
- **Groups:** pages for Men, Women, Youth & Teens, the 20 Fellowship groups and Penniel Housing,
  where leaders can post their own events and updates.
- **Member portal:** members can register and log in to see their giving history, groups and
  upcoming events.
- **Newsletters and Articles:** teachings and news that church leaders can publish.
- **Helpful extras:** a chat assistant that points visitors to the right page, a WhatsApp button,
  a cookie notice, and Terms and Privacy pages.

## Built with

- **Frontend:** plain HTML, CSS and JavaScript (no build step), hosted on GitHub Pages.
- **Backend:** Node.js, Express and MySQL, with M-Pesa (Safaricom Daraja) for payments.
- **Security:** a human check before any payment or form, rate limiting, secure logins, and
  protected payment callbacks.

Church staff can update monthly content (hero slides, theme, verse of the month) by editing a
single file, `frontend/js/content.js`, with no coding needed.

---

## Project structure

| Folder | What it is | Where it runs |
|---|---|---|
| `frontend/` | Static site (HTML/CSS/JS) | GitHub Pages |
| `backend/` | Node.js + Express + MySQL API (M-Pesa giving, login, forms) | Render / Railway / any Node host |

## How M-Pesa giving works (STK push)

1. Donor picks fund + amount, enters name, email and phone, and **ticks “I’m not a robot”** (a signed proof-of-work puzzle solved in the browser).
2. `POST /api/donations/mpesa/stkpush` — the server **verifies the human check first** (signature, expiry, single-use). Only then does it validate the form, rate-limit (6 requests / 10 min per IP, 3 per phone), save a *pending* donation and call Safaricom Daraja.
3. The donor gets the M-Pesa prompt and enters their PIN.
4. Safaricom calls `POST /api/donations/mpesa/callback/<MPESA_CALLBACK_SECRET>`; the server checks the amount, marks the donation `completed` (only a *pending* row can change, so replays do nothing) and logs it to Google Sheets (optional).
5. Meanwhile the browser polls `GET /api/donations/mpesa/status/:checkoutRequestId` every 3 s and shows success / failure. If the callback is slow or lost, the server asks Safaricom directly (STK Query).

## 1. Run the backend locally

```bash
cd backend
cp .env.example .env          # then fill it in (see comments inside)
npm install
mysql -u root -p < schema.sql # creates database dic_kizito + tables
npm run dev                   # http://localhost:4000/api/health
```

Generate each secret (`JWT_SECRET`, `CAPTCHA_SECRET`, `MPESA_CALLBACK_SECRET`) with:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Safaricom Daraja setup
1. Create an app at <https://developer.safaricom.co.ke> → copy **Consumer Key / Secret** into `.env`.
2. **Sandbox testing:** shortcode `174379` and the sandbox passkey shown on the portal (*APIs → M-Pesa Express → Simulate*).
3. Safaricom must reach your callback over **public HTTPS**. Locally use a tunnel (e.g. `ngrok http 4000`) and set
   `MPESA_CALLBACK_URL=https://<tunnel>/api/donations/mpesa/callback/<MPESA_CALLBACK_SECRET>`.
4. **Go live:** apply for Go-Live on Daraja with the church’s Paybill/Till, then set `MPESA_BASE_URL=https://api.safaricom.co.ke` plus the live shortcode and passkey.
   For a **Till** number change `TransactionType` to `CustomerBuyGoodsOnline` in `backend/services/mpesa.js`.

## 2. Deploy

**Backend (Render example):** New → Web Service → connect this repo → Root Directory `backend` → Build `npm install` → Start `npm start` →
add every variable from `.env.example` (`NODE_ENV=production`, `CORS_ORIGIN=https://<you>.github.io`). In production the server **refuses to start** if secrets are missing/weak. Use a managed MySQL (set `DB_SSL=true`) and run `schema.sql` on it.

**Frontend (GitHub Pages):** push to `main`, then Repo → Settings → Pages → Source: **GitHub Actions**. Edit `frontend/js/content.js`:
```js
apiBase: 'https://your-backend-domain.com/api',
```
Commit — the site redeploys in about a minute.

## 3. Test checklist
- [ ] `GET /api/health` returns `ok`
- [ ] Giving without ticking the box → “Please tick I’m not a robot”
- [ ] Tick box + sandbox number `254708374149` → STK prompt → success message with receipt
- [ ] Cancel the prompt → “You cancelled…” and the form stays filled in
- [ ] Row in `donations` goes `pending` → `completed`

## Security notes
- Never commit `.env`. Secrets live only in the host’s environment settings.
- The callback URL contains a secret so random traffic can’t fake a payment.
- Make a member an admin/pastor with SQL: `UPDATE members SET role='admin' WHERE email='you@example.com';`

See `frontend/README.md` for monthly content updates.
