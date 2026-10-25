<?php
if (isset($_POST['login-submit'])) {
    require 'http-response.inc.php';
    require 'dbh.inc.php';
    require 'external-db-sync.inc.php';
    $username = $_POST['username'] ?? '';
    $password = $_POST['pwd'] ?? '';
    if (empty($username) || empty($password)) {
        finishRequest('/?error=emptyfields', 'emptyfields');
    } else {
        $sql = "SELECT * FROM users WHERE uidUsers=?;";
        $stmt = mysqli_stmt_init($conn);
        if (!mysqli_stmt_prepare($stmt, $sql)) {
            finishRequest('/?error=sqlerror', 'sqlerror');
        } else {
            mysqli_stmt_bind_param($stmt, "s", $username);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);
            if ($row = mysqli_fetch_assoc($result)) {
                $pwdCheck  = password_verify($password, $row['pwdUsers']);
                if ($pwdCheck == false) {
                    finishRequest('/?error=wrongpwd', 'wrongpwd');
                } else if ($pwdCheck == true) {
                    $loginUserData = [
                        'uidUsers' => $row['uidUsers'],
                        'firstname' => $row['firstname'],
                        'lastname' => $row['lastname'],
                        'steamId' => $row['steamId'],
                        'discordId' => $row['discordId']
                    ];
                    $syncedUserData = syncExternalUserOnLogin($loginUserData);
                    $authenticatedUser = $syncedUserData === null
                        ? $row
                        : array_merge($row, $syncedUserData);

                    session_start();
                    $_SESSION['userId'] = $row['idUsers'];
                    $_SESSION['userUid'] = $authenticatedUser['uidUsers'];
                    $_SESSION['firstname'] = $authenticatedUser['firstname'];
                    $_SESSION['lastname'] = $authenticatedUser['lastname'];
                    $_SESSION['steamId'] = $authenticatedUser['steamId'] ?? '';
                    $_SESSION['sessionTimeStamp'] = time();
                    finishRequest('/accounts/?login=success');
                } else {
                    finishRequest('/?error=wrongpwd', 'wrongpwd');
                }
            } else {
                finishRequest('/?error=usernotfound', 'usernotfound');
            }
        }
    }
} else if(isset($_POST['join-submit'])) {
    require 'http-response.inc.php';
    finishRequest('/signup/');
} else {
    require 'http-response.inc.php';
    finishRequest('/');
}