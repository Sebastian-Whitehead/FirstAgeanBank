<?php
require 'http-response.inc.php';
session_start();
session_unset();
session_destroy();
finishRequest('/');