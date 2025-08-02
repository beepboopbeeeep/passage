# Passage - V2Ray Management Panel

Passage is a powerful management panel for V2Ray configurations running on Cloudflare Workers.

## Features

- User management (VLESS, VMESS, Trojan, Shadowsocks)
- Inbound management
- Traffic statistics
- Multi-language support (English/Persian)
- Dark/Light theme
- Responsive design

## Installation

1. Deploy the `worker.js` file to Cloudflare Workers
2. Set up a KV namespace and bind it as `PASSAGE_KV` in your worker
3. Deploy the frontend files (index.html, dashboard.html, css/, js/) to any static hosting

## Usage

1. Open the login page (index.html)
2. Enter your Cloudflare Worker URL
3. Use default credentials: admin / admin
4. Change password after first login

## Default Credentials

- Username: admin
- Password: admin

Make sure to change these after first login for security reasons.

## Technologies Used

- HTML5/CSS3
- Vanilla JavaScript (no frameworks)
- Cloudflare Workers
- Cloudflare KV

## Security Notes

- Default credentials are admin/admin - change them immediately after first login
- Tokens expire after 24 hours
- All communication should happen over HTTPS

## API Endpoints

- `POST /api/login` - User authentication
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `PUT /api/users/{id}` - Update a user
- `DELETE /api/users/{id}` - Delete a user
- `GET /api/inbounds` - Get all inbounds
- `POST /api/inbounds` - Create a new inbound
- `PUT /api/inbounds/{id}` - Update an inbound
- `DELETE /api/inbounds/{id}` - Delete an inbound
- `GET /api/stats` - Get statistics
- `GET /api/config/{id}` - Get user configuration
- `PUT /api/settings` - Update settings

## License

MIT