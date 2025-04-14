import tornado.web
import json
from backend.config import Config


class BaseHandler(tornado.web.RequestHandler):
    def initialize(self, logger):
        self.logger = logger

    def log_request(self):
        """Helper method for logging request access"""
        self.logger.info(f"Accessed {self.request.uri}")


class AppHandler(BaseHandler):
    def get(self):
        self.log_request()
        self.render("index.html")


class SimulationSpeedHandler(BaseHandler):
    def initialize(self, logger):
        super().initialize(logger)
        self.config = Config()

    def get(self):
        try:
            self.log_request()
            current_speed = self.config.get("env.speed")
            self.write(json.dumps({"speed": current_speed}))
        except Exception as e:
            self.logger.error(f"Failed to retrieve simulation speed: {e}")
            self.set_status(500)
            self.write({"error": "Failed to retrieve simulation speed"})
