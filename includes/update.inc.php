<?php
require 'dbh.inc.php';
require 'external-db-sync.inc.php';
require 'http-response.inc.php';
session_start();
require 'inactivity.php';

if (!isset($_SESSION['userId']) || !isset($_SESSION['sessionTimeStamp'])) {
    finishRequest('/', 'loggedout');
}

if (isset($_POST['profile-ids-submit'])) {
    $accountInfo = [
        'steamId' => trim($_POST['steamid'] ?? ''),
        'discordId' => trim($_POST['discordid'] ?? '')
    ];
    $accountInfo = array_merge(
        $accountInfo,
        syncExternalAccountInfoUpdate($accountInfo) ?? []
    );
    $steamId = $accountInfo['steamId'];
    $discordId = $accountInfo['discordId'];
    if (!preg_match('/^[0-9]{17}$/', $steamId)) {
        finishRequest('/accounts/update/?error=invalidsteamid', 'invalidsteamid');
    }
    if (!preg_match('/^[0-9]{17,20}$/', $discordId)) {
        finishRequest('/accounts/update/?error=invaliddiscordid', 'invaliddiscordid');
    }

    $stmt = mysqli_prepare($conn, "SELECT idUsers FROM users WHERE steamId=? AND idUsers<>?");
    mysqli_stmt_bind_param($stmt, "si", $steamId, $_SESSION['userId']);
    if (!mysqli_stmt_execute($stmt)) {
        error_log("Profile update failed: unable to check SteamID.");
        finishRequest('/accounts/update/?error=updatefailed', 'updatefailed');
    }
    mysqli_stmt_store_result($stmt);
    $steamIdTaken = mysqli_stmt_num_rows($stmt) > 0;
    mysqli_stmt_close($stmt);
    if ($steamIdTaken) {
        finishRequest('/accounts/update/?error=steamidtaken', 'steamidtaken');
    }

    $stmt = mysqli_prepare($conn, "UPDATE users SET steamId=?, discordId=? WHERE idUsers=?");
    mysqli_stmt_bind_param($stmt, "ssi", $steamId, $discordId, $_SESSION['userId']);
    if (!mysqli_stmt_execute($stmt)) {
        $duplicateSteamId = mysqli_stmt_errno($stmt) === 1062;
        if ($duplicateSteamId) {
            finishRequest('/accounts/update/?error=steamidtaken', 'steamidtaken');
        } else {
            error_log("Profile update failed: unable to save SteamID.");
            finishRequest('/accounts/update/?error=updatefailed', 'updatefailed');
        }
    }
    mysqli_stmt_close($stmt);
    $_SESSION['steamId'] = $steamId;
    finishRequest('/accounts/update/?profile=updated');
}

if (isset($_POST['update-submit'])) {
    $oldPassword = $_POST['oldpassword'] ?? '';
    $newPassword = $_POST['newpassword'] ?? '';
    $confirmPassword = $_POST['confirmpassword'] ?? '';
    $stmt = mysqli_prepare($conn, "SELECT pwdUsers FROM users WHERE idUsers=?");
    mysqli_stmt_bind_param($stmt, "i", $_SESSION['userId']);
    if (!mysqli_stmt_execute($stmt)) {
        error_log("Password update failed: unable to load user.");
        finishRequest('/accounts/?error=sqlerror', 'sqlerror');
    }
    $result = mysqli_stmt_get_result($stmt);
    $user = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if ($user === null || !password_verify($oldPassword, $user['pwdUsers'])) {
        finishRequest('/accounts/?error=wrongpwd', 'wrongpwd');
    }
    if ($newPassword !== $confirmPassword) {
        finishRequest('/accounts/?error=matchpwd', 'matchpwd');
    }

    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = mysqli_prepare($conn, "UPDATE users SET pwdUsers=? WHERE idUsers=?");
    mysqli_stmt_bind_param($stmt, "si", $hashedPassword, $_SESSION['userId']);
    if (!mysqli_stmt_execute($stmt)) {
        error_log("Password update failed: unable to save password.");
        finishRequest('/accounts/?error=sqlerror', 'sqlerror');
    }
    mysqli_stmt_close($stmt);
    $_SESSION = [];
    session_destroy();
    finishRequest('/');
}

finishRequest('/accounts/update/');
