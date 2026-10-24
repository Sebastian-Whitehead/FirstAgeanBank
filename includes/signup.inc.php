<?php
if (isset($_POST['signup-submit'])) {
    
    require 'dbh.inc.php';
    
    $firstname = $_POST['firstname'];
    $lastname = $_POST['lastname'];
    $username = $_POST['uid'];
    $email = $_POST['mail'];
    $steamId = $_POST['steamid'] ?? '';
    $discordId = $_POST['discordid'] ?? '';
    $password = $_POST['pwd'];
    $passwordRepeat = $_POST['pwd-repeat'];
    
    $accountBalance = 500.00;
    
    if (empty($firstname) || empty($lastname) || empty($username) || empty($email) || empty($steamId) || empty($discordId) || empty($password) || empty($passwordRepeat)) {
        header("Location: ../signup/index.php?error=emptyfields&uid=".$username."&mail=".$email."&firstname=".$firstname."&lastname=".$lastname);
        exit();
    } else if (!preg_match('/^[0-9]{17}$/', $steamId)) {
        header("Location: ../signup/index.php?error=invalidsteamid");
        exit();
    } else if (!preg_match('/^[0-9]{17,20}$/', $discordId)) {
        header("Location: ../signup/index.php?error=invaliddiscordid");
        exit();
    } else if (!filter_var($email, FILTER_VALIDATE_EMAIL) && !preg_match("/^[a-zA-Z0-9]*$/", $username)) {
        header("Location: ../signup/index.php?error=invalidmailuid");
        exit();
    } else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        header("Location: ../signup/index.php?error=invalidmail&uid=".$username);
        exit();
    } else if (!preg_match("/^[a-zA-Z0-9]*$/", $username)) {
        header("Location: ../signup/index.php?error=invaliduid&mail=".$email);
        exit();
    } else if ($password !== $passwordRepeat) {
        header("Location: ../signup/index.php?error=passwordcheck&uid=".$username."&mail=".$email);
        exit();
    } else if ((strlen($lastname) > 35) || (strlen($firstname) > 35)) {
        header("Location: ../signup/index.php?error=characterlimit&uid=".$username."&mail=".$email);
        exit();
    } else {
        $sql = "SELECT uidUsers FROM users WHERE uidUsers=?";
        $stmt = mysqli_stmt_init($conn);
        if (!mysqli_stmt_prepare($stmt, $sql)) {
            error_log("Signup failed: unable to prepare username lookup.");
            header("Location: ../signup/index.php?error=signupfailed");
            exit();
        } else {
            mysqli_stmt_bind_param($stmt, "s", $username);
            if (!mysqli_stmt_execute($stmt)) {
                error_log("Signup failed: unable to query username.");
                header("Location: ../signup/index.php?error=signupfailed");
                exit();
            }
            mysqli_stmt_store_result($stmt);
            $resultCheck = mysqli_stmt_num_rows($stmt);
            $emailStmt = mysqli_stmt_init($conn);
            if (!mysqli_stmt_prepare($emailStmt, "SELECT emailUsers FROM users WHERE emailUsers=?")) {
                error_log("Signup failed: unable to prepare email lookup.");
                header("Location: ../signup/index.php?error=signupfailed");
                exit();
            }
            mysqli_stmt_bind_param($emailStmt, "s", $email);
            if (!mysqli_stmt_execute($emailStmt)) {
                error_log("Signup failed: unable to query email.");
                header("Location: ../signup/index.php?error=signupfailed");
                exit();
            }
            mysqli_stmt_store_result($emailStmt);
            $resultCheck2 = mysqli_stmt_num_rows($emailStmt);
            mysqli_stmt_close($emailStmt);
            $steamStmt = mysqli_stmt_init($conn);
            if (!mysqli_stmt_prepare($steamStmt, "SELECT idUsers FROM users WHERE steamId=?")) {
                error_log("Signup failed: unable to prepare SteamID lookup.");
                header("Location: ../signup/index.php?error=signupfailed");
                exit();
            }
            mysqli_stmt_bind_param($steamStmt, "s", $steamId);
            if (!mysqli_stmt_execute($steamStmt)) {
                error_log("Signup failed: unable to query SteamID.");
                header("Location: ../signup/index.php?error=signupfailed");
                exit();
            }
            mysqli_stmt_store_result($steamStmt);
            $resultCheck3 = mysqli_stmt_num_rows($steamStmt);
            mysqli_stmt_close($steamStmt);

            if ($resultCheck > 0) {
                header("Location: ../signup/index.php?error=uidtaken&mail=".$email."&firstname=".$firstname."&lastname=".$lastname);
                exit();
            } else if ($resultCheck2 > 0) {
                header("Location: ../signup/index.php?error=emailtaken&uid=".$username."&firstname=".$firstname."&lastname=".$lastname);
                exit();
            } else if ($resultCheck3 > 0) {
                header("Location: ../signup/index.php?error=steamidtaken&uid=".$username."&firstname=".$firstname."&lastname=".$lastname);
                exit();
            } else {
                $sql = "INSERT INTO users (uidUsers, emailUsers, pwdUsers, firstname, lastname, accountBalance, steamId, discordId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = mysqli_stmt_init($conn);
                if (!mysqli_stmt_prepare($stmt, $sql)) {
                    header("Location: ../signup/index.php?error=sqlerror");
                    exit();
                } else if (strlen($password) < 6) {
                    header("Location: ../signup/index.php?error=passlength&uid=".$username."&mail=".$email."&firstname=".$firstname."&lastname=".$lastname);
                    exit();
                } else if (!preg_match('/[\'^£$%&*()};:"`{@#~?!.><>,|=_+¬-]/', $password)) {
                    header("Location: ../signup/index.php?error=weakpass&uid=".$username."&mail=".$email."&firstname=".$firstname."&lastname=".$lastname);
                    exit();
                } else {
                    $hashedPwd = password_hash($password, PASSWORD_DEFAULT);
                    mysqli_stmt_bind_param($stmt, "sssssdss", $username, $email, $hashedPwd, $firstname, $lastname, $accountBalance, $steamId, $discordId);
                    if (!mysqli_begin_transaction($conn)) {
                        error_log("Signup failed: unable to start database transaction.");
                        header("Location: ../signup/index.php?error=signupfailed");
                        exit();
                    }
                    if (!mysqli_stmt_execute($stmt)) {
                        error_log("Signup failed: unable to insert user.");
                        mysqli_rollback($conn);
                        header("Location: ../signup/index.php?error=signupfailed");
                        exit();
                    }
                    $activity = array(
                        array(
                            "account"=>$steamId,
                            "date"=>date("m/d"),
                            "year"=>date("Y"),
                            "desc"=>"Opening Balance",
                            "amount"=>$accountBalance,
                            "positive"=>true
                        ),
                    );
                    $newFileName = '../assets/users/'.$username.".json";
                    if (file_put_contents($newFileName, json_encode($activity, JSON_PRETTY_PRINT), LOCK_EX) === false) {
                        error_log("Signup failed: unable to write activity file.");
                        if (file_exists($newFileName) && !unlink($newFileName)) {
                            error_log("Signup cleanup failed: unable to remove incomplete activity file.");
                        }
                        mysqli_rollback($conn);
                        header("Location: ../signup/index.php?error=signupfailed");
                        exit();
                    }
                    if (!mysqli_commit($conn)) {
                        error_log("Signup failed: unable to commit user.");
                        if (!unlink($newFileName)) {
                            error_log("Signup cleanup failed: unable to remove activity file.");
                        }
                        mysqli_rollback($conn);
                        header("Location: ../signup/index.php?error=signupfailed");
                        exit();
                    }
                    header("Location: ../index.php?signup=success");
                    exit();
                }
            }
        }
    }
    mysqli_stmt_close($stmt);
    mysqli_close($conn);
} else {
    header("Location: http://".$_SERVER['HTTP_HOST']."/signup/");
    exit();
}