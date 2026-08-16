import angular from "angular";

window.angular = angular;

import "angular-route";
import "angular-animate";
import "./styles.css";
import "./app.js";
import "./routes.js";
import "./services.js";
import "./components.js";

angular.bootstrap(document, ["weatherApp"]);
