import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

settings = {
    "debug": False,
    "template_path": os.path.join(BASE_DIR, "frontend", "src", "templates"),
    "static_path": os.path.join(BASE_DIR, "frontend", "dist"),
    "cookie_secret": "YOUR_SECRET_KEY",
    "xsrf_cookies": True,
    "log_dir": os.path.join(BASE_DIR, "logs"),
}
