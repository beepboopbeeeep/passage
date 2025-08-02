# API Documentation

## Authentication

All API endpoints (except `/api/login`) require authentication using Bearer tokens.

To obtain a token, send a POST request to `/api/login`:

```
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}
```

The response will include a token:

```json
{
  "success": true,
  "token": "your-auth-token"
}
```

Include this token in subsequent requests:

```
Authorization: Bearer your-auth-token
```

## Endpoints

### User Management

#### Get all users
```
GET /api/users
```

Response:
```json
{
  "users": [
    {
      "id": "user-id",
      "username": "example",
      "protocol": "vless",
      "uuid": "user-uuid",
      "status": "active",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create a user
```
POST /api/users
Content-Type: application/json

{
  "username": "newuser",
  "protocol": "vless",
  "status": "active"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "generated-id",
    "username": "newuser",
    "protocol": "vless",
    "uuid": "generated-uuid",
    "status": "active",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### Delete a user
```
DELETE /api/users/{userId}
```

Response:
```json
{
  "success": true
}
```

### Inbound Management

#### Get all inbounds
```
GET /api/inbounds
```

Response:
```json
{
  "inbounds": [
    {
      "id": "inbound-id",
      "inbound_name": "Main Inbound",
      "protocol": "vless",
      "port": "443",
      "network": "ws",
      "security": "tls",
      "status": "فعال",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create an inbound
```
POST /api/inbounds
Content-Type: application/json

{
  "inbound_name": "New Inbound",
  "protocol": "vless",
  "port": "443",
  "network": "ws",
  "security": "tls"
}
```

Response:
```json
{
  "success": true,
  "inbound": {
    "id": "generated-id",
    "inbound_name": "New Inbound",
    "protocol": "vless",
    "port": "443",
    "network": "ws",
    "security": "tls",
    "status": "فعال",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### Delete an inbound
```
DELETE /api/inbounds/{inboundId}
```

Response:
```json
{
  "success": true
}
```

### Statistics

#### Get statistics
```
GET /api/stats
```

Response:
```json
{
  "totalClients": 10,
  "activeInbounds": 2,
  "activeConnections": 5
}
```

### Settings

#### Update settings
```
PUT /api/settings
Content-Type: application/json

{
  "password": "newpassword"
}
```

Response:
```json
{
  "success": true
}
```

### Subscription

#### Get user subscription
```
GET /api/subscription/{userId}
```

Response (plain text):
```
vmess://...
```

#### Get subscription link
```
GET /sub/{userId}
```

Response (Base64 encoded):
```
dm1lc3M6Ly9leGFtcGxl...
```

### Proxy Configuration

#### Create a proxy configuration
```
POST /api/proxy-config/{configId}
Content-Type: application/json

{
  "host": "original-domain.com",
  "port": "443",
  "path": "/config",
  "protocol": "vless",
  "uuid": "user-uuid"
}
```

Response:
```json
{
  "success": true
}
```

#### Use proxy configuration
```
GET /proxy/{host}:{port}/{path...}
```

This endpoint proxies requests to the original server through the Worker, hiding the original server's address.