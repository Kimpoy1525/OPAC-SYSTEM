@echo off
cd /d "%~dp0backend"
echo Activating virtual environment...
call ..\.venv\Scripts\activate
echo Starting Django development server...
python manage.py runserver
pause