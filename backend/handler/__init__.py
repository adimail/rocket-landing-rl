import tornado.web


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
