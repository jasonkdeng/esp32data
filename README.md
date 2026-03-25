# ESP32 Float Data API (Express)

Simple Node.js + Express API for receiving float sensor readings from an ESP32.

## Endpoint

- Method: POST
- Path: /api/esp32/reading
- Content-Type: application/json

## Expected Request Body

```json
{
	"value": 23.78
}
```

- value: required, float number (for example temperature, pressure, vibration, etc.)

## Response Examples

Success (200):

```json
{
	"success": true,
	"message": "Float reading received",
	"received": 23.78
}
```

Validation error (400):

```json
{
	"success": false,
	"error": "Field value must be a valid float number"
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

3. Server runs at:

```text
http://localhost:3000
```

## Test With cURL

```bash
curl -X POST http://localhost:3000/api/esp32/reading \
	-H "Content-Type: application/json" \
	-d "{\"value\":25.42}"
```

## ESP32 Notes

On the ESP32 side, send a JSON POST request with a float field named value. If your firmware stores a float variable like sensorValue, your payload should map that variable to value.