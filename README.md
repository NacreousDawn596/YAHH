# YAHH — Yet Another HumHub

YAHH is a modern, self-hosted social collaboration platform inspired by [HumHub](https://www.humhub.com/).  
It is built with **ReactJS**, **ExpressJS**, and **MariaDB**, offering a clean, customizable, and scalable experience.  
You can run YAHH either on **NixOS** using `shell.nix` or via **Docker Compose**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/Status-Under%20Development-yellow)
![Frontend](https://img.shields.io/badge/Frontend-ReactJS-61DAFB?logo=react&logoColor=white)
![Backend](https://img.shields.io/badge/Backend-ExpressJS-000000?logo=express&logoColor=white)
![Database](https://img.shields.io/badge/Database-MariaDB-003545?logo=mariadb&logoColor=white)
![DevEnv](https://img.shields.io/badge/DevEnv-NixOS-5277C3?logo=nixos&logoColor=white)
![Deployment](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)
![Made with Bun](https://img.shields.io/badge/Runtime-Bun-black?logo=bun&logoColor=white)
![Chat](https://img.shields.io/badge/Real%20Time-Messaging-ff69b4)
![Contributions welcome](https://img.shields.io/badge/Contributions-Welcome-brightgreen)
![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red)
![Issues](https://img.shields.io/github/issues/NacreousDawn596/YAHH)
![Pull Requests](https://img.shields.io/github/issues-pr/NacreousDawn596/YAHH)
![Stars](https://img.shields.io/github/stars/NacreousDawn596/YAHH?style=social)



## ✨ Features

### 📝 Posts & Spaces

- Share posts with **spaces as hashtags**.
- Tagged spaces automatically show posts to members.
- Spaces can be **public** or **private** (threads/forums).
- Posts and spaces support **file & media uploads**.

### 📅 Calendar

- Create and manage events.
- Tag members, make events **public** or **private**.
- Full event visibility in spaces.

### 💬 Real-Time Messaging

- Individual and group chats.
- Supports file & media sharing.
- Instant delivery with WebSocket technology.

### 🎨 User Experience

- Adjustable **font size**, **theme** (Light/Dark/System), and notification settings.
- Fully editable **profile page**.
- Visit other users' profiles by clicking their name/avatar.

### 🛠 Administration

- Full-featured **Admin Panel**:
  - Track users, posts, spaces, messages, events — _everything_.
  - Ban, kick, add, or remove users.
  - Manage content, spaces, and events.

---

## 📂 Project Structure

```bash
.
├── backend               # ExpressJS API & server logic
│   ├── config
│   ├── middleware
│   ├── routes
│   ├── uploads           # File/media uploads
│   └── server.js
├── database              # MariaDB data & init scripts
│   ├── init.sql
│   ├── start_mysql.sh
│   └── stop_mysql.sh
├── frontend              # ReactJS client
│   ├── public
│   └── src
├── docker-compose.yml    # Docker Compose configuration
├── shell.nix             # NixOS development environment
└── uploads               # Global uploads folder
```

## 🚀 Installation

### Option 1 — Using Docker Compose

```bash
git clone https://github.com/NacreousDawn596/YAHH.git
cd YAHH
docker-compose up --build
```

> This will start:

- **Frontend (ReactJS)**
- **Backend (ExpressJS API)**
- **MariaDB (Database)**

> Access the app at:

- **Frontend: http://localhost:3000**
- **Backend API: http://localhost:3310**

### Option 2 — Using NixOS (`shell.nix`)

```bash
git clone https://github.com/NacreousDawn596/YAHH.git
cd YAHH
nix-shell
```

**Inside the shell:**

```bash
# Start MariaDB
cd database
./start_mysql.sh

# Start backend
cd backend
bun install
bun start

# Start frontend
cd frontend
bun install
bun start
```

## ⚙ Configuration

![Tech Stack](https://img.shields.io/badge/Frontend-ReactJS-61DAFB?logo=react)
![Backend](https://img.shields.io/badge/Backend-ExpressJS-000000?logo=express)
![Database](https://img.shields.io/badge/Database-MariaDB-003545?logo=mariadb)
![Environment](https://img.shields.io/badge/DevEnv-NixOS-5277C3?logo=nixos)
![Deployment](https://img.shields.io/badge/Dockerized-Yes-2496ED?logo=docker)


> Backend configuration: `backend/config`
- **Database initialization script: `database/init.sql`**
- **Uploads path:**
- - **Backend: `backend/uploads`**
- - **Global: `uploads`**

> You can adjust `.env` or config files for:
- **Database credentials**
- **JWT secret**
- **Port numbers**
- **File upload limits**

## 📜 License
This project is licensed under the MIT License — see the LICENSE file for details.

## 💡 About
YAHH — *Yet Another HumHub* — is designed for communities, workspaces, and teams that want an open-source, self-hosted alternative to commercial collaboration tools.
Flexible enough for small groups, scalable enough for large organizations.

---

<!-- [![Kamal's github activity graph](https://github-readme-activity-graph.vercel.app/graph?username=NacreousDawn596&theme=react-dark)](https://github.com/NacreousDawn596/YAHH) -->

[![Star History Chart](https://api.star-history.com/svg?repos=NacreousDawn596/YAHH&type=Date)](https://star-history.com/#NacreousDawn596/YAHH&Date)

![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
