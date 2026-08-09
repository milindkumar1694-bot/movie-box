# 🎬 Frame — Private Media & Communication Room

A cinematic media discovery interface combined with an ephemeral private real-time communication room built with Node.js, Express, and Socket.IO.

---

## 🚀 How to Make It Live (Deployment Guide)

To make your application accessible live on the internet, follow the recommended steps below using **Render** (Free & supports WebSockets out-of-the-box) or **Railway**.

---

### Option 1: Deploy on Render.com (Recommended - Free)

1. **Push your code to GitHub / GitLab:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for live deployment"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

2. **Create Web Service on Render:**
   - Log in to [Render.com](https://render.com/).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository.

3. **Configure Settings:**
   - **Name:** `stitch-frame-private-room` (or your preferred name)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

4. **Set Environment Variables:**
   Under **Environment Variables**, add:
   - `ROOM_ACCESS_CODE`: *(e.g., `884920` or any passcode of your choice)*
   - `TELEGRAM_BOT_TOKEN`: *(Optional — for entry notification alerts)*
   - `TELEGRAM_CHAT_ID`: *(Optional — your Telegram user/chat ID)*

5. **Deploy!**
   - Click **Create Web Service**.
   - Render will build and deploy your app. Once deployed, you will get a live URL (e.g. `https://your-app.onrender.com`).

---

### Option 2: Deploy on Railway.app

1. Go to [Railway.app](https://railway.app/) and sign in with GitHub.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your project repository.
4. Go to **Variables** tab and add:
   - `ROOM_ACCESS_CODE`: `your_custom_passcode`
   - `PORT`: `3000`
5. Railway will automatically detect Node.js, install dependencies, run `npm start`, and generate a live public URL.

---

## 🔑 Key Pre-Flight Checklist Before Going Live

| Item | Description | Status |
|---|---|---|
| **Access Code** | Set a custom `ROOM_ACCESS_CODE` in `.env` or production dashboard. | ⚠️ Update default `123456` |
| **HTTPS / SSL** | Managed automatically by Render / Railway (required for WebSockets `wss://`). | ✅ Handled by Host |
| **Telegram Notifications** | Set `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID` if you want instant room alerts. | ℹ️ Optional |
| **Custom Domain** | Add custom domain (e.g., `room.yourdomain.com`) in host settings if needed. | ℹ️ Optional |

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Run locally in dev mode (watch mode)
npm run dev

# App running at http://localhost:3000
```
