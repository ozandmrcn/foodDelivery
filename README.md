# foodDelivery

Welcome to the **foodDelivery** project! A scalable microservice backend for food ordering and delivery, built with **Node.js**, **Express**, **TypeScript**, and **RabbitMQ**. This system serves as the core engine for a food delivery application, handling everything from user authentication and restaurant management to order processing and real-time courier delivery tracking across independent microservices.

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Bullseye.png" alt="Bullseye" width="25" height="25" /> Project Overview

foodDelivery enables users to:

- **User Registration & Login:** Secure authentication with **JWT** access/refresh tokens stored in httpOnly cookies and password hashing via **bcrypt**.
- **Restaurant & Menu Management:** Full CRUD operations for restaurants and menu items with role-based access for owners and admins.
- **Order Processing:** End-to-end order lifecycle from placement to delivery, with server-side total calculation and status tracking.
- **Event-Driven Delivery:** Loose-coupled courier assignment and tracking powered by a **RabbitMQ** topic exchange between the Order and Delivery services.
- **Role-Based Access Control:** Granular permissions enforced at the middleware level across four roles (customer, restaurant_owner, courier, admin).

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png" alt="Rocket" width="25" height="25" /> Features

- **Microservice Architecture:** Five independent services (Gateway, Auth, Restaurant, Order, Delivery), each with its own MongoDB database.
- **API Gateway:** A single entry point using **express-http-proxy** that routes requests to the correct internal service.
- **Event-Driven Communication:** A **RabbitMQ** topic exchange decouples order creation (`order.created`) from delivery assignment.
- **Secure Authentication:** **JWT**-based flows with short-lived access tokens and long-lived refresh tokens stored in httpOnly cookies.
- **Runtime Validation:** **Zod** schemas validate request bodies while keeping TypeScript types in sync.
- **Security & Performance:** **Helmet** security headers, **CORS** protection, and per-service rate limiting.
- **Type Safety:** Built entirely with **TypeScript** under strict mode for better maintainability.

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Hammer%20and%20Wrench.png" alt="Hammer and Wrench" width="25" height="25" /> Technologies Used

- **Node.js** (Runtime Environment)
- **Express.js** (Web Framework)
- **MongoDB & Mongoose** (Database & ODM)
- **TypeScript** (Language)
- **RabbitMQ & amqplib** (Message Broker)
- **JSON Web Token (JWT)** (Authentication)
- **Bcrypt** (Password Hashing)
- **Zod** (Runtime Validation)
- **express-http-proxy** (API Gateway Proxy)
- **express-rate-limit** (Rate Limiting)
- **Helmet** (Security Headers)
- **Cookie-Parser** (Cookie Handling)
- **CORS** (Cross-Origin Requests)
- **Morgan** (Request Logging)

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Desktop%20Computer.png" alt="Desktop Computer" width="25" height="25" /> Setup & Installation

To run the project locally, follow these steps:

```bash
# Clone the repository
git clone https://github.com/ozandmrcn/foodDelivery.git

# Navigate to the project folder
cd foodDelivery

# Install dependencies for each service
cd gateway && npm install && cd ..
cd auth && npm install && cd ..
cd restaurant && npm install && cd ..
cd order && npm install && cd ..
cd delivery && npm install && cd ..

# Start the services (run each in its own terminal)
cd gateway && npm run dev   # API Gateway    -> port 3000
cd auth && npm run dev      # Auth Service   -> port 3001
cd delivery && npm run dev  # Delivery       -> port 3002
cd order && npm run dev     # Order Service  -> port 3003
cd restaurant && npm run dev # Restaurant    -> port 3004
```

### <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Gear.png" alt="Gear" width="25" height="25" /> Environment Variables (.env Setup)

Create a `.env` file in each service directory. An annotated reference template is provided in the root `.env.example` file:

```env
# ─── Gateway ───
PORT=3000
AUTH_SERVICE_URL=http://localhost:3001
DELIVERY_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
RESTAURANTS_SERVICE_URL=http://localhost:3004

# ─── Auth Service ───
PORT=3001
MONGODB_URI=mongodb://localhost:27017/food_delivery_auth
JWT_SECRET=your_super_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQ=100

# ─── Delivery Service ───
PORT=3002
MONGODB_URI=mongodb://localhost:27017/food_delivery_delivery
NODE_ENV=development

# ─── Order Service ───
PORT=3003
MONGODB_URI=mongodb://localhost:27017/food_delivery_order
RABBITMQ_URL=amqp://localhost:5672

# ─── Restaurant Service ───
PORT=3004
MONGODB_URI=mongodb://localhost:27017/food_delivery_restaurant
```

> ⚠️ **Note:** A running **MongoDB** instance and a running **RabbitMQ** server are required for the services to start correctly.
>
> 💡 **Tip:** This project follows the database-per-service pattern — each service connects to its own MongoDB database, and the port numbers above must match the service URLs configured in the gateway's `.env`.

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/E-Mail.png" alt="E-Mail" width="25" height="25" /> Contact

For any questions or feedback, feel free to contact:  
**Ozan Demircan** – ozandmrcn47@gmail.com