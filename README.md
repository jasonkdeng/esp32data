# ESP32 Float Data API + Dashboard

Node.js + Express API for receiving float sensor readings from an ESP32, plus a React dashboard for visualization.

## Endpoint

- Method: POST
- Path: /api/esp32/reading
- Content-Type: application/json

## Expected Request Body

```json
{
	"title": "Water Temperature",
	"value": 23.78
}
```

- title: required, non-empty string label for the reading
- value: required, float number (for example temperature, pressure, vibration, etc.)

## Readings Feed Endpoint

- Method: GET
- Path: /api/esp32/readings

Returns the latest readings first, with the latest reading also provided separately.

## Response Examples

Success (200):

```json
{
	"success": true,
	"message": "Float reading received",
	"received": {
		"title": "Water Temperature",
		"value": 23.78,
		"timestamp": "2026-03-25T12:00:00.000Z"
	}
}
```

Validation error (400):

```json
{
	"success": false,
	"error": "Field title must be a non-empty string"
}
```

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run the API:

```bash
npm start
```

3. In another terminal, run the dashboard:

```bash
cd dashboard
npm start
```

4. API server runs at:

```text
http://localhost:3000
```

5. Dashboard runs at:

```text
http://localhost:3001
```

## Test With cURL

```bash
curl -X POST http://localhost:3000/api/esp32/reading \
	-H "Content-Type: application/json" \
	-d "{\"title\":\"Water Temperature\",\"value\":25.42}"
```

## ESP32 Notes

On the ESP32 side, send JSON with both a string title and a float value. If your firmware stores variables like sensorName and sensorValue, map them to title and value in the payload.