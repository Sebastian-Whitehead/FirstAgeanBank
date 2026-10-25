<?php
require 'dbh.inc.php';
require 'external-db-sync.inc.php';
require 'http-response.inc.php';
session_start();
require 'inactivity.php';

function redirectTransferError($error)
{
    finishRequest('/transfer/?error='.$error, $error);
}

if (!isset($_SESSION['userId']) || !isset($_SESSION['sessionTimeStamp'])) {
    finishRequest('/', 'loggedout');
}
if (!isset($_POST['transfer-submit'])) {
    finishRequest('/transfer/');
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

$senderBalance = (float)$balances[$senderId];
$recipientBalance = (float)$balances[$recipientId];
$senderBalanceAfter = $senderBalance - $amount;
$recipientBalanceAfter = $recipientBalance + $amount;
syncExternalTransfer([
    'senderUserId' => $senderId,
    'senderSteamId' => $senderSteamId,
    'recipientUserId' => $recipientId,
    'recipientSteamId' => $recipientSteamId,
    'amount' => $amount
]);
syncExternalAccountBalanceUpdate([
    'userId' => $senderId,
    'steamId' => $senderSteamId,
    'balanceBefore' => $senderBalance,
    'balanceAfter' => $senderBalanceAfter
]);
syncExternalAccountBalanceUpdate([
    'userId' => $recipientId,
    'steamId' => $recipientSteamId,
    'balanceBefore' => $recipientBalance,
    'balanceAfter' => $recipientBalanceAfter
]);

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

$activityStmt = mysqli_prepare(
    $conn,
    "INSERT INTO account_activities (user_id, description, amount, is_positive, created_at) VALUES (?, ?, ?, ?, NOW())"
);
if (!$activityStmt) {
    error_log("Transfer failed: unable to prepare transaction activity: ".mysqli_error($conn));
    mysqli_rollback($conn);
    redirectTransferError('transferfailed');
}
$senderDescription = "Transfer to SteamID ".$recipientSteamId;
$senderPositive = 0;
mysqli_stmt_bind_param($activityStmt, "isdi", $senderId, $senderDescription, $amount, $senderPositive);
if (!mysqli_stmt_execute($activityStmt)) {
    error_log("Transfer failed: unable to save sender activity: ".mysqli_stmt_error($activityStmt));
    mysqli_stmt_close($activityStmt);
    mysqli_rollback($conn);
    redirectTransferError('transferfailed');
}

$recipientDescription = "Transfer from SteamID ".$senderSteamId;
$recipientPositive = 1;
mysqli_stmt_bind_param($activityStmt, "isdi", $recipientId, $recipientDescription, $amount, $recipientPositive);
if (!mysqli_stmt_execute($activityStmt)) {
    error_log("Transfer failed: unable to save recipient activity: ".mysqli_stmt_error($activityStmt));
    mysqli_stmt_close($activityStmt);
    mysqli_rollback($conn);
    redirectTransferError('transferfailed');
}
mysqli_stmt_close($activityStmt);

if (!mysqli_commit($conn)) {
    error_log("Transfer failed: unable to commit database transaction.");
    mysqli_rollback($conn);
    redirectTransferError('transferfailed');
}

finishRequest('/accounts/?transfer=success');
?>
