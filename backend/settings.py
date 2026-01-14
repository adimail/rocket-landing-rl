import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

settings = {
    "debug": False,
    "template_path": os.path.join(BASE_DIR, "frontend", "dist"),
    "static_path": os.path.join(BASE_DIR, "frontend", "dist"),
    "cookie_secret": "KzVLR4ASqj6nvr+HplNB2/pFjeIeWeEoQT10hRGuMzg=",
    "xsrf_cookies": True,
    "log_dir": os.path.join(BASE_DIR, "logs"),
}
