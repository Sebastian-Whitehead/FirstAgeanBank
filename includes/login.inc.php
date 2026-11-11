<?php
require 'http-response.inc.php';
http_response_code(410);
finishRequest('/', 'authrequired');
