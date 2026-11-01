<?php
require 'external-db-sync.inc.php';
require 'http-response.inc.php';
session_start();
require 'inactivity.php';

if (!isset($_SESSION['userId']) || !isset($_SESSION['sessionTimeStamp'])) {
    finishRequest('/', 'loggedout');
}
if (!isset($_POST['account-action-submit'])) {
    finishRequest('/accounts/');
}

$steamId = $_SESSION['steamId'] ?? '';
$action = $_POST['action'] ?? '';
$accountNumberInput = $_POST['accountNumber'] ?? '';
if (!preg_match('/^[0-9]{17}$/', $steamId)) {
    finishRequest('/accounts/?error=steamidrequired', 'steamidrequired');
}
if (!is_string($accountNumberInput)) {
    finishRequest('/accounts/?error=invalidaccountnumber', 'invalidaccountnumber');
}

$accountNumber = trim($accountNumberInput);
if ($accountNumber === '' || strlen($accountNumber) > 128) {
    finishRequest('/accounts/?error=invalidaccountnumber', 'invalidaccountnumber');
}

try {
    if ($action === 'rename') {
        $accountNameInput = $_POST['accountName'] ?? '';
        if (!is_string($accountNameInput)) {
            finishRequest('/accounts/?error=invalidaccountname', 'invalidaccountname');
        }

        $accountName = trim($accountNameInput);
        $accountNameLength = preg_match_all('/./us', $accountName);
        if ($accountNameLength === false || $accountNameLength < 1 || $accountNameLength > 40) {
            finishRequest('/accounts/?error=invalidaccountname', 'invalidaccountname');
        }
        renameExternalPlayerAccount($steamId, $accountNumber, $accountName);
    } elseif ($action === 'delete') {
        deleteExternalPlayerAccount($steamId, $accountNumber);
    } else {
        finishRequest('/accounts/?error=invalidaccountaction', 'invalidaccountaction');
    }
} catch (SupabaseRequestException $error) {
    error_log('Account action failed in Supabase: '.$error->getMessage());
    $errorCode = match ($error->getSupabaseMessage()) {
        'invalid_account_name' => 'invalidaccountname',
        'account_name_taken' => 'accountnametaken',
        'account_balance_not_zero' => 'accountbalancenotzero',
        'last_player_account' => 'lastplayeraccount',
        'main_account_protected', 'main_account_immutable' => 'mainaccountprotected',
        'account_not_found', 'player_identity_unavailable' => 'accountnotfound',
        default => $error->getSupabaseCode() === '23505'
            && str_contains($error->getSupabaseMessage(), 'accounts_player_name_unique')
                ? 'accountnametaken'
                : 'supabaseunavailable'
    };
    finishRequest('/accounts/?error='.$errorCode, $errorCode);
}

finishRequest('/accounts/?account='.$action.'d');
