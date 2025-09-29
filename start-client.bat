@echo off
echo Setting up environment variables...
set DANGEROUSLY_DISABLE_HOST_CHECK=true
set WDS_SOCKET_HOST=localhost
set WDS_SOCKET_PORT=0
set PORT=3100

echo Starting React development server on port 3100...
cd client
npm start