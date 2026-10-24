<?php
require 'dbh.inc.php';
require 'external-db-sync.inc.php';
session_start();
require 'inactivity.php';

if (!isset($_SESSION['userId']) || !isset($_SESSION['timesince'])) {
    header("Location: ../index.php?error=loggedout");
    exit();
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
        header("Location: ../accounts/update/?error=invalidsteamid");
        exit();
    }
    if (!preg_match('/^[0-9]{17,20}$/', $discordId)) {
        header("Location: ../accounts/update/?error=invaliddiscordid");
        exit();
    }

    $stmt = mysqli_prepare($conn, "SELECT idUsers FROM users WHERE steamId=? AND idUsers<>?");
    mysqli_stmt_bind_param($stmt, "si", $steamId, $_SESSION['userId']);
    if (!mysqli_stmt_execute($stmt)) {
        error_log("Profile update failed: unable to check SteamID.");
        header("Location: ../accounts/update/?error=updatefailed");
        exit();
    }
    mysqli_stmt_store_result($stmt);
    $steamIdTaken = mysqli_stmt_num_rows($stmt) > 0;
    mysqli_stmt_close($stmt);
    if ($steamIdTaken) {
        header("Location: ../accounts/update/?error=steamidtaken");
        exit();
    }

    $stmt = mysqli_prepare($conn, "UPDATE users SET steamId=?, discordId=? WHERE idUsers=?");
    mysqli_stmt_bind_param($stmt, "ssi", $steamId, $discordId, $_SESSION['userId']);
    if (!mysqli_stmt_execute($stmt)) {
        $duplicateSteamId = mysqli_stmt_errno($stmt) === 1062;
        if ($duplicateSteamId) {
            header("Location: ../accounts/update/?error=steamidtaken");
        } else {
            error_log("Profile update failed: unable to save SteamID.");
            header("Location: ../accounts/update/?error=updatefailed");
        }
        exit();
    }
    mysqli_stmt_close($stmt);
    $_SESSION['steamId'] = $steamId;
    header("Location: ../accounts/update/?profile=updated");
    exit();
}

if (isset($_POST['update-submit'])) {
    $oldPassword = $_POST['oldpassword'] ?? '';
    $newPassword = $_POST['newpassword'] ?? '';
    $confirmPassword = $_POST['confirmpassword'] ?? '';
    $stmt = mysqli_prepare($conn, "SELECT pwdUsers FROM users WHERE idUsers=?");
    mysqli_stmt_bind_param($stmt, "i", $_SESSION['userId']);
    if (!mysqli_stmt_execute($stmt)) {
        error_log("Password update failed: unable to load user.");
        header("Location: ../accounts/index.php?error=sqlerror");
        exit();
    }
    $result = mysqli_stmt_get_result($stmt);
    $user = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if ($user === null || !password_verify($oldPassword, $user['pwdUsers'])) {
        header("Location: ../accounts/index.php?error=wrongpwd");
        exit();
    }
    if ($newPassword !== $confirmPassword) {
        header("Location: ../accounts/index.php?error=matchpwd");
        exit();
    }

    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = mysqli_prepare($conn, "UPDATE users SET pwdUsers=? WHERE idUsers=?");
    mysqli_stmt_bind_param($stmt, "si", $hashedPassword, $_SESSION['userId']);
    if (!mysqli_stmt_execute($stmt)) {
        error_log("Password update failed: unable to save password.");
        header("Location: ../accounts/index.php?error=sqlerror");
        exit();
    }
    mysqli_stmt_close($stmt);
    header("Location: ../includes/logout.inc.php");
    exit();
}

header("Location: ../accounts/update/");
exit();
