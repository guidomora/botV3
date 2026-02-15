# Reservations Agent

#### Rate Limit Logic

- if 10 messages in less than 30 seconds -> notifies the user and blocks them for 3min
- if 30 messages in less than 10 minutes -> notifies the user and blocks them for 3min
