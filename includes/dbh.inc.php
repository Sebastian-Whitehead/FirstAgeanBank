<?php

$servername = getenv('DB_HOST') ?: "localhost";
$dBUsername = getenv('DB_USER') ?: "root";
$dBPassword = getenv('DB_PASSWORD') ?: "";
$dBName = getenv('DB_NAME') ?: "gulllebelle";

$conn = mysqli_connect($servername, $dBUsername, $dBPassword, $dBName);

if (!$conn) {
    die("oops it failed: ".mysqli_connect_error());
}