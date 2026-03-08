# Nexpend.

## 📌 What is Nexpend?

Nexpend is a modern, responsive, and secure personal finance application designed to help users track their daily expenses and manage their budgets efficiently. It provides an intuitive dashboard for monitoring spending habits, visualizing financial data, and keeping an organized ledger of incoming and outgoing transactions.

**Why Nexpend?**
Managing personal finances can often feel overwhelming. Nexpend was built to simplify this process by offering a clean, distraction-free UI with powerful analytics. Whether you are tracking daily coffee purchases, managing monthly bills, or keeping an eye on your disposable income, Nexpend gives you full control and visibility over your money.

---

## 🚀 Key Features

*   **🔒 Secure Authentication:** Email & Password and one-click Google Sign-In via Firebase Auth. Includes rate-limiting and session timeouts to protect user data.
*   **📊 Interactive Analytics:** Visual charts (via Chart.js) breaking down expenses by category, trends over time, and monthly overviews.
*   **💰 Expense & Income Logging:** Easily add, edit, and categorize transactions.
*   **🌍 Multi-Currency Support:** View your expenses converted into major global currencies using live FX rates (via Frankfurter API).
*   **⚙️ Admin Panel:** Dedicated dashboard for administrators to view system logs and manage user accounts securely.
*   **📱 Fully Responsive:** A mobile-first design built with Tailwind CSS that looks beautiful on phones, tablets, and desktops.

---

## 🛠️ Technology Stack

*   **Frontend:** React 19, Vite, Tailwind CSS v4, React Router v6
*   **Backend & Database:** Firebase (Authentication, Cloud Firestore)
*   **Data Visualization:** Chart.js, react-chartjs-2
*   **Deployment:** Ready for Vercel / Netlify

---

## 📂 Project Structure

```text
nexpend-app/
│
├── .env.local             # Environment variables (API keys)
├── vercel.json            # Vercel deployment configuration (SPA routing)
├── firestore.rules        # Database security and schema validation rules
├── firebase.json          # Firebase hosting/deployment config
│
├── public/                # Static assets
└── src/
    ├── App.jsx            # Main Application Router
    ├── main.jsx           # React Entry Point
    │
    ├── components/        # Reusable UI components (Navbar, Loader, Route Guards)
    ├── context/           # React Context Providers (AuthContext)
    ├── firebase/          # Firebase initialization and Firestore service functions
    ├── hooks/             # Custom React hooks (Rate limiting, FX fetching)
    ├── pages/             # Application Views (Dashboard, Login, Signup, Analytics)
    ├── services/          # External API integrations (Exchange Rates)
    └── utils/             # Helper functions (Validation, Formatting, System Logging)
```

---

## ⚙️ Local Setup Guide

Follow these steps to run Nexpend locally on your machine.

**1. Clone the repository**
```bash
git clone https://github.com/your-username/nexpend-app.git
cd nexpend-app/expense-tracker
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure Environment Variables**
Create a `.env.local` file in the root directory and add your Firebase project credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**4. Start the Development Server**
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🌐 Deployment Guide (Vercel)

This project is configured out-of-the-box for deployment on Vercel.

1. Create an account on [Vercel](https://vercel.com) and link your GitHub account.
2. Click **"Add New..." > "Project"** and import the Nexpend repository.
3. In the Vercel project configuration settings, expand the **"Environment Variables"** section.
4. Copy and paste all the Firebase variables from your `.env.local` file directly into Vercel.
5. Click **Deploy**.

*Note: The included `vercel.json` file ensures that React Router works perfectly without returning 404 errors on page refreshes.*

---

## 📜 License
This project is open-source and available under the MIT License.
