<?php
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
?>
<!DOCTYPE html>
<html>
    <head>
        <title><?php
            if (substr_count($_SERVER['REQUEST_URI'], '/') >= 2) {
                $url = ucwords(str_replace("/", " ", $_SERVER['REQUEST_URI']));
                $str = explode('Index', $url);
                $url = $str[0];
                echo $url;
            } else {
                echo 'First Agean Bank';
            }
        ?></title>
        <link rel="stylesheet" href="/assets/css/main.css?v=20261024-profile">
        <link rel="icon" href="/assets/png/first-agean-bank.png" type="image/png">
        <script src="https://cdn.jsdelivr.net/npm/js-cookie@rc/dist/js.cookie.min.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@600&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons"
      rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    </head>
    <script src="/assets/js/main.js"></script>
    <script src="https://unpkg.com/hotkeys-js/dist/hotkeys.min.js"></script>