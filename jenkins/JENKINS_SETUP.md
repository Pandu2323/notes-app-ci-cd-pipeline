# Jenkins Pipeline Setup Guide
# File: jenkins/JENKINS_SETUP.md

## Overview

This document guides you through configuring Jenkins on Windows to auto-trigger
the CI/CD pipeline whenever you push code to GitHub.

---

## Step 1 — Install Jenkins on Windows

### Download & Install
1. Go to https://www.jenkins.io/download/
2. Download **Jenkins LTS** (.msi Windows installer)
3. Run the installer — default port is **8080**
4. During setup, choose **"Install suggested plugins"**
5. Create your admin user

### Access Jenkins
Open browser → http://localhost:8080

---

## Step 2 — Install Required Plugins

Go to: Manage Jenkins → Plugins → Available plugins

Search and install these:
- ✅ **GitHub Integration Plugin** (for webhooks)
- ✅ **GitHub Plugin**
- ✅ **AnsiColor** (colored console output)
- ✅ **Pipeline** (usually pre-installed)
- ✅ **Git Plugin** (usually pre-installed)

After installing → restart Jenkins.

---

## Step 3 — Configure Jenkins to Use WSL / Git Bash

Jenkins on Windows needs to run bash scripts. Configure the shell:

1. Go to: **Manage Jenkins → Configure System**
2. Scroll to **"Shell"** section
3. Set **Shell executable** to:
   ```
   C:\Windows\System32\wsl.exe
   ```
   Or if using Git Bash:
   ```
   C:\Program Files\Git\bin\bash.exe
   ```
4. Save

---

## Step 4 — Create Jenkins Pipeline Job

1. Click **"New Item"** on Jenkins dashboard
2. Enter name: `notes-app-cicd`
3. Select **"Pipeline"** → click OK
4. In the configuration:

### General Tab
- ✅ Check **"GitHub project"**
- Project URL: `https://github.com/YOUR_USERNAME/notes-app-cicd`

### Build Triggers Tab
- ✅ Check **"GitHub hook trigger for GITScm polling"**

### Pipeline Tab
- **Definition**: Pipeline script from SCM
- **SCM**: Git
- **Repository URL**: `https://github.com/YOUR_USERNAME/notes-app-cicd.git`
- **Branch Specifier**: `*/main`
- **Script Path**: `Jenkinsfile`

5. Click **Save**

---

## Step 5 — Expose Jenkins to the Internet (for GitHub Webhooks)

GitHub needs to reach your local Jenkins. Use **ngrok**:

### Install ngrok
1. Go to https://ngrok.com → Sign up (free)
2. Download ngrok for Windows
3. Extract and run in Command Prompt:

```cmd
ngrok http 8080
```

4. You'll get a URL like: `https://abc123.ngrok-free.app`

⚠️ **Keep ngrok running** while you're developing. The URL changes each restart
unless you have a paid plan (use ngrok config for static domains).

---

## Step 6 — Configure GitHub Webhook

1. Go to your GitHub repo → **Settings** → **Webhooks**
2. Click **"Add webhook"**
3. Fill in:
   - **Payload URL**: `https://abc123.ngrok-free.app/github-webhook/`
     (note the trailing slash — it's required!)
   - **Content type**: `application/json`
   - **Secret**: (leave blank or add one)
   - **Events**: Select **"Just the push event"**
4. Click **"Add webhook"**
5. GitHub will send a ping — you should see a green ✅ checkmark

---

## Step 7 — Test the Full Pipeline

```bash
# In WSL terminal, from your project folder:
echo "# test" >> README.md
git add .
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

Within seconds, Jenkins should:
1. Receive the GitHub webhook
2. Start a new build automatically
3. Run all pipeline stages
4. Deploy the updated app

---

## Step 8 — View Build Status

- Jenkins Dashboard: http://localhost:8080
- Your job: http://localhost:8080/job/notes-app-cicd/
- Latest build: http://localhost:8080/job/notes-app-cicd/lastBuild/console

---

## Troubleshooting

### Jenkins doesn't trigger on push
- Check ngrok is running and URL is correct in webhook
- Go to GitHub webhook → Recent Deliveries → check for errors
- Check Jenkins → Manage Jenkins → System Log for errors

### Docker not found in Jenkins
- Run Jenkins from WSL, or configure Jenkins to use WSL for shell
- Or add Docker to Windows PATH

### "Permission denied" on bash scripts
```bash
chmod +x scripts/*.sh
git add scripts/
git commit -m "fix: make scripts executable"
git push
```

### Port already in use
```bash
# In WSL:
docker compose down
# Then retry deploy
```

---

## Architecture Diagram

```
┌─────────────┐    push     ┌─────────────┐
│   VS Code   │ ─────────► │   GitHub    │
│  (Windows)  │             │    Repo     │
└─────────────┘             └──────┬──────┘
                                   │ webhook
                                   ▼
┌──────────────────────────────────────────┐
│          Windows Machine                 │
│                                          │
│   ┌──────────┐    trigger  ┌──────────┐ │
│   │  ngrok   │ ─────────► │ Jenkins  │ │
│   └──────────┘             └────┬─────┘ │
│                                 │        │
│                    ┌────────────┼──────┐ │
│                    │    WSL     │      │ │
│                    │            ▼      │ │
│                    │  ┌──────────────┐ │ │
│                    │  │    Docker    │ │ │
│                    │  │  ┌────────┐  │ │ │
│                    │  │  │Frontend│  │ │ │
│                    │  │  │:3000   │  │ │ │
│                    │  │  ├────────┤  │ │ │
│                    │  │  │Backend │  │ │ │
│                    │  │  │:5000   │  │ │ │
│                    │  │  └────────┘  │ │ │
│                    │  └──────────────┘ │ │
│                    └───────────────────┘ │
└──────────────────────────────────────────┘
```
