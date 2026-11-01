<?php
if (isset($_SESSION['userId'])) {
    if (time() - (int)$_SESSION['sessionTimeStamp'] >= 900) {
        session_destroy();
        if (function_exists('isJsonRequest') && isJsonRequest()) {
            finishRequest('/?timeout', 'sessionexpired');
        }
        header('Location: /?timeout');
        exit();
    }

    $_SESSION['sessionTimeStamp'] = time();
}