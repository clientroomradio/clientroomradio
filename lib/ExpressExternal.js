module.exports = function(config, lastfmClient, userDao, chat, permissionManager, logger) {
    var that = this;
    var express = require("express");
    var uuid = require("node-uuid");
    var httpProxy = require("http-proxy");
    var cookieParser = require("cookie-parser");
    var path = require("path");

    var app;

    that.start = function() {
        app = express();
        app.use(express.static(path.join(__dirname, "../static")));
        app.use(cookieParser("coffey"));

        app.get("/logout", function (req, res) {
            var user = userDao.getUserBySession(req.cookies.session);
            res.clearCookie("session");
            if (user) {
                userDao.removeUser(user);
            }
            res.redirect("/");
        });

        app.get("/login", function (req, res) {
            var token = req.param("token");
            lastfmClient.login(token, function(err, session) {
                if (err) {
                    logger.winston.error("login", err);
                } else {
                    var sessionId = uuid.v4();
                    if (permissionManager.isAllowedToJoin(session.user)) {
                        var user = userDao.addUser(session.user, sessionId, session.key);
                        res.cookie("session", sessionId);
                        chat.userJoined(user);
                        res.redirect("/");
                    } else {
                        res.redirect(config.notAllowedInUrl);
                    }
                }
            });
        });

        app.get("/config.js", function (req, res) {
            res.header("Content-Type", "application/javascript");
            var user = userDao.getUserBySession(req.cookies.session);
            if (user) {
                res.send("var config = " + JSON.stringify(config.external) + "; var loggedInAs =" + JSON.stringify(user.username) + ";");
            } else {
                res.send("var config = " + JSON.stringify(config.external) + "; var loggedInAs = null;");
            }
        });

        var proxy = new httpProxy.RoutingProxy();
        app.all("/stream.mp3", function(req, res) {
            req.url = "/stream.mp3";
            proxy.proxyRequest(req, res, {
                host: "localhost",
                port: 8080
            });
        });
    };

    that.getApp = function() {
        return app;
    };
};
