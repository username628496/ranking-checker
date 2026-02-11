@echo off
echo Installing shadcn/ui dependencies...
echo.

cd /d %~dp0

npm install

echo.
echo Installation complete!
echo.
echo Next steps:
echo   1. Run: npm run dev
echo   2. Open: http://localhost:5173
echo.
pause
