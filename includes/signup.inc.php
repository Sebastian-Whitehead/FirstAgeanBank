<?php
if (isset($_POST['signup-submit'])) {
    require 'http-response.inc.php';
    require 'dbh.inc.php';
    require 'external-db-sync.inc.php';
    
    $firstname = $_POST['firstname'] ?? '';
    $lastname = $_POST['lastname'] ?? '';
    $username = $_POST['uid'] ?? '';
    $steamId = $_POST['steamid'] ?? '';
    $discordId = null;
    $password = $_POST['pwd'] ?? '';
    $passwordRepeat = $_POST['pwd-repeat'] ?? '';
    
    $accountBalance = 0.00;
    
    if (empty($firstname) || empty($lastname) || empty($username) || empty($steamId) || empty($password) || empty($passwordRepeat)) {
        finishRequest('/signup/?error=emptyfields', 'emptyfields');
    } else if (!preg_match('/^[0-9]{17}$/', $steamId)) {
        finishRequest('/signup/?error=invalidsteamid', 'invalidsteamid');
    } else if (!preg_match("/^[a-zA-Z0-9]*$/", $username)) {
        finishRequest('/signup/?error=invaliduid', 'invaliduid');
    } else if ($password !== $passwordRepeat) {
        finishRequest('/signup/?error=passwordcheck', 'passwordcheck');
    } else if ((strlen($lastname) > 35) || (strlen($firstname) > 35)) {
        finishRequest('/signup/?error=characterlimit', 'characterlimit');
    } else {
        $sql = "SELECT uidUsers FROM users WHERE uidUsers=?";
        $stmt = mysqli_stmt_init($conn);
        if (!mysqli_stmt_prepare($stmt, $sql)) {
            error_log("Signup failed: unable to prepare username lookup.");
            finishRequest('/signup/?error=signupfailed', 'signupfailed');
        } else {
            mysqli_stmt_bind_param($stmt, "s", $username);
            if (!mysqli_stmt_execute($stmt)) {
                error_log("Signup failed: unable to query username.");
                finishRequest('/signup/?error=signupfailed', 'signupfailed');
            }
            mysqli_stmt_store_result($stmt);
            $resultCheck = mysqli_stmt_num_rows($stmt);
            $steamStmt = mysqli_stmt_init($conn);
            if (!mysqli_stmt_prepare($steamStmt, "SELECT idUsers FROM users WHERE steamId=?")) {
                error_log("Signup failed: unable to prepare SteamID lookup.");
                finishRequest('/signup/?error=signupfailed', 'signupfailed');
            }
            mysqli_stmt_bind_param($steamStmt, "s", $steamId);
            if (!mysqli_stmt_execute($steamStmt)) {
                error_log("Signup failed: unable to query SteamID.");
                finishRequest('/signup/?error=signupfailed', 'signupfailed');
            }
            mysqli_stmt_store_result($steamStmt);
            $resultCheck3 = mysqli_stmt_num_rows($steamStmt);
            mysqli_stmt_close($steamStmt);

            if ($resultCheck > 0) {
                finishRequest('/signup/?error=uidtaken', 'uidtaken');
            } else if ($resultCheck3 > 0) {
                finishRequest('/signup/?error=steamidtaken', 'steamidtaken');
            } else {
                $signupData = [
                    'uidUsers' => $username,
                    'firstname' => $firstname,
                    'lastname' => $lastname,
                    'steamId' => $steamId,
                    'discordId' => $discordId
                ];
                $sql = "INSERT INTO users (uidUsers, pwdUsers, firstname, lastname, accountBalance, steamId, discordId) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt = mysqli_stmt_init($conn);
                if (!mysqli_stmt_prepare($stmt, $sql)) {
                    finishRequest('/signup/?error=sqlerror', 'sqlerror');
                } else if (strlen($password) < 6) {
                    finishRequest('/signup/?error=passlength', 'passlength');
                } else if (!preg_match('/[\'^£$%&*()};:"`{@#~?!.><>,|=_+¬-]/', $password)) {
                    finishRequest('/signup/?error=weakpass', 'weakpass');
                } else {
                    try {
                        syncExternalUserOnSignup($signupData);
                    } catch (SupabaseRequestException $error) {
                        error_log('Signup failed while provisioning the Supabase account: '.$error->getMessage());
                        finishRequest('/signup/?error=supabaseunavailable', 'supabaseunavailable');
                    }

                    $hashedPwd = password_hash($password, PASSWORD_DEFAULT);
                    mysqli_stmt_bind_param($stmt, "ssssdss", $username, $hashedPwd, $firstname, $lastname, $accountBalance, $steamId, $discordId);
                    if (!mysqli_begin_transaction($conn)) {
                        error_log("Signup failed: unable to start database transaction.");
                        finishRequest('/signup/?error=signupfailed', 'signupfailed');
                    }
                    if (!mysqli_stmt_execute($stmt)) {
                        error_log("Signup failed: unable to insert user.");
                        mysqli_rollback($conn);
                        finishRequest('/signup/?error=signupfailed', 'signupfailed');
                    }
                    if (!mysqli_commit($conn)) {
                        error_log("Signup failed: unable to commit user.");
                        mysqli_rollback($conn);
                        finishRequest('/signup/?error=signupfailed', 'signupfailed');
                    }
                    finishRequest('/?signup=success');
                }
            }
        }
    }
    mysqli_stmt_close($stmt);
    mysqli_close($conn);
} else {
    require 'http-response.inc.php';
    finishRequest('/signup/');
}