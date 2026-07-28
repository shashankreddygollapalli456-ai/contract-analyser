# Legal AI Platform Deployment Guide

This guide provides step-by-step instructions on deploying the Legal AI Contract Analysis Platform to production cloud environments (**Render** or **Railway**) using **MongoDB Atlas** as the database and bypassing RabbitMQ by utilizing the built-in **REST Fallback Mode**.

---

## Prerequisites

Before beginning, ensure you have:
1. A **GitHub** account containing a fork/copy of this repository.
2. A **MongoDB Atlas** account (free tier works perfectly).
3. A **Gemini API Key** from Google AI Studio.
4. (Optional) Gmail credentials or another SMTP config if you want the platform to send verification OTPs to actual emails.

---

## Step 1: Set Up MongoDB Atlas

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create** to spin up a new database cluster (select the M0 Free Tier).
3. Under **Security -> Database Access**, create a user (e.g., username: `dbuser`, password: `yoursecurepassword`). Make sure the user has **Read and write to any database** role.
4. Under **Security -> Network Access**, click **Add IP Address** and choose **Allow Access from Anywhere** (`0.0.0.0/0`) so that your Render/Railway containers can connect to it.
5. In your cluster dashboard, click **Connect -> Drivers**, and copy your **connection string**. It will look like this:
   ```
   mongodb+srv://dbuser:<password>@cluster0.xxxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
   *Replace `<password>` with the password you created for the database user.*

---

## Step 2: Deploy to Render (Option A)

Render supports deploying a multi-service workspace with the blueprint file (`render.yaml`) provided in the repository.

1. Go to [Render](https://render.com/) and sign in.
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` file and ask you to confirm details.
5. Input the following **environment variables** when prompted:
   - **`MONGO_URI`**: The connection string from **Step 1** (e.g., `mongodb+srv://dbuser:password@cluster0.../project`).
   - **`GEMINI_API_KEY`**: Your Google Gemini API Key.
   - **`SMTP_USER`** / **`SMTP_PASS`** / **`SMTP_FROM`**: Your SMTP provider credentials (if configured).
6. Click **Apply**.
7. Render will build and deploy:
   - The React frontend (public Web Service on port `80`)
   - The API Gateway (public Web Service on port `4000`)
   - All 8 Node.js backend microservices and the 1 Python microservice (as private services inside Render's internal network).

---

## Step 3: Deploy to Railway (Option B)

Railway is highly recommended for containerized microservices.

1. Go to [Railway](https://railway.app/) and sign in.
2. Click **New Project** and select **Deploy from GitHub repo**.
3. Choose your repository.
4. Instead of deploying just one service, you can deploy each service container individually or let Railway import the configuration:
   - Add a service for the **Gateway**: set build path context to `.`, Dockerfile to `gateway/Dockerfile`, and expose port `4000`.
   - Add a service for the **Frontend**: set build path context to `.`, Dockerfile to `frontend/Dockerfile`, and expose port `80`.
   - Add separate services for other backend directories (`services/auth-service`, `services/contract-service`, etc.), specifying their respective Dockerfiles.
5. Set the shared variables in your project settings:
   - **`MONGO_URI`**
   - **`GEMINI_API_KEY`**
   - **`JWT_SECRET`** and **`JWT_REFRESH_SECRET`**
6. Railway's private networking will automatically resolve the hostnames (e.g. `http://gateway:4000` or `http://audit-service:4008`), keeping communications secure and fast.

---

## Verification after Deployment

1. Find the public URL generated for your **Frontend** service (e.g. `https://frontend-production.up.railway.app` or `https://legal-ai-frontend.onrender.com`).
2. Open the page in your browser.
3. Register a new user account, log in, and verify that the dashboard loads.
4. Upload a sample contract PDF/text file. The frontend will communicate via `/api/*` to the proxy, which forwards requests to the Gateway, executing your analytical pipelines securely via REST fallback directly to the AI service.
