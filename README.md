# Smart Query Studio - Azure API

This project is a secure backend API for the **Smart Query Studio** application, built with Node.js and Express. It uses **Microsoft Entra ID Client Credentials Flow** for secure authentication and **Azure OpenAI** for AI-powered query processing.

## Features

- **Secure Authentication**: Uses Entra ID Client Credentials Flow with `@azure/identity`
- **Azure OpenAI Integration**: Powered by GPT-4o for intelligent query handling
- **Flexible System Prompt**: Easily configurable system prompt for AI behavior
- **JSON Response Format**: Strict JSON output for all AI responses
- **Health Monitoring**: `/health` endpoint for status checks
- **Protected Endpoint**: `/api/protected` for testing authentication
- **Query API**: `/api/query` for AI-powered query processing

## Prerequisites

- **Node.js** 18.x or higher
- **npm** (or yarn/pnpm)
- **Microsoft Entra ID Application**: Registered with Client ID, Tenant ID, and Client Secret
- **Azure OpenAI Service**: With a deployed model (e.g., `gpt-4o`)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd SmartQueryStudioAzureApi
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Port
PORT=4040

# Microsoft Entra ID (Azure AD) Configuration
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-openai-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:4200
```

### Environment Variables Explained

| Variable                  | Description                                 |
| ------------------------- | ------------------------------------------- |
| `PORT`                    | Port for the API server                     |
| `AZURE_CLIENT_ID`         | Client ID of your Entra ID application      |
| `AZURE_CLIENT_SECRET`     | Client secret for your Entra ID application |
| `AZURE_TENANT_ID`         | Tenant ID of your Azure subscription        |
| `AZURE_OPENAI_ENDPOINT`   | Azure OpenAI service endpoint               |
| `AZURE_OPENAI_API_KEY`    | API key for Azure OpenAI                    |
| `AZURE_OPENAI_DEPLOYMENT` | Deployed model name (e.g., `gpt-4o`)        |
| `FRONTEND_URL`            | Frontend application URL for CORS           |

## Usage

### Start the Server

```bash
npm start
```

The server will start on `http://localhost:4040`.

### API Endpoints

#### Health Check

```bash
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "time": "2026-03-07T04:20:00.000Z"
}
```

#### Protected Endpoint

Requires authentication with Entra ID token.

```bash
GET /api/protected
```

**Response:**

```json
{
  "message": "Succesfully accessed protected data using App-only Identity.",
  "auth_info": {
    "type": "Client Credentials (Daemon)",
    "scopes": ["https://cognitiveservices.azure.com/.default"],
    "expires_on": "2026-03-07T04:20:00.000Z",
    "token_preview": "eyJ0eXAiOiJKV1Qi...",
    "full_token_demo_only": "eyJ0eXAiOiJKV1Qi..."
  },
  "data": {
    "id": "SQS-001",
    "val": "This data is secured by Entra ID Application Identity.",
    "timestamp": 1741314000000
  }
}
```

#### Query Processing

Sends a prompt to Azure OpenAI for processing.

```bash
POST /api/query
Content-Type: application/json

{
  "prompt": "What is the capital of France?"
}
```

**Response (Conversational):**

```json
{
  "type": "conversational",
  "result": "The capital of France is Paris."
}
```

**Response (Data Search):**

```json
{
  "type": "data_search",
  "needsInfo": true,
  "message": "What date range are you interested in?"
}
```

**Response (Data Result):**

```json
{
  "type": "data_result",
  "data": [
    { "id": 1, "name": "Product A", "price": 100 },
    { "id": 2, "name": "Product B", "price": 200 }
  ]
}
```

## Development

### Development Mode

```bash
npm run dev
```

This will start the server with nodemon for automatic restarts on file changes.

### Build

```bash
npm run build
```

### Start Production

```bash
npm run start
```

## Project Structure

```
SmartQueryStudioAzureApi/
├── config/
│   ├── azureOpenAIClient.js  # Azure OpenAI client configuration
│   └── db.js                   # Database configuration (if needed)
├── controllers/
│   ├── queryController.js      # Query handling logic
│   └── authController.js       # Authentication controllers
├── middleware/
│   └── tokenMiddleware.js      # Entra ID token middleware
├── routes/
│   ├── query.js                # Query API routes
│   └── index.js                # Main API routes
├── .env                        # Environment variables (not in git)
├── package.json                # Project dependencies
└── README.md                   # Project documentation
```

## Security

- **Client Credentials Flow**: Uses application identity instead of user identity
- **Token Middleware**: Automatically injects and refreshes access tokens
- **CORS Protection**: Configured to allow only specified origins
- **Environment Variables**: Sensitive data isolated in `.env` file

## Testing

### Test Authentication

```bash
curl -X GET http://localhost:4040/api/protected
```

### Test Query

```bash
curl -X POST http://localhost:4040/api/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_TENANT_ID` in `.env`
2. **500 Internal Server Error**: Check Azure OpenAI endpoint and deployment name
3. **CORS Errors**: Ensure `FRONTEND_URL` matches your frontend application URL
4. **Missing Dependencies**: Run `npm install` to install all dependencies

### Debug Mode

Enable development mode for detailed error messages:

```env
NODE_ENV=development
```

## License

MIT
