<?php
    include 'dbh.inc.php';

    if (!isset($_SESSION['userId'])) {
        header("Location: /");
        exit();
    }

    $stmt = mysqli_prepare($conn, "SELECT accountBalance, steamId, discordId FROM users WHERE idUsers=?");
    mysqli_stmt_bind_param($stmt, "i", $_SESSION['userId']);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if ($row === null) {
        error_log("Unable to load the signed-in user's account.");
        http_response_code(500);
        exit("Unable to load account.");
    }

    $userBalance = $row['accountBalance'];
    $userAccountNumber = $row['steamId'] ?? '';
    $userDiscordId = $row['discordId'] ?? '';
    $_SESSION['steamId'] = $userAccountNumber;