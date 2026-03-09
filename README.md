# Planning Poker

A simple, fast, and real-time Scrum Planning Poker application designed for remote agile teams to effectively estimate their tasks. This project is a modern clone built to offer essential features with an intuitive, clean interface based on Shadcn UI.

## 🚀 Features

- **Anonymous Authentication**: Join instantly without needing to create an account.
- **Real-time Sync**: Vote, reveal cards, and reset games with instant updates powered by Firebase Firestore.
- **Responsive UI**: Intuitive and clean design ensuring seamless use on both desktop and mobile platforms.
- **Dark Mode**: Built-in dark and light theme toggling using `next-themes` and Tailwind CSS.
- **Instant Invite**: Copy the room URL to your clipboard with a single click and invite teammates.

## 🛠 Tech Stack

- **Frontend Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) (TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix Primitives + Lucide Icons)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Anonymous Auth & Cloud Firestore)
- **Notifications & Modals**: Sonner (Toasts) and Shadcn Dialog

## 📦 Getting Started

### Prerequisites

- Node.js (v20.19.0+ or >=22.12.0)
- A Firebase Project with **Anonymous Authentication** and **Cloud Firestore** enabled.

### 1. Clone the repository

```bash
git clone https://github.com/yunkhngn/planning-pocker.git
cd planning-pocker
```

### 2. Install dependencies

```bash
yarn install
```
*(If you encounter Node version warnings, you may need to use `yarn config set ignore-engines true` temporarily depending on your Vite plugin requirements)*.

### 3. Setup Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication** and turn on the **Anonymous** provider.
3. Enable **Firestore Database** (start in test mode or use the provided rules).
4. Get your Web App Firebase configuration from Project Settings.

### 4. Configure Environment Variables

Create a `.env` file in the root directory and add your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 5. Deploy Firestore Rules

To secure your database, apply the rules defined in `firestore.rules`.
You can copy the contents of `firestore.rules` directly into the Firebase Console -> Firestore -> Rules tab, or use the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

### 6. Run the Development Server

```bash
yarn dev
```
Navigate to `http://localhost:5173` in your browser.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📝 License

This project is licensed under the MIT License.
