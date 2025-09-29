@echo off
echo Setting up environment variables...
set DANGEROUSLY_DISABLE_HOST_CHECK=true
set WDS_SOCKET_HOST=localhost
set WDS_SOCKET_PORT=0

echo Starting React development server...
cd client
npm start