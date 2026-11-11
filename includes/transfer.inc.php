<?php
require 'external-db-sync.inc.php';
require 'http-response.inc.php';
require 'auth.inc.php';

function redirectTransferError(string $error): never
{
    finishRequest('/transfer/?error='.$error, $error);
}

$player = requireAuthenticatedPlayer();
if (!isset($_POST['transfer-submit'])) {
    finishRequest('/transfer/');
}

$senderSteamId = $player['steamId'];
if (!preg_match('/^[0-9]{17}$/', $senderSteamId)) {
    redirectTransferError('steamidrequired');
}

$senderAccountInput = $_POST['sourceAccountNumber'] ?? '';
if (!is_string($senderAccountInput)) {
    redirectTransferError('invalidaccountnumber');
}
$senderAccountNumber = trim($senderAccountInput);
if ($senderAccountNumber === '' || strlen($senderAccountNumber) > 128) {
    redirectTransferError('invalidaccountnumber');
}

$recipientInput = $_POST['destinationAccountNumber'] ?? '';
if (!is_string($recipientInput)) {
    redirectTransferError('invalidaccountnumber');
}
$recipientAccountNumber = trim($recipientInput);
if ($recipientAccountNumber === '' || strlen($recipientAccountNumber) > 128) {
    redirectTransferError('invalidaccountnumber');
}

$amountInput = $_POST['amount'] ?? '';
if (!is_string($amountInput) || !preg_match('/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/', $amountInput)) {
    redirectTransferError('invalidamount');
}

$amountParts = explode('.', $amountInput, 2);
$dollarsText = $amountParts[0];
if (strlen($dollarsText) > 4 || (int)$dollarsText > 5000) {
    redirectTransferError('limitreached');
}
$amountCents = ((int)$dollarsText * 100) + (int)str_pad($amountParts[1] ?? '', 2, '0');
if ($amountCents <= 0) {
    redirectTransferError('invalidamount');
}
if ($amountCents > 500000) {
    redirectTransferError('limitreached');
}

$idempotencyInput = $_POST['idempotencyKey'] ?? '';
if (!is_string($idempotencyInput)) {
    redirectTransferError('transferfailed');
}
$idempotencyKey = strtolower(trim($idempotencyInput));
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $idempotencyKey)) {
    redirectTransferError('transferfailed');
}

try {
    supabaseRpc('fab_transfer', [
        'p_sender_steam_id' => $senderSteamId,
        'p_sender_account_number' => $senderAccountNumber,
        'p_recipient_account_number' => $recipientAccountNumber,
        'p_amount' => $amountCents,
        'p_idempotency_key' => $idempotencyKey
    ]);
} catch (SupabaseRequestException $error) {
    error_log('Transfer failed while updating the Supabase ledger: '.$error->getMessage());
    $errorCode = $error->getSupabaseMessage() === 'account_archived'
        ? 'accountarchived'
        : match ($error->getSupabaseCode()) {
            'P0002' => 'recipientnotfound',
            'P0003' => 'invalidaccounts',
            'P0004' => 'insufficientfunds',
            default => 'transferfailed'
        };
    redirectTransferError($errorCode);
} catch (Throwable $error) {
    error_log('Transfer failed: '.$error->getMessage());
    redirectTransferError('transferfailed');
}

finishRequest('/accounts/?transfer=success');
