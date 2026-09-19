# 💼 Freelance Marketplace Platform

A full-stack freelance marketplace web application where freelancers can publish services (gigs), clients can browse and order services, and both users can track order progress through role-based dashboards.

## 🚀 Live Demo

Add your deployed Render URL here:

https://your-project.onrender.com

---

## 📌 Project Overview

The Freelance Marketplace Platform provides a simplified environment similar to popular freelance platforms.

The application supports two main user roles:

- Freelancer
- Client

Freelancers can create and manage service listings, while clients can browse services, place orders, and track project progress.

The system also implements JWT authentication, role-based authorization, SQLite relational data modeling, and an order lifecycle.

---

## ✨ Features

### 🔐 Authentication

- User registration
- User login
- JWT-based authentication
- Password hashing using bcrypt
- Authentication token stored in browser localStorage
- Protected API endpoints

### 👨‍💻 Freelancer Features

- Freelancer registration/login
- Create freelance gigs
- Set service price
- Set delivery time
- Add service category
- Add service description
- Add service image
- View freelancer dashboard
- Track orders
- Track completed projects
- View earnings
- Update order status
- Cancel eligible orders

### 👤 Client Features

- Client registration/login
- Browse freelance services
- Search services
- Filter by category
- Filter by price
- View freelancer information
- Place orders
- Submit project requirements
- Track order status
- Accept delivered work
- Cancel eligible orders
- View spending statistics

### 📦 Order Workflow

Orders follow a controlled lifecycle:

```text
Pending
   ↓
In Progress
   ↓
Delivered
   ↓
Completed
```

Orders can also be cancelled when permitted.

The server validates order status transitions to prevent unauthorized workflow changes.


## 🛠️ Technology Stack
1. Frontend
- HTML5
- CSS3
- JavaScript
- Font Awesome

2. Backend
- Node.js
- Express.js

3. Database
- SQLite

4. Authentication
- JSON Web Tokens (JWT)
- bcryptjs

5. Development Tools
- VS Code
- Git
- GitHub
- npm


## 📁 Project Structure
freelance-marketplace-platform/
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── server.js
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
└── marketplace.db

marketplace.db is generated automatically when the application starts.


## ⚙️ Installation
1. Clone the repository
git clone https://github.com/YOUR_USERNAME/freelance-marketplace-platform.git

2. Enter the project directory
cd freelance-marketplace-platform

3. Install dependencies
npm install

4. Start the server
npm start

The application will run on:

http://localhost:3000


## 🔒 Security and Authorization
The application implements:

1. JWT authentication
2. Password hashing
3. Role-based authorization
4. Protected API routes
5. Server-side ownership validation
6. Freelancer ownership checks
7. Client/freelancer permission separation
8. Controlled order status transitions

For example, a freelancer cannot modify another freelancer's gig.

Similarly, a user cannot modify an order unless they are the associated client or freelancer.


## 🗃️ Database Design
The application uses three primary relational tables.

### Users
users
├── id
├── name
├── email
├── password
├── role
└── created_at

### Gigs
gigs
├── id
├── freelancer_id
├── title
├── description
├── category
├── price
├── delivery_days
├── image
└── created_at

### Orders
orders
├── id
├── gig_id
├── client_id
├── freelancer_id
├── price
├── status
├── requirements
├── created_at
└── updated_at

### Relationships:
User
 │
 ├── Freelancer ────< Gigs
 │                       │
 │                       └────< Orders
 │
 └── Client ────────────< Orders


## 🎯 Learning Outcomes
This project demonstrates practical experience with:

1. Full-stack web development
2. REST API design
3. Relational database modeling
4. JWT authentication
5. Password hashing
6. Role-based authorization
7. CRUD operations
8. Order workflow management
9. Frontend/backend integration
10. API security
11. Deployment configuration


## 👨‍💻 Author
Abhinav Upadhyay