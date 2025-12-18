@echo off
set NODE_ENV=production
set PORT=3100
echo Starting static production server on port %PORT%...
cd client
if not exist build\index.html (
  echo Building frontend...
  npm run build
)
npx serve -s build -l %PORT%
