<?php
require 'dbh.inc.php';
session_start();
require 'inactivity.php';

function redirectTransferError($error)
{
    header("Location: ../transfer/index.php?error=".$error);
    exit();
}

function loadTransferHistory($username)
{
    if (!preg_match('/^[a-zA-Z0-9]+$/', $username)) {
        throw new RuntimeException("Invalid username for transaction history.");
    }

    $path = __DIR__.'/../assets/users/'.$username.'.json';
    if (!file_exists($path)) {
        return [$path, null, []];
    }

    $contents = file_get_contents($path);
    if ($contents === false) {
        throw new RuntimeException("Unable to read transaction history.");
    }
    $history = json_decode(trim($contents, "\xEF\xBB\xBF"), true);
    if (!is_array($history)) {
        throw new RuntimeException("Transaction history contains invalid JSON.");
    }
    return [$path, $contents, $history];
}

function writeTransferHistory($path, $history)
{
    $json = json_encode($history, JSON_PRETTY_PRINT);
    return $json !== false && file_put_contents($path, $json, LOCK_EX) !== false;
}

function restoreTransferHistory($path, $originalContents)
{
    if ($originalContents === null) {
        if (file_exists($path) && !unlink($path)) {
            error_log("Transfer rollback failed: unable to remove transaction history file.");
        }
        return;
    }
    if (file_put_contents($path, $originalContents, LOCK_EX) === false) {
        error_log("Transfer rollback failed: unable to restore transaction history file.");
    }
}

if (!isset($_SESSION['userId']) || !isset($_SESSION['timesince'])) {
    header("Location: ../");
    exit();
}
if (!isset($_POST['transfer-submit'])) {
    header("Location: ../transfer/");
    exit();
}

$senderSteamId = $_SESSION['steamId'] ?? '';
if (!preg_match('/^[0-9]{17}$/', $senderSteamId)) {
    redirectTransferError('steamidrequired');
}

$recipientSteamId = $_POST['destinationAccountNumber'] ?? '';
if (!preg_match('/^[0-9]{17}$/', $recipientSteamId)) {
    redirectTransferError('invalidsteamid');
}
if ($recipientSteamId === $senderSteamId) {
    redirectTransferError('invalidaccounts');
}

$amountInput = $_POST['amount'] ?? '';
if (!preg_match('/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/', $amountInput)) {
    redirectTransferError('invalidamount');
}
$amountCents = (int)round((float)$amountInput * 100);
if ($amountCents <= 0) {
    redirectTransferError('invalidamount');
}
if ($amountCents > 500000) {
    redirectTransferError('limitreached');
}
$amount = $amountCents / 100;

$recipientStmt = mysqli_prepare($conn, "SELECT idUsers, uidUsers, steamId FROM users WHERE steamId=?");
mysqli_stmt_bind_param($recipientStmt, "s", $recipientSteamId);
if (!mysqli_stmt_execute($recipientStmt)) {
    error_log("Transfer failed: unable to find recipient.");
    redirectTransferError('transferfailed');
}
$recipientResult = mysqli_stmt_get_result($recipientStmt);
$recipient = mysqli_fetch_assoc($recipientResult);
mysqli_stmt_close($recipientStmt);
if ($recipient === null) {
    redirectTransferError('recipientnotfound');
}
if ((int)$recipient['idUsers'] === (int)$_SESSION['userId']) {
    redirectTransferError('invalidaccounts');
}

if (!mysqli_begin_transaction($conn)) {
    error_log("Transfer failed: unable to start database transaction.");
    redirectTransferError('transferfailed');
}

$senderId = (int)$_SESSION['userId'];
$recipientId = (int)$recipient['idUsers'];
$lockStmt = mysqli_prepare($conn, "SELECT idUsers, accountBalance FROM users WHERE idUsers IN (?, ?) ORDER BY idUsers FOR UPDATE");
mysqli_stmt_bind_param($lockStmt, "ii", $senderId, $recipientId);
if (!mysqli_stmt_execute($lockStmt)) {
    error_log("Transfer failed: unable to lock accounts.");
    mysqli_rollback($conn);
    redirectTransferError('transferfailed');
}
$lockedRows = mysqli_stmt_get_result($lockStmt);
$balances = [];
while ($lockedRow = mysqli_fetch_assoc($lockedRows)) {
    $balances[(int)$lockedRow['idUsers']] = $lockedRow['accountBalance'];
}
mysqli_stmt_close($lockStmt);

if (!isset($balances[$senderId], $balances[$recipientId])) {
    mysqli_rollback($conn);
    redirectTransferError('transferfailed');
}
if ((float)$balances[$senderId] < $amount) {
    mysqli_rollback($conn);
    redirectTransferError('insufficientfunds');
}

try {
    [$senderHistoryPath, $senderHistoryOriginal, $senderHistory] = loadTransferHistory($_SESSION['userUid']);
    [$recipientHistoryPath, $recipientHistoryOriginal, $recipientHistory] = loadTransferHistory($recipient['uidUsers']);
} catch (RuntimeException $error) {
    error_log("Transfer failed: ".$error->getMessage());
    mysqli_rollback($conn);
    redirectTransferError('historyfailed');
}

$debitStmt = mysqli_prepare($conn, "UPDATE users SET accountBalance=accountBalance-? WHERE idUsers=?");
$creditStmt = mysqli_prepare($conn, "UPDATE users SET accountBalance=accountBalance+? WHERE idUsers=?");
mysqli_stmt_bind_param($debitStmt, "di", $amount, $senderId);
mysqli_stmt_bind_param($creditStmt, "di", $amount, $recipientId);
if (!mysqli_stmt_execute($debitStmt) || !mysqli_stmt_execute($creditStmt)) {
    error_log("Transfer failed: unable to update account balances.");
    mysqli_stmt_close($debitStmt);
    mysqli_stmt_close($creditStmt);
    mysqli_rollback($conn);
    redirectTransferError('transferfailed');
}
mysqli_stmt_close($debitStmt);
mysqli_stmt_close($creditStmt);

$date = date("m/d");
$year = date("Y");
$senderHistory[] = [
    "account"=>$senderSteamId,
    "date"=>$date,
    "year"=>$year,
    "desc"=>"Transfer to SteamID ".$recipientSteamId,
    "amount"=>$amount,
    "positive"=>false
];
$recipientHistory[] = [
    "account"=>$recipientSteamId,
    "date"=>$date,
    "year"=>$year,
    "desc"=>"Transfer from SteamID ".$senderSteamId,
    "amount"=>$amount,
    "positive"=>true
];

if (!writeTransferHistory($senderHistoryPath, $senderHistory)) {
    error_log("Transfer failed: unable to save sender transaction history.");
    mysqli_rollback($conn);
    redirectTransferError('historyfailed');
}
if (!writeTransferHistory($recipientHistoryPath, $recipientHistory)) {
    error_log("Transfer failed: unable to save recipient transaction history.");
    restoreTransferHistory($senderHistoryPath, $senderHistoryOriginal);
    mysqli_rollback($conn);
    redirectTransferError('historyfailed');
}
if (!mysqli_commit($conn)) {
    error_log("Transfer failed: unable to commit database transaction.");
    restoreTransferHistory($senderHistoryPath, $senderHistoryOriginal);
    restoreTransferHistory($recipientHistoryPath, $recipientHistoryOriginal);
    mysqli_rollback($conn);
    redirectTransferError('transferfailed');
}

header("Location: ../accounts/index.php?transfer=success");
exit();
?>
