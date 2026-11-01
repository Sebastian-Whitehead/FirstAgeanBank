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
                    if (preg_match('/^[0-9]{17}$/', (string)$row['steamId'])) {
                        try {
                            syncExternalUserOnLogin($loginUserData);
                        } catch (SupabaseRequestException $error) {
                            error_log('Login failed while checking the Supabase account: '.$error->getMessage());
                            finishRequest('/?error=supabaseunavailable', 'supabaseunavailable');
                        }
                    }

                    session_start();
                    $_SESSION['userId'] = $row['idUsers'];
                    $_SESSION['userUid'] = $row['uidUsers'];
                    $_SESSION['firstname'] = $row['firstname'];
                    $_SESSION['lastname'] = $row['lastname'];
                    $_SESSION['steamId'] = $row['steamId'] ?? '';
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