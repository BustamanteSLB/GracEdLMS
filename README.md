# GracEd LMS

**GracEd LMS** (GracEd Learning Management System) is a cross-platform learning management app for Grace Community Christian School. It helps administrators, teachers, and students manage school life in one place such as subjects, activities, quizzes, grades, announcements, calendars, and user accounts.

This app is built with **Expo SDK 54** (React Native + Expo Router) and runs on **web** and **Android**. The API is a Node.js / Express backend with MongoDB, plus Firebase for file storage. Both the backend and the web frontend are deployed in DigitalOcean with a [Cloudflare domain](https://www.cloudflare.com/domains/).

---

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (comes with Node.js)
- [Expo Go](https://expo.dev/go) on a physical Android device, **or** an Android emulator
- A MongoDB database (local or hosted, e.g. MongoDB Atlas)
- Firebase project credentials (for uploads / storage)
- OpenAI API key (used for quiz-related AI features)
- (Optional) A [Cloudflare domain](https://www.cloudflare.com/domains/). This comes with a free SSL certificate plus a few security features as well

---

## Environment setup

You need two `.env` files: one at the **project root** (Expo app) and one in **`backend/`** (API).

### 1. Root `.env` (Expo app)

Create a file named `.env` in the project root (same folder as `package.json` and `app.json`):

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000/api/v1
```

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Base URL of the backend API (no trailing slash). |

**Tips**

- Use 2 terminals - one for frontend and then backend. For example, `C:\Users\shaws\Documents\GitHub\GracEdLMS>` on the frontend terminal and `C:\Users\shaws\Documents\GitHub\GracEdLMS\backend>` for the backend terminal
- For web on the same machine: `http://localhost:5000/api/v1` often works.
- For Expo Go / a physical device: use your computer’s IPv4 LAN IP (e.g. `http://192.168.1.10:5000/api/v1`), not `localhost`.
- After changing `.env`, restart Expo (`node server` on backend terminal and `npx expo start` on frontend terminal again). Expo only picks up `EXPO_PUBLIC_*` variables at startup.
- Domain example (production only): `https://api.domain.xyz/api/v1`

### 2. Backend `.env`

Create a file named `.env` inside the `backend` folder:

```env
# Server
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=30d

# For quiz AI features
OPENAI_API_KEY=your_openai_api_key

# Firebase Admin / Storage
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
FIREBASE_BUCKET=your_bucket.appspot.com
```

| Variable | Description |
| --- | --- |
| `PORT` | Port the API listens on (default `5000`). |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | Secret used to sign auth tokens. |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `30d`). |
| `OPENAI_API_KEY` | Optional; required only for AI quiz features. |
| `FIREBASE_*` | Firebase service account + storage bucket settings for uploads. |

**Note:** Keep `FIREBASE_PRIVATE_KEY` in quotes and preserve `\n` newlines as shown when copying from the Firebase JSON key.

Do **not** commit real `.env` files or secrets to git.

---

## Install dependencies

From the project root:

```bash
npm install
```

Then install backend dependencies:

```bash
cd backend
npm install
cd ..
```

---

## Run the backend

In one terminal:

```bash
cd backend
node server
```

You should see the API listening on the port from `backend/.env` (usually `5000`). Visiting `http://localhost:5000` should return a short “GracEdLMS Backend API is running!” message.

---

## Run the Expo app

In a second terminal, from the project root:

```bash
npx expo start
```

Then choose how to open the app:

| Option | How |
| --- | --- |
| **Android device** | Install Expo Go, scan the QR code (same Wi‑Fi as your computer). |
| **Android emulator** | Press `a` in the Expo terminal (Android Studio emulator running). |
| **Web** | Press `w`, or run `npm run web`. |

Make sure `EXPO_PUBLIC_API_URL` points at a reachable backend before signing in.

### Test Accounts:
1. Admin:
   ```
   Username/User ID: admin
   Password: root_admin
   ```
2. Teacher:
   ```
   Username/User ID: teacher1
   Password: Teacher1
   ```
3. Student:
   ```
   Username/User ID: 2025-154651
   Password: Chowchow_25
   ```

## (Optional) Upload backend to a separate Github repository to deploy in DigitalOcean
1. Create a new GitHub repository just for your backend files (e.g., [GracEdLMS-backend](https://github.com/BustamanteSLB/GracEdLMS-backend)), then upload all your backend files there. Do NOT (under any circumstances) upload your .env because this contains all the sensitive keys.
2. If you are a student/teacher, make sure you have already applied for GitHub Education and have it's perks.
3. If you are a student/teacher, sign up to DigitalOcean with your GitHub account that has GitHub Education perks active. This will give you free $200 credits for DigitalOcean that will allow you to deploy both web frontend and the backend for free for a year (if your credits aren't all used up).
4. In DigitalOcean, click `Create App` then select the backend repository (e.g., [GracEdLMS-backend](https://github.com/BustamanteSLB/GracEdLMS-backend)).
5. Select the branch you want to deploy (usually main) then make sure auto-deploy is checked.
6. Make sure the details are correct first. Choose the optimal datacenter region, and edit the deployment settings and HTTP routes if necessary. Add all the keys and values from your backend's .env file here as well.
7. Click `Create App`. It will take time to deploy, and once it is finished, you can visit the live app.
8. (Optional) Assuming your frontend's primary domain is already configured (e.g., `domain.xyz`), your backend should be the subdomain (e.g., `api.domain.xyz`). Configure it here after your backend has successfully been deployed and is currently live.

## (Optional) Create `dist` folder to upload web frontend as static site in DigitalOcean
1. Go to your frontend terminal and copy-paste `npx expo export --platform web` then enter.
2. Wait for the dist folder to appear. Generating static HTML, CSS, and JS web assets for your web application may take a while.
3. Once it's done, look at your project directory for a `dist` folder.
4. Create a new GitHub repository just for your web static files (e.g., [GracEdLMS-web](https://github.com/BustamanteSLB/GracEdLMS-web)), then upload all your web static files there.
5. If you are a student/teacher, make sure you have already applied for GitHub Education and have it's perks.
6. If you are a student/teacher, sign up to DigitalOcean with your GitHub account that has GitHub Education perks active. This will give you free $200 credits for DigitalOcean that will allow you to deploy both web frontend and the backend for free for a year (if your credits aren't all used up).
7. In DigitalOcean, click `Create App` then select the static web repository (e.g., [GracEdLMS-web](https://github.com/BustamanteSLB/GracEdLMS-web)).
8. Select the branch you want to deploy (usually main) then make sure auto-deploy is checked.
9. Deploying the static web is usually free. Make sure the details are correct first. Choose the optimal datacenter region, and edit the deployment settings and HTTP routes if necessary. For the environmental variables and App-Level Environment Variables, add the `EXPO_PUBLIC_API_URL` key and the value should be the link for your backend + /api/v1 (e.g., `https://api.domain.xyz/api/v1`)
10. Click `Create App`. It will take time to deploy, and once it is finished, you can visit the live app.
11. (Optional) If you have a domain (e.g., domain.xyz), configure it here after the app has already been deployed and is live.

## (Optional) Generate .apk file for mobile
1. You need to be logged in on [Expo Go](https://expo.dev/go) first. If you don't have an account yet, create one.
2. After that, go to your frontend terminal and run:
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. Generate the build configuration file `eas.json` by running `eas build:configure`. Select Android when prompted.
4. Once you open `eas.json`, you will see something similar to this:
   ```bash
   {
     "cli": {
       "version": ">= 16.24.1",
       "appVersionSource": "remote"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal"
       },
       "production": {
         "autoIncrement": true,
   	  "android": {
           "buildType": "apk"
         }
       }
     },
     "submit": {
       "production": {}
     }
   }
   ```
   You want your apk to be production. So copy how this `eas.json` looks (except for the version), then save.
5. Build your apk. Since we want the production build, run: `eas build -p android`. If prompted to generate an Android Keystore or Application ID, press Y or Enter to allow Expo to manage it automatically
6. Once the build finishes, the terminal will provide a QR code and a download link to fetch your completed .apk file.
7. Go to your `Expo Go Dashboard > Select Project (GracEdLMS) > Environmental Variables`. Click `Add variables` then add the all the keys from the .env files on your root folder and backend folder or import both of those files for easy adding. For `EXPO_PUBLIC_API_URL`, the value should be your backend domain's link (e.g., `https://api.domain.xyz/api/v1`)

## Run out of DigitalOcean credits?
After a year or less, your free $200 credits have either run out or expired. At this point, you have to pay for the credits yourself. In the `Accounts > Billing` section of your DigitalOcean account, you will start to see the estimated balance of your site for the current month. Payment options are PayPal, Crypto, AliPay, and credit/debit cards only (Mastercard or VISA).

If you don't pay in time, your deployed website (frontend and backend) will stop working altogether. If this happens, you have to pay then redeploy both sites again.

---

## Project layout (short)

```
GracEdLMS3/
├── app/                 # Expo Router screens & entry
├── screens/             # Role-based UI (Admin / Teacher / Student)
├── components/          # Shared UI
├── contexts/            # Auth, dark mode, etc.
├── backend/             # Express API
│   ├── .env             # Backend environment (create this)
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   └── models/
├── .env                 # Expo environment (create this)
├── app.json
└── package.json
```

---

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native](https://reactnative.dev/)
- [Build APKs for Android Emulators and devices](https://docs.expo.dev/build-reference/apk/)
