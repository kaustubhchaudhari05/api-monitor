# API Monitor

A backend API monitoring tool that checks endpoint availability, HTTP status codes, response times, and request failures.

## Features

- Health check for the monitoring server
- External API availability checks
- HTTP status code reporting
- Response time measurement
- Request timeout handling
- Basic URL validation

## Tech Stack

- Node.js
- Express.js

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server

```bash
npm start
```

### 3. Test the health endpoint

`GET http://localhost:3000/health`

### 4. Monitor an API

`GET http://localhost:3000/monitor?url=https://jsonplaceholder.typicode.com/posts/1`

## Project Status

Currently under development. More monitoring features will be added as the project evolves.