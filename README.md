# Researcher - V2Ray Config Collector

A modern web application for collecting, organizing, and serving V2Ray configurations from Telegram channels.

## Features

- Collect V2Ray configurations from multiple Telegram channels
- Organize configs by date, protocol, and IP location
- Display latest 10 configurations on main page
- Dedicated pages for today's configs, active configs, and donated configs
- Multi-language support (English/Persian) with proper RTL support
- Modern dark theme with custom color palette (#C7A46C, #1E1E1EFF)
- QR code generation for configs
- Subscription links with Base64 encoded configs
- Automatic cleanup of inactive configs
- User-donated configs that appear in subscription links
- Protocol and location-based filtering

## Deployment

### Frontend (GitHub Pages)

1. Create a new GitHub repository
2. Upload all HTML, CSS, and JS files to the repository
3. Enable GitHub Pages in repository settings
4. Set the source to GitHub Actions or master branch

### Backend (Cloudflare Worker)

1. Create a new Cloudflare Worker
2. Copy the contents of [worker.js](file:///C:/Users/M.R.co/Desktop/New%20folder%20(2)/worker.js) to the worker
3. Create a KV namespace named `COLLECT`
4. Bind the KV namespace to the worker with the variable name `COLLECT`
5. Deploy the worker

### Setting up scheduled tasks

To automatically clean up inactive configs and avoid rate limiting:

1. In your Cloudflare Worker, set up a cron trigger to call the `/api/cleanup` endpoint every 3 hours
2. This will remove configs that haven't been checked in over 24 hours

## API Endpoints

- `GET /api/configs` - Get latest 10 configs
- `GET /api/today` - Get today's configs
- `GET /api/active` - Get active configs (checked within last 3 hours)
- `GET /api/donated` - Get donated configs
- `GET /api/protocol/:protocol` - Get configs filtered by protocol
- `GET /api/location/:location` - Get active configs filtered by location
- `GET /api/sub/:date` - Get subscription link for configs collected on a specific date
- `GET /api/sub/:date/active` - Get subscription link for active configs
- `GET /api/sub/donated` - Get subscription link for donated configs
- `GET /api/configs/count` - Get config counts (total, today, active, donated)
- `POST /api/collect` - Collect new configs from Telegram channels (to be implemented)
- `POST /api/donate` - Mark a config as donated
- `POST /api/cleanup` - Clean up inactive configs

## Configuration Format

Configs stored in KV should follow this structure:

```json
{
  "id": "unique-config-id",
  "raw": "vmess://config-data...",
  "remark": "Flag | Date | @Channel",
  "flag": "🇮🇷",
  "ipLocation": "Iran",
  "protocol": "vmess",
  "collectedAt": "2023-01-01T00:00:00.000Z",
  "lastChecked": "2023-01-01T00:00:00.000Z",
  "donated": false
}
```

## Customization

### Colors

The application uses a dark theme with the following color palette:
- Primary: #C7A46C (Golden)
- Background: #1E1E1EFF (Dark)
- Cards: #2d2d2d (Darker)
- Text: #f0f0f0 (Light)

### Fonts

The application uses responsive fonts:
- English: Oswald (from Google Fonts)
- Persian: Vazirmatn (from Google Fonts)

### Logo

Place your logo as `logo.png` in the root directory.

## Usage

1. Main page shows latest 10 configurations and overall stats
2. "Today's Configs" page shows all configs collected today
3. "Active Configs" page shows only currently working configs
4. "Donated Configs" page shows configs donated by users
5. Each config can be:
   - Copied to clipboard
   - Viewed as QR code
   - Viewed in detail modal
   - Donated to appear in subscription links
6. Subscription links are available for:
   - All active configs
   - Date-specific configs
   - Donated configs

## Multi-language Support

The application supports both English and Persian with proper RTL layout. Toggle between languages using the button in the header.

## Future Improvements

- Implement actual QR code generation
- Add Telegram bot integration for automatic config collection
- Add statistics charts
- Implement config testing functionality
- Add search and filtering capabilities
- Implement user accounts for tracking donations