# MinIO LiteLLM Viewer

**Note**: This was a quick one-off project 100% vibe coded with Claude Code.

A web interface for browsing LiteLLM logs stored in MinIO. Navigate by date, view JSON files with formatting, and bookmark specific logs with URL routing.

<img width="1406" height="929" alt="image" src="https://github.com/user-attachments/assets/e4d0a84d-af7a-4424-a11b-a2e8594453aa" />

## Prerequisites

- Node.js (v14 or higher)
- Access to MinIO server with LiteLLM logs
- MinIO access credentials (read-only recommended)

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd minio-litellm-viewer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your MinIO credentials and bucket information.

4. Start the application:
   ```bash
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Docker

```sh
docker build -t ghcr.io/mrexodia/minio-litellm-viewer .
docker push ghcr.io/mrexodia/minio-litellm-viewer
docker-compose up
```

## Configuration

Create a `.env` file in the project root with the following variables:

```env
BUCKET=http://your-minio-server:9000/bucket-name/
ACCESS_KEY=your-access-key
SECRET_KEY=your-secret-key
PORT=3000
```

### Environment Variables

- `BUCKET`: Full URL to your MinIO bucket containing LiteLLM logs
- `ACCESS_KEY`: MinIO access key (read-only permissions recommended)
- `SECRET_KEY`: MinIO secret key
- `PORT`: Port for the web server (optional, defaults to 3000)

## Usage

### Navigation

1. **Date Buckets**: Start by selecting a date bucket from the left sidebar
2. **JSON Files**: Click on a date to see all JSON log files for that date
3. **File Content**: Click on any JSON file to view its formatted content
4. **Back Navigation**: Use the "← Back" button to return to date buckets

### URL Structure

The application supports deep linking with the following URL patterns:

- `http://localhost:3000/#` - Shows date buckets
- `http://localhost:3000/#2024-12-25` - Shows files for December 25, 2024
- `http://localhost:3000/#2024-12-25/logfile.json` - Opens specific JSON file

The interface auto-refreshes every 30 seconds while preserving your current selection and scroll position.

## Development

### Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-restart (requires nodemon)

### Project Structure

```
minio-litellm-viewer/
├── public/           # Static web files
│   ├── index.html   # Main HTML page
│   ├── style.css    # Stylesheet
│   └── script.js    # Client-side JavaScript
├── server.js        # Express server and MinIO client
├── package.json     # Node.js dependencies and scripts
├── .env            # Environment configuration (not in git)
├── .env.example    # Example environment file
└── README.md       # This file
```

## API Endpoints

- `GET /api/buckets` - List all date buckets
- `GET /api/files/:dateBucket` - List JSON files in a specific date bucket
- `GET /api/file/:filename` - Get content of a specific file

## Security Considerations

- Use read-only MinIO credentials when possible
- Consider implementing authentication for production deployments
- The application does not store or log any sensitive information
- All MinIO credentials are stored in environment variables

## Troubleshooting

### Connection Issues

If you see "Error loading date buckets":

1. Verify your MinIO server is accessible
2. Check that the `BUCKET` URL is correct
3. Ensure your `ACCESS_KEY` and `SECRET_KEY` are valid
4. Confirm the bucket exists and contains date-organized folders

### Performance

For large numbers of files:

- The application caches data to improve performance
- Consider adjusting the auto-refresh interval if needed
- Network latency may affect initial load times

### Browser Compatibility

- Modern browsers with ES6 support
- JavaScript must be enabled
- Tested on Chrome, Firefox, Safari, and Edge

