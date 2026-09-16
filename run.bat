@echo off
:: Configuración de codificación UTF-8 para la consola de Windows y Python
chcp 65001 > nul
set PYTHONUTF8=1

echo =======================================================
echo    Iniciando AC Gemma Local (agentes con Ollama)
echo =======================================================
echo.

:: Comprobar si Ollama está escuchando en el puerto 11434
powershell -Command "(New-Object System.Net.Sockets.TcpClient).Connect('127.0.0.1', 11434)" 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Ollama no está ejecutándose en el puerto 11434.
    echo Intentando iniciar Ollama automáticamente en segundo plano...
    start "" ollama serve
    echo Esperando a que el servicio de Ollama responda...
    ping -n 7 127.0.0.1 > nul
    echo.
)

:: Ruta al ejecutable de python dentro del entorno uv creado en la raíz del proyecto
set PYTHON_PATH=.venv\Scripts\python.exe

if not exist %PYTHON_PATH% (
    echo [ERROR] No se encuentra el entorno virtual de Python en:
    echo        %PYTHON_PATH%
    echo.
    echo Ejecute "uv sync" en la raíz del proyecto para crearlo.
    echo.
    pause
    exit /b 1
)

:: Ejecutar el script usando el Python del entorno virtual
%PYTHON_PATH% run.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] La aplicación se ha detenido de forma inesperada.
    pause
)
